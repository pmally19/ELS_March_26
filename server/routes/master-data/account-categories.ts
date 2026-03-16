import express, { Request, Response } from "express";
import { getPool } from "../../database";

const router = express.Router();
const pool = getPool();

// GET all account categories
router.get("/", async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;
    
    let query = `
      SELECT 
        id,
        code,
        name,
        description,
        account_type,
        is_active,
        created_at,
        updated_at
      FROM account_categories
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    }
    
    query += ` ORDER BY code`;
    
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching account categories:", error);
    return res.status(500).json({ message: "Failed to fetch account categories", error: error.message });
  }
});

// GET single account category by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        account_type,
        is_active,
        created_at,
        updated_at
      FROM account_categories
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account category not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching account category:", error);
    return res.status(500).json({ message: "Failed to fetch account category", error: error.message });
  }
});

// POST create new account category
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      account_type,
      is_active
    } = req.body;
    
    // Validate required fields
    if (!code || !name || !account_type) {
      return res.status(400).json({ 
        message: "Code, name, and account_type are required" 
      });
    }
    
    // Validate account_type
    const validAccountTypes = ['BALANCE_SHEET', 'PROFIT_LOSS'];
    if (!validAccountTypes.includes(account_type)) {
      return res.status(400).json({ 
        message: `Account type must be one of: ${validAccountTypes.join(', ')}` 
      });
    }
    
    // Check if code already exists
    const existing = await pool.query(
      `SELECT id FROM account_categories WHERE code = $1`,
      [code]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Account category with this code already exists" });
    }
    
    const result = await pool.query(`
      INSERT INTO account_categories (
        code,
        name,
        description,
        account_type,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [
      code,
      name,
      description || null,
      account_type,
      is_active !== undefined ? is_active : true
    ]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating account category:", error);
    return res.status(500).json({ message: "Failed to create account category", error: error.message });
  }
});

// PUT update account category
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      account_type,
      is_active
    } = req.body;
    
    // Check if category exists
    const existing = await pool.query(
      `SELECT id FROM account_categories WHERE id = $1`,
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Account category not found" });
    }
    
    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (code !== undefined) {
      // Check if new code conflicts with existing
      if (code) {
        const codeCheck = await pool.query(
          `SELECT id FROM account_categories WHERE code = $1 AND id != $2`,
          [code, id]
        );
        if (codeCheck.rows.length > 0) {
          return res.status(409).json({ message: "Account category with this code already exists" });
        }
      }
      updateFields.push(`code = $${paramIndex++}`);
      values.push(code);
    }
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    
    if (account_type !== undefined) {
      const validAccountTypes = ['BALANCE_SHEET', 'PROFIT_LOSS'];
      if (!validAccountTypes.includes(account_type)) {
        return res.status(400).json({ 
          message: `Account type must be one of: ${validAccountTypes.join(', ')}` 
        });
      }
      updateFields.push(`account_type = $${paramIndex++}`);
      values.push(account_type);
    }
    
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE account_categories 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating account category:", error);
    return res.status(500).json({ message: "Failed to update account category", error: error.message });
  }
});

// DELETE account category
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if category is used in account determination
    const usageCheck = await pool.query(
      `SELECT COUNT(*) as count FROM asset_account_determination WHERE account_category_id = $1`,
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        message: "Cannot delete account category that is in use by account determination rules" 
      });
    }
    
    const result = await pool.query(
      `DELETE FROM account_categories WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account category not found" });
    }
    
    return res.json({ message: "Account category deleted successfully", data: result.rows[0] });
  } catch (error: any) {
    console.error("Error deleting account category:", error);
    return res.status(500).json({ message: "Failed to delete account category", error: error.message });
  }
});

export default router;

