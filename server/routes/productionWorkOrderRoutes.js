/**
 * Production Work Order Routes
 * Handles production work order operations
 */

import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

// Get all production work orders
router.get('/api/production/work-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        wo.*,
        po.order_number as production_order_number,
        m.name as material_name,
        wc.name as work_center_name
      FROM production_work_orders wo
      LEFT JOIN production_orders po ON wo.production_order_id = po.id
      LEFT JOIN materials m ON wo.material_id = m.id
      LEFT JOIN work_centers wc ON wo.work_center_id = wc.id
      ORDER BY wo.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching production work orders:', error);
    res.status(500).json({ message: 'Error fetching production work orders', error: error.message });
  }
});

// Create new production work order
router.post('/api/production/work-orders', async (req, res) => {
  try {
    const { production_order_id, material_id, work_center_id, quantity, start_date, end_date, status } = req.body;
    
    const result = await pool.query(`
      INSERT INTO production_work_orders (production_order_id, material_id, work_center_id, quantity, start_date, end_date, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [production_order_id, material_id, work_center_id, quantity, start_date, end_date, status || 'planned']);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating production work order:', error);
    res.status(500).json({ message: 'Error creating production work order', error: error.message });
  }
});

export default router;