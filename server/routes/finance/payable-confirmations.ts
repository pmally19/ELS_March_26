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
 * GET /api/finance/year-end/payables
 * List all payable balance confirmations
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, status, company_code_id } = req.query;

        let query = `
      SELECT 
        bc.*,
        v.name as vendor_name,
        v.email as vendor_email,
        cc.code as company_code
      FROM balance_confirmations bc
      LEFT JOIN vendors v ON bc.vendor_id = v.id
      LEFT JOIN company_codes cc ON bc.company_code_id = cc.id
      WHERE bc.confirmation_type = 'AP'
    `;

        const params: any[] = [];
        let paramCount = 1;

        if (fiscal_year) {
            query += ` AND bc.fiscal_year = $${paramCount}`;
            params.push(fiscal_year);
            paramCount++;
        }

        if (status) {
            query += ` AND bc.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (company_code_id) {
            query += ` AND bc.company_code_id = $${paramCount}`;
            params.push(company_code_id);
            paramCount++;
        }

        query += ` ORDER BY bc.created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });

    } catch (error: any) {
        console.error('Error fetching payable confirmations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payable confirmations',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/year-end/payables/generate
 * Generate balance confirmations for all vendors
 */
router.post('/generate', async (req: Request, res: Response) => {
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

        // Get all active vendors with outstanding balances
        const vendorsQuery = `
      SELECT 
        v.id as vendor_id,
        v.code as account_number,
        v.name as account_name,
        COALESCE(SUM(CASE WHEN ap.payment_status != 'PAID' THEN ap.amount ELSE 0 END), 0) as closing_balance
      FROM vendors v
      LEFT JOIN accounts_payable ap ON v.id = ap.vendor_id
      WHERE v.is_active = true
      GROUP BY v.id, v.code, v.name
      HAVING COALESCE(SUM(CASE WHEN ap.payment_status != 'PAID' THEN ap.amount ELSE 0 END), 0) > 0
    `;

        const vendors = await client.query(vendorsQuery);

        let generated = 0;

        for (const vendor of vendors.rows) {
            // Check if confirmation already exists
            const existingCheck = await client.query(
                `SELECT id FROM balance_confirmations 
         WHERE confirmation_type = 'AP' 
         AND fiscal_year = $1 
         AND vendor_id = $2 
         AND company_code_id = $3`,
                [fiscal_year, vendor.vendor_id, company_code_id]
            );

            if (existingCheck.rows.length === 0) {
                await client.query(
                    `INSERT INTO balance_confirmations (
            confirmation_type, fiscal_year, company_code_id, vendor_id,
            account_number, account_name, closing_balance, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [
                        'AP',
                        fiscal_year,
                        company_code_id,
                        vendor.vendor_id,
                        vendor.account_number,
                        vendor.account_name,
                        vendor.closing_balance,
                        'PENDING'
                    ]
                );
                generated++;
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Generated ${generated} payable confirmations`,
            generated,
            total_vendors: vendors.rows.length
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error generating payable confirmations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate payable confirmations',
            message: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/finance/year-end/payables/:id/confirm
 * Mark a payable confirmation as confirmed
 */
router.put('/:id/confirm', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { confirmed_by_name, confirmed_by_email, notes } = req.body;

        const result = await pool.query(
            `UPDATE balance_confirmations 
       SET status = 'CONFIRMED',
           confirmation_date = CURRENT_DATE,
           confirmed_by_name = $1,
           confirmed_by_email = $2,
           resolution_notes = $3,
           updated_at = NOW()
       WHERE id = $4 AND confirmation_type = 'AP'
       RETURNING *`,
            [confirmed_by_name, confirmed_by_email, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Payable confirmation not found'
            });
        }

        res.json({
            success: true,
            message: 'Payable confirmation marked as confirmed',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error confirming payable:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm payable',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/year-end/payables/:id/dispute
 * Create a dispute for a payable confirmation
 */
router.post('/:id/dispute', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { dispute_amount, dispute_reason } = req.body;

        if (!dispute_reason) {
            return res.status(400).json({
                success: false,
                error: 'dispute_reason is required'
            });
        }

        const result = await pool.query(
            `UPDATE balance_confirmations 
       SET status = 'DISPUTED',
           is_disputed = true,
           dispute_date = CURRENT_DATE,
           dispute_amount = $1,
           dispute_reason = $2,
           updated_at = NOW()
       WHERE id = $3 AND confirmation_type = 'AP'
       RETURNING *`,
            [dispute_amount, dispute_reason, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Payable confirmation not found'
            });
        }

        res.json({
            success: true,
            message: 'Dispute created successfully',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error creating dispute:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create dispute',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/year-end/payables/:id/send-letter
 * Send confirmation letter to vendor
 */
router.post('/:id/send-letter', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE balance_confirmations 
       SET status = 'LETTER_SENT',
           letter_generated = true,
           letter_sent_date = CURRENT_DATE,
           letter_reference = $1,
           updated_at = NOW()
       WHERE id = $2 AND confirmation_type = 'AP'
       RETURNING *`,
            [`AP-${new Date().getFullYear()}-${id}`, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Payable confirmation not found'
            });
        }

        res.json({
            success: true,
            message: 'Confirmation letter sent successfully',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error sending letter:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send letter',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/year-end/payables/:id/send-reminder
 * Send reminder to vendor
 */
router.post('/:id/send-reminder', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE balance_confirmations 
       SET reminder_sent_count = reminder_sent_count + 1,
           last_reminder_date = CURRENT_DATE,
           updated_at = NOW()
       WHERE id = $1 AND confirmation_type = 'AP'
       RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Payable confirmation not found'
            });
        }

        res.json({
            success: true,
            message: 'Reminder sent successfully',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error sending reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send reminder',
            message: error.message
        });
    }
});

export default router;
