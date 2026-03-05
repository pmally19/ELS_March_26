import express from 'express';
import { z } from 'zod';
import { db, pool } from '../../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Validation schema for BOM that matches frontend expectations - No defaults
const bomSchema = z.object({
  bom_code: z.string().min(1, "BOM code is required").max(20, "BOM code must be 20 characters or less"),
  material_code: z.string().min(1, "Material code is required"),
  plant_code: z.string().min(1, "Plant code is required"),
  bom_version: z.string().max(10, "BOM version must be 10 characters or less").optional(),
  bom_status: z.string().optional(),
  base_quantity: z.number().positive("Base quantity must be positive").optional(),
  base_unit: z.string().optional(),
  description: z.string().optional(),
  valid_from: z.string().min(1, "Valid from date is required"),
  valid_to: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Get all BOMs with transformed data structure
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        b.id,
        b.code as bom_code,
        b.code as bom_number,
        m.code as material_code,
        COALESCE(m.name, m.description, m.code) as product_name,
        p.code as plant_code,
        p.name as plant_name,
        b.version as bom_version,
        b.description,
        CASE WHEN COALESCE(b.is_active, b.active, true) THEN 'Active' ELSE 'Inactive' END as bom_status,
        CASE WHEN COALESCE(b.is_active, b.active, true) THEN 'Active' ELSE 'Inactive' END as status,
        b.created_at as effective_date,
        TO_CHAR(b.created_at, 'YYYY-MM-DD') as valid_from,
        NULL as valid_to,
        COALESCE(b.is_active, b.active, true) as is_active,
        b.created_at,
        b.updated_at,
        b.created_by,
        b.updated_by,
        b."_tenantId",
        b."_deletedAt",
        (SELECT COUNT(*) FROM bom_components bc WHERE bc.bom_id = b.id) as components
      FROM bill_of_materials b 
      LEFT JOIN materials m ON b.material_id = m.id
      LEFT JOIN production_orders po ON po.bom_id = b.id
      LEFT JOIN plants p ON po.plant_id = p.id
      WHERE b."_deletedAt" IS NULL
      ORDER BY b.code
    `);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching BOMs:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get unique statuses for BOM filter
router.get('/statuses', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT
        CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status
      FROM bill_of_materials
      WHERE is_active IS NOT NULL
      ORDER BY status
    `);
    return res.status(200).json(result.rows.map(row => row.status));
  } catch (error: any) {
    console.error('Error fetching BOM statuses:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// ===================================================================
// BOM COMPONENTS LOOKUP FOR PURCHASE ORDERS/REQUISITIONS
// ===================================================================

/**
 * GET /api/master-data/bom/material/:materialId/components
 * Get active BOM components for a material (used in PO/PR forms)
 */
router.get('/material/:materialId/components', async (req, res) => {
  try {
    const { materialId } = req.params;

    // Get active BOM for material from bill_of_materials table
    const bomResult = await db.execute(sql`
      SELECT 
        bom.id as bom_id,
        bom.code as bom_code,
        bom.name as bom_name,
        bom.description,
        1 as base_quantity
      FROM bill_of_materials bom
      WHERE bom.material_id = ${materialId}
        AND COALESCE(bom.is_active, bom.active, true) = true
        AND bom."_deletedAt" IS NULL
      LIMIT 1
    `);

    if (!bomResult.rows || bomResult.rows.length === 0) {
      return res.json({
        hasBom: false,
        components: []
      });
    }

    const bom = bomResult.rows[0];

    // Get BOM components from bom_components table
    const componentsResult = await db.execute(sql`
      SELECT 
        bc.id,
        bc.component_number as position,
        bc.material_id,
        m.code as material_code,
        COALESCE(m.name, m.description, m.code) as material_name,
        bc.component_quantity::numeric as quantity,
        COALESCE(bc.component_unit, m.base_uom, 'EA') as uom,
        COALESCE(m.base_unit_price, 0)::numeric as estimated_price,
        false as is_assembly,
        bc.operation_number as notes
      FROM bom_components bc
      LEFT JOIN materials m ON bc.material_id = m.id
      WHERE bc.bom_id = ${bom.bom_id}
      ORDER BY bc.component_number
    `);

    // Format response
    const components = componentsResult.rows.map((comp: any) => ({
      id: comp.id,
      position: parseInt(comp.position) || 0,
      materialId: comp.material_id,
      materialCode: comp.material_code,
      materialName: comp.material_name,
      quantity: parseFloat(comp.quantity) || 0,
      uom: comp.uom,
      estimatedPrice: parseFloat(comp.estimated_price) || 0,
      isAssembly: comp.is_assembly || false,
      notes: comp.notes
    }));

    return res.json({
      hasBom: true,
      bomId: bom.bom_id,
      bomCode: bom.bom_code,
      bomName: bom.bom_name,
      baseQuantity: parseFloat(bom.base_quantity) || 1,
      components: components
    });

  } catch (error: any) {
    console.error('Error fetching BOM components for material:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ===================================================================
// BOM ITEMS (Components) ROUTES - Must be before /:id route
// ===================================================================

// Get single BOM details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get BOM Header
    const bomResult = await db.execute(sql`
      SELECT 
        bom.*,
        m.code as material_code,
        m.name as material_name,
        m.base_uom as uom
      FROM bill_of_materials bom
      JOIN materials m ON bom.material_id = m.id
      WHERE bom.id = ${id} AND bom."_deletedAt" IS NULL
    `);

    if (bomResult.rows.length === 0) {
      return res.status(404).json({ error: 'BOM not found' });
    }

    const bom = bomResult.rows[0];

    // Get BOM Components  
    const componentsResult = await db.execute(sql`
      SELECT 
        bc.*,
        m.code as material_code,
        m.name as material_name,
        m.base_uom as base_uom,
        m.base_unit_price as estimated_price
      FROM bom_components bc
      JOIN materials m ON bc.material_id = m.id
      WHERE bc.bom_id = ${id}
      ORDER BY bc.component_number
    `);

    // Map to frontend expected format if needed
    const components = componentsResult.rows.map(comp => ({
      ...comp,
      position: comp.component_number,
      quantity: comp.component_quantity,
      uom: comp.component_unit || comp.base_uom
    }));

    return res.json({ ...bom, components });
  } catch (error: any) {
    console.error('Error fetching BOM details:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Create new BOM
router.post('/', async (req, res) => {
  try {
    const data = bomSchema.parse(req.body);

    // Check for existing BOM
    const existing = await db.execute(sql`
      SELECT id FROM bill_of_materials WHERE code = ${data.bom_code}
    `);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "BOM with this code already exists" });
    }

    // Use current time for validation dates if format is YYYY-MM-DD
    const now = new Date();

    const userId = (req as any).user?.id || 1;
    const tenantId = (req as any).user?.tenantId || '001';

    const result = await db.execute(sql`
      INSERT INTO bill_of_materials (
        code, material_id, description, base_quantity, active, is_active, created_at, updated_at, created_by, updated_by, "_tenantId"
      )
      SELECT 
        ${data.bom_code},
        m.id,
        ${data.description},
        ${data.base_quantity || 1},
        ${data.is_active ?? true},
        ${data.is_active ?? true},
        NOW(),
        NOW(),
        ${userId},
        ${userId},
        ${tenantId}
      FROM materials m WHERE m.code = ${data.material_code}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Material not found with code: " + data.material_code });
    }

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error('Error creating BOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update BOM
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, is_active, base_quantity } = req.body;

    const userId = (req as any).user?.id || 1;

    const result = await db.execute(sql`
      UPDATE bill_of_materials
      SET 
        description = COALESCE(${description}, description),
        is_active = COALESCE(${is_active}, is_active),
        active = COALESCE(${is_active}, active),
        base_quantity = COALESCE(${base_quantity}, base_quantity),
        updated_at = NOW(),
        updated_by = ${userId}
      WHERE id = ${id}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "BOM not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating BOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Create new BOM item
router.post('/:bomId/items', async (req, res) => {
  try {
    const { bomId } = req.params;
    const { material_id, quantity } = req.body;

    // Validation
    if (!material_id) {
      return res.status(400).json({ error: "Material ID is required" });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    // Check if BOM exists
    const bomCheck = await db.execute(sql`
      SELECT id FROM bill_of_materials WHERE id = ${bomId}
    `);

    if (bomCheck.rows.length === 0) {
      return res.status(404).json({ error: "BOM not found" });
    }

    // Check if material exists
    const materialCheck = await db.execute(sql`
      SELECT id, base_uom FROM materials WHERE id = ${material_id}
    `);

    if (materialCheck.rows.length === 0) {
      return res.status(400).json({ error: "Material not found" });
    }

    // Generate component position/number (e.g. 0010, 0020)
    const maxPosResult = await db.execute(sql`
      SELECT MAX(component_number) as max_pos 
      FROM bom_components 
      WHERE bom_id = ${bomId}
    `);

    let nextPos = '0010';
    if (maxPosResult.rows[0].max_pos) {
      const current = parseInt(maxPosResult.rows[0].max_pos);
      nextPos = (current + 10).toString().padStart(4, '0');
    }

    // Insert BOM component
    const insertResult = await db.execute(sql`
      INSERT INTO bom_components (
        bom_id, 
        material_id, 
        component_number,
        component_quantity, 
        component_unit,
        valid_from
      )
      VALUES (
        ${bomId}, 
        ${material_id}, 
        ${nextPos},
        ${quantity}, 
        ${materialCheck.rows[0].base_uom || 'EA'}, 
        CURRENT_DATE
      )
      RETURNING id, bom_id, material_id, component_number, component_quantity
    `);

    // Get material details for response
    const materialResult = await db.execute(sql`
      SELECT code, name, description, base_unit_price FROM materials WHERE id = ${material_id}
    `);

    const createdItem = insertResult.rows[0];
    const material = materialResult.rows[0];

    // Format matches frontend expectations
    const responseData = {
      id: createdItem.id,
      bom_id: createdItem.bom_id,
      material_id: createdItem.material_id,
      material_code: material?.code || null,
      material_name: material?.name || material?.description || material?.code || null,
      quantity: parseFloat(createdItem.component_quantity),
      unit_cost: parseFloat(material.base_unit_price || 0),
      is_active: true,
      created_at: new Date().toISOString()
    };

    return res.status(201).json(responseData);
  } catch (error: any) {
    console.error('Error creating BOM item:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update BOM item
router.patch('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body; // Only allowing quantity updates for now to keep it simple

    // Check if BOM item exists
    const existingResult = await db.execute(sql`
      SELECT id FROM bom_components WHERE id = ${id}
    `);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "BOM item not found" });
    }

    if (quantity !== undefined && quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    const updateResult = await db.execute(sql`
      UPDATE bom_components 
      SET component_quantity = ${quantity}
      WHERE id = ${id}
      RETURNING *
    `);

    // Get material info
    const updatedItem = updateResult.rows[0];
    const materialResult = await db.execute(sql`
      SELECT code, name, description, base_unit_price FROM materials WHERE id = ${updatedItem.material_id}
    `);
    const material = materialResult.rows[0];

    const responseData = {
      id: updatedItem.id,
      bom_id: updatedItem.bom_id,
      material_id: updatedItem.material_id,
      material_code: material?.code,
      material_name: material?.name,
      quantity: parseFloat(updatedItem.component_quantity),
      unit_cost: parseFloat(material.base_unit_price || 0),
      is_active: true
    };

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Error updating BOM item:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete BOM item
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if BOM item exists
    const existingResult = await db.execute(sql`
      SELECT id FROM bom_components WHERE id = ${id}
    `);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "BOM item not found" });
    }

    // Delete BOM item
    await db.execute(sql`DELETE FROM bom_items WHERE id = ${id}`);

    return res.status(200).json({ message: "BOM item deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting BOM item:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get all BOM items for a specific BOM
router.get('/:bomId/items', async (req, res) => {
  try {
    const { bomId } = req.params;

    const result = await db.execute(sql`
      SELECT 
        bc.id,
        bc.bom_id,
        bc.material_id,
        m.code as material_code,
        COALESCE(m.name, m.description, m.code) as material_name,
        bc.component_quantity as quantity,
        m.base_unit_price as unit_cost,
        true as is_active,
        true as active,
        bc.valid_from as created_at
      FROM bom_components bc
      LEFT JOIN materials m ON bc.material_id = m.id
      WHERE bc.bom_id = ${bomId}
      ORDER BY bc.id
    `);

    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching BOM items:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get single BOM item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.execute(sql`
      SELECT 
        bc.id,
        bc.bom_id,
        bc.material_id,
        m.code as material_code,
        COALESCE(m.name, m.description, m.code) as material_name,
        bc.component_quantity as quantity,
        m.base_unit_price as unit_cost,
        true as is_active,
        true as active,
        bc.valid_from as created_at
      FROM bom_components bc
      LEFT JOIN materials m ON bc.material_id = m.id
      WHERE bc.id = ${id}
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "BOM item not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching BOM item:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Create new BOM
router.post('/', async (req, res) => {
  try {
    const validation = bomSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Get material ID from material code
    const materialResult = await db.execute(sql`
      SELECT id FROM materials WHERE code = ${data.material_code}
    `);

    if (materialResult.rows.length === 0) {
      return res.status(400).json({ error: "Material not found", message: `Material with code ${data.material_code} does not exist` });
    }

    const materialId = materialResult.rows[0].id;

    // Check if BOM code already exists
    const existingResult = await db.execute(sql`SELECT id FROM bill_of_materials WHERE code = ${data.bom_code}`);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "BOM code already exists" });
    }

    // Get plant ID from plant code
    let plantId = null;
    if (data.plant_code) {
      const plantResult = await db.execute(sql`
        SELECT id FROM plants WHERE code = ${data.plant_code}
      `);
      if (plantResult.rows.length > 0) {
        plantId = plantResult.rows[0].id;
      }
    }

    const userId = (req as any).user?.id || 1;
    const tenantId = (req as any).user?.tenantId || '001';

    // Insert BOM using correct column names - no hardcoded values
    const insertResult = await db.execute(sql`
      INSERT INTO bill_of_materials (
        code, name, material_id, description, version, is_active, created_at, updated_at, created_by, updated_by, "_tenantId"
      )
      VALUES (
        ${data.bom_code}, 
        ${data.bom_code || `BOM-${data.material_code}`}, 
        ${materialId}, 
        ${data.bom_code || `BOM for ${data.material_code}`}, 
        ${data.bom_version || null}, 
        ${data.is_active !== undefined ? data.is_active : null}, 
        NOW(), 
        NOW(),
        ${userId},
        ${userId},
        ${tenantId}
      )
      RETURNING *
    `);

    // Return the created BOM in the expected format - use actual database values
    const createdBom = insertResult.rows[0];
    const responseData = {
      id: createdBom.id,
      bom_code: createdBom.code,
      material_code: data.material_code,
      plant_code: data.plant_code || null,
      bom_version: createdBom.version || null,
      bom_status: createdBom.is_active !== null ? (createdBom.is_active ? 'ACTIVE' : 'INACTIVE') : null,
      base_quantity: data.base_quantity || null,
      base_unit: data.base_unit || null,
      valid_from: data.valid_from,
      valid_to: data.valid_to || null,
      is_active: createdBom.is_active,
      created_at: createdBom.created_at,
      updated_at: createdBom.updated_at,
      created_by: createdBom.created_by,
      updated_by: createdBom.updated_by,
      _tenantId: createdBom._tenantId,
      _deletedAt: createdBom._deletedAt,
    };

    return res.status(201).json(responseData);
  } catch (error: any) {
    console.error('Error creating BOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update BOM
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = bomSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;
    const body = req.body as any; // Access raw body for description

    // Check if BOM exists
    const existingResult = await db.execute(sql`SELECT id FROM bill_of_materials WHERE id = ${id}`);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "BOM not found" });
    }

    // Get material ID if material_code is provided
    let materialId = null;
    if (data.material_code) {
      const materialResult = await db.execute(sql`
        SELECT id FROM materials WHERE code = ${data.material_code}
      `);

      if (materialResult.rows.length === 0) {
        return res.status(400).json({ error: "Material not found", message: `Material with code ${data.material_code} does not exist` });
      }

      materialId = materialResult.rows[0].id;
    }

    // Build dynamic update query - only update provided fields
    const updateClauses: string[] = [];
    const updateValues: any[] = [];

    if (data.bom_code) {
      updateClauses.push(`code = $${updateValues.length + 1}`);
      updateValues.push(data.bom_code);
    }
    if (data.material_code && materialId) {
      updateClauses.push(`material_id = $${updateValues.length + 1}`);
      updateValues.push(materialId);
      updateClauses.push(`name = $${updateValues.length + 1}`);
      updateValues.push(`BOM-${data.material_code}`);
      // Only update description if it's explicitly provided
      if (body.description !== undefined) {
        updateClauses.push(`description = $${updateValues.length + 1}`);
        updateValues.push(body.description || `BOM for ${data.material_code}`);
      }
    }
    if (data.bom_version !== undefined) {
      updateClauses.push(`version = $${updateValues.length + 1}`);
      updateValues.push(data.bom_version || null);
    }
    if (body.description !== undefined && (!data.material_code || !materialId)) {
      // Update description if material_code is not being updated
      updateClauses.push(`description = $${updateValues.length + 1}`);
      updateValues.push(body.description);
    }
    if (data.is_active !== undefined) {
      updateClauses.push(`is_active = $${updateValues.length + 1}`);
      updateValues.push(data.is_active);
    }

    const userId = (req as any).user?.id || 1;
    updateClauses.push(`updated_at = NOW()`);
    updateClauses.push(`updated_by = $${updateValues.length + 1}`);
    updateValues.push(userId);

    if (updateClauses.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateValues.push(id);
    const updateQuery = `UPDATE bill_of_materials SET ${updateClauses.join(', ')} WHERE id = $${updateValues.length} RETURNING *`;
    const updateResult = await pool.query(updateQuery, updateValues);

    // Get material code for response
    const materialResult = await db.execute(sql`
      SELECT code FROM materials WHERE id = ${updateResult.rows[0].material_id}
    `);
    const materialCode = materialResult.rows.length > 0 ? materialResult.rows[0].code : null;

    // Get plant code for response - try multiple sources
    let plantCode: string | null = data.plant_code || null;

    // Try to get from production_orders first
    try {
      const plantResult = await db.execute(sql`
        SELECT p.code FROM production_orders po
        LEFT JOIN plants p ON po.plant_id = p.id
        WHERE po.bom_id = ${updateResult.rows[0].id}
        LIMIT 1
      `);
      if (plantResult.rows.length > 0 && plantResult.rows[0].code) {
        plantCode = String(plantResult.rows[0].code);
      }
    } catch (e) {
      // If production_orders doesn't exist or query fails, use provided plant_code
      console.log('Could not fetch plant from production_orders, using provided plant_code');
    }

    // If still no plant_code and one was provided, try to validate it exists
    if (!plantCode && data.plant_code) {
      try {
        const plantCheck = await db.execute(sql`
          SELECT code FROM plants WHERE code = ${data.plant_code} LIMIT 1
        `);
        if (plantCheck.rows.length > 0) {
          plantCode = (plantCheck.rows[0].code as string) || null;
        }
      } catch (e) {
        console.log('Could not validate plant_code');
      }
    }

    // Return the updated BOM in the expected format - use actual database values
    const updatedBom = updateResult.rows[0];
    const responseData = {
      id: updatedBom.id,
      bom_code: updatedBom.code,
      material_code: materialCode || data.material_code || null,
      plant_code: plantCode,
      bom_version: updatedBom.version || null,
      bom_status: updatedBom.is_active !== null ? (updatedBom.is_active ? 'ACTIVE' : 'INACTIVE') : null,
      base_quantity: data.base_quantity || null,
      base_unit: data.base_unit || null,
      valid_from: data.valid_from || (updatedBom.created_at ? new Date(updatedBom.created_at).toISOString().split('T')[0] : null),
      valid_to: data.valid_to || null,
      is_active: updatedBom.is_active,
      created_at: updatedBom.created_at,
      updated_at: updatedBom.updated_at,
      created_by: updatedBom.created_by,
      updated_by: updatedBom.updated_by,
      _tenantId: updatedBom._tenantId,
      _deletedAt: updatedBom._deletedAt,
    };

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Error updating BOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete BOM
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if BOM exists
    const existingResult = await db.execute(sql`SELECT id FROM bill_of_materials WHERE id = ${id}`);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "BOM not found" });
    }

    const userId = (req as any).user?.id || 1;

    // Delete BOM (Soft Delete)
    await db.execute(sql`UPDATE bill_of_materials SET is_active = false, active = false, "_deletedAt" = NOW(), updated_by = ${userId}, updated_at = NOW() WHERE id = ${id}`);

    return res.status(200).json({ message: "BOM deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting BOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Bulk import BOMs
router.post('/bulk-import', async (req, res) => {
  try {
    const boms = req.body;

    if (!Array.isArray(boms)) {
      return res.status(400).json({ error: "Request body must be an array of BOMs" });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const bom of boms) {
      try {
        const validation = bomSchema.safeParse(bom);

        if (!validation.success) {
          results.failed++;
          results.errors.push(`BOM ${bom.bom_code || 'unknown'}: ${validation.error.errors.map(e => e.message).join(", ")}`);
          continue;
        }

        const data = validation.data;

        // Get material ID from material code
        const materialResult = await db.execute(sql`
          SELECT id FROM materials WHERE code = ${data.material_code}
        `);

        if (materialResult.rows.length === 0) {
          results.failed++;
          results.errors.push(`BOM ${data.bom_code}: Material with code ${data.material_code} does not exist`);
          continue;
        }

        const materialId = materialResult.rows[0].id;

        // Check if BOM code already exists
        const existingResult = await db.execute(sql`SELECT id FROM bill_of_materials WHERE code = ${data.bom_code}`);

        if (existingResult.rows.length > 0) {
          results.failed++;
          results.errors.push(`BOM ${data.bom_code}: BOM code already exists`);
          continue;
        }

        const userId = (req as any).user?.id || 1;
        const tenantId = (req as any).user?.tenantId || '001';

        // Insert BOM using correct column names - no hardcoded values
        await db.execute(sql`
          INSERT INTO bill_of_materials (
            code, name, material_id, description, version, is_active, created_at, updated_at, created_by, updated_by, "_tenantId"
          )
          VALUES (
            ${data.bom_code}, 
            ${data.bom_code || `BOM-${data.material_code}`}, 
            ${materialId}, 
            ${data.bom_code || `BOM for ${data.material_code}`}, 
            ${data.bom_version || null}, 
            ${data.is_active !== undefined ? data.is_active : null}, 
            NOW(), 
            NOW(),
            ${userId},
            ${userId},
            ${tenantId}
          )
        `);

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`BOM ${bom.bom_code || 'unknown'}: ${error.message}`);
      }
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Error bulk importing BOMs:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

export default router;