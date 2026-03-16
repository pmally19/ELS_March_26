import { Router } from 'express';
import { pool } from '../../db.js';

const router = Router();

/**
 * GET /api/sales/document-types
 * Fetch document types by category
 * Query params: category (optional) - e.g., 'QUOTATION', 'ORDER', 'DELIVERY', 'BILLING'
 */
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;

        let query = `
      SELECT 
        id,
        code,
        name,
        category,
        number_range,
        is_active
      FROM sd_document_types
      WHERE is_active = true
    `;

        const params = [];

        if (category) {
            query += ' AND category = $1';
            params.push(category);
        }

        query += ' ORDER BY category, code';

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching document types:', error);
        res.status(500).json({
            error: 'Failed to fetch document types',
            message: error.message
        });
    }
});

/**
 * GET /api/sales/document-types/:code
 * Fetch a specific document type by code
 */
router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        category,
        number_range,
        is_active
      FROM sd_document_types
      WHERE code = $1 AND is_active = true
    `, [code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document type not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching document type:', error);
        res.status(500).json({
            error: 'Failed to fetch document type',
            message: error.message
        });
    }
});

export default router;
