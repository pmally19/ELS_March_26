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
 * GET /api/finance/year-end/receivables
 * List all receivable balance confirmations
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { fiscal_year, status, company_code_id } = req.query;

        let query = `
      SELECT 
        bc.*,
        ec.name as customer_name,
        ec.email as customer_email,
        cc.code as company_code
      FROM balance_confirmations bc
      LEFT JOIN erp_customers ec ON bc.customer_id = ec.id
      LEFT JOIN company_codes cc ON bc.company_code_id = cc.id
      WHERE bc.confirmation_type = 'AR'
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
        console.error('Error fetching receivable confirmations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch receivable confirmations',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/year-end/receivables/generate
 * Generate balance confirmations for all customers
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

        // Get all active customers with outstanding balances
        const customersQuery = `
      SELECT 
        ec.id as customer_id,
        ec.customer_code as account_number,
        ec.name as account_name,
        COALESCE(SUM(ar.outstanding_amount), 0) as closing_balance
      FROM erp_customers ec
      LEFT JOIN ar_open_items ar ON ec.id = ar.customer_id
      WHERE ec.active = true
      GROUP BY ec.id, ec.customer_code, ec.name
      HAVING COALESCE(SUM(ar.outstanding_amount), 0) > 0
    `;

        const customers = await client.query(customersQuery);

        let generated = 0;

        for (const customer of customers.rows) {
            // Check if confirmation already exists
            const existingCheck = await client.query(
                `SELECT id FROM balance_confirmations 
         WHERE confirmation_type = 'AR' 
         AND fiscal_year = $1 
         AND customer_id = $2 
         AND company_code_id = $3`,
                [fiscal_year, customer.customer_id, company_code_id]
            );

            if (existingCheck.rows.length === 0) {
                await client.query(
                    `INSERT INTO balance_confirmations (
            confirmation_type, fiscal_year, company_code_id, customer_id,
            account_number, account_name, closing_balance, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [
                        'AR',
                        fiscal_year,
                        company_code_id,
                        customer.customer_id,
                        customer.account_number,
                        customer.account_name,
                        customer.closing_balance,
                        'PENDING'
                    ]
                );
                generated++;
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Generated ${generated} receivable confirmations`,
            generated,
            total_customers: customers.rows.length
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error generating receivable confirmations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate receivable confirmations',
            message: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/finance/year-end/receivables/:id/confirm
 * Mark a receivable confirmation as confirmed
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
       WHERE id = $4 AND confirmation_type = 'AR'
       RETURNING *`,
            [confirmed_by_name, confirmed_by_email, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Receivable confirmation not found'
            });
        }

        res.json({
            success: true,
            message: 'Receivable confirmation marked as confirmed',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error confirming receivable:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm receivable',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/year-end/receivables/:id/dispute
 * Create a dispute for a receivable confirmation
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
       WHERE id = $3 AND confirmation_type = 'AR'
       RETURNING *`,
            [dispute_amount, dispute_reason, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Receivable confirmation not found'
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
 * GET /api/finance/year-end/receivables/:id/letter-pdf
 * Download confirmation letter PDF
 */
router.get('/:id/letter-pdf', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT bc.*, 
             ec.name as customer_name, ec.address, ec.city, ec.state, ec.postal_code, ec.country,
             cc.name as company_name, cc.currency
             FROM balance_confirmations bc
             LEFT JOIN erp_customers ec ON bc.customer_id = ec.id
             LEFT JOIN company_codes cc ON bc.company_code_id = cc.id
             WHERE bc.id = $1 AND bc.confirmation_type = 'AR'`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Receivable confirmation not found'
            });
        }

        const confirmation = result.rows[0];

        // Create PDF
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Confirmation-${confirmation.account_number}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text(confirmation.company_name, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('Balance Confirmation Request', { align: 'center' });
        doc.moveDown(2);

        // Date & Ref
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Reference: ${confirmation.letter_reference || 'Pending'}`);
        doc.moveDown();

        // Customer Address
        doc.text('To:');
        doc.text(confirmation.customer_name);
        if (confirmation.address) doc.text(confirmation.address);
        doc.text(`${confirmation.city || ''} ${confirmation.state || ''} ${confirmation.postal_code || ''}`);
        doc.text(confirmation.country || '');
        doc.moveDown(2);

        // Body
        doc.text('Dear Sir/Madam,');
        doc.moveDown();
        doc.text(`Please confirm that the balance of your account ${confirmation.account_number} as of ${confirmation.fiscal_year} showing a balance of ${confirmation.currency} ${Number(confirmation.closing_balance).toFixed(2)} is correct.`);
        doc.moveDown();
        doc.text('If the amount does not agree with your records, please report any differences directly to our audit department.');
        doc.moveDown(2);

        // Table
        const startY = doc.y;
        doc.text('Details:', { underline: true });
        doc.moveDown();
        doc.text(`Account Number: ${confirmation.account_number}`);
        doc.text(`Closing Balance: ${confirmation.currency} ${Number(confirmation.closing_balance).toFixed(2)}`);
        doc.moveDown(2);

        // Footer
        doc.text('Sincerely,');
        doc.moveDown();
        doc.text('Finance Department');
        doc.text(confirmation.company_name);

        doc.end();

    } catch (error: any) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF',
            message: error.message
        });
    }
});

/**
 * POST /api/finance/year-end/receivables/:id/send-letter
 * Send confirmation letter to customer
 */
router.post('/:id/send-letter', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Update letter sent status
        const result = await pool.query(
            `UPDATE balance_confirmations 
       SET status = 'LETTER_SENT',
           letter_generated = true,
           letter_sent_date = CURRENT_DATE,
           letter_reference = $1,
           updated_at = NOW()
       WHERE id = $2 AND confirmation_type = 'AR'
       RETURNING *`,
            [`AR-${new Date().getFullYear()}-${id}`, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Receivable confirmation not found'
            });
        }

        // TODO: Integrate with email service to send actual letter

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
 * POST /api/finance/year-end/receivables/:id/send-reminder
 * Send reminder to customer
 */
router.post('/:id/send-reminder', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE balance_confirmations 
       SET reminder_sent_count = reminder_sent_count + 1,
           last_reminder_date = CURRENT_DATE,
           updated_at = NOW()
       WHERE id = $1 AND confirmation_type = 'AR'
       RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Receivable confirmation not found'
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
