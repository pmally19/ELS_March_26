import express from 'express';
import { ensureActivePool } from '../../database.js';

const router = express.Router();

// GET all movement transaction types
router.get('/', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { is_active, category } = req.query;

        let query = 'SELECT * FROM movement_transaction_types';
        const conditions = ['"_deletedAt" IS NULL'];
        const params = [];
        let paramIndex = 1;

        if (is_active !== undefined) {
            conditions.push(`is_active = $${paramIndex++}`);
            params.push(is_active === 'true');
        }

        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            params.push(category);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY sort_order, name';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching movement transaction types:', error);
        res.status(500).json({
            message: 'Failed to fetch movement transaction types',
            error: error.message
        });
    }
});

// GET single movement transaction type by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM movement_transaction_types WHERE id = $1 AND "_deletedAt" IS NULL',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Movement transaction type not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching movement transaction type:', error);
        res.status(500).json({
            message: 'Failed to fetch movement transaction type',
            error: error.message
        });
    }
});

// POST create new movement transaction type
router.post('/', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const userId = (req as any).user?.id || 1;
        const tenantId = (req as any).user?.tenantId || '001';
        const {
            code, name, description, category, affects_inventory,
            direction, requires_reference, sort_order, is_active
        } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({ message: 'Code and name are required' });
        }

        const result = await pool.query(`
      INSERT INTO movement_transaction_types (
        code, name, description, category, affects_inventory,
        direction, requires_reference, sort_order, is_active,
        created_by, updated_by, "_tenantId",
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
            code.toUpperCase(),
            name,
            description || null,
            category || null,
            affects_inventory !== false,
            direction || 'NEUTRAL',
            requires_reference || false,
            sort_order || 0,
            is_active !== false,
            userId,
            userId,
            tenantId
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Transaction type code already exists' });
        }
        console.error('Error creating movement transaction type:', error);
        res.status(500).json({
            message: 'Failed to create movement transaction type',
            error: error.message
        });
    }
});

// PUT update movement transaction type
router.put('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { id } = req.params;
        const userId = (req as any).user?.id || 1;
        const {
            code, name, description, category, affects_inventory,
            direction, requires_reference, sort_order, is_active
        } = req.body;

        const result = await pool.query(`
      UPDATE movement_transaction_types
      SET code = $1, name = $2, description = $3, category = $4,
          affects_inventory = $5, direction = $6, requires_reference = $7,
          sort_order = $8, is_active = $9, updated_by = $10, updated_at = NOW()
      WHERE id = $11 AND "_deletedAt" IS NULL
      RETURNING *
    `, [
            code.toUpperCase(),
            name,
            description || null,
            category || null,
            affects_inventory !== false,
            direction || 'NEUTRAL',
            requires_reference || false,
            sort_order || 0,
            is_active !== false,
            userId,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Movement transaction type not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Transaction type code already exists' });
        }
        console.error('Error updating movement transaction type:', error);
        res.status(500).json({
            message: 'Failed to update movement transaction type',
            error: error.message
        });
    }
});

// DELETE movement transaction type
router.delete('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { id } = req.params;
        const userId = (req as any).user?.id || 1;

        // Check if it's being used
        const usageCheck = await pool.query(
            'SELECT COUNT(*) as count FROM movement_types WHERE movement_transaction_type_id = $1',
            [id]
        );

        if (parseInt(usageCheck.rows[0].count) > 0) {
            return res.status(400).json({
                message: 'Cannot delete: This transaction type is being used by movement types'
            });
        }

        const result = await pool.query(
            'UPDATE movement_transaction_types SET "_deletedAt" = NOW(), updated_by = $1 WHERE id = $2 AND "_deletedAt" IS NULL RETURNING *',
            [userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Movement transaction type not found' });
        }

        res.json({ message: 'Movement transaction type deleted successfully' });
    } catch (error) {
        console.error('Error deleting movement transaction type:', error);
        res.status(500).json({
            message: 'Failed to delete movement transaction type',
            error: error.message
        });
    }
});

export default router;
