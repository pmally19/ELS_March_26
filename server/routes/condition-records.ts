import express from 'express';
import { pool } from '../db';

const router = express.Router();

/**
 * Condition Records CRUD
 * Actual DB columns: id, condition_type, material_id, customer_id, sales_organization,
 *   valid_from, valid_to, amount, currency, unit, is_active, created_at
 */

// Get all condition records with optional filters
router.get('/', async (req, res) => {
    try {
        const {
            condition_type,
            material_id,
            customer_id,
            distribution_channel,
            is_active = 'true'
        } = req.query;

        let query = `
      SELECT 
        cr.*,
        ct.condition_name,
        ct.condition_category as condition_class
      FROM condition_records cr
      LEFT JOIN condition_types ct ON cr.condition_type = ct.condition_code
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramCount = 1;

        if (condition_type) {
            query += ` AND cr.condition_type = $${paramCount}`;
            params.push(condition_type);
            paramCount++;
        }

        if (material_id) {
            query += ` AND cr.material_id = $${paramCount}`;
            params.push(material_id);
            paramCount++;
        }

        if (customer_id) {
            query += ` AND cr.customer_id = $${paramCount}`;
            params.push(customer_id);
            paramCount++;
        }

        if (distribution_channel) {
            query += ` AND cr.distribution_channel = $${paramCount}`;
            params.push(distribution_channel);
            paramCount++;
        }

        if (is_active === 'true') {
            query += ` AND cr.is_active = true`;
        }

        query += ` ORDER BY cr.condition_type, cr.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching condition records:', error);
        res.status(500).json({ error: 'Failed to fetch condition records' });
    }
});

// Get specific condition record
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        cr.*,
        ct.condition_name,
        ct.condition_category as condition_class
      FROM condition_records cr
      LEFT JOIN condition_types ct ON cr.condition_type = ct.condition_code
      WHERE cr.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Condition record not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching condition record:', error);
        res.status(500).json({ error: 'Failed to fetch condition record' });
    }
});

// Search condition records for pricing context
router.post('/search', async (req, res) => {
    try {
        const {
            condition_type,
            material_id,
            customer_id,
        } = req.body;

        // Find most specific matching record (cascading specificity)
        const result = await pool.query(`
      SELECT *
      FROM condition_records
      WHERE condition_type = $1
        AND is_active = true
        AND valid_from <= CURRENT_DATE
        AND valid_to >= CURRENT_DATE
        AND (
          (customer_id = $2 AND material_id = $3) OR
          (customer_id = $2 AND material_id IS NULL) OR
          (customer_id IS NULL AND material_id = $3) OR
          (customer_id IS NULL AND material_id IS NULL)
        )
      ORDER BY
        CASE
          WHEN customer_id IS NOT NULL AND material_id IS NOT NULL THEN 1
          WHEN customer_id IS NOT NULL THEN 2
          WHEN material_id IS NOT NULL THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT 1
    `, [condition_type, customer_id || null, material_id || null]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'No matching condition record found',
                condition_type
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error searching condition records:', error);
        res.status(500).json({ error: 'Failed to search condition records' });
    }
});

// Create condition record
router.post('/', async (req, res) => {
    try {
        const {
            condition_type,
            // Also accept legacy field name from frontend
            condition_type_code,
            material_id,
            customer_id,
            sales_organization,
            amount,
            // Also accept legacy field name
            condition_value,
            currency = 'USD',
            unit,
            per = 1,
            distribution_channel,
            valid_from,
            valid_to = '2099-12-31',
            is_active = true,
        } = req.body;

        const actualConditionType = condition_type || condition_type_code;
        const actualAmount = amount || condition_value;

        // Validation
        if (!actualConditionType || !actualAmount || !valid_from) {
            return res.status(400).json({
                error: 'Missing required fields: condition_type, amount, valid_from'
            });
        }

        const result = await pool.query(`
      INSERT INTO condition_records (
        condition_type, material_id, customer_id, sales_organization, distribution_channel,
        amount, currency, unit, per,
        valid_from, valid_to, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      RETURNING *
    `, [
            actualConditionType, material_id || null, customer_id || null, sales_organization || null, distribution_channel || null,
            actualAmount, currency, unit || null, per || 1,
            valid_from, valid_to, is_active
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating condition record:', error);
        res.status(500).json({ error: 'Failed to create condition record' });
    }
});

// Update condition record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            amount,
            condition_value,
            currency,
            unit,
            per,
            distribution_channel,
            valid_from,
            valid_to,
            is_active
        } = req.body;

        const actualAmount = amount || condition_value;

        const result = await pool.query(`
      UPDATE condition_records
      SET 
        amount = COALESCE($1, amount),
        currency = COALESCE($2, currency),
        unit = COALESCE($3, unit),
        per = COALESCE($4, per),
        distribution_channel = COALESCE($5, distribution_channel),
        valid_from = COALESCE($6, valid_from),
        valid_to = COALESCE($7, valid_to),
        is_active = COALESCE($8, is_active)
      WHERE id = $9
      RETURNING *
    `, [
            actualAmount, currency, unit, per, distribution_channel,
            valid_from, valid_to, is_active, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Condition record not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating condition record:', error);
        res.status(500).json({ error: 'Failed to update condition record' });
    }
});

// Delete condition record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM condition_records WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Condition record not found' });
        }

        res.json({ message: 'Condition record deleted successfully' });
    } catch (error) {
        console.error('Error deleting condition record:', error);
        res.status(500).json({ error: 'Failed to delete condition record' });
    }
});

export default router;
