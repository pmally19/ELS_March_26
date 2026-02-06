import { Router } from 'express';
import { dbPool as pool } from '../../database.js';

const router = Router();

// Get validation summary for a fiscal period
router.get('/summary', async (req, res) => {
    try {
        const { fiscalPeriodId, companyCodeId } = req.query;

        if (!fiscalPeriodId) {
            return res.status(400).json({
                success: false,
                error: 'fiscalPeriodId is required'
            });
        }

        // Get period details
        const periodResult = await pool.query(
            `SELECT * FROM fiscal_periods WHERE id = $1`,
            [fiscalPeriodId]
        );

        if (periodResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Fiscal period not found'
            });
        }

        const period = periodResult.rows[0];

        // Get company code if provided
        let companyCode = null;
        if (companyCodeId) {
            const companyResult = await pool.query(
                `SELECT code FROM company_codes WHERE id = $1`,
                [companyCodeId]
            );
            companyCode = companyResult.rows[0]?.code;
        }

        // Check both gl_entries and accounting_documents tables
        // GL Entries validation
        const glEntriesStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT ge.document_number) as total_documents,
        COUNT(*) as total_line_items,
        COALESCE(SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN ge.debit_credit_indicator = 'C' THEN ge.amount::numeric ELSE 0 END), 0) as total_credits
      FROM gl_entries ge
      INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.fiscal_year = $1 
      AND ge.fiscal_period = $2
      AND ge.posting_status ILIKE 'posted'
      ${companyCodeId ? 'AND ga.company_code_id = $3' : ''}
    `, companyCodeId ? [period.year, period.period, companyCodeId] : [period.year, period.period]);

        // Accounting Documents stats
        const adStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT ad.document_number) as total_documents,
        COUNT(adi.id) as total_line_items,
        COALESCE(SUM(adi.debit_amount::numeric), 0) as total_debits,
        COALESCE(SUM(adi.credit_amount::numeric), 0) as total_credits
      FROM accounting_documents ad
      LEFT JOIN accounting_document_items adi ON ad.id = adi.document_id
      WHERE ad.fiscal_year = $1 
      AND ad.period = $2
      AND ad.status ILIKE 'posted'
      ${companyCode ? 'AND ad.company_code = $3' : ''}
    `, companyCode ? [period.year, period.period, companyCode] : [period.year, period.period]);

        // Find unbalanced entries in GL
        const unbalancedGL = await pool.query(`
      SELECT 
        ge.document_number,
        SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END) as balance
      FROM gl_entries ge
      INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.fiscal_year = $1 
      AND ge.fiscal_period = $2
      AND ge.posting_status ILIKE 'posted'
      ${companyCodeId ? 'AND ga.company_code_id = $3' : ''}
      GROUP BY ge.document_number
      HAVING ABS(SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END)) > 0.01
    `, companyCodeId ? [period.year, period.period, companyCodeId] : [period.year, period.period]);

        // Find unbalanced entries in Accounting Documents
        const unbalancedAD = await pool.query(`
      SELECT 
        ad.document_number,
        SUM(adi.debit_amount::numeric - adi.credit_amount::numeric) as balance
      FROM accounting_documents ad
      INNER JOIN accounting_document_items adi ON ad.id = adi.document_id
      WHERE ad.fiscal_year = $1 
      AND ad.period = $2
      AND ad.status ILIKE 'posted'
      ${companyCode ? 'AND ad.company_code = $3' : ''}
      GROUP BY ad.document_number
      HAVING ABS(SUM(adi.debit_amount::numeric - adi.credit_amount::numeric)) > 0.01
    `, companyCode ? [period.year, period.period, companyCode] : [period.year, period.period]);

        const totalDocuments = parseInt(glEntriesStats.rows[0]?.total_documents || '0') +
            parseInt(adStats.rows[0]?.total_documents || '0');
        const totalDebits = parseFloat(glEntriesStats.rows[0]?.total_debits || '0') +
            parseFloat(adStats.rows[0]?.total_debits || '0');
        const totalCredits = parseFloat(glEntriesStats.rows[0]?.total_credits || '0') +
            parseFloat(adStats.rows[0]?.total_credits || '0');
        const unbalancedCount = unbalancedGL.rows.length + unbalancedAD.rows.length;
        const balancedCount = totalDocuments - unbalancedCount;

        res.json({
            success: true,
            data: {
                period: {
                    id: period.id,
                    year: period.year,
                    period: period.period,
                    name: period.name
                },
                summary: {
                    totalEntries: totalDocuments,
                    balancedEntries: balancedCount,
                    unbalancedEntries: unbalancedCount,
                    totalDebits: totalDebits.toFixed(2),
                    totalCredits: totalCredits.toFixed(2),
                    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
                    validationStatus: unbalancedCount === 0 ? 'passed' : 'failed'
                }
            }
        });
    } catch (error: any) {
        console.error('Error fetching validation summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch validation summary',
            message: error.message
        });
    }
});

