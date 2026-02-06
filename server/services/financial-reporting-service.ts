import { dbPool as pool } from '../database.js';

export interface FinancialReportLine {
    accountType: string;
    accountGroup: string;
    accountNumber: string;
    accountName: string;
    balance: number;
}

export class FinancialReportingService {

    async getBalanceSheet(fiscalPeriodId: number) {
        const client = await pool.connect();
        try {
            // Get Period Info
            const periodResult = await client.query('SELECT * FROM fiscal_periods WHERE id = $1', [fiscalPeriodId]);
            if (periodResult.rows.length === 0) throw new Error('Period not found');
            const period = periodResult.rows[0];

            // Query Balance Sheet Accounts
            const result = await client.query(`
                SELECT 
                    ga.account_type,
                    ga.account_group,
                    ga.account_number,
                    ga.account_name,
                    SUM(jeli.debit_amount - jeli.credit_amount) as balance
                FROM journal_entry_line_items jeli
                JOIN journal_entries je ON jeli.journal_entry_id = je.id
                JOIN gl_accounts ga ON jeli.gl_account = ga.account_number -- Fixed join on account_number
                WHERE je.fiscal_year = $1 
                  AND je.fiscal_period <= $2
                  AND je.status = 'POSTED'
                  AND ga.balance_sheet_account = true
                GROUP BY ga.account_type, ga.account_group, ga.account_number, ga.account_name
                HAVING ABS(SUM(jeli.debit_amount - jeli.credit_amount)) > 0.01
                ORDER BY ga.account_type, ga.account_group, ga.account_number
            `, [period.year, period.period]);

            // Organize Data
            const assets = result.rows.filter(r => r.account_type === 'ASSETS' || r.account_type === 'assets');
            const liabilities = result.rows.filter(r => r.account_type === 'LIABILITIES' || r.account_type === 'liabilities');
            const equity = result.rows.filter(r => r.account_type === 'EQUITY' || r.account_type === 'equity');

            const totalAssets = assets.reduce((sum, r) => sum + parseFloat(r.balance), 0);
            const totalLiabilities = liabilities.reduce((sum, r) => sum + parseFloat(r.balance), 0); // Usually credit balance (negative in this calc? No, liability is Credit Normal. Debit-Credit -> Negative).

            // Correction: If Debit-Credit used:
            // Asset: Positive
            // Liability: Negative
            // Equity: Negative

            // Standardize output to positive numbers for display where appropriate, or keep sign.
            // Balance Sheet usually shows signs relative to the section.

            return {
                period: `${period.period}/${period.year}`,
                assets: assets.map(r => ({ ...r, balance: parseFloat(r.balance) })),
                liabilities: liabilities.map(r => ({ ...r, balance: parseFloat(r.balance) })), // Keep sign (negative)
                equity: equity.map(r => ({ ...r, balance: parseFloat(r.balance) })),
                totals: {
                    assets: totalAssets,
                    liabilities: totalLiabilities,
                    equity: equity.reduce((sum, r) => sum + parseFloat(r.balance), 0)
                }
            };
        } finally {
            client.release();
        }
    }

    async getIncomeStatement(fiscalPeriodId: number) {
        const client = await pool.connect();
        try {
            const periodResult = await client.query('SELECT * FROM fiscal_periods WHERE id = $1', [fiscalPeriodId]);
            if (periodResult.rows.length === 0) throw new Error('Period not found');
            const period = periodResult.rows[0];

            const result = await client.query(`
                SELECT 
                    ga.account_type,
                    ga.account_group,
                    ga.account_number,
                    ga.account_name,
                    SUM(jeli.credit_amount - jeli.debit_amount) as balance -- Note: Revenue is Credit Normal (Positive here)
                FROM journal_entry_line_items jeli
                JOIN journal_entries je ON jeli.journal_entry_id = je.id
                JOIN gl_accounts ga ON jeli.gl_account = ga.account_number
                WHERE je.fiscal_year = $1 
                  AND je.fiscal_period <= $2
                  AND je.status = 'POSTED'
                  AND ga.balance_sheet_account = false
                GROUP BY ga.account_type, ga.account_group, ga.account_number, ga.account_name
                HAVING ABS(SUM(jeli.credit_amount - jeli.debit_amount)) > 0.01
                ORDER BY ga.account_type, ga.account_group, ga.account_number
            `, [period.year, period.period]);

            const revenue = result.rows.filter(r => r.account_type === 'REVENUE' || r.account_type === 'revenue');
            const expenses = result.rows.filter(r => r.account_type === 'EXPENSE' || r.account_type === 'expense');

            const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.balance), 0);
            const totalExpense = expenses.reduce((sum, r) => sum + parseFloat(r.balance), 0); // Expense is Debit. Credit-Debit -> Negative.

            // If I want positive expense display:
            // Expense row: -100. Display as 100?
            // Net Income = Revenue + Expense (since Expense is negative in this calc).

            return {
                period: `${period.period}/${period.year}`,
                revenue: revenue.map(r => ({ ...r, balance: parseFloat(r.balance) })),
                expenses: expenses.map(r => ({ ...r, balance: Math.abs(parseFloat(r.balance)) })), // Display positive
                totals: {
                    revenue: totalRevenue,
                    expenses: Math.abs(totalExpense),
                    netIncome: totalRevenue + totalExpense // (Revenue - Expense magnitude)
                }
            };

        } finally {
            client.release();
        }
    }
}

export const financialReportingService = new FinancialReportingService();
