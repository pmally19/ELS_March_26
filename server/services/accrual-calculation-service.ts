import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21',
});

interface AccrualCalculationResult {
    calculated: number;
    totalAmount: number;
    details: any[];
}

interface AccrualPosting {
    id: number;
    accrual_rule_id: number;
    fiscal_year: number;
    fiscal_period: number;
    accrual_amount: number;
    description: string;
    status: string;
}

export class AccrualCalculationService {
    /**
     * Calculate accruals for a given period based on active rules
     */
    async calculateAccrualsForPeriod(
        fiscalYear: number,
        fiscalPeriod: number,
        companyCodeId?: number
    ): Promise<AccrualCalculationResult> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get the fiscal period details
            const periodQuery = `
        SELECT id, start_date, end_date, company_code_id
        FROM fiscal_periods 
        WHERE year = $1 AND period = $2
        ${companyCodeId ? 'AND company_code_id = $3' : ''}
        LIMIT 1
      `;
            const periodParams = companyCodeId ? [fiscalYear, fiscalPeriod, companyCodeId] : [fiscalYear, fiscalPeriod];
            const periodResult = await client.query(periodQuery, periodParams);

            if (periodResult.rows.length === 0) {
                throw new Error(`Fiscal period ${fiscalPeriod}/${fiscalYear} not found`);
            }

            const period = periodResult.rows[0];

            // Get active accrual rules
            let rulesQuery = `
        SELECT ar.*, 
               ea.account_number as expense_account_number,
               ea.account_name as expense_account_name,
               aa.account_number as accrual_account_number,
               aa.account_name as accrual_account_name
        FROM accrual_rules ar
        LEFT JOIN gl_accounts ea ON ar.gl_expense_account_id = ea.id
        LEFT JOIN gl_accounts aa ON ar.gl_accrual_account_id = aa.id
        WHERE ar.is_active = true
      `;
            const rulesParams: any[] = [];

            if (period.company_code_id) {
                rulesQuery += ` AND ar.company_code_id = $1`;
                rulesParams.push(period.company_code_id);
            }

            const rulesResult = await client.query(rulesQuery, rulesParams);
            const rules = rulesResult.rows;

            if (rules.length === 0) {
                console.log('No active accrual rules found');
                await client.query('COMMIT');
                return {
                    calculated: 0,
                    totalAmount: 0,
                    details: []
                };
            }

            const details: any[] = [];
            let totalAmount = 0;

            for (const rule of rules) {
                let accrualAmount = 0;

                // Calculate based on method
                if (rule.calculation_method === 'unbilled_deliveries') {
                    // Revenue accrual: Deliveries made but not invoiced
                    const result = await client.query(`
            SELECT COALESCE(SUM(di.net_value), 0) as unbilled_amount
            FROM delivery_items di
            JOIN deliveries d ON di.delivery_id = d.id
            LEFT JOIN sales_invoice_items sii ON di.id = sii.delivery_item_id
            WHERE d.posting_date >= $1
              AND d.posting_date <= $2
              AND d.status = 'posted'
              AND sii.id IS NULL
          `, [period.start_date, period.end_date]);

                    accrualAmount = parseFloat(result.rows[0].unbilled_amount) || 0;
                }
                else if (rule.calculation_method === 'unpaid_invoices') {
                    // Expense accrual: Vendor invoices received but not paid
                    const result = await client.query(`
            SELECT COALESCE(SUM(total_amount), 0) as unpaid_amount
            FROM ap_invoices
            WHERE invoice_date >= $1
              AND invoice_date <= $2
              AND payment_status != 'paid'
              AND status = 'posted'
          `, [period.start_date, period.end_date]);

                    accrualAmount = parseFloat(result.rows[0].unpaid_amount) || 0;
                }
                else if (rule.calculation_method === 'received_not_invoiced') {
                    // Goods received but not invoiced
                    const result = await client.query(`
            SELECT COALESCE(SUM(poi.quantity * poi.net_price), 0) as rni_amount
            FROM goods_receipts gr
            JOIN goods_receipt_items gri ON gr.id = gri.goods_receipt_id
            JOIN po_items poi ON gri.po_item_id = poi.id
            LEFT JOIN ap_invoice_items aii ON gri.id = aii.goods_receipt_item_id
            WHERE gr.posting_date >= $1
              AND gr.posting_date <= $2
              AND gr.status = 'posted'
              AND aii.id IS NULL
          `, [period.start_date, period.end_date]);

                    accrualAmount = parseFloat(result.rows[0].rni_amount) || 0;
                }
                // For manual, accrualAmount stays 0 - will be entered manually

                if (accrualAmount > 0 || rule.calculation_method === 'manual') {
                    // Check if accrual already exists for this period
                    const existingCheck = await client.query(`
            SELECT id FROM accrual_postings
            WHERE accrual_rule_id = $1 
              AND fiscal_year = $2 
              AND fiscal_period = $3
          `, [rule.id, fiscalYear, fiscalPeriod]);

                    if (existingCheck.rows.length === 0) {
                        // Save calculated accrual
                        const postingResult = await client.query(`
              INSERT INTO accrual_postings (
                accrual_rule_id, fiscal_year, fiscal_period, fiscal_period_id,
                accrual_amount, posting_date, description, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'calculated')
              RETURNING *
            `, [
                            rule.id,
                            fiscalYear,
                            fiscalPeriod,
                            period.id,
                            accrualAmount,
                            period.end_date,
                            `${rule.rule_name} - Period ${fiscalPeriod}/${fiscalYear}`
                        ]);

                        const posting = postingResult.rows[0];
                        details.push({
                            ...posting,
                            rule_name: rule.rule_name,
                            rule_type: rule.accrual_type,
                            calculation_method: rule.calculation_method,
                            expense_account: rule.expense_account_number,
                            accrual_account: rule.accrual_account_number
                        });
                        totalAmount += accrualAmount;
                    }
                }
            }

