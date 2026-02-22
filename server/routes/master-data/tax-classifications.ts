import { Router } from 'express';
import { getPool } from '../../database';

const router = Router();

// ─── CRUD ─────────────────────────────────────────────────────────────────

// GET all
router.get('/', async (req, res) => {
    try {
        const { is_active, applies_to } = req.query;
        let query = `SELECT * FROM tax_classifications WHERE 1=1`;
        const params: any[] = [];

        if (is_active !== undefined) {
            params.push(is_active === 'true');
            query += ` AND is_active = $${params.length}`;
        }
        if (applies_to) {
            params.push(applies_to);
            query += ` AND (applies_to = $${params.length} OR applies_to = 'BOTH')`;
        }
        query += ' ORDER BY code';
        const result = await getPool().query(query, params);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch tax classifications', details: e?.message });
    }
});

// GET single
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool().query('SELECT * FROM tax_classifications WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch', details: e?.message });
    }
});

// POST create
router.post('/', async (req, res) => {
    try {
        const { code, description, tax_applicable = true, applies_to = 'BOTH', is_active = true } = req.body;
        if (!code || !description) {
            return res.status(400).json({ error: 'code and description are required' });
        }
        const result = await getPool().query(`
      INSERT INTO tax_classifications (code, description, tax_applicable, applies_to, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [code.toUpperCase(), description, tax_applicable, applies_to, is_active]);
        res.status(201).json(result.rows[0]);
    } catch (e: any) {
        const msg = e?.message || '';
        const status = /unique|duplicate/i.test(msg) ? 409 : 400;
        res.status(status).json({ error: 'Failed to create', details: msg });
    }
});

// PUT update
router.put('/:id', async (req, res) => {
    try {
        const { code, description, tax_applicable, applies_to, is_active } = req.body;
        const result = await getPool().query(`
      UPDATE tax_classifications
      SET code          = COALESCE($1, code),
          description   = COALESCE($2, description),
          tax_applicable= COALESCE($3, tax_applicable),
          applies_to    = COALESCE($4, applies_to),
          is_active     = COALESCE($5, is_active),
          updated_at    = NOW()
      WHERE id = $6
      RETURNING *
    `, [code?.toUpperCase(), description, tax_applicable, applies_to, is_active, req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to update', details: e?.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        // Check if in use
        const usage = await getPool().query(`
      SELECT 
        (SELECT COUNT(*) FROM erp_customers WHERE tax_classification_id = $1) +
        (SELECT COUNT(*) FROM materials WHERE tax_classification_id = $1) as count
    `, [req.params.id]);
        if (parseInt(usage.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete — this classification is assigned to customers or materials.' });
        }
        const result = await getPool().query('DELETE FROM tax_classifications WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted', id: Number(req.params.id) });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to delete', details: e?.message });
    }
});

export default router;
