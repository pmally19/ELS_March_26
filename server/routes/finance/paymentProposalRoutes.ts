import { Router, Request, Response } from 'express';
import { dbPool as pool } from '../../database';

const router = Router();

/**
 * GET /api/payment-proposals
 * List all payment proposals with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { status, company_code_id, from_date, to_date, created_by } = req.query;

        let query = `
      SELECT 
        pp.*,
        cc.name as company_code_name,
        u.name as creator_name,
        COUNT(ppi.id) as item_count,
        SUM(ppi.amount) as total_amount_calculated
      FROM payment_proposals pp
      LEFT JOIN company_codes cc ON pp.company_code_id = cc.id
      LEFT JOIN users u ON pp.created_by = u.id
      LEFT JOIN payment_proposal_items ppi ON pp.id = ppi.proposal_id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND pp.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (company_code_id) {
            query += ` AND pp.company_code_id = $${paramIndex}`;
            params.push(company_code_id);
            paramIndex++;
        }

        if (from_date) {
            query += ` AND pp.payment_date >= $${paramIndex}`;
            params.push(from_date);
            paramIndex++;
        }

        if (to_date) {
            query += ` AND pp.payment_date <= $${paramIndex}`;
            params.push(to_date);
            paramIndex++;
        }

        if (created_by) {
            query += ` AND pp.created_by = $${paramIndex}`;
            params.push(created_by);
            paramIndex++;
        }

        query += `
      GROUP BY pp.id, cc.name, u.name
      ORDER BY pp.created_at DESC
    `;

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching payment proposals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payment proposals', error: error.message });
    }
});

/**
 * GET /api/payment-proposals/:id
 * Get single proposal with details
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const proposalResult = await pool.query(`
      SELECT 
        pp.*,
        cc.name as company_code_name,
        u.name as creator_name
      FROM payment_proposals pp
      LEFT JOIN company_codes cc ON pp.company_code_id = cc.id
      LEFT JOIN users u ON pp.created_by = u.id
      WHERE pp.id = $1
    `, [id]);

        if (proposalResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Proposal not found' });
        }

        res.json({ success: true, data: proposalResult.rows[0] });
    } catch (error: any) {
        console.error('Error fetching proposal:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch proposal', error: error.message });
    }
});

/**
 * POST /api/payment-proposals
 * Create new payment proposal
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            company_code_id,
            payment_date,
            value_date,
            invoice_ids,
            approval_pattern,
            notes,
            created_by
        } = req.body;

        // Generate proposal number
        const numberResult = await pool.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(proposal_number FROM 5) AS INTEGER)), 0) + 1 as next_num
      FROM payment_proposals
      WHERE proposal_number LIKE 'PPR-%'
    `);
        const proposalNumber = `PPR-${String(numberResult.rows[0].next_num).padStart(6, '0')}`;

        // Start transaction
        await pool.query('BEGIN');

        // Create proposal
        const proposalResult = await pool.query(`
      INSERT INTO payment_proposals (
        proposal_number, company_code_id, payment_date, value_date,
        status, approval_pattern, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [proposalNumber, company_code_id, payment_date, value_date, 'DRAFT', approval_pattern, notes, created_by]);

        const proposal = proposalResult.rows[0];

        // Add items if invoice_ids provided
        if (invoice_ids && invoice_ids.length > 0) {
            for (let i = 0; i < invoice_ids.length; i++) {
                const invoiceId = invoice_ids[i];

                // Get invoice details
                const invoiceResult = await pool.query(`
          SELECT api.*, v.name as vendor_name
          FROM accounts_payable_invoices api
          LEFT JOIN vendors v ON api.vendor_id = v.id
          WHERE api.id = $1 AND api.status = 'APPROVED'
        `, [invoiceId]);

                if (invoiceResult.rows.length > 0) {
                    const invoice = invoiceResult.rows[0];

                    await pool.query(`
            INSERT INTO payment_proposal_items (
              proposal_id, invoice_id, vendor_id, vendor_name, invoice_number,
              amount, currency, payment_method, line_number, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
                        proposal.id,
                        invoice.id,
                        invoice.vendor_id,
                        invoice.vendor_name,
                        invoice.invoice_number,
                        invoice.net_amount,
                        invoice.currency || 'USD',
                        'BANK_TRANSFER',
                        i + 1,
                        'PENDING'
                    ]);
                }
            }
        }

        // Update proposal totals
        const totalsResult = await pool.query(`
      SELECT COUNT(*) as item_count, COALESCE(SUM(amount), 0) as total_amount
      FROM payment_proposal_items
      WHERE proposal_id = $1
    `, [proposal.id]);

        await pool.query(`
      UPDATE payment_proposals
      SET total_items = $1, total_amount = $2
      WHERE id = $3
    `, [totalsResult.rows[0].item_count, totalsResult.rows[0].total_amount, proposal.id]);

        // Commit transaction
        await pool.query('COMMIT');

        res.status(201).json({ success: true, data: { ...proposal, ...totalsResult.rows[0] } });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error creating proposal:', error);
        res.status(500).json({ success: false, message: 'Failed to create proposal', error: error.message });
    }
});

/**
 * GET /api/payment-proposals/:id/items
 * Get proposal items
 */
