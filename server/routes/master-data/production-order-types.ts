import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// Get all production order types
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        order_type_code,
        description,
        default_priority,
        default_status,
        is_active,
        created_at,
        updated_at
      FROM production_order_types
      WHERE is_active = true
      ORDER BY order_type_code
    `);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching production order types:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch production order types', error: error.message });
  }
});

// Get production order type by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        order_type_code,
        description,
        default_priority,
        default_status,
        is_active,
        created_at,
        updated_at
      FROM production_order_types
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production order type not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching production order type:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch production order type', error: error.message });
  }
});

// Create new production order type
router.post('/', async (req, res) => {
  try {
    const {
      order_type_code,
      description,
      default_priority,
      default_status,
      is_active
    } = req.body;

    if (!order_type_code) {
      return res.status(400).json({ success: false, message: 'Order type code is required' });
    }

    const result = await pool.query(`
      INSERT INTO production_order_types (
        order_type_code, description, default_priority, default_status, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      order_type_code,
      description || null,
      default_priority || 'NORMAL',
      default_status || 'CREATED',
      is_active !== undefined ? is_active : true
    ]);

    res.status(201).json({ success: true, data: result.rows[0], message: 'Production order type created successfully' });
  } catch (error: any) {
    console.error('Error creating production order type:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ success: false, message: 'Order type code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create production order type', error: error.message });
  }
});

// Update production order type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      order_type_code,
      description,
      default_priority,
      default_status,
      is_active
    } = req.body;

    const result = await pool.query(`
      UPDATE production_order_types SET
        order_type_code = $1,
        description = $2,
        default_priority = $3,
        default_status = $4,
        is_active = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      order_type_code,
      description,
      default_priority,
      default_status,
      is_active,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production order type not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Production order type updated successfully' });
  } catch (error: any) {
    console.error('Error updating production order type:', error);
    res.status(500).json({ success: false, message: 'Failed to update production order type', error: error.message });
  }
});

// Delete production order type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM production_order_types WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production order type not found' });
    }
    res.json({ success: true, message: 'Production order type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting production order type:', error);
    res.status(500).json({ success: false, message: 'Failed to delete production order type', error: error.message });
  }
});

export default router;

