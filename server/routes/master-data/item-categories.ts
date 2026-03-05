/**
 * Item Categories Backend API Routes
 * Manages SD (Sales & Distribution) Item Categories master data
 */

import { Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// GET /api/master-data/item-categories - List all item categories
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        item_type,
        delivery_relevant,
        billing_relevant,
        pricing_relevant,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId",
        "_deletedAt"
      FROM sd_item_categories
      WHERE "_deletedAt" IS NULL
      ORDER BY code
    `);

        res.json(result.rows.map(row => ({
            id: row.id,
            code: row.code,
            name: row.name,
            itemType: row.item_type,
            deliveryRelevant: row.delivery_relevant,
            billingRelevant: row.billing_relevant,
            pricingRelevant: row.pricing_relevant,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt,
        })));
    } catch (error) {
        console.error('Error fetching item categories:', error);
        res.status(500).json({ error: 'Failed to fetch item categories' });
    }
});

// GET /api/master-data/item-categories/:id - Get single item category
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        item_type,
        delivery_relevant,
        billing_relevant,
        pricing_relevant,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId",
        "_deletedAt"
      FROM sd_item_categories
      WHERE id = $1 AND "_deletedAt" IS NULL
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item category not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.id,
            code: row.code,
            name: row.name,
            itemType: row.item_type,
            deliveryRelevant: row.delivery_relevant,
            billingRelevant: row.billing_relevant,
            pricingRelevant: row.pricing_relevant,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt,
        });
    } catch (error) {
        console.error('Error fetching item category:', error);
        res.status(500).json({ error: 'Failed to fetch item category' });
    }
});

// POST /api/master-data/item-categories - Create new item category
router.post('/', async (req: any, res) => {
    try {
        const {
            code,
            name,
            itemType,
            deliveryRelevant = true,
            billingRelevant = true,
            pricingRelevant = true,
        } = req.body;

        const tenantId = req.user?.tenantId || '001';
        const userId = req.user?.id || 1;

        // Validation
        if (!code || !name || !itemType) {
            return res.status(400).json({
                error: 'Code, name, and item type are required'
            });
        }

        // Check code length (max 4 characters)
        if (code.length > 4) {
            return res.status(400).json({
                error: 'Code must be 4 characters or less'
            });
        }

        const result = await pool.query(`
      INSERT INTO sd_item_categories(
            code,
            name,
            item_type,
            delivery_relevant,
            billing_relevant,
            pricing_relevant,
            "_tenantId",
            created_by,
            updated_by
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
        `, [
            code.toUpperCase(),
            name,
            itemType,
            deliveryRelevant,
            billingRelevant,
            pricingRelevant,
            tenantId,
            userId,
            userId
        ]);

        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            code: row.code,
            name: row.name,
            itemType: row.item_type,
            deliveryRelevant: row.delivery_relevant,
            billingRelevant: row.billing_relevant,
            pricingRelevant: row.pricing_relevant,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt,
        });
    } catch (error) {
        console.error('Error creating item category:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Item category code already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create item category' });
        }
    }
});

// PUT /api/master-data/item-categories/:id - Update item category
router.put('/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            itemType,
            deliveryRelevant,
            billingRelevant,
            pricingRelevant,
        } = req.body;

        const userId = req.user?.id || 1;

        const result = await pool.query(`
      UPDATE sd_item_categories
      SET 
        name = COALESCE($1, name),
        item_type = COALESCE($2, item_type),
        delivery_relevant = COALESCE($3, delivery_relevant),
        billing_relevant = COALESCE($4, billing_relevant),
        pricing_relevant = COALESCE($5, pricing_relevant),
        updated_at = NOW(),
        updated_by = $6
      WHERE id = $7 AND "_deletedAt" IS NULL
      RETURNING *
    `, [
            name,
            itemType,
            deliveryRelevant,
            billingRelevant,
            pricingRelevant,
            userId,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item category not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.id,
            code: row.code,
            name: row.name,
            itemType: row.item_type,
            deliveryRelevant: row.delivery_relevant,
            billingRelevant: row.billing_relevant,
            pricingRelevant: row.pricing_relevant,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt,
        });
    } catch (error) {
        console.error('Error updating item category:', error);
        res.status(500).json({ error: 'Failed to update item category' });
    }
});

// DELETE /api/master-data/item-categories/:id - Delete item category
router.delete('/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || 1;

        const result = await pool.query(`
      UPDATE sd_item_categories
      SET "_deletedAt" = NOW(), updated_by = $1, updated_at = NOW()
      WHERE id = $2 AND "_deletedAt" IS NULL
      RETURNING id
    `, [userId, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item category not found' });
        }

        res.json({ message: 'Item category deleted successfully' });
    } catch (error) {
        console.error('Error deleting item category:', error);
        res.status(500).json({ error: 'Failed to delete item category' });
    }
});

export default router;
