import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET all variants
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT v.*, COUNT(g.id)::int as group_count
       FROM field_status_variants v
       LEFT JOIN field_status_groups g ON g.variant_id = v.id
       GROUP BY v.id ORDER BY v.code`
        );
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET single variant
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM field_status_variants WHERE id = $1', [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST create variant
router.post('/', async (req, res) => {
    try {
        const { code, description, active = true } = req.body;
        if (!code || !description) return res.status(400).json({ success: false, error: 'code and description are required' });

        const result = await pool.query(
            `INSERT INTO field_status_variants (code, description, active)
       VALUES ($1, $2, $3) RETURNING *`,
            [code.toUpperCase(), description, active]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        if (err.code === '23505') return res.status(400).json({ success: false, error: 'Variant code already exists' });
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT update variant
router.put('/:id', async (req, res) => {
    try {
        const { code, description, active } = req.body;
        const result = await pool.query(
            `UPDATE field_status_variants
       SET code = COALESCE($1, code),
           description = COALESCE($2, description),
           active = COALESCE($3, active),
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
            [code || null, description || null, active !== undefined ? active : null, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE variant
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM field_status_variants WHERE id = $1 RETURNING id', [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
