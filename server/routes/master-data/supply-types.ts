import { Request, Response } from "express";
import { pool } from "../../db";

// Get all supply types
export async function getSupplyTypes(req: Request, res: Response) {
  try {
    // Fallback to raw query if drizzle table isn't present yet
    // Check physical table existence and return empty array if missing
    const exists = await pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'supply_types'
    `);
    if (!exists.rowCount) {
      return res.status(200).json([]);
    }
    const raw = await pool.query("SELECT * FROM supply_types ORDER BY code");
    const data = raw.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      supplyCategory: r.supply_category ?? null,
      procurementType: r.procurement_type ?? "standard",
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      version: r.version ?? 1,
      validFrom: r.valid_from,
      validTo: r.valid_to ?? null,
      active: r.active !== false,
    }));
    return res.status(200).json(data);
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
    
    const result = await pool.query("SELECT * FROM supply_types WHERE id = $1", [id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    const r = result.rows[0];
    return res.status(200).json({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      supplyCategory: r.supply_category ?? null,
      procurementType: r.procurement_type ?? "standard",
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      version: r.version ?? 1,
      validFrom: r.valid_from,
      validTo: r.valid_to ?? null,
      active: r.active !== false,
    });
  } catch (error) {
    console.error("Error fetching supply type:", error);
    return res.status(500).json({ message: "Failed to fetch supply type", error });
  }
}

// Create new supply type
export async function createSupplyType(req: Request, res: Response) {
  try {
    const body = req.body || {};
    // accept both camelCase and snake_case
    const code = body.code ?? body.Code ?? body.supply_code;
    const name = body.name ?? body.Name ?? body.supply_name;
    const description = body.description ?? body.Description ?? null;
    const supplyCategory = body.supplyCategory ?? body.supply_category ?? null;
    const procurementType = body.procurementType ?? body.procurement_type ?? "standard";
    const isActive = body.isActive ?? body.is_active ?? true;
    
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required" });
    }
    
    // Check if code already exists
    // Raw SQL to match physical table definition
    const conflict = await pool.query("SELECT id FROM supply_types WHERE code = $1", [code]);
    if (conflict.rowCount) {
      return res.status(409).json({ message: "Supply type code already exists" });
    }
    const result = await pool.query(
      `INSERT INTO supply_types (code, name, description, is_active, created_at, updated_at, version, valid_from, active)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 1, NOW(), true)
       RETURNING *`,
      [code, name, description, isActive !== false]
    );
    const r = result.rows[0];
    return res.status(201).json({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      supplyCategory: r.supply_category ?? null,
      procurementType: r.procurement_type ?? "standard",
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      version: r.version ?? 1,
      validFrom: r.valid_from,
      validTo: r.valid_to ?? null,
      active: r.active !== false,
    });
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
    const body = req.body || {};
    const code = body.code ?? body.Code ?? body.supply_code;
    const name = body.name ?? body.Name ?? body.supply_name; // allow name update
    const description = body.description ?? body.Description;
    const supplyCategory = body.supplyCategory ?? body.supply_category;
    const procurementType = body.procurementType ?? body.procurement_type;
    const isActive = body.isActive ?? body.is_active;
    
    // Check if supply type exists
    // Check existence
    const existing = await pool.query("SELECT id, code FROM supply_types WHERE id = $1", [id]);
    if (!existing.rowCount) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    // If code is updated, check uniqueness
    if (code && code !== existing.rows[0].code) {
      const dup = await pool.query("SELECT id FROM supply_types WHERE code = $1 AND id <> $2", [code, id]);
      if (dup.rowCount) {
        return res.status(409).json({ message: "Supply type code already exists" });
      }
    }
    // Build raw SQL update aligned to physical columns
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (code !== undefined) { fields.push(`code = $${idx++}`); values.push(code); }
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(!!isActive); }
    fields.push(`updated_at = NOW()`);
    if (fields.length === 1) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    const result = await pool.query(
      `UPDATE supply_types SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      [...values, id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    const r = result.rows[0];
    return res.status(200).json({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      supplyCategory: r.supply_category ?? null,
      procurementType: r.procurement_type ?? "standard",
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      version: r.version ?? 1,
      validFrom: r.valid_from,
      validTo: r.valid_to ?? null,
      active: r.active !== false,
    });
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
    
    const result = await pool.query("DELETE FROM supply_types WHERE id = $1 RETURNING *", [id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    return res.status(200).json({ message: "Supply type deleted successfully" });
  } catch (error) {
    console.error("Error deleting supply type:", error);
    return res.status(500).json({ message: "Failed to delete supply type", error });
  }
}

// Toggle supply type active status
export async function toggleSupplyTypeStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const existing = await pool.query("SELECT id, is_active FROM supply_types WHERE id = $1", [id]);
    if (!existing.rowCount) {
      return res.status(404).json({ message: "Supply type not found" });
    }
    const newStatus = !existing.rows[0].is_active;
    const result = await pool.query(
      "UPDATE supply_types SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [newStatus, id]
    );
    const r = result.rows[0];
    return res.status(200).json({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      supplyCategory: r.supply_category ?? null,
      procurementType: r.procurement_type ?? "standard",
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      version: r.version ?? 1,
      validFrom: r.valid_from,
      validTo: r.valid_to ?? null,
      active: r.active !== false,
    });
  } catch (error) {
    console.error("Error toggling supply type status:", error);
    return res.status(500).json({ message: "Failed to toggle supply type status", error });
  }
}