import { Router } from 'express';
import { dbPool as pool } from '../../database.js';

const router = Router();

// Get all closing documents
router.get('/', async (req, res) => {
    try {
        const { periodClosingId, fiscalPeriodId, documentType } = req.query;

        let query = `
      SELECT 
        pcd.*,
        fp.name as period_name,
        fp.year,
        fp.period,
        cc.code as company_code,
        cc.name as company_name
      FROM period_closing_documents pcd
      LEFT JOIN fiscal_periods fp ON pcd.fiscal_period_id = fp.id
      LEFT JOIN company_codes cc ON pcd.company_code_id = cc.id
      WHERE 1=1
    `;
        const params: any[] = [];
        let paramCount = 0;

        if (periodClosingId) {
            paramCount++;
            query += ` AND pcd.period_closing_id = $${paramCount}`;
            params.push(periodClosingId);
        }

        if (fiscalPeriodId) {
            paramCount++;
            query += ` AND pcd.fiscal_period_id = $${paramCount}`;
            params.push(fiscalPeriodId);
        }

        if (documentType) {
            paramCount++;
            query += ` AND pcd.document_type = $${paramCount}`;
            params.push(documentType);
        }

        query += ' ORDER BY pcd.generated_at DESC';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Error fetching closing documents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch closing documents',
            message: error.message
        });
    }
});

// Generate closing checklist
async function generateChecklist(fiscalPeriodId: number, companyCodeId: number | null) {
    const period = await pool.query(
        `SELECT * FROM fiscal_periods WHERE id = $1`,
        [fiscalPeriodId]
    );

    if (period.rows.length === 0) {
        throw new Error('Fiscal period not found');
    }

    const p = period.rows[0];

    // Get closing record if exists
    const closing = await pool.query(
        `SELECT * FROM period_end_closing 
     WHERE fiscal_period_id = $1 
     ${companyCodeId ? 'AND company_code_id = $2' : ''}
     ORDER BY created_at DESC LIMIT 1`,
        companyCodeId ? [fiscalPeriodId, companyCodeId] : [fiscalPeriodId]
    );

    // Check various closing activities
    const accruals = await pool.query(
        `SELECT COUNT(*) as count FROM accrual_postings 
     WHERE fiscal_period_id = $1`,
        [fiscalPeriodId]
    );

    const taxProvisions = await pool.query(
        `SELECT COUNT(*) as count FROM tax_provisions 
     WHERE fiscal_period_id = $1`,
        [fiscalPeriodId]
    );

    const balanceCarryForward = await pool.query(
        `SELECT * FROM journal_entries 
     WHERE fiscal_period_id = $1 
     AND description ILIKE '%balance carry forward%'
     LIMIT 1`,
        [fiscalPeriodId]
    );

    const checklist = {
        periodInfo: {
            period: p.period,
            year: p.year,
            name: p.name,
            status: p.status
        },
        items: [
            {
                step: 1,
                name: 'Period Validation',
                description: 'Validate all journal entries are balanced',
                status: closing.rows.length > 0 && closing.rows[0].status === 'completed' ? 'completed' : 'pending',
                completedAt: closing.rows[0]?.completed_at || null,
                completedBy: closing.rows[0]?.created_by || null
            },
            {
                step: 2,
                name: 'Accrual Postings',
                description: 'Post period-end accruals',
                status: parseInt(accruals.rows[0].count) > 0 ? 'completed' : 'pending',
                completedAt: null,
                completedBy: null
            },
            {
                step: 3,
                name: 'Tax Provisions',
                description: 'Calculate and post tax provisions',
                status: parseInt(taxProvisions.rows[0].count) > 0 ? 'completed' : 'pending',
                completedAt: null,
                completedBy: null
            },
            {
                step: 4,
                name: 'Balance Carry Forward',
                description: 'Close P&L accounts and carry forward balances',
                status: balanceCarryForward.rows.length > 0 ? 'completed' : 'pending',
                completedAt: balanceCarryForward.rows[0]?.posting_date || null,
                completedBy: balanceCarryForward.rows[0]?.created_by || null
            },
            {
                step: 5,
                name: 'Period Lock',
                description: 'Lock period for posting',
                status: p.status === 'Closed' ? 'completed' : 'pending',
                completedAt: p.updated_at,
                completedBy: null
            }
        ],
        summary: {
            totalSteps: 5,
            completedSteps: 0,
            pendingSteps: 0,
            completionPercentage: 0
        }
    };

    // Calculate summary
    checklist.summary.completedSteps = checklist.items.filter(i => i.status === 'completed').length;
    checklist.summary.pendingSteps = checklist.items.filter(i => i.status === 'pending').length;
    checklist.summary.completionPercentage = Math.round((checklist.summary.completedSteps / checklist.summary.totalSteps) * 100);

    return checklist;
}