// Get unbalanced entries
router.get('/unbalanced-entries', async (req, res) => {
    try {
        const { fiscalPeriodId, companyCodeId } = req.query;

        if (!fiscalPeriodId) {
            return res.status(400).json({
                success: false,
                error: 'fiscalPeriodId is required'
            });
        }

        const periodResult = await pool.query(
            `SELECT * FROM fiscal_periods WHERE id = $1`,
            [fiscalPeriodId]
        );

        if (periodResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Fiscal period not found'
            });
        }

        const period = periodResult.rows[0];

        let companyCode = null;
        if (companyCodeId) {
            const companyResult = await pool.query(
                `SELECT code FROM company_codes WHERE id = $1`,
                [companyCodeId]
            );
            companyCode = companyResult.rows[0]?.code;
        }

        // Get unbalanced GL entries with details
        const unbalancedGL = await pool.query(`
      SELECT 
        ge.document_number,
        MIN(ge.posting_date) as posting_date,
        MIN(ge.document_type) as document_type,
        SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE 0 END) as total_debit,
        SUM(CASE WHEN ge.debit_credit_indicator = 'C' THEN ge.amount::numeric ELSE 0 END) as total_credit,
        SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END) as balance,
        'gl_entries' as source
      FROM gl_entries ge
      INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.fiscal_year = $1 
      AND ge.fiscal_period = $2
      AND ge.posting_status ILIKE 'posted'
      ${companyCodeId ? 'AND ga.company_code_id = $3' : ''}
      GROUP BY ge.document_number
      HAVING ABS(SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END)) > 0.01
      ORDER BY ge.document_number
    `, companyCodeId ? [period.year, period.period, companyCodeId] : [period.year, period.period]);

        // Get unbalanced accounting documents
        const unbalancedAD = await pool.query(`
      SELECT 
        ad.document_number,
        ad.posting_date,
        ad.document_type,
        SUM(adi.debit_amount::numeric) as total_debit,
        SUM(adi.credit_amount::numeric) as total_credit,
        SUM(adi.debit_amount::numeric - adi.credit_amount::numeric) as balance,
        'accounting_documents' as source
      FROM accounting_documents ad
      INNER JOIN accounting_document_items adi ON ad.id = adi.document_id
      WHERE ad.fiscal_year = $1 
      AND ad.period = $2
      AND ad.status ILIKE 'posted'
      ${companyCode ? 'AND ad.company_code = $3' : ''}
      GROUP BY ad.id, ad.document_number, ad.posting_date, ad.document_type
      HAVING ABS(SUM(adi.debit_amount::numeric - adi.credit_amount::numeric)) > 0.01
      ORDER BY ad.document_number
    `, companyCode ? [period.year, period.period, companyCode] : [period.year, period.period]);

        const allUnbalanced = [...unbalancedGL.rows, ...unbalancedAD.rows].map(row => ({
            documentNumber: row.document_number,
            postingDate: row.posting_date,
            documentType: row.document_type,
            totalDebit: parseFloat(row.total_debit || '0').toFixed(2),
            totalCredit: parseFloat(row.total_credit || '0').toFixed(2),
            balance: parseFloat(row.balance || '0').toFixed(2),
            source: row.source
        }));

        res.json({
            success: true,
            data: allUnbalanced
        });
    } catch (error: any) {
        console.error('Error fetching unbalanced entries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch unbalanced entries',
            message: error.message
        });
    }
});

