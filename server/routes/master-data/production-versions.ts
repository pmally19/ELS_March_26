import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /api/master-data/production-versions
router.get('/', async (req, res) => {
  try {
    const { materialId, plantId, versionNumber } = req.query;
    
    let query = `
      SELECT 
        pv.*,
        m.code as material_code,
        COALESCE(m.name, m.description, m.code) as material_name,
        p.code as plant_code,
        p.name as plant_name,
        bom.code as bom_code,
        CASE 
          WHEN pv.routing_model_type = 'legacy' THEN r.routing_code
          ELSE rm.routing_group_code
        END as routing_code
      FROM production_versions pv
      LEFT JOIN materials m ON pv.material_id = m.id
      LEFT JOIN plants p ON pv.plant_id = p.id
      LEFT JOIN bill_of_materials bom ON pv.bom_id = bom.id
      LEFT JOIN routings r ON pv.routing_id::text = r.routing_id AND pv.routing_model_type = 'legacy'
      LEFT JOIN routing_master rm ON pv.routing_id = rm.id AND pv.routing_model_type = 'modern'
      WHERE pv.is_active = true
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (materialId) {
      query += ` AND pv.material_id = $${paramIndex}`;
      params.push(materialId);
      paramIndex++;
    }
    if (plantId) {
      query += ` AND pv.plant_id = $${paramIndex}`;
      params.push(plantId);
      paramIndex++;
    }
    if (versionNumber) {
      query += ` AND pv.version_number = $${paramIndex}`;
      params.push(versionNumber);
      paramIndex++;
    }
    
    query += ' ORDER BY pv.material_id, pv.plant_id, pv.valid_from DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching production versions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/master-data/production-versions/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        pv.*,
        m.code as material_code,
        COALESCE(m.name, m.description, m.code) as material_name,
        p.code as plant_code,
        p.name as plant_name,
        bom.code as bom_code,
        CASE 
          WHEN pv.routing_model_type = 'legacy' THEN r.routing_code
          ELSE rm.routing_group_code
        END as routing_code
      FROM production_versions pv
      LEFT JOIN materials m ON pv.material_id = m.id
      LEFT JOIN plants p ON pv.plant_id = p.id
      LEFT JOIN bill_of_materials bom ON pv.bom_id = bom.id
      LEFT JOIN routings r ON pv.routing_id::text = r.routing_id AND pv.routing_model_type = 'legacy'
      LEFT JOIN routing_master rm ON pv.routing_id = rm.id AND pv.routing_model_type = 'modern'
      WHERE pv.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production version not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching production version:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/master-data/production-versions
router.post('/', async (req, res) => {
  try {
    const {
      material_id,
      plant_id,
      version_number,
      bom_id,
      routing_id,
      routing_model_type,
      valid_from,
      valid_to,
      lot_size_from,
      lot_size_to,
      description
    } = req.body;
    
    // Validation
    if (!material_id || !plant_id || !version_number || !bom_id || !routing_id || !valid_from) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: material_id, plant_id, version_number, bom_id, routing_id, valid_from'
      });
    }
    
    // Verify material exists
    const materialCheck = await pool.query('SELECT id FROM materials WHERE id = $1 AND is_active = true', [material_id]);
    if (materialCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Material not found or inactive' });
    }
    
    // Verify plant exists
    const plantCheck = await pool.query('SELECT id FROM plants WHERE id = $1 AND is_active = true', [plant_id]);
    if (plantCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Plant not found or inactive' });
    }
    
    // Verify BOM exists
    const bomCheck = await pool.query('SELECT id FROM bill_of_materials WHERE id = $1', [bom_id]);
    if (bomCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Bill of Materials not found' });
    }
    
    const result = await pool.query(`
      INSERT INTO production_versions (
        material_id, plant_id, version_number, bom_id, routing_id, routing_model_type,
        valid_from, valid_to, lot_size_from, lot_size_to, description, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      material_id, plant_id, version_number, bom_id, routing_id, routing_model_type || 'legacy',
      valid_from, valid_to || null, lot_size_from || 0, lot_size_to || null, description || null
    ]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Production version already exists for this material/plant combination'
      });
    }
    console.error('Error creating production version:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/master-data/production-versions/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bom_id,
      routing_id,
      routing_model_type,
      valid_from,
      valid_to,
      lot_size_from,
      lot_size_to,
      description,
      is_active
    } = req.body;
    
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (bom_id !== undefined) {
      updates.push(`bom_id = $${paramIndex}`);
      params.push(bom_id);
      paramIndex++;
    }
    if (routing_id !== undefined) {
      updates.push(`routing_id = $${paramIndex}`);
      params.push(routing_id);
      paramIndex++;
    }
    if (routing_model_type !== undefined) {
      updates.push(`routing_model_type = $${paramIndex}`);
      params.push(routing_model_type);
      paramIndex++;
    }
    if (valid_from !== undefined) {
      updates.push(`valid_from = $${paramIndex}`);
      params.push(valid_from);
      paramIndex++;
    }
    if (valid_to !== undefined) {
      updates.push(`valid_to = $${paramIndex}`);
      params.push(valid_to);
      paramIndex++;
    }
    if (lot_size_from !== undefined) {
      updates.push(`lot_size_from = $${paramIndex}`);
      params.push(lot_size_from);
      paramIndex++;
    }
    if (lot_size_to !== undefined) {
      updates.push(`lot_size_to = $${paramIndex}`);
      params.push(lot_size_to);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const result = await pool.query(`
      UPDATE production_versions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production version not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating production version:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/master-data/production-versions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if used by any production orders
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM production_orders WHERE production_version_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete production version that is used by production orders'
      });
    }
    
    const result = await pool.query('DELETE FROM production_versions WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Production version not found' });
    }
    
    res.json({ success: true, message: 'Production version deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting production version:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

