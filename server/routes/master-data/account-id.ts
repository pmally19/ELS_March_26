import { Router } from "express";
import { pool } from "../../db";

const router = Router();

// GET /api/master-data/account-id - Get all account ID records
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ai.id,
        ai.account_id,
        ai.description,
        ai.bank_master_id,
        bm.bank_key,
        bm.bank_name,
        ai.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        ai.account_number,
        ai.account_type,
        ai.currency,
        ai.gl_account_id,
        ai.routing_number,
        ai.iban,
        ai.account_holder_name,
        ai.is_active,
        ai.created_at,
        ai.updated_at
      FROM account_id_master ai
      LEFT JOIN bank_master bm ON ai.bank_master_id = bm.id
      LEFT JOIN company_codes cc ON ai.company_code_id = cc.id
      ORDER BY ai.account_id, ai.description
    `);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching account ID:", error);
    return res.status(500).json({ 
      message: "Failed to fetch account ID records",
      error: error.message 
    });
  }
});

// GET /api/master-data/account-id/:id - Get a single account ID record
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        ai.id,
        ai.account_id,
        ai.description,
        ai.bank_master_id,
        bm.bank_key,
        bm.bank_name,
        ai.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        ai.account_number,
        ai.account_type,
        ai.currency,
        ai.gl_account_id,
        ai.routing_number,
        ai.iban,
        ai.account_holder_name,
        ai.is_active,
        ai.created_at,
        ai.updated_at
      FROM account_id_master ai
      LEFT JOIN bank_master bm ON ai.bank_master_id = bm.id
      LEFT JOIN company_codes cc ON ai.company_code_id = cc.id
      WHERE ai.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account ID record not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching account ID:", error);
    return res.status(500).json({ 
      message: "Failed to fetch account ID record",
      error: error.message 
    });
  }
});

// POST /api/master-data/account-id - Create a new account ID record
router.post("/", async (req, res) => {
  try {
    const {
      accountId,
      description,
      bankMasterId,
      companyCodeId,
      accountNumber,
      accountType = "checking",
      currency = "USD",
      glAccountId,
      routingNumber,
      iban,
      accountHolderName,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!accountId || !description || !companyCodeId) {
      return res.status(400).json({ 
        message: "Account ID, description, and company code are required" 
      });
    }

    // Validate field lengths
    if (accountId.length > 10) {
      return res.status(400).json({ 
        message: "Account ID must be 10 characters or less" 
      });
    }
    if (description.length > 100) {
      return res.status(400).json({ 
        message: "Description must be 100 characters or less" 
      });
    }
    if (accountNumber && accountNumber.length > 50) {
      return res.status(400).json({ 
        message: "Account number must be 50 characters or less" 
      });
    }

    // Check if account ID already exists
    const existingCheck = await pool.query(
      `SELECT id FROM account_id_master WHERE account_id = $1`,
      [accountId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        message: "Account ID already exists" 
      });
    }

    const result = await pool.query(`
      INSERT INTO account_id_master (
        account_id,
        description,
        bank_master_id,
        company_code_id,
        account_number,
        account_type,
        currency,
        gl_account_id,
        routing_number,
        iban,
        account_holder_name,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      accountId,
      description,
      bankMasterId || null,
      companyCodeId || null,
      accountNumber || null,
      accountType,
      currency,
      glAccountId || null,
      routingNumber || null,
      iban || null,
      accountHolderName || null,
      isActive
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating account ID:", error);
    return res.status(500).json({ 
      message: "Failed to create account ID record",
      error: error.message 
    });
  }
});

// PATCH /api/master-data/account-id/:id - Update an account ID record
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      accountId,
      description,
      bankMasterId,
      companyCodeId,
      accountNumber,
      accountType,
      currency,
      glAccountId,
      routingNumber,
      iban,
      accountHolderName,
      isActive
    } = req.body;

    // Check if record exists
    const existingCheck = await pool.query(
      `SELECT id FROM account_id_master WHERE id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Account ID record not found" });
    }

    // If account ID is being updated, check for duplicates and validate length
    if (accountId) {
      if (accountId.length > 10) {
        return res.status(400).json({ 
          message: "Account ID must be 10 characters or less" 
        });
      }
      const duplicateCheck = await pool.query(
        `SELECT id FROM account_id_master WHERE account_id = $1 AND id != $2`,
        [accountId, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ 
          message: "Account ID already exists" 
        });
      }
    }

    // Validate field lengths if being updated
    if (description !== undefined && description.length > 100) {
      return res.status(400).json({ 
        message: "Description must be 100 characters or less" 
      });
    }
    if (accountNumber !== undefined && accountNumber && accountNumber.length > 50) {
      return res.status(400).json({ 
        message: "Account number must be 50 characters or less" 
      });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (accountId !== undefined) {
      updates.push(`account_id = $${paramCount++}`);
      values.push(accountId);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (bankMasterId !== undefined) {
      updates.push(`bank_master_id = $${paramCount++}`);
      values.push(bankMasterId || null);
    }
    if (companyCodeId !== undefined) {
      updates.push(`company_code_id = $${paramCount++}`);
      values.push(companyCodeId || null);
    }
    if (accountNumber !== undefined) {
      updates.push(`account_number = $${paramCount++}`);
      values.push(accountNumber || null);
    }
    if (accountType !== undefined) {
      updates.push(`account_type = $${paramCount++}`);
      values.push(accountType);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(currency);
    }
    if (glAccountId !== undefined) {
      updates.push(`gl_account_id = $${paramCount++}`);
      values.push(glAccountId || null);
    }
    if (routingNumber !== undefined) {
      updates.push(`routing_number = $${paramCount++}`);
      values.push(routingNumber || null);
    }
    if (iban !== undefined) {
      updates.push(`iban = $${paramCount++}`);
      values.push(iban || null);
    }
    if (accountHolderName !== undefined) {
      updates.push(`account_holder_name = $${paramCount++}`);
      values.push(accountHolderName || null);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE account_id_master
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating account ID:", error);
    return res.status(500).json({ 
      message: "Failed to update account ID record",
      error: error.message 
    });
  }
});

// DELETE /api/master-data/account-id/:id - Delete an account ID record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if record exists
    const existingCheck = await pool.query(
      `SELECT id FROM account_id_master WHERE id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Account ID record not found" });
    }

    await pool.query(`DELETE FROM account_id_master WHERE id = $1`, [id]);

    res.json({ message: "Account ID record deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting account ID:", error);
    return res.status(500).json({ 
      message: "Failed to delete account ID record",
      error: error.message 
    });
  }
});

export default router;

