import { Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// GET /api/master-data/sales-process-types - List all sales process types
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                process_code,
                process_name,
                description,
                is_active,
                created_at,
                updated_at
            FROM sales_process_types
            ORDER BY process_code
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sales process types:', error);
        res.status(500).json({ error: 'Failed to fetch sales process types' });
    }
});

// GET /api/master-data/sales-process-types/:id - Get single sales process type
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                id,
                process_code,
                process_name,
                description,
                is_active,
                created_at,
                updated_at
            FROM sales_process_types
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sales process type not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching sales process type:', error);
        res.status(500).json({ error: 'Failed to fetch sales process type' });
    }
});

// POST /api/master-data/sales-process-types - Create new sales process type
router.post('/', async (req, res) => {
    try {
        const {
            processCode,
            processName,
            description,
            isActive = true,
        } = req.body;

        // Validation
        if (!processCode || !processName) {
            return res.status(400).json({
                error: 'Process code and name are required'
            });
        }

        // Check for duplicate process_code
        const existingCheck = await pool.query(`
            SELECT id FROM sales_process_types WHERE process_code = $1
        `, [processCode.toUpperCase()]);

        if (existingCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Process code already exists',
                existingId: existingCheck.rows[0].id
            });
        }

        const result = await pool.query(`
            INSERT INTO sales_process_types (
                process_code,
                process_name,
                description,
                is_active
            ) VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [
            processCode.toUpperCase(),
            processName.trim(),
            description?.trim() || null,
            isActive
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating sales process type:', error);
        res.status(500).json({ error: 'Failed to create sales process type' });
    }
});

// PUT /api/master-data/sales-process-types/:id - Update sales process type
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            processName,
            description,
            isActive,
        } = req.body;

        // Check if exists
        const existingCheck = await pool.query(`
            SELECT id FROM sales_process_types WHERE id = $1
        `, [id]);

        if (existingCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sales process type not found' });
        }

        const result = await pool.query(`
            UPDATE sales_process_types
            SET 
                process_name = COALESCE($1, process_name),
                description = COALESCE($2, description),
                is_active = COALESCE($3, is_active),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `, [
            processName?.trim(),
            description?.trim(),
            isActive,
            id
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating sales process type:', error);
        res.status(500).json({ error: 'Failed to update sales process type' });
    }
});

// DELETE /api/master-data/sales-process-types/:id - Delete sales process type
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if it's being used by any sales document categories
        const usageCheck = await pool.query(`
            SELECT COUNT(*) as count 
            FROM sales_document_categories 
            WHERE sales_process_type_id = $1
        `, [id]);

        if (parseInt(usageCheck.rows[0].count) > 0) {
            return res.status(409).json({
                error: 'Cannot delete sales process type',
                message: `This process type is used by ${usageCheck.rows[0].count} sales document categories`
            });
        }

        const result = await pool.query(`
            DELETE FROM sales_process_types
            WHERE id = $1
            RETURNING id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sales process type not found' });
        }

        res.json({ message: 'Sales process type deleted successfully' });
    } catch (error) {
        console.error('Error deleting sales process type:', error);
        res.status(500).json({ error: 'Failed to delete sales process type' });
    }
});

export default router;
