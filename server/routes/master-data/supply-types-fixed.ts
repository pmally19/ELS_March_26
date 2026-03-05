import { Request, Response } from "express";
import { pool } from "../../db";

// Get all supply types
export async function getSupplyTypes(req: Request, res: Response) {
  try {
    // Ensure table exists before querying
    const exists = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'supply_types'
    `);
    if (!exists.rowCount) {
      return res.status(200).json([]);
    }
    const result = await pool.query(`
      SELECT 
        id, code, name, description, is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        created_by AS "_createdBy",
        updated_by AS "_updatedBy",
        "_tenantId",
        "_deletedAt"
      FROM supply_types 
      WHERE is_active = true OR is_active IS NULL
      ORDER BY code
    `);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching supply types:", error);
    return res.status(500).json({ message: "Failed to fetch supply types", error });
  }
}

// Get supply type by ID
export async function getSupplyTypeById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        id, code, name, description, is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        created_by AS "_createdBy",
        updated_by AS "_updatedBy",
        "_tenantId",
        "_deletedAt"
      FROM supply_types WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Supply type not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching supply type:", error);
    return res.status(500).json({ message: "Failed to fetch supply type", error });
  }
}

// Create new supply type
export async function createSupplyType(req: Request, res: Response) {
  try {
    const { code, description, supply_category, procurement_type = "standard", is_active = true } = req.body;

    if (!code || !description) {
      return res.status(400).json({ message: "Code and description are required" });
    }

    // Check if code already exists
    const existingCode = await pool.query("SELECT id FROM supply_types WHERE code = $1", [code]);
    if (existingCode.rows.length > 0) {
      return res.status(409).json({ message: "Supply type code already exists" });
    }

    const userId = (req as any).user?.id?.toString() ?? '1';
    const tenantId = (req as any).user?.tenantId ?? '001';

    const result = await pool.query(`
      INSERT INTO supply_types (code, description, supply_category, procurement_type, is_active, created_at, updated_at, created_by, updated_by, "_tenantId", "_deletedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7, $8, NULL)
      RETURNING *
    `, [code, description, supply_category, procurement_type, is_active, userId, userId, tenantId]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating supply type:", error);
    return res.status(500).json({ message: "Failed to create supply type", error });
  }
}

// Update supply type
export async function updateSupplyType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const { code, description, supply_category, procurement_type, is_active } = req.body;

    // Check if supply type exists
    const existing = await pool.query("SELECT * FROM supply_types WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Supply type not found" });
    }

    // Check if new code conflicts with existing (excluding current record)
    if (code && code !== existing.rows[0].code) {
      const codeConflict = await pool.query("SELECT id FROM supply_types WHERE code = $1 AND id != $2", [code, id]);
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({ message: "Supply type code already exists" });
      }
    }

    const userId = (req as any).user?.id?.toString() ?? '1';

    const result = await pool.query(`
      UPDATE supply_types 
      SET code = COALESCE($1, code), 
          description = COALESCE($2, description),
          supply_category = COALESCE($3, supply_category),
          procurement_type = COALESCE($4, procurement_type),
          is_active = COALESCE($5, is_active),
          updated_at = NOW(),
          updated_by = $6
      WHERE id = $7
      RETURNING *
    `, [code, description, supply_category, procurement_type, is_active, userId, id]);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating supply type:", error);
    return res.status(500).json({ message: "Failed to update supply type", error });
  }
}

// Delete supply type
export async function deleteSupplyType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const userId = (req as any).user?.id?.toString() ?? '1';

    // Soft delete
    const result = await pool.query(`
      UPDATE supply_types 
      SET is_active = false, "_deletedAt" = NOW(), updated_by = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Supply type not found" });
    }

    return res.status(200).json({ message: "Supply type deleted successfully", deletedRecord: result.rows[0] });
  } catch (error) {
    console.error("Error deleting supply type:", error);
    return res.status(500).json({ message: "Failed to delete supply type", error });
  }
}

// Bulk import supply types
export async function bulkImportSupplyTypes(req: Request, res: Response) {
  try {
    const { supplyTypes: importData } = req.body;

    if (!Array.isArray(importData) || importData.length === 0) {
      return res.status(400).json({ message: "Valid supply types array is required" });
    }

    const results = [];
    const errors = [];

    for (let index = 0; index < importData.length; index++) {
      const supplyType = importData[index];
      try {
        const { code, description, supply_category, procurement_type = "standard", is_active = true } = supplyType;

        if (!code || !description) {
          errors.push({ row: index + 1, error: "Code and description are required" });
          continue;
        }

        // Check if code already exists
        const existingCode = await pool.query("SELECT id FROM supply_types WHERE code = $1", [code]);
        if (existingCode.rows.length > 0) {
          errors.push({ row: index + 1, error: `Supply type code ${code} already exists` });
          continue;
        }

        const result = await pool.query(`
          INSERT INTO supply_types (code, description, supply_category, procurement_type, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING *
        `, [code, description, supply_category, procurement_type, is_active]);

        results.push(result.rows[0]);
      } catch (error) {
        errors.push({ row: index + 1, error: error.message });
      }
    }

    return res.status(200).json({
      message: `Bulk import completed. ${results.length} supply types created, ${errors.length} errors`,
      imported: results,
      errors,
    });
  } catch (error) {
    console.error("Error bulk importing supply types:", error);
    return res.status(500).json({ message: "Failed to bulk import supply types", error });
  }
}