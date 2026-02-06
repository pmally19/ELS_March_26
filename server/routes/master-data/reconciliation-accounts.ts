import { Router } from "express";
import { db } from "../../db";
import { reconciliationAccounts } from "@shared/reconciliation-accounts-schema";
import { glAccounts, companyCodes } from "@shared/schema";
import { eq, inArray, sql } from "drizzle-orm";

const router = Router();

// GET /api/master-data/reconciliation-accounts - Get all reconciliation accounts
router.get("/", async (req, res) => {
  try {
    const accounts = await db
      .select({
        id: reconciliationAccounts.id,
        code: reconciliationAccounts.code,
        name: reconciliationAccounts.name,
        description: reconciliationAccounts.description,
        glAccountId: reconciliationAccounts.glAccountId,
        glAccountNumber: glAccounts.accountNumber,
        glAccountName: glAccounts.accountName,
        accountType: reconciliationAccounts.accountType,
        companyCodeId: reconciliationAccounts.companyCodeId,
        companyCode: companyCodes.code,
        companyName: companyCodes.name,
        isActive: reconciliationAccounts.isActive,
        createdAt: reconciliationAccounts.createdAt,
        updatedAt: reconciliationAccounts.updatedAt,
      })
      .from(reconciliationAccounts)
      .leftJoin(glAccounts, eq(reconciliationAccounts.glAccountId, glAccounts.id))
      .leftJoin(companyCodes, eq(reconciliationAccounts.companyCodeId, companyCodes.id));
    res.json(accounts);
  } catch (error) {
    console.error("Error fetching reconciliation accounts:", error);
    res.status(500).json({ error: "Failed to fetch reconciliation accounts" });
  }
});

