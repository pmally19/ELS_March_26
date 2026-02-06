import express, { Request, Response } from 'express';
import { z } from 'zod';
import { db, pool } from '../../db';
import { sql } from 'drizzle-orm';
import { routingMaster, routingOperations, routingOperationComponents } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Ensure routing tables exist
async function ensureRoutingTables(): Promise<void> {
  try {
    // Check if routing_master exists
    const checkResult = await pool.query(`
      SELECT to_regclass('public.routing_master') as exists
    `);
    
    if (checkResult.rows[0]?.exists === null) {
      console.log('🔧 Creating routing_master and related tables...');
      // Create routing_master table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS routing_master (
          id SERIAL PRIMARY KEY,
          material_id INTEGER,
          material_code VARCHAR(100) NOT NULL,
          plant_code VARCHAR(20) NOT NULL,
          plant_id INTEGER,
          routing_group_code VARCHAR(50) NOT NULL,
          base_quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.0,
          base_unit VARCHAR(10) NOT NULL DEFAULT 'PC',
          description TEXT,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          valid_from DATE,
          valid_to DATE,
          is_active BOOLEAN DEFAULT true,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(material_code, plant_code, routing_group_code)
        );
      `);

      // Create routing_operations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS routing_operations (
          id SERIAL PRIMARY KEY,
          routing_master_id INTEGER NOT NULL REFERENCES routing_master(id) ON DELETE CASCADE,
          operation_number VARCHAR(10) NOT NULL,
          operation_description TEXT NOT NULL,
          work_center_id INTEGER,
          work_center_code VARCHAR(50),
          setup_time_minutes INTEGER DEFAULT 0,
          machine_time_minutes DECIMAL(10, 2) DEFAULT 0,
          labor_time_minutes DECIMAL(10, 2) DEFAULT 0,
          sequence_order INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(routing_master_id, operation_number)
        );
      `);

      // Create routing_operation_components table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS routing_operation_components (
          id SERIAL PRIMARY KEY,
          routing_operation_id INTEGER NOT NULL REFERENCES routing_operations(id) ON DELETE CASCADE,
          material_id INTEGER,
          material_code VARCHAR(100) NOT NULL,
          quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.0,
          unit VARCHAR(10) NOT NULL DEFAULT 'PC',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_routing_master_material ON routing_master(material_code);
        CREATE INDEX IF NOT EXISTS idx_routing_master_plant ON routing_master(plant_code);
        CREATE INDEX IF NOT EXISTS idx_routing_master_group ON routing_master(routing_group_code);
        CREATE INDEX IF NOT EXISTS idx_routing_operations_master ON routing_operations(routing_master_id);
        CREATE INDEX IF NOT EXISTS idx_routing_operations_sequence ON routing_operations(routing_master_id, sequence_order);
        CREATE INDEX IF NOT EXISTS idx_routing_operation_components_operation ON routing_operation_components(routing_operation_id);
        CREATE INDEX IF NOT EXISTS idx_routing_operation_components_material ON routing_operation_components(material_code);
      `);
    }
  } catch (error) {
    console.error('Error ensuring routing tables:', error);
    // Don't throw - let the route handle it
  }
}

// Validation schemas
const routingMasterSchema = z.object({
  materialCode: z.string().min(1, "Material code is required"),
  plantCode: z.string().min(1, "Plant code is required"),
  routingGroupCode: z.string().min(1, "Routing group code is required"),
  baseQuantity: z.string().or(z.number()).transform(val => String(val)),
  baseUnit: z.string().optional().default("PC"),
  description: z.string().optional(),
  status: z.string().optional().default("ACTIVE"),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const routingOperationSchema = z.object({
  operationNumber: z.string().min(1, "Operation number is required"),
  operationDescription: z.string().min(1, "Operation description is required"),
  workCenterId: z.number().optional(),
  workCenterCode: z.string().optional(),
  setupTimeMinutes: z.number().optional().default(0),
  machineTimeMinutes: z.string().or(z.number()).transform(val => String(val)).optional().default("0"),
  laborTimeMinutes: z.string().or(z.number()).transform(val => String(val)).optional().default("0"),
  sequenceOrder: z.number().min(1, "Sequence order is required"),
  isActive: z.boolean().optional().default(true),
});

const routingComponentSchema = z.object({
  materialCode: z.string().min(1, "Material code is required"),
  quantity: z.string().or(z.number()).transform(val => String(val)),
  unit: z.string().optional().default("PC"),
  isActive: z.boolean().optional().default(true),
});

// ===================================================================
// ROUTING MASTER ROUTES
// ===================================================================

// Get all routing masters
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureRoutingTables();
    const result = await pool.query(`
      SELECT 
        rm.id,
        rm.material_id,
        rm.material_code,
        m.description as material_description,
        rm.plant_code,
        p.name as plant_name,
        rm.plant_id,
        rm.routing_group_code,
        rm.base_quantity,
        rm.base_unit,
        rm.description,
        rm.status,
        rm.valid_from,
        rm.valid_to,
        rm.is_active,
        rm.created_at,
        rm.updated_at,
        (SELECT COUNT(*) FROM routing_operations ro WHERE ro.routing_master_id = rm.id) as operations_count
      FROM routing_master rm
      LEFT JOIN materials m ON rm.material_code = m.code
      LEFT JOIN plants p ON rm.plant_code = p.code
      ORDER BY rm.routing_group_code, rm.created_at DESC
    `);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching routing masters:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get all operations for a routing master (must come before /:id)
router.get('/:routingMasterId/operations', async (req: Request, res: Response) => {
  try {
    await ensureRoutingTables();
    const { routingMasterId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ro.id,
        ro.routing_master_id,
        ro.operation_number,
        ro.operation_description,
        ro.work_center_id,
        ro.work_center_code,
        wc.name as work_center_name,
        ro.setup_time_minutes,
        ro.machine_time_minutes,
        ro.labor_time_minutes,
        ro.sequence_order,
        ro.is_active,
        ro.created_at,
        ro.updated_at,
        (SELECT COUNT(*) FROM routing_operation_components roc WHERE roc.routing_operation_id = ro.id) as components_count
      FROM routing_operations ro
      LEFT JOIN work_centers wc ON ro.work_center_id = wc.id
      WHERE ro.routing_master_id = $1
      ORDER BY ro.sequence_order, ro.operation_number
    `, [routingMasterId]);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching routing operations:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get routing master by ID (must come after /:routingMasterId/operations)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    await ensureRoutingTables();
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        rm.id,
        rm.material_id,
        rm.material_code,
        m.description as material_description,
        rm.plant_code,
        p.name as plant_name,
        rm.plant_id,
        rm.routing_group_code,
        rm.base_quantity,
        rm.base_unit,
        rm.description,
        rm.status,
        rm.valid_from,
        rm.valid_to,
        rm.is_active,
        rm.created_at,
        rm.updated_at
      FROM routing_master rm
      LEFT JOIN materials m ON rm.material_code = m.code
      LEFT JOIN plants p ON rm.plant_code = p.code
      WHERE rm.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing master not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching routing master:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Create new routing master
