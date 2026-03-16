import express from 'express';
import { pool } from './db';

const testRouter = express.Router();

testRouter.get('/test-materials', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        code as material_code,
        name as description,
        type as material_type,
        base_uom as base_unit,
        base_unit_price as base_price
      FROM materials 
      WHERE is_active = true
      LIMIT 3
    `);

        console.log('TEST: Raw query result:', JSON.stringify(result.rows, null, 2));

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error: any) {
        console.error('TEST ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

export default testRouter;
