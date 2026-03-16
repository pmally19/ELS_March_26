import { Request, Response, Router } from 'express';
import { db, pool } from '../../db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schema for MRP Controller
const mrpControllerSchema = z.object({
  controller_code: z.string().min(1, "Controller code is required").max(3, "Controller code must be 3 characters or less"),
  controller_name: z.string().min(1, "Controller name is required").max(100, "Controller name must be 100 characters or less"),
  description: z.string().optional().nullable(),
  is_active: z.boolean(),
});

// GET /api/master-data/mrp-controllers - Get all MRP Controllers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;
    
    let query = sql`
      SELECT 
        id,
        controller_code,
        controller_name,
        description,
        is_active,
        created_at,
        updated_at
      FROM mrp_controllers
    `;
    
    const conditions: any[] = [];
    if (is_active !== undefined) {
      conditions.push(sql`is_active = ${is_active === 'true'}`);
    }
    
    if (conditions.length > 0) {
      query = sql`${query} WHERE ${sql.join(conditions, sql` AND `)}`;
    }
    
    query = sql`${query} ORDER BY controller_code`;
    
    const result = await db.execute(query);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching MRP controllers:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// GET /api/master-data/mrp-controllers/:id - Get MRP Controller by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db.execute(sql`
      SELECT 
        id,
        controller_code,
        controller_name,
        description,
        is_active,
        created_at,
        updated_at
      FROM mrp_controllers
      WHERE id = ${id}
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "MRP Controller not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching MRP controller:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// POST /api/master-data/mrp-controllers - Create new MRP Controller
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = mrpControllerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        message: validation.error.errors.map(e => e.message).join(", ") 
      });
    }
    
    const data = validation.data;
    
    // Trim and normalize controller code (uppercase, max 3 chars)
    const normalizedCode = data.controller_code.trim().toUpperCase().substring(0, 3);
    
    if (normalizedCode.length === 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        message: "Controller code cannot be empty" 
      });
    }
    
    // Check if controller code already exists
    const existingResult = await pool.query(
      'SELECT id FROM mrp_controllers WHERE controller_code = $1',
      [normalizedCode]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ 
        error: "Conflict", 
        message: "Controller code already exists" 
      });
    }
    
    // Trim controller name
    const normalizedName = data.controller_name.trim();
    
    if (normalizedName.length === 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        message: "Controller name cannot be empty" 
      });
    }
    
    // Insert MRP Controller
    const insertResult = await pool.query(`
      INSERT INTO mrp_controllers (
        controller_code, 
        controller_name, 
        description, 
        is_active,
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [
      normalizedCode,
      normalizedName,
      data.description?.trim() || null,
      data.is_active !== undefined ? data.is_active : true
    ]);
    
    return res.status(201).json(insertResult.rows[0]);
  } catch (error: any) {
    console.error('Error creating MRP controller:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: "Conflict", 
        message: "Controller code already exists" 
      });
    }
    
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// PATCH /api/master-data/mrp-controllers/:id - Update MRP Controller
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if MRP Controller exists first
    const existingResult = await db.execute(sql`
      SELECT id, controller_code FROM mrp_controllers WHERE id = ${id}
    `);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "MRP Controller not found" });
    }
    
    const existingController = existingResult.rows[0] as { id: number; controller_code: string };
    
    // Validate only provided fields (partial update)
    const validation = mrpControllerSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        message: validation.error.errors.map(e => e.message).join(", ") 
      });
    }
    
    const data = validation.data;
    
    // Check if controller code is being changed and if new code already exists
    if (data.controller_code !== undefined) {
      // Prevent changing controller code if it's different from existing
      if (data.controller_code !== existingController.controller_code) {
        const codeCheck = await db.execute(sql`
          SELECT id FROM mrp_controllers 
          WHERE controller_code = ${data.controller_code} AND id != ${id}
        `);
        
        if (codeCheck.rows.length > 0) {
          return res.status(409).json({ 
            error: "Conflict", 
            message: "Controller code already exists" 
          });
        }
        
        // Check if old controller code is being used
        const oldCodeUsage = await pool.query(
          'SELECT COUNT(*) as count FROM material_mrp_data WHERE mrp_controller = $1',
          [existingController.controller_code]
        );
        
        const oldUsageCount = parseInt(String((oldCodeUsage.rows[0] as { count: string | number })?.count ?? '0'), 10);
        if (oldUsageCount > 0) {
          return res.status(409).json({ 
            error: "Conflict", 
            message: "Cannot change controller code. It is being used by material MRP data records." 
          });
        }
      }
    }
    
    // Build dynamic update query
    const updateClauses: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;
    
    if (data.controller_code !== undefined) {
      updateClauses.push(`controller_code = $${paramCount++}`);
      updateValues.push(data.controller_code.trim().toUpperCase());
    }
    if (data.controller_name !== undefined) {
      if (!data.controller_name.trim()) {
        return res.status(400).json({ 
          error: "Validation failed", 
          message: "Controller name cannot be empty" 
        });
      }
      updateClauses.push(`controller_name = $${paramCount++}`);
      updateValues.push(data.controller_name.trim());
    }
    if (data.description !== undefined) {
      updateClauses.push(`description = $${paramCount++}`);
      updateValues.push(data.description?.trim() || null);
    }
    if (data.is_active !== undefined) {
      updateClauses.push(`is_active = $${paramCount++}`);
      updateValues.push(data.is_active);
    }
    
    if (updateClauses.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    updateClauses.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    const updateQuery = `
      UPDATE mrp_controllers 
      SET ${updateClauses.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, updateValues);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "MRP Controller not found" });
    }
    
    return res.status(200).json(updateResult.rows[0]);
  } catch (error: any) {
    console.error('Error updating MRP controller:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: "Conflict", 
        message: "Controller code already exists" 
      });
    }
    
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// DELETE /api/master-data/mrp-controllers/:id - Delete MRP Controller (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if MRP Controller exists
    const existingResult = await db.execute(sql`
      SELECT controller_code FROM mrp_controllers WHERE id = ${id}
    `);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "MRP Controller not found" });
    }
    
    const row = existingResult.rows[0] as { controller_code: string } | undefined;
    const controllerCode: string = row?.controller_code || '';
    
    if (!controllerCode) {
      return res.status(404).json({ error: "MRP Controller not found" });
    }
    
    // Check if MRP Controller is being used in materials table
    const materialsUsage = await pool.query<{ count: string | number }>(
      'SELECT COUNT(*) as count FROM materials WHERE mrp_controller = $1',
      [controllerCode]
    );
    
    // Check if MRP Controller is being used in material_mrp_data table
    const mrpDataUsage = await pool.query<{ count: string | number }>(
      'SELECT COUNT(*) as count FROM material_mrp_data WHERE mrp_controller = $1',
      [controllerCode]
    );
    
    const materialsCount = parseInt(String((materialsUsage.rows[0] as { count: string | number })?.count ?? '0'), 10);
    const mrpDataCount = parseInt(String((mrpDataUsage.rows[0] as { count: string | number })?.count ?? '0'), 10);
    const totalUsage = materialsCount + mrpDataCount;
    
    if (totalUsage > 0) {
      const usageDetails: string[] = [];
      if (materialsCount > 0) {
        usageDetails.push(`${materialsCount} material(s)`);
      }
      if (mrpDataCount > 0) {
        usageDetails.push(`${mrpDataCount} material MRP data record(s)`);
      }
      
      return res.status(409).json({ 
        error: "Conflict", 
        message: `Cannot delete MRP Controller. It is being used by: ${usageDetails.join(', ')}.` 
      });
    }
    
    // Hard delete - permanently remove from database
    const deleteResult = await pool.query(`
      DELETE FROM mrp_controllers 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "MRP Controller not found" });
    }
    
    return res.status(200).json({ 
      message: "MRP Controller deleted permanently",
      data: deleteResult.rows[0]
    });
  } catch (error: any) {
    console.error('Error deleting MRP controller:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

export default router;