// Generate period summary report
async function generateSummary(fiscalPeriodId: number, companyCodeId: number | null) {
    const period = await pool.query(
        `SELECT * FROM fiscal_periods WHERE id = $1`,
        [fiscalPeriodId]
    );

    if (period.rows.length === 0) {
        throw new Error('Fiscal period not found');
    }

    const p = period.rows[0];

    // Get P&L accounts
    const plAccounts = await pool.query(`
    SELECT 
      ga.account_number,
      ga.account_name,
      ga.account_type,
      COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0) as balance
    FROM gl_accounts ga
    LEFT JOIN journal_entry_line_items jeli ON jeli.gl_account = ga.account_number
    LEFT JOIN journal_entries je ON jeli.journal_entry_id = je.id 
      AND je.fiscal_year = $1 
      AND je.fiscal_period <= $2
      AND je.status = 'POSTED'
    WHERE ga.balance_sheet_account = false
    ${companyCodeId ? 'AND ga.company_code_id = $3' : ''}
    GROUP BY ga.account_number, ga.account_name, ga.account_type
    HAVING ABS(COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0)) > 0.01
    ORDER BY ga.account_number
  `, companyCodeId ? [p.year, p.period, companyCodeId] : [p.year, p.period]);

    // Get BS accounts
    const bsAccounts = await pool.query(`
    SELECT 
      ga.account_number,
      ga.account_name,
      ga.account_type,
      COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0) as balance
    FROM gl_accounts ga
    LEFT JOIN journal_entry_line_items jeli ON jeli.gl_account = ga.account_number
    LEFT JOIN journal_entries je ON jeli.journal_entry_id = je.id 
      AND je.fiscal_year = $1 
      AND je.fiscal_period <= $2
      AND je.status = 'POSTED'
    WHERE ga.balance_sheet_account = true
    ${companyCodeId ? 'AND ga.company_code_id = $3' : ''}
    GROUP BY ga.account_number, ga.account_name, ga.account_type
    HAVING ABS(COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0)) > 0.01
    ORDER BY ga.account_number
  `, companyCodeId ? [p.year, p.period, companyCodeId] : [p.year, p.period]);

    // Calculate totals
    let revenue = 0, expenses = 0, assets = 0, liabilities = 0, equity = 0;

    plAccounts.rows.forEach(acc => {
        const balance = parseFloat(acc.balance);
        if (acc.account_type?.toUpperCase().includes('REVENUE')) {
            revenue += Math.abs(balance);
        } else {
            expenses += Math.abs(balance);
        }
    });

    bsAccounts.rows.forEach(acc => {
        const balance = parseFloat(acc.balance);
        const type = acc.account_type?.toUpperCase();
        if (type?.includes('ASSET')) {
            assets += balance;
        } else if (type?.includes('LIABILITY')) {
            liabilities += Math.abs(balance);
        } else if (type?.includes('EQUITY')) {
            equity += Math.abs(balance);
        }
    });

    const netIncome = revenue - expenses;

    return {
        periodInfo: {
            period: p.period,
            year: p.year,
            name: p.name,
            startDate: p.start_date,
            endDate: p.end_date
        },
        profitLoss: {
            revenue: revenue.toFixed(2),
            expenses: expenses.toFixed(2),
            netIncome: netIncome.toFixed(2),
            accounts: plAccounts.rows.map(r => ({
                accountNumber: r.account_number,
                accountName: r.account_name,
                accountType: r.account_type,
                balance: parseFloat(r.balance).toFixed(2)
            }))
        },
        balanceSheet: {
            assets: assets.toFixed(2),
            liabilities: liabilities.toFixed(2),
            equity: equity.toFixed(2),
            totalLiabilitiesEquity: (liabilities + equity).toFixed(2),
            accounts: bsAccounts.rows.map(r => ({
                accountNumber: r.account_number,
                accountName: r.account_name,
                accountType: r.account_type,
                balance: parseFloat(r.balance).toFixed(2)
            }))
        }
    };
}

// Generate audit trail
async function generateAuditTrail(fiscalPeriodId: number, companyCodeId: number | null) {
    const period = await pool.query(
        `SELECT * FROM fiscal_periods WHERE id = $1`,
        [fiscalPeriodId]
    );

    if (period.rows.length === 0) {
        throw new Error('Fiscal period not found');
    }

    const p = period.rows[0];

    // Get period status changes from audit log
    const statusChanges = await pool.query(`
    SELECT * FROM period_audit_log 
    WHERE fiscal_period_id = $1 
    ORDER BY changed_at DESC
  `, [fiscalPeriodId]);

    // Get closing activities
    const closingActivities = await pool.query(`
    SELECT * FROM period_end_closing 
    WHERE fiscal_period_id = $1 
    ORDER BY created_at DESC
  `, [fiscalPeriodId]);

    // Get validation runs
    const validationRuns = await pool.query(`
    SELECT * FROM daily_validation_runs 
    WHERE fiscal_period_id = $1 
    ORDER BY run_date DESC
  `, [fiscalPeriodId]);

    return {
        periodInfo: {
            period: p.period,
            year: p.year,
            name: p.name
        },
        activities: {
            statusChanges: statusChanges.rows,
            closingActivities: closingActivities.rows,
            validationRuns: validationRuns.rows
        }
    };
}