// Get account balances
router.get('/account-balances', async (req, res) => {
    try {
        const { fiscalPeriodId, companyCodeId, accountType } = req.query;

        if (!fiscalPeriodId) {
            return res.status(400).json({
                success: false,
                error: 'fiscalPeriodId is required'
            });
        }

        const periodResult = await pool.query(
            `SELECT * FROM fiscal_periods WHERE id = $1`,
            [fiscalPeriodId]
        );

        if (periodResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Fiscal period not found'
            });
        }

        const period = periodResult.rows[0];

        // Get GL account balances from journal entries
        let query = `
      SELECT 
        ga.id,
        ga.account_number,
        ga.account_name,
        ga.account_type,
        ga.balance_sheet_account,
        COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_line_items jeli ON jeli.gl_account = ga.account_number
      LEFT JOIN journal_entries je ON jeli.journal_entry_id = je.id 
        AND je.fiscal_year = $1 
        AND je.fiscal_period <= $2
        AND je.status = 'POSTED'
      WHERE 1=1
    `;
        const params: any[] = [period.year, period.period];
        let paramCount = 2;

        if (companyCodeId) {
            paramCount++;
            query += ` AND ga.company_code_id = $${paramCount}`;
            params.push(companyCodeId);
        }

        if (accountType) {
            paramCount++;
            query += ` AND UPPER(ga.account_type) = UPPER($${paramCount})`;
            params.push(accountType);
        }

        query += `
      GROUP BY ga.id, ga.account_number, ga.account_name, ga.account_type, ga.balance_sheet_account
      HAVING ABS(COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0)) > 0.01
      ORDER BY ga.account_number
    `;

        const result = await pool.query(query, params);

        const balances = result.rows.map(row => ({
            accountNumber: row.account_number,
            accountName: row.account_name,
            accountType: row.account_type,
            isBalanceSheet: row.balance_sheet_account,
            balance: parseFloat(row.balance || '0').toFixed(2)
        }));

        res.json({
            success: true,
            data: balances
        });
    } catch (error: any) {
        console.error('Error fetching account balances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch account balances',
            message: error.message
        });
    }
});

// Run validation and save results
router.post('/run', async (req, res) => {
    try {
        const { fiscalPeriodId, companyCodeId, userId } = req.body;

        if (!fiscalPeriodId) {
            return res.status(400).json({
                success: false,
                error: 'fiscalPeriodId is required'
            });
        }

        // Get summary data
        const summaryResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/finance/daily-validation/summary?fiscalPeriodId=${fiscalPeriodId}${companyCodeId ? `&companyCodeId=${companyCodeId}` : ''}`);
        const summaryData = await summaryResponse.json();

        if (!summaryData.success) {
            throw new Error('Failed to get validation summary');
        }

        const summary = summaryData.data.summary;

        // Save validation run
        const result = await pool.query(`
      INSERT INTO daily_validation_runs (
        fiscal_period_id, company_code_id, total_entries,
        balanced_entries, unbalanced_entries, total_debits,
        total_credits, validation_status, executed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
            fiscalPeriodId,
            companyCodeId || null,
            summary.totalEntries,
            summary.balancedEntries,
            summary.unbalancedEntries,
            summary.totalDebits,
            summary.totalCredits,
            summary.validationStatus,
            userId || 'system'
        ]);

        res.json({
            success: true,
            message: 'Validation completed',
            data: {
                runId: result.rows[0].id,
                summary
            }
        });
    } catch (error: any) {
        console.error('Error running validation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run validation',
            message: error.message
        });
    }
});

export default router;
