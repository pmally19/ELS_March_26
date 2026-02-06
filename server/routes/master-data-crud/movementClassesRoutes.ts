import express from 'express';
import { ensureActivePool } from '../../database.js';

const router = express.Router();

// GET all movement classes
router.get('/', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { is_active } = req.query;

        let query = 'SELECT * FROM movement_classes';
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (is_active !== undefined) {
            conditions.push(`is_active = $${paramIndex++}`);
            params.push(is_active === 'true');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY code';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching movement classes:', error);
        res.status(500).json({
            message: 'Failed to fetch movement classes',
            error: error.message
        });
    }
});

// GET single movement class by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM movement_classes WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Movement class not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching movement class:', error);
        res.status(500).json({
            message: 'Failed to fetch movement class',
            error: error.message
        });
    }
});

// POST create new movement class
router.post('/', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const {
            code, name, description, affects_gl, allows_negative, is_active
        } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({ message: 'Code and name are required' });
        }

        const result = await pool.query(`
      INSERT INTO movement_classes (
        code, name, description, affects_gl, allows_negative, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
            code,
            name,
            description || null,
            affects_gl !== false, // Default to true
            allows_negative === true, // Default to false
            is_active !== false // Default to true
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Class code already exists' });
        }
        console.error('Error creating movement class:', error);
        res.status(500).json({
            message: 'Failed to create movement class',
            error: error.message
        });
    }
});

// PUT update movement class
router.put('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { id } = req.params;
        const {
            code, name, description, affects_gl, allows_negative, is_active
        } = req.body;

        const result = await pool.query(`
      UPDATE movement_classes
      SET code = $1, name = $2, description = $3, affects_gl = $4,
          allows_negative = $5, is_active = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
            code,
            name,
            description || null,
            affects_gl !== false,
            allows_negative === true,
            is_active !== false,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Movement class not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Class code already exists' });
        }
        console.error('Error updating movement class:', error);
        res.status(500).json({
            message: 'Failed to update movement class',
            error: error.message
        });
    }
});

// DELETE movement class
router.delete('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM movement_classes WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Movement class not found' });
        }

        res.json({ message: 'Movement class deleted successfully' });
    } catch (error) {
        console.error('Error deleting movement class:', error);
        res.status(500).json({
            message: 'Failed to delete movement class',
            error: error.message
        });
    }
});

export default router;
