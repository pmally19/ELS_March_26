import pkg from 'pg';
const { Pool } = pkg;
import { getPool } from '../database.js';

const pool = getPool ? getPool() : new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21',
});

export class TaxProvisionService {
    /**
     * Calculate income tax provision for a period based on YTD income
     */
    async calculateIncomeTaxProvision(fiscalPeriodId: number, userId: string = 'system'): Promise<{
        taxableIncome: number;
        taxRate: number;
        provisionAmount: number;
        expenseAccountId: number | null;
        liabilityAccountId: number | null;
    }> {
        const client = await pool.connect();
        try {
            // Get period details
            const periodResult = await client.query(`
                SELECT * FROM fiscal_periods WHERE id = $1
            `, [fiscalPeriodId]);

            if (periodResult.rows.length === 0) {
                throw new Error('Period not found');
            }

            const period = periodResult.rows[0];

            // Get tax configuration
            const configResult = await client.query(`
                SELECT * FROM tax_provision_config
                WHERE company_code_id = $1
                  AND provision_type = 'income_tax'
                  AND active = true
                LIMIT 1
            `, [period.company_code_id]);

            if (configResult.rows.length === 0) {
                throw new Error('Income tax configuration not found. Please configure tax rates first.');
            }

            const config = configResult.rows[0];

            // Calculate YTD income (Revenue - Expenses)
            const incomeResult = await client.query(`
                SELECT 
                    SUM(CASE 
                        WHEN ga.account_type IN ('REVENUE', 'revenue') 
                        THEN jeli.credit_amount - jeli.debit_amount 
                        ELSE 0 
                    END) as total_revenue,
                    SUM(CASE 
                        WHEN ga.account_type IN ('EXPENSE', 'expense') 
                        THEN jeli.debit_amount - jeli.credit_amount 
                        ELSE 0 
                    END) as total_expense
                FROM journal_entry_line_items jeli
                JOIN journal_entries je ON jeli.journal_entry_id = je.id
                JOIN gl_accounts ga ON jeli.gl_account_id = ga.id
                WHERE je.company_code_id = $1
                  AND je.fiscal_year = $2
                  AND je.fiscal_period <= $3
                  AND je.status = 'POSTED'
                  AND ga.balance_sheet_account = false
            `, [period.company_code_id, period.year, period.period]);

            const revenue = parseFloat(incomeResult.rows[0].total_revenue || 0);
            const expense = parseFloat(incomeResult.rows[0].total_expense || 0);
            const taxableIncome = revenue - expense;

            // Calculate provision
            const taxRate = parseFloat(config.tax_rate);
            const provisionAmount = (taxableIncome * taxRate) / 100;

            return {
                taxableIncome,
                taxRate,
                provisionAmount,
                expenseAccountId: config.expense_account_id,
                liabilityAccountId: config.liability_account_id,
            };

        } finally {
            client.release();
        }
    }

    /**
     * Post tax provision as a journal entry
     */
    async postTaxProvision(params: {
        fiscalPeriodId: number;
        provisionType: string;
        taxableAmount: number;
        taxRate: number;
        provisionAmount: number;
        expenseAccountId: number;
        liabilityAccountId: number;
        userId: string;
    }): Promise<{
        provisionId: number;
        journalEntryId: number;
    }> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get period details
            const periodResult = await client.query(`
                SELECT * FROM fiscal_periods WHERE id = $1
            `, [params.fiscalPeriodId]);

            if (periodResult.rows.length === 0) {
                throw new Error('Period not found');
            }

            const period = periodResult.rows[0];

            // Check if provision already exists
            const existing = await client.query(`
                SELECT id FROM tax_provisions
                WHERE fiscal_period_id = $1
                  AND provision_type = $2
                  AND posted = true
            `, [params.fiscalPeriodId, params.provisionType]);

            if (existing.rows.length > 0) {
                throw new Error(`${params.provisionType} provision already posted for this period`);
            }

            // Generate document number
            const docNumResult = await client.query(`
                SELECT 'TAXPROV' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('journal_entries_id_seq')::TEXT, 6, '0') as doc_num
            `);

            // Create journal entry
            const jeResult = await client.query(`
                INSERT INTO journal_entries (
                    document_number, company_code_id, posting_date, document_date,
                    fiscal_year, fiscal_period, reference, header_text,
                    total_debit, total_credit, balance_check, created_by, status
                ) VALUES (
                    $1, $2, $3, $3, $4, $5, $6, $7, $8, $8, true, $9, 'POSTED'
                ) RETURNING id
            `, [
                docNumResult.rows[0].doc_num,
                period.company_code_id,
                period.end_date,
                period.year,
                period.period,
                `TAX-PROV-${period.period}/${period.year}`,
                `${params.provisionType} Provision - Period ${period.period}/${period.year}`,
                Math.abs(params.provisionAmount),
                params.userId
            ]);

            const journalEntryId = jeResult.rows[0].id;

            // Create line items
            // Debit: Tax Expense
            await client.query(`
                INSERT INTO journal_entry_line_items (
                    journal_entry_id, line_number, gl_account_id,
                    debit_amount, credit_amount, item_text
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                journalEntryId,
                1,
                params.expenseAccountId,
                params.provisionAmount,
                0,
                `${params.provisionType} expense`
            ]);

            // Credit: Tax Payable
            await client.query(`
                INSERT INTO journal_entry_line_items (
                    journal_entry_id, line_number, gl_account_id,
                    debit_amount, credit_amount, item_text
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                journalEntryId,
                2,
                params.liabilityAccountId,
                0,
                params.provisionAmount,
                `${params.provisionType} payable`
            ]);

            // Create tax provision record
            const provisionResult = await client.query(`
                INSERT INTO tax_provisions (
                    company_code_id, fiscal_period_id, year, period,
                    provision_type, taxable_amount, tax_rate, provision_amount,
                    expense_gl_account_id, liability_gl_account_id,
                    posted, journal_entry_id, posting_date, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $13
                ) RETURNING id
            `, [
                period.company_code_id,
                params.fiscalPeriodId,
                period.year,
                period.period,
                params.provisionType,
                params.taxableAmount,
                params.taxRate,
                params.provisionAmount,
                params.expenseAccountId,
                params.liabilityAccountId,
                journalEntryId,
                period.end_date,
                params.userId
            ]);

            await client.query('COMMIT');

            return {
                provisionId: provisionResult.rows[0].id,
                journalEntryId
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get tax provisions for a period
     */
    async getTaxProvisions(fiscalPeriodId: number): Promise<any[]> {
        const result = await pool.query(`
            SELECT 
                tp.*,
                ga_exp.account_number as expense_account_number,
                ga_exp.account_name as expense_account_name,
                ga_lib.account_number as liability_account_number,
                ga_lib.account_name as liability_account_name,
                je.document_number as journal_entry_document
            FROM tax_provisions tp
            LEFT JOIN gl_accounts ga_exp ON tp.expense_gl_account_id = ga_exp.id
            LEFT JOIN gl_accounts ga_lib ON tp.liability_gl_account_id = ga_lib.id
            LEFT JOIN journal_entries je ON tp.journal_entry_id = je.id
            WHERE tp.fiscal_period_id = $1
            ORDER BY tp.created_at DESC
        `, [fiscalPeriodId]);

        return result.rows;
    }
}

export const taxProvisionService = new TaxProvisionService();
