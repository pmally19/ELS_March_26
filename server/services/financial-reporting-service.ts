import { dbPool as pool } from '../database.js';

export interface FinancialReportLine {
    accountType: string;
    accountGroup: string;
    accountNumber: string;
    accountName: string;
    balance: number;
}

export class FinancialReportingService {

    /**
     * Balance Sheet — correct SAP-standard accounting equation:
     *   Assets = Liabilities + Equity
     *   Equity = Share Capital + Retained Earnings + Current Year Net Income
     *
     * Reads from gl_entries (MIRO/GR postings) AND journal_entry_line_items (manual JEs).
     */
    async getBalanceSheet(fiscalPeriodId: number) {
        const client = await pool.connect();
        try {
            const periodResult = await client.query(
                'SELECT * FROM fiscal_periods WHERE id = $1',
                [fiscalPeriodId]
            );
            if (periodResult.rows.length === 0) throw new Error('Period not found');
            const period = periodResult.rows[0];

            // ── 1. Balance Sheet accounts (Assets / Liabilities / Equity) ─────────
            // Primary source: gl_entries (GR, MIRO, payment postings)
            const glBsResult = await client.query(`
                SELECT
                    ga.account_type,
                    ga.account_group,
                    ga.account_number,
                    ga.account_name,
                    SUM(
                        CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount
                             ELSE -ge.amount END
                    ) AS balance
                FROM gl_entries ge
                JOIN gl_accounts ga ON ge.gl_account_id = ga.id
                WHERE EXTRACT(YEAR  FROM ge.posting_date) = $1
                  AND EXTRACT(MONTH FROM ge.posting_date) <= $2
                  AND ge.posting_status = 'posted'
                  AND ga.account_type ILIKE ANY(ARRAY['%asset%','%liabilit%','%equity%'])
                GROUP BY ga.account_type, ga.account_group, ga.account_number, ga.account_name
                HAVING ABS(SUM(CASE WHEN ge.debit_credit_indicator = 'D'
                                    THEN ge.amount ELSE -ge.amount END)) > 0.01
                ORDER BY ga.account_type, ga.account_number
            `, [period.year, period.period]);

            // Secondary source: journal_entry_line_items (manual journal entries)
            const jeBsResult = await client.query(`
                SELECT
                    ga.account_type,
                    ga.account_group,
                    ga.account_number,
                    ga.account_name,
                    SUM(jeli.debit_amount - jeli.credit_amount) AS balance
                FROM journal_entry_line_items jeli
                JOIN journal_entries je ON jeli.journal_entry_id = je.id
                JOIN gl_accounts ga ON jeli.gl_account = ga.account_number
                WHERE je.fiscal_year = $1
                  AND je.fiscal_period <= $2
                  AND je.status = 'POSTED'
                  AND ga.account_type ILIKE ANY(ARRAY['%asset%','%liabilit%','%equity%'])
                GROUP BY ga.account_type, ga.account_group, ga.account_number, ga.account_name
                HAVING ABS(SUM(jeli.debit_amount - jeli.credit_amount)) > 0.01
            `, [period.year, period.period]).catch(() => ({ rows: [] }));

            // Merge: gl_entries is primary; add JE rows not already in gl_entries
            const allBsRows = [...glBsResult.rows];
            const covered = new Set(glBsResult.rows.map((r: any) => r.account_number));
            jeBsResult.rows.forEach((r: any) => {
                if (!covered.has(r.account_number)) allBsRows.push(r);
            });

            const assets = allBsRows.filter(r => r.account_type?.toLowerCase().includes('asset'));
            const liabilities = allBsRows.filter(r => r.account_type?.toLowerCase().includes('liabilit'));
            const equityAccts = allBsRows.filter(r => r.account_type?.toLowerCase().includes('equity'));

            const totalAssets = assets.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
            const totalLiabilities = Math.abs(liabilities.reduce((s, r) => s + parseFloat(r.balance || 0), 0));
            const totalEquityAccts = Math.abs(equityAccts.reduce((s, r) => s + parseFloat(r.balance || 0), 0));

            // ── 2. Current Year Net Income from P&L accounts ──────────────────────
            // Revenue = Credit normal → positive when credit amount is larger
            // Expense = Debit normal  → positive when debit amount is larger
            // Net Income = Revenue − Expenses (negative = loss)
            const plResult = await client.query(`
                SELECT
                    SUM(
                        CASE WHEN ge.debit_credit_indicator = 'C' THEN  ge.amount
                             ELSE                                       -ge.amount END
                    ) AS net_income
                FROM gl_entries ge
                JOIN gl_accounts ga ON ge.gl_account_id = ga.id
                WHERE EXTRACT(YEAR  FROM ge.posting_date) = $1
                  AND EXTRACT(MONTH FROM ge.posting_date) <= $2
                  AND ge.posting_status = 'posted'
                  AND ga.account_type ILIKE ANY(ARRAY['%revenue%','%income%','%expense%','%cost%'])
            `, [period.year, period.period]).catch(() => ({ rows: [{ net_income: 0 }] }));

            const currentYearNetIncome = parseFloat(plResult.rows[0]?.net_income || 0);

            // ── 3. Equity = permanent equity accounts + Current Year Net Income ────
            // Accounting Equation: Assets = Liabilities + Equity  ✅
            const totalEquity = totalEquityAccts + currentYearNetIncome;

            return {
                period: `${period.period}/${period.year}`,
                assets: assets.map(r => ({ ...r, balance: parseFloat(r.balance) })),
                liabilities: liabilities.map(r => ({ ...r, balance: Math.abs(parseFloat(r.balance)) })),
                equity: [
                    ...equityAccts.map(r => ({ ...r, balance: Math.abs(parseFloat(r.balance)) })),
                    {
                        accountType: 'EQUITY',
                        accountGroup: 'RETAINED_EARNINGS',
                        accountNumber: 'NET-INCOME',
                        accountName: 'Current Year Net Income / (Loss)',
                        balance: currentYearNetIncome
                    }
                ],
                totals: {
                    assets: totalAssets,
                    liabilities: totalLiabilities,
                    equity: totalEquity,
                    currentYearNetIncome,
                    // Audit check: true means the BS balances
                    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
                }
            };

        } finally {
            client.release();
        }
    }

