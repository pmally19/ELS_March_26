/**
 * Item Category Determination Backend API Routes
 * Manages SD (Sales & Distribution) Item Category Determination configuration
 */

import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /api/master-data/item-category-determination/determine - Determine item category
// Priority lookup: most specific (all 4 keys) → least specific (only docType + icGroup)
router.get('/determine', async (req, res) => {
    try {
        const {
            sales_document_type,
            item_category_group,
            usage = null,
            higher_level_item_category = null
        } = req.query as Record<string, string>;

        if (!sales_document_type || !item_category_group) {
            return res.status(400).json({
                error: 'sales_document_type and item_category_group are required'
            });
        }

        const sdType = sales_document_type.toUpperCase();
        const icGroup = item_category_group.toUpperCase();
        const usageVal = usage ? usage.toUpperCase() : null;
        const higherVal = higher_level_item_category ? higher_level_item_category.toUpperCase() : null;

        // SAP-style priority lookup: try from most specific to least specific
        const lookups = [
            // 1. All 4 keys match
            [sdType, icGroup, usageVal, higherVal],
            // 2. No higher-level
            [sdType, icGroup, usageVal, null],
            // 3. No usage
            [sdType, icGroup, null, higherVal],
            // 4. Only doc type + item category group (most common)
            [sdType, icGroup, null, null],
        ];

        let determined = null;

        for (const [dt, icg, u, hlc] of lookups) {
            const result = await pool.query(`
                SELECT item_category, description
                FROM item_category_determination
                WHERE sales_document_type = $1
                  AND item_category_group = $2
                  AND COALESCE(usage, '') = COALESCE($3, '')
                  AND COALESCE(higher_level_item_category, '') = COALESCE($4, '')
                  AND is_active = true
                LIMIT 1
            `, [dt, icg, u, hlc]);

            if (result.rows.length > 0) {
                determined = result.rows[0];
                break;
            }
        }

        if (!determined) {
            return res.json({
                found: false,
                item_category: null,
                message: `No determination found for docType=${sdType}, icGroup=${icGroup}`
            });
        }

        return res.json({
            found: true,
            item_category: determined.item_category,
            description: determined.description,
            sales_document_type: sdType,
            item_category_group: icGroup
        });
    } catch (error) {
        console.error('Error determining item category:', error);
        res.status(500).json({ error: 'Failed to determine item category' });
    }
});

// GET /api/master-data/item-category-determination - List all item category determination records
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        sales_document_type,
        item_category_group,
        usage,
        higher_level_item_category,
        item_category,
        description,
        is_active,
        created_at,
        updated_at
      FROM item_category_determination
      ORDER BY sales_document_type, item_category_group, usage, higher_level_item_category
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching item category determination records:', error);
        res.status(500).json({ error: 'Failed to fetch item category determination records' });
    }
});

// GET /api/master-data/item-category-determination/:id - Get single item category determination record
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        sales_document_type,
        item_category_group,
        usage,
        higher_level_item_category,
        item_category,
        description,
        is_active,
        created_at,
        updated_at
      FROM item_category_determination
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item category determination record not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching item category determination record:', error);
        res.status(500).json({ error: 'Failed to fetch item category determination record' });
    }
});

