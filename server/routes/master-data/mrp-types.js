import express from 'express';
import { pool } from '../../db';

const router = express.Router();

// Get all MRP types
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        planning_indicator,
        is_active,
        created_at,
        updated_at
      FROM mrp_types
      WHERE is_active = true
      ORDER BY code
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching MRP types:', error);
    res.status(500).json({ error: 'Failed to fetch MRP types' });
  }
});

// Get MRP type by code
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        planning_indicator,
        is_active,
        created_at,
        updated_at
      FROM mrp_types
      WHERE code = $1 AND is_active = true
    `, [code]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MRP type not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching MRP type:', error);
    res.status(500).json({ error: 'Failed to fetch MRP type' });
  }
});

// Create MRP type
router.post('/', async (req, res) => {
  try {
    const { code, name, description, planning_indicator, is_active, created_by } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }
    
    if (planning_indicator === undefined) {
      return res.status(400).json({ error: 'Planning indicator is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO mrp_types (code, name, description, planning_indicator, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      code,
      name,
      description || null,
      planning_indicator,
      is_active !== undefined ? is_active : true,
      created_by || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'MRP type code already exists' });
    }
    console.error('Error creating MRP type:', error);
    res.status(500).json({ error: 'Failed to create MRP type' });
  }
});

// Update MRP type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, planning_indicator, is_active, updated_by } = req.body;
    
    const result = await pool.query(`
      UPDATE mrp_types
      SET 
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        planning_indicator = COALESCE($4, planning_indicator),
        is_active = COALESCE($5, is_active),
        updated_by = COALESCE($6, updated_by),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [code, name, description, planning_indicator, is_active, updated_by, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MRP type not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'MRP type code already exists' });
    }
    console.error('Error updating MRP type:', error);
    res.status(500).json({ error: 'Failed to update MRP type' });
  }
});

// Delete MRP type (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if MRP type is in use
    const inUseCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM material_mrp_data
      WHERE mrp_type IN (SELECT code FROM mrp_types WHERE id = $1)
    `, [id]);
    
    if (parseInt(inUseCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete MRP type that is in use. Deactivate it instead.' 
      });
    }
    
    const result = await pool.query(`
      UPDATE mrp_types
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MRP type not found' });
    }
    
    res.json({ message: 'MRP type deactivated successfully' });
  } catch (error) {
    console.error('Error deleting MRP type:', error);
    res.status(500).json({ error: 'Failed to delete MRP type' });
  }
});

export default router;

