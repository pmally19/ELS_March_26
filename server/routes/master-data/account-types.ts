import { Request, Response } from "express";
import { pool } from "../../db";

// Get all account types
export async function getAccountTypes(req: Request, res: Response) {
  try {
    const result = await pool.query("SELECT * FROM account_types ORDER BY code");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching account types:", error);
    return res.status(500).json({ message: "Failed to fetch account types", error });
  }
}

// Get account type by ID
export async function getAccountTypeById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query("SELECT * FROM account_types WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account type not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching account type:", error);
    return res.status(500).json({ message: "Failed to fetch account type", error });
  }
}

// Create new account type
export async function createAccountType(req: Request, res: Response) {
  try {
    // Accept both camelCase (from client) and snake_case (legacy)
    const { 
      code, 
      name, 
      description,
      category,
      isActive,
      is_active 
    } = req.body;
    
    // Use camelCase if provided, otherwise fallback to snake_case
    const is_active_value = isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true);
    
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required" });
    }
    
    // Check if code already exists
    const existingCode = await pool.query("SELECT id FROM account_types WHERE code = $1", [code]);
    if (existingCode.rows.length > 0) {
      return res.status(409).json({ message: "Account type code already exists" });
    }
    
    const result = await pool.query(`
      INSERT INTO account_types (code, name, description, category, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, category || null, is_active_value]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating account type:", error);
    return res.status(500).json({ message: "Failed to create account type", error });
  }
}

// Update account type
export async function updateAccountType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Accept both camelCase (from client) and snake_case (legacy)
    const { 
      code, 
      name, 
      description,
      category,
      isActive,
      is_active 
    } = req.body;
    
    // Use camelCase if provided, otherwise fallback to snake_case
    const is_active_value = isActive !== undefined ? isActive : is_active;
    
    // Check if account type exists
    const existing = await pool.query("SELECT * FROM account_types WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Account type not found" });
    }
    
    // Check if new code conflicts with existing (excluding current record)
    if (code && code !== existing.rows[0].code) {
      const codeConflict = await pool.query("SELECT id FROM account_types WHERE code = $1 AND id != $2", [code, id]);
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({ message: "Account type code already exists" });
      }
    }
    
    const result = await pool.query(`
      UPDATE account_types 
      SET code = COALESCE($1, code), 
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          category = COALESCE($4, category),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [code, name, description, category, is_active_value, id]);
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating account type:", error);
    return res.status(500).json({ message: "Failed to update account type", error });
  }
}

// Delete account type
export async function deleteAccountType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if account type is being used (you can add validation here if needed)
    // For now, just delete it
    
    const result = await pool.query("DELETE FROM account_types WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account type not found" });
    }
    
    return res.status(200).json({ message: "Account type deleted successfully", deletedRecord: result.rows[0] });
  } catch (error) {
    console.error("Error deleting account type:", error);
    return res.status(500).json({ message: "Failed to delete account type", error });
  }
}

