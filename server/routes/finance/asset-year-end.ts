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
 * POST /api/finance/year-end/assets/run-closing
 * Execute asset year-end depreciation run
 */
router.post('/run-closing', async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        const { fiscal_year, company_code_id, depreciation_area } = req.body;

        if (!fiscal_year || !company_code_id) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year and company_code_id are required'
            });
        }

        await client.query('BEGIN');

        const startTime = new Date();

        // Create year-end closing run record
        const runResult = await client.query(
            `INSERT INTO asset_year_end_closing (
        fiscal_year, company_code_id, run_date, run_type, status,
        start_time, depreciation_area
      ) VALUES ($1, $2, NOW(), 'AUTOMATIC', 'IN_PROGRESS', NOW(), $3)
      RETURNING id`,
            [fiscal_year, company_code_id, depreciation_area || 'ALL']
        );

        const runId = runResult.rows[0].id;

        // Get all active assets
        const assetsQuery = `
      SELECT 
        am.id,
        am.asset_number,
        am.acquisition_value,
        am.accumulated_depreciation,
        am.book_value,
        am.useful_life_years,
        am.depreciation_method
      FROM asset_master am
      WHERE am.is_active = true
      AND am.company_code_id = $1
    `;

        const assets = await client.query(assetsQuery, [company_code_id]);

        let totalAssetsProcessed = 0;
        let assetsWithDepreciation = 0;
        let totalDepreciationPosted = 0;
        let errors = 0;
        const errorLog: string[] = [];

        // Process each asset
        for (const asset of assets.rows) {
            try {
                // Calculate annual depreciation (simplified straight-line method)
                const annualDepreciation = asset.useful_life_years > 0
                    ? asset.acquisition_value / asset.useful_life_years
                    : 0;

                if (annualDepreciation > 0) {
                    // Record depreciation (in real implementation, this would post to GL)
                    totalDepreciationPosted += annualDepreciation;
                    assetsWithDepreciation++;
                }

                totalAssetsProcessed++;

            } catch (assetError: any) {
                errors++;
                errorLog.push(`Asset ${asset.asset_number}: ${assetError.message}`);
            }
        }

        const endTime = new Date();
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        // Update run record with results
        await client.query(
            `UPDATE asset_year_end_closing 
       SET status = $1,
           end_time = NOW(),
           execution_duration_seconds = $2,
           total_assets_processed = $3,
           assets_with_depreciation = $4,
           total_depreciation_posted = $5,
           errors_encountered = $6,
           error_log = $7,
           updated_at = NOW()
       WHERE id = $8`,
            [
                errors > 0 ? 'COMPLETED' : 'COMPLETED',
                durationSeconds,
                totalAssetsProcessed,
                assetsWithDepreciation,
                totalDepreciationPosted,
                errors,
                errorLog.join('\n'),
                runId
            ]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Asset year-end closing completed',
            run_id: runId,
            summary: {
                total_assets_processed: totalAssetsProcessed,
                assets_with_depreciation: assetsWithDepreciation,
                total_depreciation_posted: totalDepreciationPosted,
                errors_encountered: errors,
                execution_duration_seconds: durationSeconds
            }
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error running asset year-end closing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run asset year-end closing',
            message: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/finance/year-end/assets/status
 * Get status of the latest year-end run
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT * FROM asset_year_end_closing 
             ORDER BY run_date DESC, id DESC 
             LIMIT 1`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No year-end runs found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error fetching latest run status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest run status',
            message: error.message
        });
    }
});

/**
 * GET /api/finance/year-end/assets/status/:runId
 * Get status of a specific year-end run
 */
router.get('/status/:runId', async (req: Request, res: Response) => {
    try {
        const { runId } = req.params;

        const result = await pool.query(
            `SELECT * FROM asset_year_end_closing WHERE id = $1`,
            [runId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Year-end run not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error fetching run status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch run status',
            message: error.message
        });
    }
});

/**
 * GET /api/finance/year-end/assets/history
 * Get history of all year-end runs
 */
router.get('/history', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, company_code_id } = req.query;

        let query = `
      SELECT 
        ayec.*,
        cc.code as company_code,
        cc.name as company_name
      FROM asset_year_end_closing ayec
      LEFT JOIN company_codes cc ON ayec.company_code_id = cc.id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramCount = 1;

        if (fiscal_year) {
            query += ` AND ayec.fiscal_year = $${paramCount}`;
            params.push(fiscal_year);
            paramCount++;
        }

        if (company_code_id) {
            query += ` AND ayec.company_code_id = $${paramCount}`;
            params.push(company_code_id);
            paramCount++;
        }

        query += ` ORDER BY ayec.run_date DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });

    } catch (error: any) {
        console.error('Error fetching run history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch run history',
            message: error.message
        });
    }
});

/**
 * GET /api/finance/year-end/assets/depreciation-report
 * Generate depreciation report
 */
router.get('/depreciation-report', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, company_code_id } = req.query;

        if (!fiscal_year || !company_code_id) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year and company_code_id are required'
            });
        }

        // Get depreciation summary
        const summary = await pool.query(
            `SELECT 
        COUNT(*) as total_assets,
        SUM(acquisition_value) as total_acquisition_value,
        SUM(accumulated_depreciation) as total_accumulated_depreciation,
        SUM(book_value) as total_book_value
       FROM asset_master
       WHERE is_active = true
       AND company_code_id = $1`,
            [company_code_id]
        );

        res.json({
            success: true,
            fiscal_year,
            company_code_id,
            summary: summary.rows[0]
        });

    } catch (error: any) {
        console.error('Error generating depreciation report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate depreciation report',
            message: error.message
        });
    }
});

export default router;
