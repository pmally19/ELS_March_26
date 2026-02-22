import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// Get all condition classes
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT * FROM condition_classes
      ORDER BY class_code
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching condition classes:', error);
        res.status(500).json({ error: 'Failed to fetch condition classes' });
    }
});

// Get single condition class by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT * FROM condition_classes WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Condition class not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching condition class:', error);
        res.status(500).json({ error: 'Failed to fetch condition class' });
    }
});

// Create new condition class
router.post('/', async (req, res) => {
    try {
        const {
            class_code,
            class_name,
            description,
            is_active
        } = req.body;

        // Validate required fields
        if (!class_code || !class_name) {
            return res.status(400).json({
                error: 'class_code and class_name are required'
            });
        }

        // Validate class_code is single character
        if (class_code.length !== 1) {
            return res.status(400).json({
                error: 'class_code must be exactly 1 character'
            });
        }

        // Check if class_code already exists
        const existingResult = await pool.query(`
      SELECT id FROM condition_classes WHERE class_code = $1
    `, [class_code.toUpperCase()]);

        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                error: 'Class code already exists'
            });
        }

        // Insert new class
        const insertResult = await pool.query(`
      INSERT INTO condition_classes (
        class_code, class_name, description, is_active
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
            class_code.toUpperCase(),
            class_name,
            description,
            is_active !== undefined ? is_active : true
        ]);

        res.status(201).json(insertResult.rows[0]);
    } catch (error) {
        console.error('Error creating condition class:', error);
        res.status(500).json({ error: 'Failed to create condition class' });
    }
});

// Update condition class
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            class_code,
            class_name,
            description,
            is_active
        } = req.body;

        // Check if class exists
        const checkResult = await pool.query(`
      SELECT id FROM condition_classes WHERE id = $1
    `, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Condition class not found' });
        }

        // Check if class_code conflicts with another record
        if (class_code) {
            const conflictResult = await pool.query(`
        SELECT id FROM condition_classes 
        WHERE class_code = $1 AND id != $2
      `, [class_code.toUpperCase(), id]);

            if (conflictResult.rows.length > 0) {
                return res.status(400).json({
                    error: 'Class code already exists'
                });
            }
        }

        // Update class
        const updateResult = await pool.query(`
      UPDATE condition_classes SET
        class_code = COALESCE($1, class_code),
        class_name = COALESCE($2, class_name),
        description = $3,
        is_active = COALESCE($4, is_active),
        updated_at = now()
      WHERE id = $5
      RETURNING *
    `, [
            class_code ? class_code.toUpperCase() : null,
            class_name,
            description,
            is_active,
            id
        ]);

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error updating condition class:', error);
        res.status(500).json({ error: 'Failed to update condition class' });
    }
});

// Delete condition class
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if class is used in condition_types
        const usageResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM condition_types
      WHERE condition_class_id = $1
    `, [id]);

        const usageCount = parseInt(usageResult.rows[0].count);
        if (usageCount > 0) {
            return res.status(400).json({
                error: `Cannot delete class. It is used in ${usageCount} condition type(s)`
            });
        }

        // Delete class
        const deleteResult = await pool.query(`
      DELETE FROM condition_classes WHERE id = $1 RETURNING *
    `, [id]);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Condition class not found' });
        }

        res.json({
            message: 'Condition class deleted successfully',
            conditionClass: deleteResult.rows[0]
        });
    } catch (error) {
        console.error('Error deleting condition class:', error);
        res.status(500).json({ error: 'Failed to delete condition class' });
    }
});

export default router;
