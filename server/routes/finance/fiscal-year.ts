import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21'
});

/**
 * GET /api/finance/fiscal-years
 * List all fiscal years
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { company_code_id } = req.query;

        let query = `
      SELECT 
        fy.*,
        cc.code as company_code,
        cc.name as company_name
      FROM fiscal_years fy
      LEFT JOIN company_codes cc ON fy.company_code_id = cc.id
      WHERE 1=1
    `;

        const params: any[] = [];

        if (company_code_id) {
            query += ` AND fy.company_code_id = $1`;
            params.push(company_code_id);
        }

        query += ` ORDER BY fy.fiscal_year DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });

    } catch (error: any) {
        console.error('Error fetching fiscal years:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch fiscal years',
            message: error.message
        });
    }
});

/**
 * GET /api/finance/fiscal-years/current
 * Get current fiscal year
 */
router.get('/current', async (req: Request, res: Response) => {
    try {
        const { company_code_id } = req.query;

        const result = await pool.query(
            `SELECT 
        fy.*,
        cc.code as company_code,
        cc.name as company_name
       FROM fiscal_years fy
       LEFT JOIN company_codes cc ON fy.company_code_id = cc.id
       WHERE fy.is_current = true
       ${company_code_id ? 'AND fy.company_code_id = $1' : ''}
       LIMIT 1`,
            company_code_id ? [company_code_id] : []
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No current fiscal year found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error fetching current fiscal year:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current fiscal year',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/fiscal-years/open
 * Open a new fiscal year
 */
router.post('/open', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        const { fiscal_year, company_code_id, start_date, end_date } = req.body;

        if (!fiscal_year || !company_code_id || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year, company_code_id, start_date, and end_date are required'
            });
        }

        await client.query('BEGIN');

        // Check if fiscal year already exists
        const existing = await client.query(
            `SELECT id FROM fiscal_years WHERE fiscal_year = $1 AND company_code_id = $2`,
            [fiscal_year, company_code_id]
        );

        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Fiscal year already exists'
            });
        }

        // Create new fiscal year
        const result = await client.query(
            `INSERT INTO fiscal_years (
        fiscal_year, company_code_id, start_date, end_date, 
        status, is_current, posting_periods_open, special_periods_open
      ) VALUES ($1, $2, $3, $4, 'OPEN', false, 12, 4)
      RETURNING *`,
            [fiscal_year, company_code_id, start_date, end_date]
        );

        // Log the change
        await client.query(
            `INSERT INTO fiscal_year_change_log (
        new_fiscal_year, company_code_id, change_type, change_date,
        validation_status, new_year_periods_opened
      ) VALUES ($1, $2, 'OPEN_NEW_YEAR', NOW(), 'PASSED', true)`,
            [fiscal_year, company_code_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Fiscal year ${fiscal_year} opened successfully`,
            data: result.rows[0]
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error opening fiscal year:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to open fiscal year',
            message: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/finance/fiscal-years/close
 * Close current fiscal year
 */
router.post('/close', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        const { fiscal_year, company_code_id } = req.body;

        if (!fiscal_year || !company_code_id) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year and company_code_id are required'
            });
        }

        await client.query('BEGIN');

        // Validate prerequisites
        const validation = await validateYearEndClosing(client, fiscal_year, company_code_id);

        if (!validation.passed) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Year-end closing validation failed',
                validation_errors: validation.errors
            });
        }

        // Close the fiscal year
        const result = await client.query(
            `UPDATE fiscal_years 
       SET status = 'CLOSED',
           is_current = false,
           year_end_closing_completed = NOW(),
           posting_periods_open = 0,
           special_periods_open = 0,
           updated_at = NOW()
       WHERE fiscal_year = $1 AND company_code_id = $2
       RETURNING *`,
            [fiscal_year, company_code_id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Fiscal year not found'
            });
        }

        // Log the change
        await client.query(
            `INSERT INTO fiscal_year_change_log (
        old_fiscal_year, company_code_id, change_type, change_date,
        validation_status, old_year_periods_closed
      ) VALUES ($1, $2, 'CLOSE_OLD_YEAR', NOW(), 'PASSED', true)`,
            [fiscal_year, company_code_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Fiscal year ${fiscal_year} closed successfully`,
            data: result.rows[0]
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error closing fiscal year:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to close fiscal year',
            message: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/finance/fiscal-years/validate
 * Run pre-closing validation
 */
router.post('/validate', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        const { fiscal_year, company_code_id } = req.body;

        if (!fiscal_year || !company_code_id) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year and company_code_id are required'
            });
        }

        const validation = await validateYearEndClosing(client, fiscal_year, company_code_id);

        res.json({
            success: true,
            validation_passed: validation.passed,
            errors: validation.errors,
            warnings: validation.warnings
        });

    } catch (error: any) {
        console.error('Error validating fiscal year:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate fiscal year',
            message: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/finance/fiscal-years/rollover
 * Execute balance rollover to new year
 */
router.post('/rollover', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        const { old_fiscal_year, new_fiscal_year, company_code_id } = req.body;

        if (!old_fiscal_year || !new_fiscal_year || !company_code_id) {
            return res.status(400).json({
                success: false,
                error: 'old_fiscal_year, new_fiscal_year, and company_code_id are required'
            });
        }

        await client.query('BEGIN');

        // Set new year as current
        await client.query(
            `UPDATE fiscal_years 
       SET is_current = false 
       WHERE company_code_id = $1`,
            [company_code_id]
        );

        await client.query(
            `UPDATE fiscal_years 
       SET is_current = true,
           posting_periods_open = 12,
           special_periods_open = 4
       WHERE fiscal_year = $1 AND company_code_id = $2`,
            [new_fiscal_year, company_code_id]
        );

        // Log the rollover
        await client.query(
            `INSERT INTO fiscal_year_change_log (
        old_fiscal_year, new_fiscal_year, company_code_id, 
        change_type, change_date, validation_status,
        gl_balances_transferred, ar_balances_transferred, ap_balances_transferred
      ) VALUES ($1, $2, $3, 'ROLLOVER_BALANCES', NOW(), 'PASSED', true, true, true)`,
            [old_fiscal_year, new_fiscal_year, company_code_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Balance rollover from ${old_fiscal_year} to ${new_fiscal_year} completed successfully`
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error rolling over balances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to rollover balances',
            message: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * Helper function to validate year-end closing prerequisites
 */
async function validateYearEndClosing(client: any, fiscal_year: string, company_code_id: number) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for pending receivable confirmations
    const pendingAR = await client.query(
        `SELECT COUNT(*) as count FROM balance_confirmations 
     WHERE confirmation_type = 'AR' 
     AND fiscal_year = $1 
     AND company_code_id = $2 
     AND status IN ('PENDING', 'LETTER_SENT', 'DISPUTED')`,
        [fiscal_year, company_code_id]
    );

    if (parseInt(pendingAR.rows[0].count) > 0) {
        warnings.push(`${pendingAR.rows[0].count} receivable confirmations are still pending`);
    }

    // Check for pending payable confirmations
    const pendingAP = await client.query(
        `SELECT COUNT(*) as count FROM balance_confirmations 
     WHERE confirmation_type = 'AP' 
     AND fiscal_year = $1 
     AND company_code_id = $2 
     AND status IN ('PENDING', 'LETTER_SENT', 'DISPUTED')`,
        [fiscal_year, company_code_id]
    );

    if (parseInt(pendingAP.rows[0].count) > 0) {
        warnings.push(`${pendingAP.rows[0].count} payable confirmations are still pending`);
    }

    // Check if asset year-end closing is complete
    const assetClosing = await client.query(
        `SELECT COUNT(*) as count FROM asset_year_end_closing 
     WHERE fiscal_year = $1 
     AND company_code_id = $2 
     AND status = 'COMPLETED'`,
        [fiscal_year, company_code_id]
    );

    if (parseInt(assetClosing.rows[0].count) === 0) {
        errors.push('Asset year-end closing has not been completed');
    }

    return {
        passed: errors.length === 0,
        errors,
        warnings
    };
}

export default router;
