/**
 * Purchase Request Routes
 * Handles purchase request operations
 */

import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

// Get all purchase requests
router.get('/api/purchase/requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pr.*
      FROM purchase_requests pr
      ORDER BY pr.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    res.status(500).json({ message: 'Error fetching purchase requests', error: error.message });
  }
});

// Create new purchase request
router.post('/api/purchase/requests', async (req, res) => {
  try {
    const { description, amount, priority, cost_center_id, requester_id, status } = req.body;
    
    const result = await pool.query(`
      INSERT INTO purchase_requests (description, amount, priority, cost_center_id, requester_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [description, amount, priority || 'Medium', cost_center_id, requester_id || 1, status || 'pending']);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating purchase request:', error);
    res.status(500).json({ message: 'Error creating purchase request', error: error.message });
  }
});

export default router;