router.post('/', async (req: Request, res: Response) => {
  try {
    await ensureRoutingTables();
    const validatedData = routingMasterSchema.parse(req.body);
    
    // Get material_id if materialCode is provided
    let materialId = null;
    if (validatedData.materialCode) {
      const materialResult = await pool.query(
        'SELECT id FROM materials WHERE code = $1',
        [validatedData.materialCode]
      );
      if (materialResult.rows.length > 0) {
        materialId = materialResult.rows[0].id;
      }
    }
    
    // Get plant_id if plantCode is provided
    let plantId = null;
    if (validatedData.plantCode) {
      const plantResult = await pool.query(
        'SELECT id FROM plants WHERE code = $1',
        [validatedData.plantCode]
      );
      if (plantResult.rows.length > 0) {
        plantId = plantResult.rows[0].id;
      }
    }
    
    const result = await pool.query(`
      INSERT INTO routing_master (
        material_id, material_code, plant_code, plant_id, routing_group_code,
        base_quantity, base_unit, description, status, valid_from, valid_to, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      materialId,
      validatedData.materialCode,
      validatedData.plantCode,
      plantId,
      validatedData.routingGroupCode,
      validatedData.baseQuantity,
      validatedData.baseUnit,
      validatedData.description || null,
      validatedData.status,
      validatedData.validFrom || null,
      validatedData.validTo || null,
      validatedData.isActive
    ]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error('Error creating routing master:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update routing master
router.put('/:id', async (req: Request, res: Response) => {
  try {
    await ensureRoutingTables();
    const { id } = req.params;
    const validatedData = routingMasterSchema.partial().parse(req.body);
    
    // Get material_id if materialCode is provided
    let materialId = null;
    if (validatedData.materialCode) {
      const materialResult = await pool.query(
        'SELECT id FROM materials WHERE code = $1',
        [validatedData.materialCode]
      );
      if (materialResult.rows.length > 0) {
        materialId = materialResult.rows[0].id;
      }
    }
    
    // Get plant_id if plantCode is provided
    let plantId = null;
    if (validatedData.plantCode) {
      const plantResult = await pool.query(
        'SELECT id FROM plants WHERE code = $1',
        [validatedData.plantCode]
      );
      if (plantResult.rows.length > 0) {
        plantId = plantResult.rows[0].id;
      }
    }
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (materialId !== null) {
      updateFields.push(`material_id = $${paramIndex++}`);
      updateValues.push(materialId);
    }
    if (validatedData.materialCode !== undefined) {
      updateFields.push(`material_code = $${paramIndex++}`);
      updateValues.push(validatedData.materialCode);
    }
    if (validatedData.plantCode !== undefined) {
      updateFields.push(`plant_code = $${paramIndex++}`);
      updateValues.push(validatedData.plantCode);
    }
    if (plantId !== null) {
      updateFields.push(`plant_id = $${paramIndex++}`);
      updateValues.push(plantId);
    }
    if (validatedData.routingGroupCode !== undefined) {
      updateFields.push(`routing_group_code = $${paramIndex++}`);
      updateValues.push(validatedData.routingGroupCode);
    }
    if (validatedData.baseQuantity !== undefined) {
      updateFields.push(`base_quantity = $${paramIndex++}`);
      updateValues.push(validatedData.baseQuantity);
    }
    if (validatedData.baseUnit !== undefined) {
      updateFields.push(`base_unit = $${paramIndex++}`);
      updateValues.push(validatedData.baseUnit);
    }
    if (validatedData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(validatedData.description);
    }
    if (validatedData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(validatedData.status);
    }
    if (validatedData.validFrom !== undefined) {
      updateFields.push(`valid_from = $${paramIndex++}`);
      updateValues.push(validatedData.validFrom || null);
    }
    if (validatedData.validTo !== undefined) {
      updateFields.push(`valid_to = $${paramIndex++}`);
      updateValues.push(validatedData.validTo || null);
    }
    if (validatedData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(validatedData.isActive);
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    const query = `
      UPDATE routing_master 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing master not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error('Error updating routing master:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete routing master
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await ensureRoutingTables();
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM routing_master WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing master not found" });
    }
    
    return res.status(200).json({ message: "Routing master deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting routing master:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// ===================================================================
// ROUTING OPERATIONS ROUTES
// ===================================================================

// Get all components for an operation (must come before /operations/:id)
router.get('/operations/:operationId/components', async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        roc.id,
        roc.routing_operation_id,
        roc.material_id,
        roc.material_code,
        m.description as material_description,
        roc.quantity,
        roc.unit,
        roc.is_active,
        roc.created_at,
        roc.updated_at
      FROM routing_operation_components roc
      LEFT JOIN materials m ON roc.material_code = m.code
      WHERE roc.routing_operation_id = $1
      ORDER BY roc.material_code
    `, [operationId]);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching routing operation components:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get single operation by ID
router.get('/operations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ro.id,
        ro.routing_master_id,
        ro.operation_number,
        ro.operation_description,
        ro.work_center_id,
        ro.work_center_code,
        wc.name as work_center_name,
        ro.setup_time_minutes,
        ro.machine_time_minutes,
        ro.labor_time_minutes,
        ro.sequence_order,
        ro.is_active,
        ro.created_at,
        ro.updated_at
      FROM routing_operations ro
      LEFT JOIN work_centers wc ON ro.work_center_id = wc.id
      WHERE ro.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing operation not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching routing operation:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Create new operation
router.post('/:routingMasterId/operations', async (req: Request, res: Response) => {
  try {
    const { routingMasterId } = req.params;
    const validatedData = routingOperationSchema.parse(req.body);
    
    // Get work_center_id if workCenterCode is provided
    let workCenterId = validatedData.workCenterId || null;
    if (!workCenterId && validatedData.workCenterCode) {
      const wcResult = await pool.query(
        'SELECT id FROM work_centers WHERE code = $1',
        [validatedData.workCenterCode]
      );
      if (wcResult.rows.length > 0) {
        workCenterId = wcResult.rows[0].id;
      }
    }
    
    const result = await pool.query(`
      INSERT INTO routing_operations (
        routing_master_id, operation_number, operation_description,
        work_center_id, work_center_code, setup_time_minutes,
        machine_time_minutes, labor_time_minutes, sequence_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      routingMasterId,
      validatedData.operationNumber,
      validatedData.operationDescription,
      workCenterId,
      validatedData.workCenterCode || null,
      validatedData.setupTimeMinutes,
      validatedData.machineTimeMinutes,
      validatedData.laborTimeMinutes,
      validatedData.sequenceOrder,
      validatedData.isActive
    ]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error('Error creating routing operation:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update operation
router.put('/operations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = routingOperationSchema.partial().parse(req.body);
    
    // Get work_center_id if workCenterCode is provided
    let workCenterId = validatedData.workCenterId;
    if (workCenterId === undefined && validatedData.workCenterCode) {
      const wcResult = await pool.query(
        'SELECT id FROM work_centers WHERE code = $1',
        [validatedData.workCenterCode]
      );
      if (wcResult.rows.length > 0) {
        workCenterId = wcResult.rows[0].id;
      }
    }
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (validatedData.operationNumber !== undefined) {
      updateFields.push(`operation_number = $${paramIndex++}`);
      updateValues.push(validatedData.operationNumber);
    }
    if (validatedData.operationDescription !== undefined) {
      updateFields.push(`operation_description = $${paramIndex++}`);
      updateValues.push(validatedData.operationDescription);
    }
    if (workCenterId !== undefined) {
      updateFields.push(`work_center_id = $${paramIndex++}`);
      updateValues.push(workCenterId);
    }
    if (validatedData.workCenterCode !== undefined) {
      updateFields.push(`work_center_code = $${paramIndex++}`);
      updateValues.push(validatedData.workCenterCode);
    }
    if (validatedData.setupTimeMinutes !== undefined) {
      updateFields.push(`setup_time_minutes = $${paramIndex++}`);
      updateValues.push(validatedData.setupTimeMinutes);
    }
    if (validatedData.machineTimeMinutes !== undefined) {
      updateFields.push(`machine_time_minutes = $${paramIndex++}`);
      updateValues.push(validatedData.machineTimeMinutes);
    }
    if (validatedData.laborTimeMinutes !== undefined) {
      updateFields.push(`labor_time_minutes = $${paramIndex++}`);
      updateValues.push(validatedData.laborTimeMinutes);
    }
    if (validatedData.sequenceOrder !== undefined) {
      updateFields.push(`sequence_order = $${paramIndex++}`);
      updateValues.push(validatedData.sequenceOrder);
    }
    if (validatedData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(validatedData.isActive);
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    const query = `
      UPDATE routing_operations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing operation not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error('Error updating routing operation:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete operation
router.delete('/operations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM routing_operations WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing operation not found" });
    }
    
    return res.status(200).json({ message: "Routing operation deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting routing operation:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// ===================================================================
// ROUTING OPERATION COMPONENTS ROUTES
// ===================================================================

// Get single component by ID
router.get('/components/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        roc.id,
        roc.routing_operation_id,
        roc.material_id,
        roc.material_code,
        m.description as material_description,
        roc.quantity,
        roc.unit,
        roc.is_active,
        roc.created_at,
        roc.updated_at
      FROM routing_operation_components roc
      LEFT JOIN materials m ON roc.material_code = m.code
      WHERE roc.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing operation component not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching routing operation component:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Create new component
router.post('/operations/:operationId/components', async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;
    const validatedData = routingComponentSchema.parse(req.body);
    
    // Get material_id if materialCode is provided
    let materialId = null;
    if (validatedData.materialCode) {
      const materialResult = await pool.query(
        'SELECT id FROM materials WHERE code = $1',
        [validatedData.materialCode]
      );
      if (materialResult.rows.length > 0) {
        materialId = materialResult.rows[0].id;
      }
    }
    
    const result = await pool.query(`
      INSERT INTO routing_operation_components (
        routing_operation_id, material_id, material_code, quantity, unit, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      operationId,
      materialId,
      validatedData.materialCode,
      validatedData.quantity,
      validatedData.unit,
      validatedData.isActive
    ]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error('Error creating routing operation component:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update component
router.put('/components/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = routingComponentSchema.partial().parse(req.body);
    
    // Get material_id if materialCode is provided
    let materialId = null;
    if (validatedData.materialCode) {
      const materialResult = await pool.query(
        'SELECT id FROM materials WHERE code = $1',
        [validatedData.materialCode]
      );
      if (materialResult.rows.length > 0) {
        materialId = materialResult.rows[0].id;
      }
    }
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (materialId !== null) {
      updateFields.push(`material_id = $${paramIndex++}`);
      updateValues.push(materialId);
    }
    if (validatedData.materialCode !== undefined) {
      updateFields.push(`material_code = $${paramIndex++}`);
      updateValues.push(validatedData.materialCode);
    }
    if (validatedData.quantity !== undefined) {
      updateFields.push(`quantity = $${paramIndex++}`);
      updateValues.push(validatedData.quantity);
    }
    if (validatedData.unit !== undefined) {
      updateFields.push(`unit = $${paramIndex++}`);
      updateValues.push(validatedData.unit);
    }
    if (validatedData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(validatedData.isActive);
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    const query = `
      UPDATE routing_operation_components 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing operation component not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error('Error updating routing operation component:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete component
router.delete('/components/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM routing_operation_components WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Routing operation component not found" });
    }
    
    return res.status(200).json({ message: "Routing operation component deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting routing operation component:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

export default router;
