import express from 'express';
import { pool } from '../../db';

const router = express.Router();

// Fixed: Updated to use sd_sales_organizations table

// Get all determinations
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        ppd.id,
        ppd.sales_organization_id, so.name as sales_organization_name, so.code as sales_org_code,
        ppd.distribution_channel_id, dc.name as distribution_channel_name, dc.code as distribution_channel_code,
        ppd.division_id, dv.name as division_name, dv.code as division_code,
        ppd.customer_pricing_procedure_id, cpp.procedure_code as customer_pricing_procedure_code, cpp.description as customer_pricing_procedure_description,
        ppd.document_pricing_procedure_id, dpp.procedure_code as document_pricing_procedure_code, dpp.description as document_pricing_procedure_description,
        ppd.pricing_procedure_id, pp.procedure_code as pricing_procedure_code, pp.procedure_name as pricing_procedure_name
      FROM pricing_procedure_determinations ppd
      JOIN sd_sales_organizations so ON ppd.sales_organization_id = so.id
      JOIN sd_distribution_channels dc ON ppd.distribution_channel_id = dc.id
      JOIN sd_divisions dv ON ppd.division_id = dv.id
      JOIN customer_pricing_procedures cpp ON ppd.customer_pricing_procedure_id = cpp.id
      JOIN document_pricing_procedures dpp ON ppd.document_pricing_procedure_id = dpp.id
      JOIN pricing_procedures pp ON ppd.pricing_procedure_id = pp.id
      ORDER BY so.code, dc.code, dv.code
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pricing determinations:', error);
        res.status(500).json({ error: 'Failed to fetch pricing determinations' });
    }
});

// Create determination
router.post('/', async (req, res) => {
    try {
        const {
            sales_organization_id,
            distribution_channel_id,
            division_id,
            customer_pricing_procedure_id,
            document_pricing_procedure_id,
            pricing_procedure_id
        } = req.body;

        // Validate inputs
        if (!sales_organization_id || !distribution_channel_id || !division_id ||
            !customer_pricing_procedure_id || !document_pricing_procedure_id || !pricing_procedure_id) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check existing rule
        const existing = await pool.query(`
      SELECT id FROM pricing_procedure_determinations 
      WHERE sales_organization_id = $1 
      AND distribution_channel_id = $2
      AND division_id = $3
      AND customer_pricing_procedure_id = $4
      AND document_pricing_procedure_id = $5
    `, [sales_organization_id, distribution_channel_id, division_id, customer_pricing_procedure_id, document_pricing_procedure_id]);

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Determination rule already exists for this combination' });
        }

        const result = await pool.query(`
      INSERT INTO pricing_procedure_determinations (
        sales_organization_id, distribution_channel_id, division_id,
        customer_pricing_procedure_id, document_pricing_procedure_id, pricing_procedure_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [sales_organization_id, distribution_channel_id, division_id, customer_pricing_procedure_id, document_pricing_procedure_id, pricing_procedure_id]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating pricing determination:', error);
        res.status(500).json({ error: 'Failed to create pricing determination' });
    }
});

// Delete determination
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM pricing_procedure_determinations WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Determination not found' });
        }

        res.json({ message: 'Determination deleted successfully' });
    } catch (error) {
        console.error('Error deleting pricing determination:', error);
        res.status(500).json({ error: 'Failed to delete pricing determination' });
    }
});

export default router;