    /**
     * Income Statement (P&L)
     * Net Income = Revenue − Expenses
     * This net income feeds into Balance Sheet equity.
     */
    async getIncomeStatement(fiscalPeriodId: number) {
        const client = await pool.connect();
        try {
            const periodResult = await client.query(
                'SELECT * FROM fiscal_periods WHERE id = $1',
                [fiscalPeriodId]
            );
            if (periodResult.rows.length === 0) throw new Error('Period not found');
            const period = periodResult.rows[0];

            // Primary: gl_entries (MIRO/GR postings)
            const glResult = await client.query(`
                SELECT
                    ga.account_type,
                    ga.account_group,
                    ga.account_number,
                    ga.account_name,
                    SUM(
                        CASE WHEN ge.debit_credit_indicator = 'C' THEN  ge.amount
                             ELSE                                       -ge.amount END
                    ) AS balance
                FROM gl_entries ge
                JOIN gl_accounts ga ON ge.gl_account_id = ga.id
                WHERE EXTRACT(YEAR  FROM ge.posting_date) = $1
                  AND EXTRACT(MONTH FROM ge.posting_date) <= $2
                  AND ge.posting_status = 'posted'
                  AND ga.account_type ILIKE ANY(ARRAY['%revenue%','%income%','%expense%','%cost%'])
                GROUP BY ga.account_type, ga.account_group, ga.account_number, ga.account_name
                HAVING ABS(SUM(CASE WHEN ge.debit_credit_indicator = 'C'
                                    THEN ge.amount ELSE -ge.amount END)) > 0.01
                ORDER BY ga.account_type, ga.account_number
            `, [period.year, period.period]);

            // Secondary: journal_entry_line_items (manual JEs)
            const jeResult = await client.query(`
                SELECT
                    ga.account_type,
                    ga.account_group,
                    ga.account_number,
                    ga.account_name,
                    SUM(jeli.credit_amount - jeli.debit_amount) AS balance
                FROM journal_entry_line_items jeli
                JOIN journal_entries je ON jeli.journal_entry_id = je.id
                JOIN gl_accounts ga ON jeli.gl_account = ga.account_number
                WHERE je.fiscal_year = $1
                  AND je.fiscal_period <= $2
                  AND je.status = 'POSTED'
                  AND ga.balance_sheet_account = false
                GROUP BY ga.account_type, ga.account_group, ga.account_number, ga.account_name
                HAVING ABS(SUM(jeli.credit_amount - jeli.debit_amount)) > 0.01
            `, [period.year, period.period]).catch(() => ({ rows: [] }));

            const allRows = [...glResult.rows];
            const covered = new Set(glResult.rows.map((r: any) => r.account_number));
            jeResult.rows.forEach((r: any) => {
                if (!covered.has(r.account_number)) allRows.push(r);
            });

            const revenue = allRows.filter(r =>
                r.account_type?.toLowerCase().includes('revenue') ||
                r.account_type?.toLowerCase().includes('income')
            );
            const expenses = allRows.filter(r =>
                r.account_type?.toLowerCase().includes('expense') ||
                r.account_type?.toLowerCase().includes('cost')
            );

            const totalRevenue = revenue.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
            const totalExpense = expenses.reduce((s, r) => s + Math.abs(parseFloat(r.balance || 0)), 0);
            const netIncome = totalRevenue - totalExpense;

            return {
                period: `${period.period}/${period.year}`,
                revenue: revenue.map(r => ({ ...r, balance: parseFloat(r.balance) })),
                expenses: expenses.map(r => ({ ...r, balance: Math.abs(parseFloat(r.balance)) })),
                totals: {
                    revenue: totalRevenue,
                    expenses: totalExpense,
                    netIncome
                }
            };

        } finally {
            client.release();
        }
    }
}

export const financialReportingService = new FinancialReportingService();
