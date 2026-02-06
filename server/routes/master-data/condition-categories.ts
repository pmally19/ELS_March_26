import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// Get all condition categories
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT * FROM condition_categories
      ORDER BY sort_order, category_code
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching condition categories:', error);
        res.status(500).json({ error: 'Failed to fetch condition categories' });
    }
});

// Get single condition category by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT * FROM condition_categories WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Condition category not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching condition category:', error);
        res.status(500).json({ error: 'Failed to fetch condition category' });
    }
});

// Create new condition category
router.post('/', async (req, res) => {
    try {
        const {
            category_code,
            category_name,
            category_type,
            description,
            sort_order,
            is_active
        } = req.body;

        // Validate required fields
        if (!category_code || !category_name || !category_type) {
            return res.status(400).json({
                error: 'category_code, category_name, and category_type are required'
            });
        }

        // Check if category_code already exists
        const existingResult = await pool.query(`
      SELECT id FROM condition_categories WHERE category_code = $1
    `, [category_code]);

        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                error: 'Category code already exists'
            });
        }

        // Insert new category
        const insertResult = await pool.query(`
      INSERT INTO condition_categories (
        category_code, category_name, category_type, description, 
        sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
            category_code,
            category_name,
            category_type,
            description,
            sort_order || 1,
            is_active !== undefined ? is_active : true
        ]);

        res.status(201).json(insertResult.rows[0]);
    } catch (error) {
        console.error('Error creating condition category:', error);
        res.status(500).json({ error: 'Failed to create condition category' });
    }
});

// Update condition category
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_code,
            category_name,
            category_type,
            description,
            sort_order,
            is_active
        } = req.body;

        // Check if category exists
        const checkResult = await pool.query(`
      SELECT id FROM condition_categories WHERE id = $1
    `, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Condition category not found' });
        }

        // Check if category_code conflicts with another record
        if (category_code) {
            const conflictResult = await pool.query(`
        SELECT id FROM condition_categories 
        WHERE category_code = $1 AND id != $2
      `, [category_code, id]);

            if (conflictResult.rows.length > 0) {
                return res.status(400).json({
                    error: 'Category code already exists'
                });
            }
        }

        // Update category
        const updateResult = await pool.query(`
      UPDATE condition_categories SET
        category_code = COALESCE($1, category_code),
        category_name = COALESCE($2, category_name),
        category_type = COALESCE($3, category_type),
        description = $4,
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active),
        updated_at = now()
      WHERE id = $7
      RETURNING *
    `, [
            category_code,
            category_name,
            category_type,
            description,
            sort_order,
            is_active,
            id
        ]);

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error updating condition category:', error);
        res.status(500).json({ error: 'Failed to update condition category' });
    }
});

// Delete condition category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category is used in condition_types
        const usageResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM condition_types
      WHERE category_id = $1
    `, [id]);

        const usageCount = parseInt(usageResult.rows[0].count);
        if (usageCount > 0) {
            return res.status(400).json({
                error: `Cannot delete category. It is used in ${usageCount} condition type(s)`
            });
        }

        // Delete category
        const deleteResult = await pool.query(`
      DELETE FROM condition_categories WHERE id = $1 RETURNING *
    `, [id]);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Condition category not found' });
        }

        res.json({
            message: 'Condition category deleted successfully',
            category: deleteResult.rows[0]
        });
    } catch (error) {
        console.error('Error deleting condition category:', error);
        res.status(500).json({ error: 'Failed to delete condition category' });
    }
});

export default router;
