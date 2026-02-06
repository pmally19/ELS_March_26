import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get all condition records with optional filters
router.get('/', async (req, res) => {
    try {
        const {
            condition_type,
            material_code,
            customer_code,
            is_active = 'true'
        } = req.query;

        let query = `
      SELECT 
        cr.*,
        ct.condition_name,
        ct.condition_class
      FROM condition_records cr
      LEFT JOIN condition_types ct ON cr.condition_type_code = ct.condition_code
      WHERE 1=1
    `;

        const params = [];
        let paramCount = 1;

        if (condition_type) {
            query += ` AND cr.condition_type_code = $${paramCount}`;
            params.push(condition_type);
            paramCount++;
        }

        if (material_code) {
            query += ` AND cr.material_code = $${paramCount}`;
            params.push(material_code);
            paramCount++;
        }

        if (customer_code) {
            query += ` AND cr.customer_code = $${paramCount}`;
            params.push(customer_code);
            paramCount++;
        }

        if (is_active === 'true') {
            query += ` AND cr.is_active = true`;
        }

        query += ` ORDER BY cr.condition_type_code, cr.created_at DESC`;

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
        ct.condition_class
      FROM condition_records cr
      LEFT JOIN condition_types ct ON cr.condition_type_code = ct.condition_code
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
            condition_type_code,
            material_code,
            customer_code,
            sales_org_id,
            distribution_channel_id,
            division_id,
            material_group,
            customer_group,
            quantity
        } = req.body;

        // Find most specific matching record (cascading specificity)
        const result = await pool.query(`
      SELECT *
      FROM condition_records
      WHERE condition_type_code = $1
        AND is_active = true
        AND valid_from <= CURRENT_DATE
        AND valid_to >= CURRENT_DATE
        AND (
          -- Exact match on all keys (highest priority)
          (customer_code = $2 AND material_code = $3) OR
          -- Match on customer only
          (customer_code = $2 AND material_code IS NULL) OR
          -- Match on material only
          (customer_code IS NULL AND material_code = $3) OR
          -- Match on groups
          (customer_group = $4 AND material_group = $5) OR
          -- Generic (no specific assignment)
          (customer_code IS NULL AND material_code IS NULL AND customer_group IS NULL AND material_group IS NULL)
        )
        -- Handle scale pricing if quantity provided
        AND (
          $6::decimal IS NULL OR
          scale_quantity_from IS NULL OR
          ($6 >= scale_quantity_from AND $6 <= scale_quantity_to)
        )
      ORDER BY
        -- Prioritize more specific records
        CASE
          WHEN customer_code IS NOT NULL AND material_code IS NOT NULL THEN 1
          WHEN customer_code IS NOT NULL THEN 2
          WHEN material_code IS NOT NULL THEN 3
          WHEN customer_group IS NOT NULL AND material_group IS NOT NULL THEN 4
          ELSE 5
        END,
        -- Within same specificity, prefer scale records for exact quantity match
        CASE WHEN scale_quantity_from IS NOT NULL THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT 1
    `, [condition_type_code, customer_code, material_code, customer_group, material_group, quantity]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'No matching condition record found',
                condition_type_code
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
            condition_type_code,
            company_code_id,
            sales_org_id,
            distribution_channel_id,
            division_id,
            customer_code,
            material_code,
            material_group,
            customer_group,
            condition_value,
            currency = 'INR',
            per_unit = 1,
            unit_of_measure,
            calculation_type = 'A',
            valid_from,
            valid_to = '9999-12-31',
            scale_quantity_from,
            scale_quantity_to,
            is_active = true,
            created_by
        } = req.body;

        // Validation
        if (!condition_type_code || !condition_value || !valid_from) {
            return res.status(400).json({
                error: 'Missing required fields: condition_type_code, condition_value, valid_from'
            });
        }

        const result = await pool.query(`
      INSERT INTO condition_records (
        condition_type_code, company_code_id, sales_org_id, distribution_channel_id, division_id,
        customer_code, material_code, material_group, customer_group,
        condition_value, currency, per_unit, unit_of_measure, calculation_type,
        valid_from, valid_to, scale_quantity_from, scale_quantity_to, is_active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING *
    `, [
            condition_type_code, company_code_id, sales_org_id, distribution_channel_id, division_id,
            customer_code, material_code, material_group, customer_group,
            condition_value, currency, per_unit, unit_of_measure, calculation_type,
            valid_from, valid_to, scale_quantity_from, scale_quantity_to, is_active, created_by
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
            condition_value,
            currency,
            per_unit,
            unit_of_measure,
            calculation_type,
            valid_from,
            valid_to,
            scale_quantity_from,
            scale_quantity_to,
            is_active
        } = req.body;

        const result = await pool.query(`
      UPDATE condition_records
      SET 
        condition_value = COALESCE($1, condition_value),
        currency = COALESCE($2, currency),
        per_unit = COALESCE($3, per_unit),
        unit_of_measure = COALESCE($4, unit_of_measure),
        calculation_type = COALESCE($5, calculation_type),
        valid_from = COALESCE($6, valid_from),
        valid_to = COALESCE($7, valid_to),
        scale_quantity_from = $8,
        scale_quantity_to = $9,
        is_active = COALESCE($10, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
            condition_value, currency, per_unit, unit_of_measure, calculation_type,
            valid_from, valid_to, scale_quantity_from, scale_quantity_to, is_active, id
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
