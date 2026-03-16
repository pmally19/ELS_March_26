import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET all posting keys
router.get('/', async (req, res) => {
    try {
        const { search, debit_credit, account_type } = req.query;

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];
        let paramIdx = 1;

        if (search && typeof search === 'string') {
            whereClause += ` AND (posting_key ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        if (debit_credit && typeof debit_credit === 'string') {
            whereClause += ` AND debit_credit = $${paramIdx}`;
            params.push(debit_credit);
            paramIdx++;
        }

        if (account_type && typeof account_type === 'string') {
            whereClause += ` AND account_type = $${paramIdx}`;
            params.push(account_type);
            paramIdx++;
        }

        const result = await pool.query(
            `SELECT id, posting_key, description, debit_credit, account_type, special_gl_indicator, active
       FROM posting_keys
       ${whereClause}
       ORDER BY posting_key ASC`,
            params
        );

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching posting keys:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch posting keys', details: error.message });
    }
});

// GET single posting key by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, posting_key, description, debit_credit, account_type, special_gl_indicator, active
       FROM posting_keys WHERE id = $1`,
            [parseInt(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Posting key not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error fetching posting key:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch posting key', details: error.message });
    }
});

// POST create new posting key
router.post('/', async (req, res) => {
    try {
        const { posting_key, description, debit_credit, account_type, special_gl_indicator, active } = req.body;

        // Validate required fields
        if (!posting_key || !debit_credit || !account_type) {
            return res.status(400).json({
                success: false,
                error: 'posting_key, debit_credit, and account_type are required'
            });
        }

        // Validate debit_credit
        if (!['D', 'C'].includes(debit_credit)) {
            return res.status(400).json({
                success: false,
                error: 'debit_credit must be D (Debit) or C (Credit)'
            });
        }

        // Validate account_type against real account_types table
        const accountTypeCheck = await pool.query(
            'SELECT id FROM account_types WHERE code = $1 AND is_active = true',
            [account_type]
        );

        if (accountTypeCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: `account_type "${account_type}" does not exist. Use a valid code from Account Types master data.`
            });
        }

        // Check for duplicate posting key code
        const existing = await pool.query(
            'SELECT id FROM posting_keys WHERE posting_key = $1',
            [posting_key]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Posting key "${posting_key}" already exists`
            });
        }

        const result = await pool.query(
            `INSERT INTO posting_keys (posting_key, description, debit_credit, account_type, special_gl_indicator, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, posting_key, description, debit_credit, account_type, special_gl_indicator, active`,
            [
                posting_key,
                description || null,
                debit_credit,
                account_type,
                special_gl_indicator || null,
                active !== undefined ? active : true
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error creating posting key:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, error: 'Posting key code already exists' });
        }
        res.status(500).json({ success: false, error: 'Failed to create posting key', details: error.message });
    }
});

// PUT update posting key
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { posting_key, description, debit_credit, account_type, special_gl_indicator, active } = req.body;

        // Validate debit_credit if provided
        if (debit_credit && !['D', 'C'].includes(debit_credit)) {
            return res.status(400).json({
                success: false,
                error: 'debit_credit must be D (Debit) or C (Credit)'
            });
        }

        const result = await pool.query(
            `UPDATE posting_keys
       SET posting_key = COALESCE($1, posting_key),
           description = COALESCE($2, description),
           debit_credit = COALESCE($3, debit_credit),
           account_type = COALESCE($4, account_type),
           special_gl_indicator = $5,
           active = COALESCE($6, active)
       WHERE id = $7
       RETURNING id, posting_key, description, debit_credit, account_type, special_gl_indicator, active`,
            [
                posting_key || null,
                description || null,
                debit_credit || null,
                account_type || null,
                special_gl_indicator || null,
                active !== undefined ? active : null,
                parseInt(id)
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Posting key not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error updating posting key:', error);
        res.status(500).json({ success: false, error: 'Failed to update posting key', details: error.message });
    }
});

// DELETE posting key
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM posting_keys WHERE id = $1 RETURNING id',
            [parseInt(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Posting key not found' });
        }

        res.json({ success: true, message: 'Posting key deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting posting key:', error);
        res.status(500).json({ success: false, error: 'Failed to delete posting key', details: error.message });
    }
});

export default router;