            await client.query('COMMIT');

            return {
                calculated: details.length,
                totalAmount,
                details
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get calculated accruals for a period
     */
    async getAccrualsForPeriod(
        fiscalYear: number,
        fiscalPeriod: number,
        status?: string
    ): Promise<any[]> {
        const client = await pool.connect();

        try {
            let query = `
        SELECT ap.*, 
               ar.rule_name, 
               ar.accrual_type,
               ar.calculation_method,
               ea.account_number as expense_account,
               aa.account_number as accrual_account,
               je.document_number as journal_entry_number
        FROM accrual_postings ap
        JOIN accrual_rules ar ON ap.accrual_rule_id = ar.id
        LEFT JOIN gl_accounts ea ON ar.gl_expense_account_id = ea.id
        LEFT JOIN gl_accounts aa ON ar.gl_accrual_account_id = aa.id
        LEFT JOIN journal_entries je ON ap.journal_entry_id = je.id
        WHERE ap.fiscal_year = $1 AND ap.fiscal_period = $2
      `;
            const params: any[] = [fiscalYear, fiscalPeriod];

            if (status) {
                query += ` AND ap.status = $3`;
                params.push(status);
            }

            query += ` ORDER BY ap.created_at DESC`;

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Post calculated accruals to GL
     */
    async postAccruals(accrualPostingIds: number[], postedBy: string): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const id of accrualPostingIds) {
                // Get accrual posting details with rule information
                const result = await client.query(`
          SELECT ap.*, 
                 ar.gl_expense_account_id, 
                 ar.gl_accrual_account_id, 
                 ar.rule_name,
                 ar.company_code_id,
                 fp.end_date
          FROM accrual_postings ap
          JOIN accrual_rules ar ON ap.accrual_rule_id = ar.id
          JOIN fiscal_periods fp ON ap.fiscal_period_id = fp.id
          WHERE ap.id = $1 AND ap.status = 'calculated'
        `, [id]);

                if (result.rows.length === 0) {
                    console.log(`Accrual posting ${id} not found or already posted`);
                    continue;
                }

                const accrual = result.rows[0];

                if (!accrual.gl_expense_account_id || !accrual.gl_accrual_account_id) {
                    throw new Error(`Accrual rule '${accrual.rule_name}' missing GL account assignments`);
                }

                // Generate document number
                const docNumResult = await client.query(`
          SELECT 'ACR' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('journal_entries_id_seq')::TEXT, 6, '0') as doc_num
        `);
                const documentNumber = docNumResult.rows[0].doc_num;

                // Create journal entry header
                const jeResult = await client.query(`
          INSERT INTO journal_entries (
            document_number, company_code_id, posting_date, document_date,
            fiscal_year, fiscal_period, reference, header_text,
            total_debit, total_credit, balance_check, created_by, status
          ) VALUES (
            $1, $2, $3, $3, $4, $5, $6, $7, $8, $8, true, $9, 'POSTED'
          ) RETURNING id
        `, [
                    documentNumber,
                    accrual.company_code_id,
                    accrual.end_date,
                    accrual.fiscal_year,
                    accrual.fiscal_period,
                    `ACCRUAL-${id}`,
                    `Accrual: ${accrual.rule_name}`,
                    accrual.accrual_amount,
                    postedBy
                ]);

                const jeId = jeResult.rows[0].id;

                // Create line items - Debit Expense
                await client.query(`
          INSERT INTO journal_entry_line_items (
            journal_entry_id, line_number, gl_account_id,
            debit_amount, credit_amount, item_text
          ) VALUES ($1, 1, $2, $3, 0, $4)
        `, [
                    jeId,
                    accrual.gl_expense_account_id,
                    accrual.accrual_amount,
                    `Accrual expense - ${accrual.rule_name}`
                ]);

                // Create line items - Credit Accrual Liability
                await client.query(`
          INSERT INTO journal_entry_line_items (
            journal_entry_id, line_number, gl_account_id,
            debit_amount, credit_amount, item_text
          ) VALUES ($1, 2, $2, 0, $3, $4)
        `, [
                    jeId,
                    accrual.gl_accrual_account_id,
                    accrual.accrual_amount,
                    `Accrual liability - ${accrual.rule_name}`
                ]);

                // Update accrual posting status
                await client.query(`
          UPDATE accrual_postings 
          SET status = 'posted', 
              journal_entry_id = $1,
              posted_at = NOW(),
              posted_by = $2
          WHERE id = $3
        `, [jeId, postedBy, id]);

                console.log(`Posted accrual ${id} with journal entry ${documentNumber}`);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export const accrualCalculationService = new AccrualCalculationService();
