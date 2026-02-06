// Direct, simpler approval level implementation that doesn't depend on ORM

const express = require('express');

import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

// Create a direct pool connection 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create router
const router = express.Router();

// Create the approval_levels table if it doesn't exist
router.use(async (req, res, next) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approval_levels (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        value_limit NUMERIC NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    next();
  } catch (error) {
    console.error("Error ensuring approval_levels table exists:", error);
    next();
  }
});

// GET /api/approval-levels
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      ORDER BY level ASC
    `);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching approval levels:", error);
    return res.status(500).json({ message: `Failed to fetch approval levels: ${error.message}` });
  }
});

// GET /api/approval-levels/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching approval level by ID:", error);
    return res.status(500).json({ message: `Failed to fetch approval level: ${error.message}` });
  }
});

// POST /api/approval-levels
router.post('/', async (req, res) => {
  try {
    const { level, name, description, value_limit } = req.body;
    
    console.log("Creating approval level with data:", { level, name, description, value_limit });
    
    if (!level || !name) {
      return res.status(400).json({ message: "Level and name are required fields" });
    }
    
    const result = await pool.query(`
      INSERT INTO approval_levels (level, name, description, value_limit)
      VALUES ($1, $2, $3, $4)
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description || null, value_limit || null]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating approval level:", error);
    return res.status(500).json({ message: `Failed to create approval level: ${error.message}` });
  }
});

// PUT /api/approval-levels/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, name, description, value_limit } = req.body;
    
    if (!level || !name) {
      return res.status(400).json({ message: "Level and name are required fields" });
    }
    
    const result = await pool.query(`
      UPDATE approval_levels
      SET level = $1, 
          name = $2, 
          description = $3, 
          value_limit = $4, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description || null, value_limit || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating approval level:", error);
    return res.status(500).json({ message: `Failed to update approval level: ${error.message}` });
  }
});

// DELETE /api/approval-levels/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM approval_levels
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    return res.status(200).json({ message: `Approval level with ID ${id} successfully deleted` });
  } catch (error) {
    console.error("Error deleting approval level:", error);
    return res.status(500).json({ message: `Failed to delete approval level: ${error.message}` });
  }
});

module.exports = router;