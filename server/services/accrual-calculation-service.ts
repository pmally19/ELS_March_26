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

// SAP document type for Accruals = 'AB' (Accounting Document)
const ACCRUAL_DOCUMENT_TYPE = 'AB';

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
        SELECT id, start_date, end_date, company_code_id, year, period
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
                rulesQuery += ` AND (ar.company_code_id = $1 OR ar.company_code_id IS NULL)`;
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
                    // Goods received but not invoiced (GR/IR clearing)
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
                else if (rule.calculation_method === 'linear_distribution') {
                    // SAP Accrual Objects: sum active accrual objects for this period
                    const result = await client.query(`
            SELECT COALESCE(SUM(
              ao.total_amount / GREATEST(
                EXTRACT(MONTH FROM AGE(ao.end_date, ao.start_date)) + 1, 1
              )
            ), 0) as period_amount
            FROM accrual_objects ao
            WHERE ao.accrual_rule_id = $1
              AND ao.status = 'active'
              AND ao.start_date <= $2
              AND ao.end_date >= $3
          `, [rule.id, period.end_date, period.start_date]);

                    accrualAmount = parseFloat(result.rows[0].period_amount) || 0;
                }
                // For 'manual': accrualAmount stays 0 – user will enter it in UI

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
                            accrual_account: rule.accrual_account_number,
                            requires_reversal: rule.requires_reversal,
                            provision_type: rule.provision_type
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
               ar.requires_reversal,
               ar.provision_type,
               ea.account_number as expense_account,
               aa.account_number as accrual_account,
               je.document_number as journal_entry_number,
               rje.document_number as reversal_entry_number
        FROM accrual_postings ap
        JOIN accrual_rules ar ON ap.accrual_rule_id = ar.id
        LEFT JOIN gl_accounts ea ON ar.gl_expense_account_id = ea.id
        LEFT JOIN gl_accounts aa ON ar.gl_accrual_account_id = aa.id
        LEFT JOIN journal_entries je ON ap.journal_entry_id = je.id
        LEFT JOIN journal_entries rje ON ap.reversal_entry_id = rje.id
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
     * Post calculated accruals to GL (SAP-style with Document Type AB)
     * Optionally generates auto-reversal for provisions
     */
    async postAccruals(
        accrualPostingIds: number[],
        postedBy: string,
        manualAmounts?: Record<number, number>
    ): Promise<void> {
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
                 ar.requires_reversal,
                 ar.provision_type,
                 fp.end_date,
                 fp.period,
                 fp.year,
                 fp.company_code_id as fp_company_code_id
          FROM accrual_postings ap
          JOIN accrual_rules ar ON ap.accrual_rule_id = ar.id
          LEFT JOIN fiscal_periods fp ON ap.fiscal_period_id = fp.id
          WHERE ap.id = $1 AND ap.status = 'calculated'
        `, [id]);

                if (result.rows.length === 0) {
                    console.log(`Accrual posting ${id} not found or already posted`);
                    continue;
                }

                const accrual = result.rows[0];

                if (!accrual.gl_expense_account_id || !accrual.gl_accrual_account_id) {
                    throw new Error(`Accrual rule '${accrual.rule_name}' is missing GL account assignments. Please edit the rule and assign GL accounts.`);
                }

                // Apply manual amount override if provided
                if (manualAmounts && manualAmounts[id] !== undefined) {
                    accrual.accrual_amount = manualAmounts[id];
                    await client.query(
                        `UPDATE accrual_postings SET accrual_amount = $1 WHERE id = $2`,
                        [accrual.accrual_amount, id]
                    );
                }

                if (!accrual.accrual_amount || parseFloat(accrual.accrual_amount) === 0) {
                    throw new Error(`Accrual '${accrual.rule_name}' has amount 0. Please enter an amount before posting.`);
                }

                const postingDate = accrual.end_date || new Date().toISOString().split('T')[0];
                const companyCodeId = accrual.company_code_id || accrual.fp_company_code_id;
                const amount = parseFloat(accrual.accrual_amount);
                const fiscalPeriodStr = String(accrual.fiscal_period || accrual.period);
                const fiscalYear = accrual.fiscal_year || accrual.year;

                // Generate unique document number
                const docNumResult = await client.query(`
          SELECT 'AB' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('journal_entries_id_seq')::TEXT, 6, '0') as doc_num
        `);
                const documentNumber = docNumResult.rows[0].doc_num;

                // Create journal entry header (SAP Document Type AB = Accounting Document)
                const jeResult = await client.query(`
          INSERT INTO journal_entries (
            document_number, company_code_id, document_type, posting_date, document_date,
            fiscal_year, fiscal_period, reference_document, header_text,
            total_debit_amount, total_credit_amount, status,
            source_module, source_document_id, source_document_type
          ) VALUES (
            $1, $2, $3, $4, $4,
            $5, $6, $7, $8,
            $9, $9, 'posted',
            'ACCRUALS', $10, 'accrual_posting'
          ) RETURNING id
        `, [
                    documentNumber,
                    companyCodeId,
                    ACCRUAL_DOCUMENT_TYPE,
                    postingDate,
                    fiscalYear,
                    fiscalPeriodStr,
                    `ACCRUAL-${id}`,
                    `Accrual: ${accrual.rule_name} P${fiscalPeriodStr}/${fiscalYear}`,
                    amount,
                    id
                ]);

                const jeId = jeResult.rows[0].id;

                // Create line item — Debit Expense Account (Dr), posting key 40
                await client.query(`
          INSERT INTO journal_entry_line_items (
            journal_entry_id, line_item_number, gl_account_id, gl_account,
            account_type, debit_amount, credit_amount, description,
            posting_key, source_module, source_document_id, source_document_type
          ) VALUES ($1, 1, $2, $3, 'GL', $4, 0, $5, '40', 'ACCRUALS', $6, 'accrual_posting')
        `, [
                    jeId,
                    accrual.gl_expense_account_id,
                    accrual.expense_account_number || String(accrual.gl_expense_account_id),
                    amount,
                    `Accrual Dr: ${accrual.rule_name}`,
                    id
                ]);

                // Create line item — Credit Accrual/Provision Account (Cr), posting key 50
                await client.query(`
          INSERT INTO journal_entry_line_items (
            journal_entry_id, line_item_number, gl_account_id, gl_account,
            account_type, debit_amount, credit_amount, description,
            posting_key, source_module, source_document_id, source_document_type
          ) VALUES ($1, 2, $2, $3, 'GL', 0, $4, $5, '50', 'ACCRUALS', $6, 'accrual_posting')
        `, [
                    jeId,
                    accrual.gl_accrual_account_id,
                    accrual.accrual_account_number || String(accrual.gl_accrual_account_id),
                    amount,
                    `Accrual Cr: ${accrual.rule_name}`,
                    id
                ]);

                let reversalJeId: number | null = null;

                // ─── Auto-Reversal (SAP Provision Pattern) ───────────────────────────────
                if (accrual.requires_reversal) {
                    // Find next fiscal period
                    const nextPeriodResult = await client.query(`
            SELECT id, start_date, year, period 
            FROM fiscal_periods 
            WHERE company_code_id = $1 
              AND (year > $2 OR (year = $2 AND period > $3))
            ORDER BY year ASC, period ASC
            LIMIT 1
          `, [companyCodeId, fiscalYear, accrual.fiscal_period || accrual.period]);

                    if (nextPeriodResult.rows.length > 0) {
                        const nextPeriod = nextPeriodResult.rows[0];

                        // Generate reversal document number
                        const revDocNumResult = await client.query(`
              SELECT 'AB' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('journal_entries_id_seq')::TEXT, 6, '0') as doc_num
            `);
                        const reversalDocNumber = revDocNumResult.rows[0].doc_num;

                        // Create reversal JE header (mirrors original, posted to next period)
                        const revJeResult = await client.query(`
              INSERT INTO journal_entries (
                document_number, company_code_id, document_type, posting_date, document_date,
                fiscal_year, fiscal_period, reference_document, header_text,
                total_debit_amount, total_credit_amount, status,
                is_reversal, reversal_of_id,
                source_module, source_document_id, source_document_type
              ) VALUES (
                $1, $2, $3, $4, $4,
                $5, $6, $7, $8,
                $9, $9, 'posted',
                true, $10,
                'ACCRUALS', $11, 'accrual_reversal'
              ) RETURNING id
            `, [
                            reversalDocNumber,
                            companyCodeId,
                            ACCRUAL_DOCUMENT_TYPE,
                            nextPeriod.start_date,
                            nextPeriod.year,
                            String(nextPeriod.period),
                            documentNumber,
                            `REVERSAL: ${accrual.rule_name} (P${fiscalPeriodStr}/${fiscalYear})`,
                            amount,
                            jeId,
                            id
                        ]);

                        reversalJeId = revJeResult.rows[0].id;

                        // Reversal line items — SWAP Debit/Credit (Cr expense, Dr accrual)
                        await client.query(`
              INSERT INTO journal_entry_line_items (
                journal_entry_id, line_item_number, gl_account_id, gl_account,
                account_type, debit_amount, credit_amount, description,
                posting_key, source_module, source_document_id, source_document_type
              ) VALUES ($1, 1, $2, $3, 'GL', 0, $4, $5, '50', 'ACCRUALS', $6, 'accrual_reversal')
            `, [
                            reversalJeId,
                            accrual.gl_expense_account_id,
                            accrual.expense_account_number || String(accrual.gl_expense_account_id),
                            amount,
                            `Reversal Cr: ${accrual.rule_name}`,
                            id
                        ]);

                        await client.query(`
              INSERT INTO journal_entry_line_items (
                journal_entry_id, line_item_number, gl_account_id, gl_account,
                account_type, debit_amount, credit_amount, description,
                posting_key, source_module, source_document_id, source_document_type
              ) VALUES ($1, 2, $2, $3, 'GL', $4, 0, $5, '40', 'ACCRUALS', $6, 'accrual_reversal')
            `, [
                            reversalJeId,
                            accrual.gl_accrual_account_id,
                            accrual.accrual_account_number || String(accrual.gl_accrual_account_id),
                            amount,
                            `Reversal Dr: ${accrual.rule_name}`,
                            id
                        ]);

                        console.log(`✓ Auto-reversal created: ${reversalDocNumber} for period ${nextPeriod.period}/${nextPeriod.year}`);
                    }
                }
                // ─────────────────────────────────────────────────────────────────────────

                // Update accrual posting status
                await client.query(`
          UPDATE accrual_postings 
          SET status = 'posted', 
              journal_entry_id = $1,
              reversal_entry_id = $2,
              posted_at = NOW(),
              posted_by = $3
          WHERE id = $4
        `, [jeId, reversalJeId, postedBy, id]);

                console.log(`✓ Posted accrual ${id}: ${documentNumber} (Amount: ${amount})`);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get pending reversals for a fiscal period (accruals posted in previous period with requires_reversal=true)
     */
    async getPendingReversals(fiscalYear: number, fiscalPeriod: number): Promise<any[]> {
        const client = await pool.connect();
        try {
            // Find previous period
            const prevPeriodResult = await client.query(`
        SELECT year, period FROM fiscal_periods
        WHERE (year < $1 OR (year = $1 AND period < $2))
        ORDER BY year DESC, period DESC LIMIT 1
      `, [fiscalYear, fiscalPeriod]);

            if (prevPeriodResult.rows.length === 0) return [];

            const prev = prevPeriodResult.rows[0];

            const result = await client.query(`
        SELECT ap.*, ar.rule_name, ar.accrual_type, ar.provision_type,
               je.document_number as journal_entry_number
        FROM accrual_postings ap
        JOIN accrual_rules ar ON ap.accrual_rule_id = ar.id
        LEFT JOIN journal_entries je ON ap.journal_entry_id = je.id
        WHERE ap.fiscal_year = $1 
          AND ap.fiscal_period = $2
          AND ap.status = 'posted'
          AND ar.requires_reversal = true
          AND ap.reversal_entry_id IS NULL
        ORDER BY ap.created_at DESC
      `, [prev.year, prev.period]);

            return result.rows;
        } finally {
            client.release();
        }
    }
}

export const accrualCalculationService = new AccrualCalculationService();
