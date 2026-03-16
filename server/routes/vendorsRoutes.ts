import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get all vendors
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        type,
        email,
        phone,
        address,
        city,
        state,
        country,
        postal_code,
        currency,
        payment_terms,
        status,
        category,
        supplier_type,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId" as "tenantId"
      FROM vendors
      WHERE (is_active = true OR is_active IS NULL) 
        AND ("_deletedAt" IS NULL)
      ORDER BY name ASC
    `);

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({
            message: 'Failed to fetch vendors',
            error: error.message
        });
    }
});

// Get vendor by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        type,
        email,
        phone,
        address,
        city,
        state,
        country,
        postal_code,
        currency,
        payment_terms,
        status,
        category,
        supplier_type,
        tax_id,
        description,
        website,
        contact_name,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId" as "tenantId"
      FROM vendors
      WHERE id = $1 AND ("_deletedAt" IS NULL)
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({
            message: 'Failed to fetch vendor',
            error: error.message
        });
    }
});

// Create new vendor
router.post('/', async (req, res) => {
    try {
        const {
            code,
            name,
            type,
            email,
            phone,
            address,
            city,
            state,
            country,
            postal_code,
            currency,
            payment_terms,
            status,
            category,
            supplier_type,
            tax_id,
            description,
            website,
            contact_name
        } = req.body;

        // Get user ID and tenant ID from request if available, otherwise use defaults
        // Need to add this to the Request type/interface in a real auth setup
        const userId = (req as any).user?.id || 1;
        const tenantId = (req as any).user?.tenantId || '001';

        // Validate required fields
        if (!name) {
            return res.status(400).json({ message: 'Vendor name is required' });
        }

        const result = await pool.query(`
      INSERT INTO vendors (
        code, name, type, email, phone, address, city, state, country, 
        postal_code, currency, payment_terms, status, category, supplier_type,
        tax_id, description, website, contact_name, is_active,
        created_by, updated_by, "_tenantId"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true, $20, $21, $22)
      RETURNING *
    `, [
            code, name, type, email, phone, address, city, state, country,
            postal_code, currency, payment_terms, status || 'active', category, supplier_type,
            tax_id, description, website, contact_name, userId, userId, tenantId
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating vendor:', error);
        res.status(500).json({
            message: 'Failed to create vendor',
            error: error.message
        });
    }
});

// Update vendor
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            name,
            type,
            email,
            phone,
            address,
            city,
            state,
            country,
            postal_code,
            currency,
            payment_terms,
            status,
            category,
            supplier_type,
            tax_id,
            description,
            website,
            contact_name,
            is_active
        } = req.body;

        const userId = (req as any).user?.id || 1;

        const result = await pool.query(`
      UPDATE vendors SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        type = COALESCE($3, type),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        country = COALESCE($9, country),
        postal_code = COALESCE($10, postal_code),
        currency = COALESCE($11, currency),
        payment_terms = COALESCE($12, payment_terms),
        status = COALESCE($13, status),
        category = COALESCE($14, category),
        supplier_type = COALESCE($15, supplier_type),
        tax_id = COALESCE($16, tax_id),
        description = COALESCE($17, description),
        website = COALESCE($18, website),
        contact_name = COALESCE($19, contact_name),
        is_active = COALESCE($20, is_active),
        updated_by = $21,
        updated_at = NOW()
      WHERE id = $22 AND ("_deletedAt" IS NULL)
      RETURNING *
    `, [
            code, name, type, email, phone, address, city, state, country,
            postal_code, currency, payment_terms, status, category, supplier_type,
            tax_id, description, website, contact_name, is_active, userId, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating vendor:', error);
        res.status(500).json({
            message: 'Failed to update vendor',
            error: error.message
        });
    }
});

// Delete vendor (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id || 1;

        const result = await pool.query(`
      UPDATE vendors SET
        is_active = false,
        "_deletedAt" = NOW(),
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $1 AND ("_deletedAt" IS NULL)
      RETURNING *
    `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.json({ message: 'Vendor deleted successfully', vendor: result.rows[0] });
    } catch (error: any) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({
            message: 'Failed to delete vendor',
            error: error.message
        });
    }
});

export default router;
