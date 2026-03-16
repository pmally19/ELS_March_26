import express, { Request, Response } from "express";
import { getPool } from "../../database";

const router = express.Router();
const pool = getPool();

// Helper function to validate transaction type from database
async function validateTransactionType(transactionType: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM transaction_types WHERE code = $1 AND is_active = true`,
    [transactionType]
  );
  return result.rows.length > 0;
}

// Helper function to validate account category from database
async function validateAccountCategory(accountCategory: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM account_categories WHERE code = $1 AND is_active = true`,
    [accountCategory]
  );
  return result.rows.length > 0;
}

// GET all account determination rules
router.get("/", async (req: Request, res: Response) => {
  try {
    const { asset_class_id, transaction_type, company_code_id, account_category } = req.query;
    
    let query = `
      SELECT 
        aad.*,
        ac.code as asset_class_code,
        ac.name as asset_class_name,
        cc.code as company_code,
        cc.name as company_name,
        gl.account_number as gl_account_number,
        gl.account_name as gl_account_name,
        gl.account_type as gl_account_type
      FROM asset_account_determination aad
      JOIN asset_classes ac ON aad.asset_class_id = ac.id
      JOIN gl_accounts gl ON aad.gl_account_id = gl.id
      LEFT JOIN company_codes cc ON aad.company_code_id = cc.id
      WHERE aad.is_active = true
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (asset_class_id) {
      query += ` AND aad.asset_class_id = $${paramIndex++}`;
      params.push(parseInt(asset_class_id as string));
    }
    
    if (transaction_type) {
      query += ` AND aad.transaction_type = $${paramIndex++}`;
      params.push(transaction_type);
    }
    
    if (account_category) {
      query += ` AND aad.account_category = $${paramIndex++}`;
      params.push(account_category);
    }
    
    if (company_code_id) {
      query += ` AND (aad.company_code_id = $${paramIndex++} OR aad.company_code_id IS NULL)`;
      params.push(parseInt(company_code_id as string));
    }
    
    query += ` ORDER BY ac.code, aad.transaction_type, aad.account_category, aad.company_code_id NULLS LAST`;
    
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching account determination rules:", error);
    return res.status(500).json({ message: "Failed to fetch account determination rules", error: error.message });
  }
});

// GET single rule by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        aad.*,
        ac.code as asset_class_code,
        ac.name as asset_class_name,
        cc.code as company_code,
        cc.name as company_name,
        gl.account_number as gl_account_number,
        gl.account_name as gl_account_name,
        gl.account_type as gl_account_type
      FROM asset_account_determination aad
      JOIN asset_classes ac ON aad.asset_class_id = ac.id
      JOIN gl_accounts gl ON aad.gl_account_id = gl.id
      LEFT JOIN company_codes cc ON aad.company_code_id = cc.id
      WHERE aad.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account determination rule not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching account determination rule:", error);
    return res.status(500).json({ message: "Failed to fetch account determination rule", error: error.message });
  }
});

// POST create new rule
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      asset_class_id,
      transaction_type,
      account_category,
      gl_account_id,
      company_code_id,
      description,
      is_active,
      depreciation_area_id,
      account_determination_key,
      valid_from_date,
      valid_to_date,
      priority
    } = req.body;
    
    // Validate required fields
    if (!asset_class_id || !transaction_type || !account_category || !gl_account_id) {
      return res.status(400).json({ 
        message: "Asset class ID, transaction type, account category, and GL account ID are required" 
      });
    }
    
    // Validate transaction type exists in database
    const transactionTypeValid = await validateTransactionType(transaction_type);
    if (!transactionTypeValid) {
      return res.status(400).json({ 
        message: `Transaction type '${transaction_type}' not found or inactive` 
      });
    }
    
    // Validate account category exists in database
    const accountCategoryValid = await validateAccountCategory(account_category);
    if (!accountCategoryValid) {
      return res.status(400).json({ 
        message: `Account category '${account_category}' not found or inactive` 
      });
    }
    
    // Validate is_active is provided
    if (is_active === undefined || is_active === null) {
      return res.status(400).json({ 
        message: "is_active field is required" 
      });
    }
    
    // Check if rule already exists
    const existing = await pool.query(`
      SELECT id FROM asset_account_determination 
      WHERE asset_class_id = $1 
        AND transaction_type = $2 
        AND account_category = $3
        AND (company_code_id = $4 OR (company_code_id IS NULL AND $4 IS NULL))
    `, [asset_class_id, transaction_type, account_category, company_code_id || null]);
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Account determination rule already exists for this combination" });
    }
    
    const result = await pool.query(`
      INSERT INTO asset_account_determination (
        asset_class_id,
        transaction_type,
        account_category,
        gl_account_id,
        company_code_id,
        description,
        is_active,
        depreciation_area_id,
        account_determination_key,
        valid_from_date,
        valid_to_date,
        priority,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      asset_class_id,
      transaction_type,
      account_category,
      gl_account_id,
      company_code_id || null,
      description || null,
      is_active,
      depreciation_area_id || null,
      account_determination_key || null,
      valid_from_date || null,
      valid_to_date || null,
      priority || 0
    ]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating account determination rule:", error);
    return res.status(500).json({ message: "Failed to create account determination rule", error: error.message });
  }
});