// Generate GL balances report
async function generateGLBalances(fiscalPeriodId: number, companyCodeId: number | null) {
    const period = await pool.query(
        `SELECT * FROM fiscal_periods WHERE id = $1`,
        [fiscalPeriodId]
    );

    if (period.rows.length === 0) {
        throw new Error('Fiscal period not found');
    }

    const p = period.rows[0];

    const balances = await pool.query(`
    SELECT 
      ga.account_number,
      ga.account_name,
      ga.account_type,
      ga.balance_sheet_account,
      COALESCE(SUM(jeli.debit_amount), 0) as total_debits,
      COALESCE(SUM(jeli.credit_amount), 0) as total_credits,
      COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0) as balance
    FROM gl_accounts ga
    LEFT JOIN journal_entry_line_items jeli ON jeli.gl_account = ga.account_number
    LEFT JOIN journal_entries je ON jeli.journal_entry_id = je.id 
      AND je.fiscal_year = $1 
      AND je.fiscal_period <= $2
      AND je.status = 'POSTED'
    WHERE 1=1
    ${companyCodeId ? 'AND ga.company_code_id = $3' : ''}
    GROUP BY ga.account_number, ga.account_name, ga.account_type, ga.balance_sheet_account
    ORDER BY ga.account_number
  `, companyCodeId ? [p.year, p.period, companyCodeId] : [p.year, p.period]);

    return {
        periodInfo: {
            period: p.period,
            year: p.year,
            name: p.name,
            asOfDate: p.end_date
        },
        accounts: balances.rows.map(r => ({
            accountNumber: r.account_number,
            accountName: r.account_name,
            accountType: r.account_type,
            isBalanceSheet: r.balance_sheet_account,
            totalDebits: parseFloat(r.total_debits).toFixed(2),
            totalCredits: parseFloat(r.total_credits).toFixed(2),
            balance: parseFloat(r.balance).toFixed(2)
        }))
    };
}

// Generate document
router.post('/generate', async (req, res) => {
    try {
        const { periodClosingId, fiscalPeriodId, companyCodeId, documentType, userId } = req.body;

        if (!fiscalPeriodId || !documentType) {
            return res.status(400).json({
                success: false,
                error: 'fiscalPeriodId and documentType are required'
            });
        }

        let documentData;
        let documentName;

        switch (documentType) {
            case 'checklist':
                documentData = await generateChecklist(fiscalPeriodId, companyCodeId || null);
                documentName = `Period Closing Checklist - Period ${documentData.periodInfo.period}/${documentData.periodInfo.year}`;
                break;
            case 'summary':
                documentData = await generateSummary(fiscalPeriodId, companyCodeId || null);
                documentName = `Period Summary Report - Period ${documentData.periodInfo.period}/${documentData.periodInfo.year}`;
                break;
            case 'audit_trail':
                documentData = await generateAuditTrail(fiscalPeriodId, companyCodeId || null);
                documentName = `Audit Trail - Period ${documentData.periodInfo.period}/${documentData.periodInfo.year}`;
                break;
            case 'gl_balances':
                documentData = await generateGLBalances(fiscalPeriodId, companyCodeId || null);
                documentName = `GL Account Balances - Period ${documentData.periodInfo.period}/${documentData.periodInfo.year}`;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid document type'
                });
        }

        // Save document
        const result = await pool.query(`
      INSERT INTO period_closing_documents (
        period_closing_id, fiscal_period_id, company_code_id,
        document_type, document_name, document_data,
        generated_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'final')
      RETURNING *
    `, [
            periodClosingId || null,
            fiscalPeriodId,
            companyCodeId || null,
            documentType,
            documentName,
            JSON.stringify(documentData),
            userId || 'system'
        ]);

        res.json({
            success: true,
            message: 'Document generated successfully',
            data: {
                id: result.rows[0].id,
                documentName,
                documentType,
                generatedAt: result.rows[0].generated_at,
                documentData
            }
        });
    } catch (error: any) {
        console.error('Error generating document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate document',
            message: error.message
        });
    }
});

// Get document by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT * FROM period_closing_documents WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error fetching document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch document',
            message: error.message
        });
    }
});

export default router;