router.get('/:id/items', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT ppi.*, pe.severity, pe.exception_message
      FROM payment_proposal_items ppi
      LEFT JOIN payment_exceptions pe ON ppi.id = pe.item_id AND pe.resolution_status = 'OPEN'
      WHERE ppi.proposal_id = $1
      ORDER BY ppi.line_number
    `, [id]);

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching proposal items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch items', error: error.message });
    }
});

/**
 * POST /api/payment-proposals/:id/validate
 * Validate proposal and create exceptions
 */
router.post('/:id/validate', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await pool.query('BEGIN');

        // Clear existing exceptions
        await pool.query('DELETE FROM payment_exceptions WHERE proposal_id = $1', [id]);

        // Get items
        const itemsResult = await pool.query(`
      SELECT ppi.*, v.bank_account_number, v.bank_name
      FROM payment_proposal_items ppi
      LEFT JOIN vendors v ON ppi.vendor_id = v.id
      WHERE ppi.proposal_id = $1
    `, [id]);

        const exceptions = [];

        for (const item of itemsResult.rows) {
            // Check for missing bank details
            if (!item.bank_account_number || !item.bank_name) {
                await pool.query(`
          INSERT INTO payment_exceptions (
            proposal_id, item_id, severity, exception_code, exception_message
          ) VALUES ($1, $2, $3, $4, $5)
        `, [id, item.id, 'CRITICAL', 'MISSING_BANK_DETAILS', 'Vendor missing bank account information']);

                exceptions.push({
                    item_id: item.id,
                    severity: 'CRITICAL',
                    message: 'Missing bank details'
                });
            }

            // Check for missing payment method
            if (!item.payment_method) {
                await pool.query(`
          INSERT INTO payment_exceptions (
            proposal_id, item_id, severity, exception_code, exception_message
          ) VALUES ($1, $2, $3, $4, $5)
        `, [id, item.id, 'WARNING', 'MISSING_PAYMENT_METHOD', 'Payment method not specified']);

                exceptions.push({
                    item_id: item.id,
                    severity: 'WARNING',
                    message: 'Missing payment method'
                });
            }
        }

        await pool.query('COMMIT');

        res.json({ success: true, exceptions_found: exceptions.length, exceptions });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error validating proposal:', error);
        res.status(500).json({ success: false, message: 'Failed to validate proposal', error: error.message });
    }
});

/**
 * GET /api/payment-proposals/:id/exceptions
 * Get proposal exceptions
 */
router.get('/:id/exceptions', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT pe.*, ppi.vendor_name, ppi.invoice_number, ppi.amount
      FROM payment_exceptions pe
      LEFT JOIN payment_proposal_items ppi ON pe.item_id = ppi.id
      WHERE pe.proposal_id = $1
      ORDER BY 
        CASE pe.severity 
          WHEN 'CRITICAL' THEN 1
          WHEN 'WARNING' THEN 2
          ELSE 3
        END,
        pe.created_at DESC
    `, [id]);

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching exceptions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch exceptions', error: error.message });
    }
});

/**
 * POST /api/payment-proposals/:id/submit
 * Submit proposal for approval
 */
