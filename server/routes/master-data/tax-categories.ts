import { Router } from 'express';
import { getPool } from '../../database';

const router = Router();

// GET all tax categories
router.get('/', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT 
        id,
        tax_category_code,
        description,
        tax_type,
        is_active,
        created_at,
        updated_at
      FROM tax_categories 
      ORDER BY tax_category_code
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tax categories:', error);
        res.status(500).json({ error: 'Failed to fetch tax categories' });
    }
});

// GET active tax categories only
router.get('/active', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT 
        id,
        tax_category_code,
        description,
        tax_type,
        is_active
      FROM tax_categories 
      WHERE is_active = true 
      ORDER BY tax_category_code
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching active tax categories:', error);
        res.status(500).json({ error: 'Failed to fetch active tax categories' });
    }
});

// GET single tax category by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await getPool().query(
            'SELECT * FROM tax_categories WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tax category not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching tax category:', error);
        res.status(500).json({ error: 'Failed to fetch tax category' });
    }
});

// POST create new tax category
router.post('/', async (req, res) => {
    try {
        const {
            tax_category_code,
            description,
            tax_type,
            is_active = true
        } = req.body;

        // Validate required fields
        if (!tax_category_code || !description || !tax_type) {
            return res.status(400).json({
                error: 'Missing required fields: tax_category_code, description, tax_type'
            });
        }

        // Validate code length (2 characters max)
        if (tax_category_code.length > 2) {
            return res.status(400).json({
                error: 'Tax category code must be 1-2 characters'
            });
        }

        // Validate tax type
        const validTaxTypes = ['INPUT_TAX', 'OUTPUT_TAX', 'BOTH'];
        if (!validTaxTypes.includes(tax_type)) {
            return res.status(400).json({
                error: 'Tax type must be INPUT_TAX, OUTPUT_TAX, or BOTH'
            });
        }

        const result = await getPool().query(`
      INSERT INTO tax_categories (
        tax_category_code, 
        description, 
        tax_type,
        is_active
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
            tax_category_code.toUpperCase(),
            description,
            tax_type,
            is_active
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating tax category:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                error: 'Tax category code already exists'
            });
        }
        res.status(500).json({ error: 'Failed to create tax category' });
    }
});

// PUT update tax category
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tax_category_code,
            description,
            tax_type,
            is_active
        } = req.body;

        // Validate tax type if provided
        if (tax_type) {
            const validTaxTypes = ['INPUT_TAX', 'OUTPUT_TAX', 'BOTH'];
            if (!validTaxTypes.includes(tax_type)) {
                return res.status(400).json({
                    error: 'Tax type must be INPUT_TAX, OUTPUT_TAX, or BOTH'
                });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (tax_category_code !== undefined) {
            if (tax_category_code.length > 2) {
                return res.status(400).json({
                    error: 'Tax category code must be 1-2 characters'
                });
            }
            updates.push(`tax_category_code = $${paramCount++}`);
            values.push(tax_category_code.toUpperCase());
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (tax_type !== undefined) {
            updates.push(`tax_type = $${paramCount++}`);
            values.push(tax_type);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await getPool().query(`
      UPDATE tax_categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tax category not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating tax category:', error);
        if (error.code === '23505') {
            return res.status(400).json({
                error: 'Tax category code already exists'
            });
        }
        res.status(500).json({ error: 'Failed to update tax category' });
    }
});

// DELETE tax category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await getPool().query(
            'DELETE FROM tax_categories WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tax category not found' });
        }

        res.json({
            message: 'Tax category deleted successfully',
            deleted: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting tax category:', error);
        res.status(500).json({ error: 'Failed to delete tax category' });
    }
});

export default router;