// PUT update rule
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      asset_class_id,
      transaction_type,
      account_category,
      gl_account_id,
      company_code_id,
      description,
      is_active,
      depreciation_area_id,
      account_determination_key,
      valid_from_date,
      valid_to_date,
      priority
    } = req.body;
    
    // Check if rule exists
    const existing = await pool.query(
      `SELECT id FROM asset_account_determination WHERE id = $1`,
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Account determination rule not found" });
    }
    
    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (asset_class_id !== undefined) {
      updateFields.push(`asset_class_id = $${paramIndex++}`);
      values.push(asset_class_id);
    }
    if (transaction_type !== undefined) {
      const transactionTypeValid = await validateTransactionType(transaction_type);
      if (!transactionTypeValid) {
        return res.status(400).json({ 
          message: `Transaction type '${transaction_type}' not found or inactive` 
        });
      }
      updateFields.push(`transaction_type = $${paramIndex++}`);
      values.push(transaction_type);
    }
    if (account_category !== undefined) {
      const accountCategoryValid = await validateAccountCategory(account_category);
      if (!accountCategoryValid) {
        return res.status(400).json({ 
          message: `Account category '${account_category}' not found or inactive` 
        });
      }
      updateFields.push(`account_category = $${paramIndex++}`);
      values.push(account_category);
    }
    if (gl_account_id !== undefined) {
      updateFields.push(`gl_account_id = $${paramIndex++}`);
      values.push(gl_account_id);
    }
    if (company_code_id !== undefined) {
      updateFields.push(`company_code_id = $${paramIndex++}`);
      values.push(company_code_id || null);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (depreciation_area_id !== undefined) {
      updateFields.push(`depreciation_area_id = $${paramIndex++}`);
      values.push(depreciation_area_id || null);
    }
    if (account_determination_key !== undefined) {
      updateFields.push(`account_determination_key = $${paramIndex++}`);
      values.push(account_determination_key || null);
    }
    if (valid_from_date !== undefined) {
      updateFields.push(`valid_from_date = $${paramIndex++}`);
      values.push(valid_from_date || null);
    }
    if (valid_to_date !== undefined) {
      updateFields.push(`valid_to_date = $${paramIndex++}`);
      values.push(valid_to_date || null);
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      values.push(priority || 0);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE asset_account_determination 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating account determination rule:", error);
    return res.status(500).json({ message: "Failed to update account determination rule", error: error.message });
  }
});

// DELETE rule
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM asset_account_determination WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account determination rule not found" });
    }
    
    return res.json({ message: "Account determination rule deleted successfully", data: result.rows[0] });
  } catch (error: any) {
    console.error("Error deleting account determination rule:", error);
    return res.status(500).json({ message: "Failed to delete account determination rule", error: error.message });
  }
});

export default router;
