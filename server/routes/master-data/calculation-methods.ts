import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// Get all calculation methods
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT * FROM calculation_methods
      ORDER BY method_code
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching calculation methods:', error);
        res.status(500).json({ error: 'Failed to fetch calculation methods' });
    }
});

// Get single calculation method by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT * FROM calculation_methods WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Calculation method not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching calculation method:', error);
        res.status(500).json({ error: 'Failed to fetch calculation method' });
    }
});

// Create new calculation method
router.post('/', async (req, res) => {
    try {
        const {
            method_code,
            method_name,
            calculation_type,
            formula_template,
            description,
            is_active
        } = req.body;

        // Validate required fields
        if (!method_code || !method_name || !calculation_type) {
            return res.status(400).json({
                error: 'method_code, method_name, and calculation_type are required'
            });
        }

        // Check if method_code already exists
        const existingResult = await pool.query(`
      SELECT id FROM calculation_methods WHERE method_code = $1
    `, [method_code]);

        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                error: 'Method code already exists'
            });
        }

        // Insert new method
        const insertResult = await pool.query(`
      INSERT INTO calculation_methods (
        method_code, method_name, calculation_type, formula_template,
        description, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [
            method_code,
            method_name,
            calculation_type,
            formula_template,
            description,
            is_active !== undefined ? is_active : true
        ]);

        res.status(201).json(insertResult.rows[0]);
    } catch (error) {
        console.error('Error creating calculation method:', error);
        res.status(500).json({ error: 'Failed to create calculation method' });
    }
});

// Update calculation method
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            method_code,
            method_name,
            calculation_type,
            formula_template,
            description,
            is_active
        } = req.body;

        // Check if method exists
        const checkResult = await pool.query(`
      SELECT id FROM calculation_methods WHERE id = $1
    `, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Calculation method not found' });
        }

        // Check if method_code conflicts with another record
        if (method_code) {
            const conflictResult = await pool.query(`
        SELECT id FROM calculation_methods 
        WHERE method_code = $1 AND id != $2
      `, [method_code, id]);

            if (conflictResult.rows.length > 0) {
                return res.status(400).json({
                    error: 'Method code already exists'
                });
            }
        }

        // Update method
        const updateResult = await pool.query(`
      UPDATE calculation_methods SET
        method_code = COALESCE($1, method_code),
        method_name = COALESCE($2, method_name),
        calculation_type = COALESCE($3, calculation_type),
        formula_template = $4,
        description = $5,
        is_active = COALESCE($6, is_active)
      WHERE id = $7
      RETURNING *
    `, [
            method_code,
            method_name,
            calculation_type,
            formula_template,
            description,
            is_active,
            id
        ]);

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error updating calculation method:', error);
        res.status(500).json({ error: 'Failed to update calculation method' });
    }
});

// Delete calculation method
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check usage in condition_types (assuming column is calculation_method_id or similar)
        // Based on previous chats, condition_types has calculation_type, let's verify if there is a FK or just string usage
        // Since we are standardizing, we should check if this ID is used.
        // However, older implementation used strings. 
        // Let's check simply if there are condition types referring to this method logic or ID.
        // For now, standard delete check.

        // In ConditionTypesManagement.tsx, we saw it fetches calculation methods.
        // It uses `calculation_type` value from this table to populate the dropdown.
        // We should check if any condition_type uses this method's calculation_type code.

        // Let's first get the method to catch its type
        const methodResult = await pool.query('SELECT calculation_type FROM calculation_methods WHERE id = $1', [id]);
        if (methodResult.rows.length === 0) {
            return res.status(404).json({ error: 'Calculation method not found' });
        }
        const typeCode = methodResult.rows[0].calculation_type;

        // Check usage in condition_types by calculation_type string (as per previous schema awareness)
        const usageResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM condition_types
      WHERE calculation_type = $1
    `, [typeCode]);

        const usageCount = parseInt(usageResult.rows[0].count);
        if (usageCount > 0) {
            return res.status(400).json({
                error: `Cannot delete method. It is used in ${usageCount} condition type(s)`
            });
        }

        // Delete method
        const deleteResult = await pool.query(`
      DELETE FROM calculation_methods WHERE id = $1 RETURNING *
    `, [id]);

        res.json({
            message: 'Calculation method deleted successfully',
            method: deleteResult.rows[0]
        });
    } catch (error) {
        console.error('Error deleting calculation method:', error);
        res.status(500).json({ error: 'Failed to delete calculation method' });
    }
});

export default router;
