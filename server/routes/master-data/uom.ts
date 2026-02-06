import express from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Validation schema for UOM
const uomSchema = z.object({
  code: z.string().min(1, "UOM code is required").max(5, "UOM code must be 5 characters or less"),
  name: z.string().min(1, "UOM name is required").max(50, "UOM name must be 50 characters or less"),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
  dimension: z.string().min(1, "Dimension is required").max(20, "Dimension must be 20 characters or less"),
  baseUnit: z.string().max(5, "Base unit must be 5 characters or less").optional(),
  conversionFactor: z.number().positive("Conversion factor must be positive").optional(),
  isActive: z.boolean().default(true),
});

// Get all UOMs
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM units_of_measure 
      ORDER BY code
    `);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching UOMs:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Get UOM by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT * FROM units_of_measure 
      WHERE id = ${id}
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "UOM not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching UOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Create new UOM
router.post('/', async (req, res) => {
  try {
    const validation = uomSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        message: validation.error.errors.map(e => e.message).join(", ") 
      });
    }

    const data = validation.data;

    // Check if UOM code already exists
    const existingResult = await db.execute(sql`SELECT id FROM units_of_measure WHERE code = ${data.code}`);
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "UOM code already exists" });
    }

    // Resolve base unit code -> id if provided
    let baseUomId: number | null = null;
    if (data.baseUnit) {
      const baseLookup = await db.execute(sql`SELECT id FROM units_of_measure WHERE code = ${data.baseUnit}`);
      baseUomId = baseLookup.rows[0]?.id ?? null;
    }

    // Insert UOM (using correct column names)
    const insertResult = await db.execute(sql`
      INSERT INTO units_of_measure (
        code, name, description, dimension, base_uom_id, conversion_factor, 
        is_active, created_at, updated_at
      )
      VALUES (
        ${data.code}, ${data.name}, ${data.description || null}, ${data.dimension}, 
        ${baseUomId}, ${data.conversionFactor ?? 1}, ${data.isActive}, NOW(), NOW()
      )
      RETURNING *
    `);

    return res.status(201).json(insertResult.rows[0]);
  } catch (error: any) {
    console.error('Error creating UOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Update UOM
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = uomSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        message: validation.error.errors.map(e => e.message).join(", ") 
      });
    }

    const data = validation.data;

    // Check if UOM exists
    const existingResult = await db.execute(sql`SELECT id FROM units_of_measure WHERE id = ${id}`);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "UOM not found" });
    }

    // Build dynamic SET clause
    const updates: any[] = [];
    if (data.code !== undefined) updates.push(sql`code = ${data.code}`);
    if (data.name !== undefined) updates.push(sql`name = ${data.name}`);
    if (data.description !== undefined) updates.push(sql`description = ${data.description || null}`);
    if (data.dimension !== undefined) updates.push(sql`dimension = ${data.dimension}`);
    if (data.conversionFactor !== undefined) updates.push(sql`conversion_factor = ${data.conversionFactor}`);
    if (data.isActive !== undefined) updates.push(sql`is_active = ${data.isActive}`);

    if (data.baseUnit !== undefined) {
      let baseUomId: number | null = null;
      if (data.baseUnit) {
        const baseLookup = await db.execute(sql`SELECT id FROM units_of_measure WHERE code = ${data.baseUnit}`);
        baseUomId = baseLookup.rows[0]?.id ?? null;
      }
      updates.push(sql`base_uom_id = ${baseUomId}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const setClause = sql.join(updates, sql`, `);

    const updateResult = await db.execute(sql`
      UPDATE units_of_measure 
      SET ${setClause}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    return res.status(200).json(updateResult.rows[0]);
  } catch (error: any) {
    console.error('Error updating UOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete UOM
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if UOM exists
    const existingResult = await db.execute(sql`SELECT id FROM units_of_measure WHERE id = ${id}`);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "UOM not found" });
    }

    // Delete UOM
    await db.execute(sql`DELETE FROM units_of_measure WHERE id = ${id}`);

    return res.status(200).json({ message: "UOM deleted successfully" });
  } catch (error: any) {
    console.error('Error deleting UOM:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Bulk import UOMs
router.post('/bulk-import', async (req, res) => {
  try {
    const uoms = req.body;
    
    if (!Array.isArray(uoms)) {
      return res.status(400).json({ error: "Request body must be an array of UOMs" });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const uom of uoms) {
      try {
        const validation = uomSchema.safeParse(uom);
        
        if (!validation.success) {
          results.failed++;
          results.errors.push(`UOM ${uom.code || 'unknown'}: ${validation.error.errors.map(e => e.message).join(", ")}`);
          continue;
        }

        const data = validation.data;

        // Check if UOM code already exists
        const existingResult = await db.execute(sql`SELECT id FROM units_of_measure WHERE uom_code = ${data.code}`);
        
        if (existingResult.rows.length > 0) {
          results.failed++;
          results.errors.push(`UOM ${data.code}: UOM code already exists`);
          continue;
        }

        // Insert UOM
        await db.execute(sql`
          INSERT INTO units_of_measure (
            uom_code, name, description, dimension, base_unit, conversion_factor, 
            is_active, created_at, updated_at
          )
          VALUES (
            ${data.code}, ${data.name}, ${data.description || null}, ${data.dimension}, 
            ${data.baseUnit || null}, ${data.conversionFactor || 1}, ${data.isActive}, NOW(), NOW()
          )
        `);

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`UOM ${uom.code || 'unknown'}: ${error.message}`);
      }
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Error bulk importing UOMs:', error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

export default router;