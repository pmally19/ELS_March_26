import { Request, Response, Router } from "express";
import { pool } from "../../db";
import { insertNumberRangeObjectSchema, updateNumberRangeObjectSchema } from "@shared/number-range-objects-schema";

const router = Router();

// Get all number range objects
router.get("/", async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM number_range_objects
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }

    query += " ORDER BY code";

    const result = await pool.query(query, params);

    // Convert snake_case to camelCase
    const formattedData = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return res.status(200).json(formattedData);
  } catch (error: any) {
    console.error("Error fetching number range objects:", error);
    return res.status(500).json({
      message: "Failed to fetch number range objects",
      error: error.message || "Unknown error"
    });
  }
});

// Get number range object by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await pool.query("SELECT * FROM number_range_objects WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Number range object not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching number range object:", error);
    return res.status(500).json({
      message: "Failed to fetch number range object",
      error: error.message || "Unknown error"
    });
  }
});

// Create new number range object
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertNumberRangeObjectSchema.parse(req.body);

    // Check if code already exists
    const existingCode = await pool.query(
      "SELECT id FROM number_range_objects WHERE code = $1",
      [validatedData.code]
    );
    if (existingCode.rows.length > 0) {
      return res.status(409).json({ message: "Number range object code already exists" });
    }

    const result = await pool.query(`
      INSERT INTO number_range_objects (code, name, description, is_active, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      validatedData.code,
      validatedData.name,
      validatedData.description || null,
      validatedData.isActive ?? true,
      validatedData.createdBy || null,
      validatedData.updatedBy || null,
    ]);

    const created = result.rows[0];
    return res.status(201).json({
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description,
      isActive: created.is_active,
      createdAt: created.created_at,
      updatedAt: created.updated_at
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors
      });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: "Number range object code already exists" });
    }
    console.error("Error creating number range object:", error);
    return res.status(500).json({
      message: "Failed to create number range object",
      error: error.message || "Unknown error"
    });
  }
});

// Update number range object
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const validatedData = updateNumberRangeObjectSchema.parse(req.body);

    // Check if record exists
    const existing = await pool.query("SELECT * FROM number_range_objects WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Number range object not found" });
    }

    // Check if new code conflicts with existing (excluding current record)
    if (validatedData.code && validatedData.code !== existing.rows[0].code) {
      const codeConflict = await pool.query(
        "SELECT id FROM number_range_objects WHERE code = $1 AND id != $2",
        [validatedData.code, id]
      );
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({ message: "Number range object code already exists" });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (validatedData.code !== undefined) {
      updates.push(`code = $${paramCount++}`);
      values.push(validatedData.code);
    }
    if (validatedData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(validatedData.name);
    }
    if (validatedData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(validatedData.description || null);
    }
    if (validatedData.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(validatedData.isActive);
    }
    if (validatedData.updatedBy !== undefined) {
      updates.push(`updated_by = $${paramCount++}`);
      values.push(validatedData.updatedBy || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE number_range_objects 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    const updated = result.rows[0];
    return res.status(200).json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isActive: updated.is_active,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors
      });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: "Number range object code already exists" });
    }
    console.error("Error updating number range object:", error);
    return res.status(500).json({
      message: "Failed to update number range object",
      error: error.message || "Unknown error"
    });
  }
});

// Delete number range object
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Check if number range object is referenced by number ranges
    const numberRangeCheck = await pool.query(`
      SELECT COUNT(*) as count FROM number_ranges 
      WHERE number_range_object = (SELECT code FROM number_range_objects WHERE id = $1)
    `, [id]);

    if (parseInt(numberRangeCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: `Cannot delete number range object. It is used by ${numberRangeCheck.rows[0].count} number range(s).`
      });
    }

    const result = await pool.query(
      "DELETE FROM number_range_objects WHERE id = $1 RETURNING id, code, name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Number range object not found" });
    }

    return res.status(200).json({
      message: "Number range object deleted successfully",
      deleted: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23503') {
      return res.status(400).json({ message: "Cannot delete number range object. It is referenced by other records." });
    }
    console.error("Error deleting number range object:", error);
    return res.status(500).json({
      message: "Failed to delete number range object",
      error: error.message || "Unknown error"
    });
  }
});

export default router;

