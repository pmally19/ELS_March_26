import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Get all materials
router.get('/', async (req, res) => {
  try {
    const { plant_code, company_code_id } = req.query;

    // Build WHERE clause and joins based on query parameters
    let joins = '';
    let whereClause = 'WHERE m.is_active = true';
    const params: any[] = [];
    let paramIndex = 1;

    // If filtering by company, join with plants table
    if (company_code_id) {
      joins = 'LEFT JOIN plants p ON m.plant_code = p.code';
      whereClause += ` AND p.company_code_id = $${paramIndex}`;
      params.push(parseInt(company_code_id as string));
      paramIndex++;
    }

    // If also filtering by specific plant
    if (plant_code) {
      whereClause += ` AND m.plant_code = $${paramIndex}`;
      params.push(plant_code);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT 
        m.id,
        m.code,
        m.name,
        m.description,
        m.type,
        m.base_uom,
        m.base_unit_price,
        m.plant_code,
        m.material_group,
        m.cost_center,
        m.purchasing_group,
        m.purchase_organization,
        m.production_storage_location,
        m.planned_delivery_time,
        m.is_active,
        m.created_at,
        m.updated_at
      FROM materials m
      ${joins}
      ${whereClause}
      ORDER BY m.name
    `, params);

    // Transform to match frontend expectations
    const transformedResult = result.rows.map((material: any) => ({
      id: material.id,
      code: material.code,
      name: material.name,
      description: material.description,
      type: material.type,
      base_uom: material.base_uom,
      base_unit_price: material.base_unit_price ? parseFloat(material.base_unit_price) : null,
      plant_code: material.plant_code,
      material_group: material.material_group,
      cost_center: material.cost_center,
      purchasing_group: material.purchasing_group,
      purchase_organization: material.purchase_organization,
      production_storage_location: material.production_storage_location,
      planned_delivery_time: material.planned_delivery_time,
      is_active: material.is_active,
      created_at: material.created_at,
      updated_at: material.updated_at
    }));

    res.json(transformedResult);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials', details: error.message });
  }
});

// Get material by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        id,
        code as material_code,
        name as description,
        type as material_type,
        base_uom as base_unit,
        base_unit_price as base_price,
        is_active,
        created_at,
        updated_at
      FROM materials 
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = result.rows[0];

    // Transform database fields to frontend expected format
    const transformedMaterial = {
      id: material.id,
      material_code: material.material_code,
      description: material.description,
      material_type: material.material_type,
      base_unit: material.base_unit,
      industry_sector: 'M',
      material_group: '',
      base_price: parseFloat(material.base_price) || 0,
      gross_weight: 0,
      net_weight: 0,
      weight_unit: 'KG',
      volume: 0,
      volume_unit: 'L',
      is_active: material.is_active,
      created_at: material.created_at,
      updated_at: material.updated_at
    };

    res.json(transformedMaterial);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// Update material (PATCH endpoint)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.material_code !== undefined) {
      updateFields.push(`code = $${paramCount++}`);
      values.push(updateData.material_code);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(updateData.description);
    }
    if (updateData.material_type !== undefined) {
      updateFields.push(`type = $${paramCount++}`);
      values.push(updateData.material_type);
    }
    if (updateData.base_unit !== undefined) {
      updateFields.push(`base_uom = $${paramCount++}`);
      values.push(updateData.base_unit);
    }
    if (updateData.base_price !== undefined) {
      updateFields.push(`base_unit_price = $${paramCount++}`);
      values.push(updateData.base_price);
    }
    if (updateData.is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(updateData.is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated timestamp
    updateFields.push(`updated_at = NOW()`);

    // Add ID parameter
    values.push(id);

    const query = `
      UPDATE materials 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, code, name, type, base_uom, base_unit_price, is_active, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const updatedMaterial = result.rows[0];

    // Transform back to frontend format
    const transformedMaterial = {
      id: updatedMaterial.id,
      material_code: updatedMaterial.code,
      description: updatedMaterial.name,
      material_type: updatedMaterial.type,
      base_unit: updatedMaterial.base_uom,
      industry_sector: 'M',
      material_group: '',
      base_price: parseFloat(updatedMaterial.base_unit_price) || 0,
      gross_weight: 0,
      net_weight: 0,
      weight_unit: 'KG',
      volume: 0,
      volume_unit: 'L',
      is_active: updatedMaterial.is_active,
      created_at: updatedMaterial.created_at,
      updated_at: updatedMaterial.updated_at
    };

    res.json(transformedMaterial);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material', details: error.message });
  }
});

// Create new material (POST endpoint)
router.post('/', async (req, res) => {
  try {
    const createData = req.body;

    const query = `
      INSERT INTO materials (
        code, name, description, type, base_uom, base_unit_price, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, code, name, type, base_uom, base_unit_price, is_active, created_at, updated_at
    `;

    const values = [
      createData.material_code,
      createData.description,
      createData.description,
      createData.material_type || 'FERT',
      createData.base_unit || 'EA',
      createData.base_price || 0,
      createData.is_active !== undefined ? createData.is_active : true
    ];

    const result = await pool.query(query, values);
    const createdMaterial = result.rows[0];

    // Create initial stock_balance entry so material appears in inventory
    // Get plant and storage location from system or use defaults
    const plantCode = createData.plant_code || 'P002'; // Default plant
    const storageLocation = createData.production_storage_location || '1010'; // Default storage

    try {
      await pool.query(`
        INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, available_quantity, reserved_quantity,
          unit, moving_average_price, total_value,
          last_updated, created_at, updated_at
        ) VALUES ($1, $2, $3, 'AVAILABLE', 0, 0, 0, $4, $5, 0, NOW(), NOW(), NOW())
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO NOTHING
      `, [
        createdMaterial.code,
        plantCode,
        storageLocation,
        createdMaterial.base_uom || 'EA',
        createdMaterial.base_unit_price || 0
      ]);

      console.log(`✅ Created stock balance for material ${createdMaterial.code}`);
    } catch (stockError) {
      console.error('⚠️ Error creating stock balance:', stockError.message);
      // Don't fail material creation if stock balance creation fails
    }

    // Transform back to frontend format
    const transformedMaterial = {
      id: createdMaterial.id,
      material_code: createdMaterial.code,
      description: createdMaterial.name,
      material_type: createdMaterial.type,
      base_unit: createdMaterial.base_uom,
      industry_sector: 'M',
      material_group: '',
      base_price: parseFloat(createdMaterial.base_unit_price) || 0,
      gross_weight: 0,
      net_weight: 0,
      weight_unit: 'KG',
      volume: 0,
      volume_unit: 'L',
      is_active: createdMaterial.is_active,
      created_at: createdMaterial.created_at,
      updated_at: createdMaterial.updated_at
    };

    res.status(201).json(transformedMaterial);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material', details: error.message });
  }
});

// Delete material (DELETE endpoint)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const existingResult = await pool.query('SELECT id FROM materials WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Delete the material
    await pool.query('DELETE FROM materials WHERE id = $1', [id]);

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material', details: error.message });
  }
});

export { router as materialsRouter };