// POST /api/master-data/item-category-determination - Create new item category determination record
router.post('/', async (req, res) => {
    try {
        const {
            sales_document_type,
            item_category_group,
            usage,
            higher_level_item_category,
            item_category,
            description,
            is_active = true
        } = req.body;

        // Validation
        if (!sales_document_type || !item_category_group || !item_category) {
            return res.status(400).json({
                error: 'Missing required fields: sales_document_type, item_category_group, and item_category are required'
            });
        }

        // Validate field lengths (SAP standard: 4 characters max)
        if (sales_document_type.length > 4) {
            return res.status(400).json({ error: 'sales_document_type must be 4 characters or less' });
        }
        if (item_category_group.length > 4) {
            return res.status(400).json({ error: 'item_category_group must be 4 characters or less' });
        }
        if (item_category.length > 4) {
            return res.status(400).json({ error: 'item_category must be 4 characters or less' });
        }
        if (usage && usage.length > 4) {
            return res.status(400).json({ error: 'usage must be 4 characters or less' });
        }
        if (higher_level_item_category && higher_level_item_category.length > 4) {
            return res.status(400).json({ error: 'higher_level_item_category must be 4 characters or less' });
        }

        // Verify that the item_category_group exists
        const groupCheck = await pool.query(
            'SELECT group_code FROM item_category_groups WHERE group_code = $1',
            [item_category_group.toUpperCase()]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(400).json({
                error: `Item category group '${item_category_group}' does not exist. Please create it first.`
            });
        }

        // Check for duplicate combination
        const duplicateCheck = await pool.query(`
            SELECT id FROM item_category_determination 
            WHERE sales_document_type = $1 
              AND item_category_group = $2 
              AND COALESCE(usage, '') = COALESCE($3, '')
              AND COALESCE(higher_level_item_category, '') = COALESCE($4, '')
        `, [
            sales_document_type.toUpperCase(),
            item_category_group.toUpperCase(),
            usage?.toUpperCase() || null,
            higher_level_item_category?.toUpperCase() || null
        ]);

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Item category determination with this combination already exists'
            });
        }

        const result = await pool.query(`
      INSERT INTO item_category_determination (
        sales_document_type,
        item_category_group,
        usage,
        higher_level_item_category,
        item_category,
        description,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
            sales_document_type.toUpperCase(),
            item_category_group.toUpperCase(),
            usage?.toUpperCase() || null,
            higher_level_item_category?.toUpperCase() || null,
            item_category.toUpperCase(),
            description || null,
            is_active
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating item category determination record:', error);

        // Handle foreign key constraint violation
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Referenced item category group does not exist'
            });
        }

        res.status(500).json({ error: 'Failed to create item category determination record' });
    }
});

// PUT /api/master-data/item-category-determination/:id - Update item category determination record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            sales_document_type,
            item_category_group,
            usage,
            higher_level_item_category,
            item_category,
            description,
            is_active
        } = req.body;

        // Validation
        if (!sales_document_type || !item_category_group || !item_category) {
            return res.status(400).json({
                error: 'Missing required fields: sales_document_type, item_category_group, and item_category are required'
            });
        }

        // Check if exists
        const existsCheck = await pool.query(
            'SELECT id FROM item_category_determination WHERE id = $1',
            [id]
        );

        if (existsCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Item category determination record not found' });
        }

        // Verify that the item_category_group exists
        const groupCheck = await pool.query(
            'SELECT group_code FROM item_category_groups WHERE group_code = $1',
            [item_category_group.toUpperCase()]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(400).json({
                error: `Item category group '${item_category_group}' does not exist. Please create it first.`
            });
        }

        // Check for duplicate combination (excluding current record)
        const duplicateCheck = await pool.query(`
            SELECT id FROM item_category_determination 
            WHERE sales_document_type = $1 
              AND item_category_group = $2 
              AND COALESCE(usage, '') = COALESCE($3, '')
              AND COALESCE(higher_level_item_category, '') = COALESCE($4, '')
              AND id != $5
        `, [
            sales_document_type.toUpperCase(),
            item_category_group.toUpperCase(),
            usage?.toUpperCase() || null,
            higher_level_item_category?.toUpperCase() || null,
            id
        ]);

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Item category determination with this combination already exists'
            });
        }

        const result = await pool.query(`
      UPDATE item_category_determination
      SET 
        sales_document_type = $1,
        item_category_group = $2,
        usage = $3,
        higher_level_item_category = $4,
        item_category = $5,
        description = $6,
        is_active = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
            sales_document_type.toUpperCase(),
            item_category_group.toUpperCase(),
            usage?.toUpperCase() || null,
            higher_level_item_category?.toUpperCase() || null,
            item_category.toUpperCase(),
            description || null,
            is_active,
            id
        ]);

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating item category determination record:', error);

        // Handle foreign key constraint violation
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Referenced item category group does not exist'
            });
        }

        res.status(500).json({ error: 'Failed to update item category determination record' });
    }
});

// DELETE /api/master-data/item-category-determination/:id - Delete item category determination record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if exists
        const existsCheck = await pool.query(
            'SELECT id, sales_document_type, item_category_group FROM item_category_determination WHERE id = $1',
            [id]
        );

        if (existsCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Item category determination record not found' });
        }

        // TODO: Add foreign key checks when sales order items table references this
        // For now, allow deletion

        await pool.query('DELETE FROM item_category_determination WHERE id = $1', [id]);

        res.json({
            message: 'Item category determination record deleted successfully',
            deleted_record: {
                sales_document_type: existsCheck.rows[0].sales_document_type,
                item_category_group: existsCheck.rows[0].item_category_group
            }
        });
    } catch (error) {
        console.error('Error deleting item category determination record:', error);
        res.status(500).json({ error: 'Failed to delete item category determination record' });
    }
});

export default router;
