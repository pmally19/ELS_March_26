import { Router } from 'express';
import { pool } from '../db';
import { z } from 'zod';

const router = Router();

// Schema for application tiles
const applicationTileSchema = z.object({
  tile_name: z.string(),
  tile_description: z.string(),
  tile_category: z.string(),
  tile_status: z.enum(['active', 'inactive', 'development', 'testing']),
  tile_type: z.string(),
  tile_url: z.string().optional(),
  tile_icon: z.string().optional(),
  tile_order: z.number().optional(),
  module_name: z.string().optional()
});

// Get all application tiles
router.get('/', async (req, res) => {
  try {
    const tiles = await pool.query(`
      SELECT * FROM application_tiles 
      ORDER BY tile_order ASC, tile_name ASC
    `);
    
    res.json({
      success: true,
      tiles: tiles.rows
    });
  } catch (error) {
    console.error('Error fetching application tiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application tiles'
    });
  }
});

// Create new application tile
router.post('/', async (req, res) => {
  try {
    const validatedData = applicationTileSchema.parse(req.body);
    
    const result = await pool.query(`
      INSERT INTO application_tiles (
        tile_name, tile_description, tile_category, tile_status, 
        tile_type, tile_url, tile_icon, tile_order, module_name,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *
    `, [
      validatedData.tile_name,
      validatedData.tile_description,
      validatedData.tile_category,
      validatedData.tile_status,
      validatedData.tile_type,
      validatedData.tile_url || '',
      validatedData.tile_icon || 'square',
      validatedData.tile_order || 100,
      validatedData.module_name || 'general'
    ]);
    
    res.json({
      success: true,
      tile: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating application tile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create application tile'
    });
  }
});

// Update application tile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = applicationTileSchema.parse(req.body);
    
    const result = await pool.query(`
      UPDATE application_tiles 
      SET tile_name = $1, tile_description = $2, tile_category = $3, 
          tile_status = $4, tile_type = $5, tile_url = $6, 
          tile_icon = $7, tile_order = $8, module_name = $9,
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      validatedData.tile_name,
      validatedData.tile_description,
      validatedData.tile_category,
      validatedData.tile_status,
      validatedData.tile_type,
      validatedData.tile_url,
      validatedData.tile_icon,
      validatedData.tile_order,
      validatedData.module_name,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application tile not found'
      });
    }
    
    res.json({
      success: true,
      tile: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating application tile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application tile'
    });
  }
});

// Delete application tile
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM application_tiles 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application tile not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Application tile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting application tile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete application tile'
    });
  }
});

// Get tile statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        tile_status,
        COUNT(*) as count
      FROM application_tiles 
      GROUP BY tile_status
      ORDER BY tile_status
    `);
    
    res.json({
      success: true,
      stats: stats.rows
    });
  } catch (error) {
    console.error('Error fetching tile statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tile statistics'
    });
  }
});

export default router;