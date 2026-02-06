import express, { Request, Response } from "express";
import { getPool } from "../../database";

const router = express.Router();
const pool = getPool();

// GET all transaction types
router.get("/", async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;
    
    let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM transaction_types
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
    console.error("Error fetching transaction types:", error);
    return res.status(500).json({ message: "Failed to fetch transaction types", error: error.message });
  }
});

// GET single transaction type by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM transaction_types
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transaction type not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching transaction type:", error);
    return res.status(500).json({ message: "Failed to fetch transaction type", error: error.message });
  }
});

// POST create new transaction type
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      is_active
    } = req.body;
    
    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ 
        message: "Code and name are required" 
      });
    }
    
    // Check if code already exists
    const existing = await pool.query(
      `SELECT id FROM transaction_types WHERE code = $1`,
      [code]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Transaction type with this code already exists" });
    }
    
    const result = await pool.query(`
      INSERT INTO transaction_types (
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [
      code,
      name,
      description || null,
      is_active !== undefined ? is_active : true
    ]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating transaction type:", error);
    return res.status(500).json({ message: "Failed to create transaction type", error: error.message });
  }
});

// PUT update transaction type
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      is_active
    } = req.body;
    
    // Check if type exists
    const existing = await pool.query(
      `SELECT id FROM transaction_types WHERE id = $1`,
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Transaction type not found" });
    }
    
    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (code !== undefined) {
      // Check if new code conflicts with existing
      if (code) {
        const codeCheck = await pool.query(
          `SELECT id FROM transaction_types WHERE code = $1 AND id != $2`,
          [code, id]
        );
        if (codeCheck.rows.length > 0) {
          return res.status(409).json({ message: "Transaction type with this code already exists" });
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
      UPDATE transaction_types 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating transaction type:", error);
    return res.status(500).json({ message: "Failed to update transaction type", error: error.message });
  }
});

// DELETE transaction type
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if type is used in account determination
    const usageCheck = await pool.query(
      `SELECT COUNT(*) as count FROM asset_account_determination WHERE transaction_type_id = $1`,
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        message: "Cannot delete transaction type that is in use by account determination rules" 
      });
    }
    
    const result = await pool.query(
      `DELETE FROM transaction_types WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transaction type not found" });
    }
    
    return res.json({ message: "Transaction type deleted successfully", data: result.rows[0] });
  } catch (error: any) {
    console.error("Error deleting transaction type:", error);
    return res.status(500).json({ message: "Failed to delete transaction type", error: error.message });
  }
});

export default router;