router.post('/:id/submit', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { submitted_by } = req.body;

        // Check for critical exceptions
        const exceptionsResult = await pool.query(`
      SELECT COUNT(*) as critical_count
      FROM payment_exceptions
      WHERE proposal_id = $1 AND severity = 'CRITICAL' AND resolution_status = 'OPEN'
    `, [id]);

        if (parseInt(exceptionsResult.rows[0].critical_count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot submit proposal with unresolved critical exceptions'
            });
        }

        // Update proposal status
        await pool.query(`
      UPDATE payment_proposals
      SET status = 'SUBMITTED', submitted_by = $1, submitted_at = NOW()
      WHERE id = $2
    `, [submitted_by, id]);

        // Log audit
        await pool.query(`
      INSERT INTO payment_audit_logs (proposal_id, user_id, action, new_value)
      VALUES ($1, $2, 'SUBMITTED', 'Proposal submitted for approval')
    `, [id, submitted_by]);

        res.json({ success: true, message: 'Proposal submitted successfully' });
    } catch (error: any) {
        console.error('Error submitting proposal:', error);
        res.status(500).json({ success: false, message: 'Failed to submit proposal', error: error.message });
    }
});

/**
 * POST /api/payment-proposals/:id/approve
 * Approve proposal (add signature)
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { approver_id, approver_name, approver_email, comments, sequence_number } = req.body;

        await pool.query('BEGIN');

        // Add signature
        await pool.query(`
      INSERT INTO payment_approval_signatures (
        proposal_id, approver_id, approver_name, approver_email, 
        sequence_number, action, comments
      ) VALUES ($1, $2, $3, $4, $5, 'APPROVED', $6)
    `, [id, approver_id, approver_name, approver_email, sequence_number, comments]);

        // Check if all required signatures received
        const proposalResult = await pool.query(`
      SELECT approval_pattern, 
        (SELECT COUNT(*) FROM payment_approval_signatures WHERE proposal_id = $1 AND action = 'APPROVED') as signature_count
      FROM payment_proposals
      WHERE id = $1
    `, [id]);

        const proposal = proposalResult.rows[0];

        // Update status if fully approved
        if (proposal.signature_count >= 1) { // Simplified - check against required_signatures in real implementation
            await pool.query(`
        UPDATE payment_proposals
        SET status = 'APPROVED'
        WHERE id = $1
      `, [id]);
        }

        // Log audit
        await pool.query(`
      INSERT INTO payment_audit_logs (proposal_id, user_id, action, new_value)
      VALUES ($1, $2, 'APPROVED', $3)
    `, [id, approver_id, `Approved by ${approver_name}`]);

        await pool.query('COMMIT');

        res.json({ success: true, message: 'Proposal approved successfully' });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error approving proposal:', error);
        res.status(500).json({ success: false, message: 'Failed to approve proposal', error: error.message });
    }
});

/**
 * POST /api/payment-proposals/:id/reject
 * Reject proposal
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { approver_id, approver_name, approver_email, comments } = req.body;

        await pool.query('BEGIN');

        // Add rejection signature
        await pool.query(`
      INSERT INTO payment_approval_signatures (
        proposal_id, approver_id, approver_name, approver_email, 
        action, comments
      ) VALUES ($1, $2, $3, $4, 'REJECTED', $5)
    `, [id, approver_id, approver_name, approver_email, comments]);

        // Update proposal status
        await pool.query(`
      UPDATE payment_proposals
      SET status = 'REJECTED'
      WHERE id = $1
    `, [id]);

        // Log audit
        await pool.query(`
      INSERT INTO payment_audit_logs (proposal_id, user_id, action, new_value)
      VALUES ($1, $2, 'REJECTED', $3)
    `, [id, approver_id, `Rejected by ${approver_name}: ${comments}`]);

        await pool.query('COMMIT');

        res.json({ success: true, message: 'Proposal rejected' });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error rejecting proposal:', error);
        res.status(500).json({ success: false, message: 'Failed to reject proposal', error: error.message });
    }
});

/**
 * POST /api/payment-proposals/:id/execute
 * Execute approved proposal (create payments)
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { executed_by } = req.body;

        // Verify proposal is approved
        const proposalResult = await pool.query(`
      SELECT * FROM payment_proposals WHERE id = $1 AND status = 'APPROVED'
    `, [id]);

        if (proposalResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Proposal must be approved before execution'
            });
        }

        await pool.query('BEGIN');

        // Get items
        const itemsResult = await pool.query(`
      SELECT * FROM payment_proposal_items 
      WHERE proposal_id = $1 AND status = 'PENDING'
    `, [id]);

        let successCount = 0;

        for (const item of itemsResult.rows) {
            try {
                // Create vendor payment
                await pool.query(`
          INSERT INTO vendor_payments (
            payment_number, vendor_id, payment_amount,
            payment_method, payment_date, value_date,
            invoice_id, currency, status, reference
          ) VALUES (
            'VP-' || nextval('vendor_payment_seq'),
            $1, $2, $3, $4, $5, $6, $7, 'POSTED', 
            'From Proposal ' || $8
          )
        `, [
                    item.vendor_id,
                    item.amount,
                    item.payment_method,
                    proposalResult.rows[0].payment_date,
                    proposalResult.rows[0].value_date,
                    item.invoice_id,
                    item.currency,
                    proposalResult.rows[0].proposal_number
                ]);

                // Update item status
                await pool.query(`
          UPDATE payment_proposal_items
          SET status = 'POSTED'
          WHERE id = $1
        `, [item.id]);

                successCount++;
            } catch (itemError: any) {
                // Log error but continue with other items
                await pool.query(`
          INSERT INTO payment_exceptions (
            proposal_id, item_id, severity, exception_code, exception_message
          ) VALUES ($1, $2, 'CRITICAL', 'POSTING_ERROR', $3)
        `, [id, item.id, itemError.message]);

                await pool.query(`
          UPDATE payment_proposal_items
          SET status = 'ERROR', exception_message = $1
          WHERE id = $2
        `, [itemError.message, item.id]);
            }
        }

        // Update proposal status
        await pool.query(`
      UPDATE payment_proposals
      SET status = 'POSTED'
      WHERE id = $1
    `, [id]);

        // Log audit
        await pool.query(`
      INSERT INTO payment_audit_logs (proposal_id, user_id, action, new_value)
      VALUES ($1, $2, 'EXECUTED', $3)
    `, [id, executed_by, `Posted ${successCount} payments`]);

        await pool.query('COMMIT');

        res.json({
            success: true,
            message: `Successfully posted ${successCount} payments`,
            posted_count: successCount,
            total_count: itemsResult.rows.length
        });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error executing proposal:', error);
        res.status(500).json({ success: false, message: 'Failed to execute proposal', error: error.message });
    }
});

/**
 * GET /api/payment-proposals/:id/generate-file
 * Generate payment file (XML/CSV)
 */