// POST /api/master-data/reconciliation-accounts - Create new reconciliation account
router.post("/", async (req, res) => {
  try {
    const { 
      code, 
      name,
      description, 
      glAccountId,
      accountType, 
      companyCodeId,
      isActive
    } = req.body;

    if (!code || !name || !glAccountId || !accountType || !companyCodeId) {
      return res.status(400).json({ 
        error: "Code, name, GL account ID, account type, and company code ID are required" 
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ 
        error: "isActive must be a boolean value" 
      });
    }

    // Use raw SQL for all queries to avoid Drizzle schema caching issues
    const { getPool } = await import('../../database');
    const pool = getPool();

    // Verify GL account exists using raw SQL
    const glAccountCheck = await pool.query(
      'SELECT id FROM gl_accounts WHERE id = $1',
      [parseInt(glAccountId)]
    );

    if (glAccountCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: "GL account not found" 
      });
    }

    // Verify company code exists using raw SQL
    const companyCodeCheck = await pool.query(
      'SELECT id FROM company_codes WHERE id = $1',
      [parseInt(companyCodeId)]
    );

    if (companyCodeCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: "Company code not found" 
      });
    }

    // Check for duplicate code
    const duplicateCheck = await pool.query(
      'SELECT id FROM reconciliation_accounts WHERE code = $1',
      [code]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: "Reconciliation account with this code already exists" 
      });
    }

    // Insert using raw SQL
    const now = new Date();
    const result = await pool.query(`
      INSERT INTO reconciliation_accounts (
        code, name, description, gl_account_id, account_type, 
        company_code_id, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      code,
      name,
      description && description.trim() !== '' ? description : null,
      parseInt(glAccountId),
      accountType,
      parseInt(companyCodeId),
      isActive,
      now,
      now
    ]);

    const newAccount = result.rows[0];

    // Fetch with joins for complete response
    const fullAccount = await pool.query(`
      SELECT 
        ra.id,
        ra.code,
        ra.name,
        ra.description,
        ra.gl_account_id as "glAccountId",
        ra.account_type as "accountType",
        ra.company_code_id as "companyCodeId",
        ra.is_active as "isActive",
        ra.created_at as "createdAt",
        ra.updated_at as "updatedAt",
        ga.account_number as "glAccountNumber",
        ga.account_name as "glAccountName",
        cc.code as "companyCode",
        cc.name as "companyName"
      FROM reconciliation_accounts ra
      LEFT JOIN gl_accounts ga ON ra.gl_account_id = ga.id
      LEFT JOIN company_codes cc ON ra.company_code_id = cc.id
      WHERE ra.id = $1
    `, [newAccount.id]);

    res.status(201).json(fullAccount.rows[0]);
  } catch (error) {
    console.error("Error creating reconciliation account:", error);
    res.status(500).json({ error: "Failed to create reconciliation account" });
  }
});

// PUT /api/master-data/reconciliation-accounts/:id - Update reconciliation account
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      code, 
      name,
      description, 
      glAccountId,
      accountType, 
      companyCodeId,
      isActive 
    } = req.body;

    // Use raw SQL for all queries to avoid Drizzle schema caching issues
    const { getPool } = await import('../../database');
    const pool = getPool();
    
    // Verify reconciliation account exists using raw SQL
    const existingCheck = await pool.query(
      'SELECT id FROM reconciliation_accounts WHERE id = $1',
      [parseInt(id)]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: "Reconciliation account not found" });
    }

    // If GL account ID is provided, verify it exists using raw SQL
    if (glAccountId !== undefined) {
      const glAccountCheck = await pool.query(
        'SELECT id FROM gl_accounts WHERE id = $1',
        [parseInt(glAccountId)]
      );

      if (glAccountCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: "GL account not found" 
        });
      }
    }

    // If company code ID is provided, verify it exists using raw SQL
    if (companyCodeId !== undefined) {
      const companyCodeCheck = await pool.query(
        'SELECT id FROM company_codes WHERE id = $1',
        [parseInt(companyCodeId)]
      );

      if (companyCodeCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: "Company code not found" 
        });
      }
    }
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (code !== undefined) {
      updateFields.push(`code = $${paramCount++}`);
      updateValues.push(code);
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }
    // Include description if provided - use explicit column name
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description === null ? null : String(description));
    }
    if (glAccountId !== undefined) {
      updateFields.push(`gl_account_id = $${paramCount++}`);
      updateValues.push(parseInt(glAccountId));
    }
    if (accountType !== undefined) {
      updateFields.push(`account_type = $${paramCount++}`);
      updateValues.push(accountType);
    }
    if (companyCodeId !== undefined) {
      updateFields.push(`company_code_id = $${paramCount++}`);
      updateValues.push(parseInt(companyCodeId));
    }
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ 
          error: "isActive must be a boolean value" 
        });
      }
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(isActive);
    }
    
    updateFields.push(`updated_at = $${paramCount++}`);
    updateValues.push(new Date());
    
    // Add the WHERE clause parameter
    const whereParamIndex = paramCount;
    updateValues.push(parseInt(id));

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Build the SQL query - use whereParamIndex for WHERE clause
    const updateQuery = `
      UPDATE reconciliation_accounts 
      SET ${updateFields.join(', ')}
      WHERE id = $${whereParamIndex}
      RETURNING *
    `;
    
    // Use raw SQL query to bypass Drizzle schema cache
    const result = await pool.query(updateQuery, updateValues);

    const updatedAccount = result.rows[0];

    if (!updatedAccount) {
      return res.status(404).json({ error: "Reconciliation account not found" });
    }

    // Map database snake_case to camelCase for frontend
    // Fetch joined data for complete response
    const fullAccount = await pool.query(`
      SELECT 
        ra.id,
        ra.code,
        ra.name,
        ra.description,
        ra.gl_account_id as "glAccountId",
        ra.account_type as "accountType",
        ra.company_code_id as "companyCodeId",
        ra.is_active as "isActive",
        ra.created_at as "createdAt",
        ra.updated_at as "updatedAt",
        ga.account_number as "glAccountNumber",
        ga.account_name as "glAccountName",
        cc.code as "companyCode",
        cc.name as "companyName"
      FROM reconciliation_accounts ra
      LEFT JOIN gl_accounts ga ON ra.gl_account_id = ga.id
      LEFT JOIN company_codes cc ON ra.company_code_id = cc.id
      WHERE ra.id = $1
    `, [parseInt(id)]);
    
    res.json(fullAccount.rows[0] || {
      id: updatedAccount.id,
      code: updatedAccount.code,
      name: updatedAccount.name,
      description: updatedAccount.description || null,
      glAccountId: updatedAccount.gl_account_id,
      accountType: updatedAccount.account_type,
      companyCodeId: updatedAccount.company_code_id,
      isActive: updatedAccount.is_active,
      createdAt: updatedAccount.created_at,
      updatedAt: updatedAccount.updated_at
    });
  } catch (error) {
    console.error("Error updating reconciliation account:", error);
    res.status(500).json({ error: "Failed to update reconciliation account" });
  }
});

// DELETE /api/master-data/reconciliation-accounts/:id - Delete reconciliation account
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedAccount] = await db
      .delete(reconciliationAccounts)
      .where(eq(reconciliationAccounts.id, parseInt(id)))
      .returning();

    if (!deletedAccount) {
      return res.status(404).json({ error: "Reconciliation account not found" });
    }

    res.json({ message: "Reconciliation account deleted successfully" });
  } catch (error) {
    console.error("Error deleting reconciliation account:", error);
    res.status(500).json({ error: "Failed to delete reconciliation account" });
  }
});

// POST /api/master-data/reconciliation-accounts/bulk-import - Bulk import reconciliation accounts
router.post("/bulk-import", async (req, res) => {
  try {
    const { accounts } = req.body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: "No accounts provided for import" });
    }

    const validAccounts = accounts.filter(account => 
      account.code && 
      account.name && 
      account.glAccountId && 
      account.accountType &&
      account.companyCodeId &&
      typeof account.isActive === "boolean"
    );

    if (validAccounts.length === 0) {
      return res.status(400).json({ error: "No valid accounts found for import. Required fields: code, name, glAccountId, accountType, companyCodeId, isActive" });
    }

    // Verify all GL accounts and company codes exist
    const glAccountIds = Array.from(new Set(validAccounts.map(a => parseInt(a.glAccountId))));
    const companyCodeIds = Array.from(new Set(validAccounts.map(a => parseInt(a.companyCodeId))));

    const existingGlAccounts = await db
      .select({ id: glAccounts.id })
      .from(glAccounts)
      .where(inArray(glAccounts.id, glAccountIds));

    const existingCompanyCodes = await db
      .select({ id: companyCodes.id })
      .from(companyCodes)
      .where(inArray(companyCodes.id, companyCodeIds));

    if (existingGlAccounts.length !== glAccountIds.length) {
      return res.status(400).json({ error: "One or more GL accounts not found" });
    }

    if (existingCompanyCodes.length !== companyCodeIds.length) {
      return res.status(400).json({ error: "One or more company codes not found" });
    }

    const now = new Date();
    const formattedAccounts = validAccounts.map(account => ({
      code: account.code,
      name: account.name,
      description: account.description || null,
      glAccountId: parseInt(account.glAccountId),
      accountType: account.accountType,
      companyCodeId: parseInt(account.companyCodeId),
      isActive: account.isActive,
      createdAt: now,
      updatedAt: now
    }));

    const insertedAccounts = await db
      .insert(reconciliationAccounts)
      .values(formattedAccounts)
      .returning();

    res.status(201).json({
      message: `Successfully imported ${insertedAccounts.length} reconciliation accounts`,
      imported: insertedAccounts.length,
      total: accounts.length,
      accounts: insertedAccounts
    });
  } catch (error) {
    console.error("Error during bulk import:", error);
    res.status(500).json({ error: "Failed to import reconciliation accounts" });
  }
});

export default router;