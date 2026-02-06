/**
 * Item Category Groups Backend API Routes
 * Manages SD (Sales & Distribution) Item Category Groups master data
 */

import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /api/master-data/item-category-groups - List all item category groups
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        group_code,
        group_name,
        description,
        is_active,
        created_at,
        updated_at
      FROM item_category_groups
      ORDER BY group_code
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching item category groups:', error);
        res.status(500).json({ error: 'Failed to fetch item category groups' });
    }
});

// GET /api/master-data/item-category-groups/:id - Get single item category group
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        group_code,
        group_name,
        description,
        is_active,
        created_at,
        updated_at
      FROM item_category_groups
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item category group not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching item category group:', error);
        res.status(500).json({ error: 'Failed to fetch item category group' });
    }
});

// POST /api/master-data/item-category-groups - Create new item category group
router.post('/', async (req, res) => {
    try {
        const {
            group_code,
            group_name,
            description,
            is_active = true
        } = req.body;

        // Validation
        if (!group_code || !group_name) {
            return res.status(400).json({
                error: 'Missing required fields: group_code and group_name are required'
            });
        }

        // Validate code format (4 characters max)
        if (group_code.length > 4) {
            return res.status(400).json({
                error: 'group_code must be 4 characters or less'
            });
        }

        // Check for duplicate code
        const duplicateCheck = await pool.query(
            'SELECT id FROM item_category_groups WHERE group_code = $1',
            [group_code]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Item category group with this code already exists'
            });
        }

        const result = await pool.query(`
      INSERT INTO item_category_groups (
        group_code,
        group_name,
        description,
        is_active
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
            group_code.toUpperCase(),
            group_name,
            description || null,
            is_active
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating item category group:', error);
        res.status(500).json({ error: 'Failed to create item category group' });
    }
});

// PUT /api/master-data/item-category-groups/:id - Update item category group
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            group_code,
            group_name,
            description,
            is_active
        } = req.body;

        // Validation
        if (!group_code || !group_name) {
            return res.status(400).json({
                error: 'Missing required fields: group_code and group_name are required'
            });
        }

        // Check if exists
        const existsCheck = await pool.query(
            'SELECT id FROM item_category_groups WHERE id = $1',
            [id]
        );

        if (existsCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Item category group not found' });
        }

        // Check for duplicate code (excluding current record)
        const duplicateCheck = await pool.query(
            'SELECT id FROM item_category_groups WHERE group_code = $1 AND id != $2',
            [group_code, id]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Item category group with this code already exists'
            });
        }

        const result = await pool.query(`
      UPDATE item_category_groups
      SET 
        group_code = $1,
        group_name = $2,
        description = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
            group_code.toUpperCase(),
            group_name,
            description || null,
            is_active,
            id
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating item category group:', error);
        res.status(500).json({ error: 'Failed to update item category group' });
    }
});

// DELETE /api/master-data/item-category-groups/:id - Delete item category group
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if exists
        const existsCheck = await pool.query(
            'SELECT id, group_code FROM item_category_groups WHERE id = $1',
            [id]
        );

        if (existsCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Item category group not found' });
        }

        // TODO: Add foreign key checks when materials table is linked
        // For now, allow deletion

        await pool.query('DELETE FROM item_category_groups WHERE id = $1', [id]);

        res.json({
            message: 'Item category group deleted successfully',
            deleted_code: existsCheck.rows[0].group_code
        });
    } catch (error) {
        console.error('Error deleting item category group:', error);
        res.status(500).json({ error: 'Failed to delete item category group' });
    }
});

export default router;
