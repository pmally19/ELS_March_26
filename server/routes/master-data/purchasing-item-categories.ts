
import { Router } from 'express';
import { ensureActivePool } from '../../database';

const router = Router();

// GET /api/master-data/purchasing-item-categories
router.get('/', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const result = await pool.query(`
      SELECT * FROM purchasing_item_categories 
      WHERE "_deletedAt" IS NULL
      ORDER BY code
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching purchasing item categories:', error);
        res.status(500).json({ error: 'Failed to fetch purchasing item categories' });
    }
});

// POST /api/master-data/purchasing-item-categories
router.post('/', async (req, res) => {
    const { code, name, description, is_active } = req.body;
    const userId = (req as any).user?.id || 1;
    const tenantId = (req as any).user?.tenantId || '001';

    try {
        const pool = ensureActivePool();
        const result = await pool.query(
            `INSERT INTO purchasing_item_categories (code, name, description, is_active, created_by, updated_by, "_tenantId") 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [code, name, description, is_active !== undefined ? is_active : true, userId, userId, tenantId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating purchasing item category:', error);
        res.status(500).json({ error: 'Failed to create purchasing item category' });
    }
});

// PUT /api/master-data/purchasing-item-categories/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { code, name, description, is_active } = req.body;
    const userId = (req as any).user?.id || 1;
    try {
        const pool = ensureActivePool();
        const result = await pool.query(
            `UPDATE purchasing_item_categories 
             SET code = $1, name = $2, description = $3, is_active = $4, updated_by = $5 
             WHERE id = $6 AND "_deletedAt" IS NULL
             RETURNING *`,
            [code, name, description, is_active, userId, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Purchasing item category not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating purchasing item category:', error);
        res.status(500).json({ error: 'Failed to update purchasing item category' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user?.id || 1;
    try {
        const pool = ensureActivePool();
        const result = await pool.query(
            'UPDATE purchasing_item_categories SET "_deletedAt" = NOW(), updated_by = $1 WHERE id = $2 AND "_deletedAt" IS NULL RETURNING *',
            [userId, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Purchasing item category not found' });
        }
        res.json({ message: 'Purchasing item category deleted successfully' });
    } catch (error) {
        console.error('Error deleting purchasing item category:', error);
        res.status(500).json({ error: 'Failed to delete purchasing item category' });
    }
});

export default router;