router.get('/:id/generate-file', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { format = 'csv' } = req.query;

        const proposalResult = await pool.query(`
      SELECT * FROM payment_proposals WHERE id = $1
    `, [id]);

        if (proposalResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Proposal not found' });
        }

        const itemsResult = await pool.query(`
      SELECT ppi.*, v.bank_account_number, v.bank_name, v.bank_branch_code
      FROM payment_proposal_items ppi
      LEFT JOIN vendors v ON ppi.vendor_id = v.id
      WHERE ppi.proposal_id = $1 AND ppi.status != 'BLOCKED'
      ORDER BY ppi.line_number
    `, [id]);

        if (format === 'csv') {
            // Generate CSV
            let csv = 'Vendor Name,Invoice Number,Amount,Currency,Bank Name,Account Number,Reference\n';

            for (const item of itemsResult.rows) {
                csv += `"${item.vendor_name}","${item.invoice_number}",${item.amount},"${item.currency}","${item.bank_name || ''}","${item.bank_account_number || ''}","${proposalResult.rows[0].proposal_number}"\n`;
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="payment_${proposalResult.rows[0].proposal_number}.csv"`);
            res.send(csv);
        } else {
            res.status(400).json({ success: false, message: 'Unsupported format' });
        }
    } catch (error: any) {
        console.error('Error generating file:', error);
        res.status(500).json({ success: false, message: 'Failed to generate file', error: error.message });
    }
});

export default router;
