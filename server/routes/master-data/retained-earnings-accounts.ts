import { Request, Response, Router } from "express";
import { pool } from "../../db";
import { z } from "zod";

const router = Router();

// Validation Schema
const createRetainedEarningsAccountSchema = z.object({
  companyCodeId: z.number().int().positive(),
  glAccountId: z.number().int().positive(),
  fiscalYearVariantId: z.number().int().positive().optional(),
  accountType: z.enum(["RETAINED_EARNINGS", "PROFIT_CARRY_FORWARD", "LOSS_CARRY_FORWARD"]).default("RETAINED_EARNINGS"),
  description: z.string().optional(),
  carryForwardProfit: z.boolean().default(true),
  carryForwardLoss: z.boolean().default(true),
  automaticCarryForward: z.boolean().default(false),
  useForYearEndClosing: z.boolean().default(true),
  closingAccountType: z.enum(["PROFIT", "LOSS", "BOTH"]).optional(),
  isActive: z.boolean().default(true),
});

// GET /api/master-data/retained-earnings-accounts - Get all retained earnings accounts
router.get("/", async (req: Request, res: Response) => {
  try {
    const { companyCodeId, accountType, active } = req.query;
    
    let query = `
      SELECT 
        rea.*,
        cc.code as company_code,
        cc.name as company_name,
        ga.account_number as gl_account_number,
        ga.account_name as gl_account_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM retained_earnings_accounts rea
      LEFT JOIN company_codes cc ON rea.company_code_id = cc.id
      LEFT JOIN gl_accounts ga ON rea.gl_account_id = ga.id
      LEFT JOIN fiscal_year_variants fyv ON rea.fiscal_year_variant_id = fyv.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;
    
    if (companyCodeId) {
      query += ` AND rea.company_code_id = $${paramCount++}`;
      params.push(parseInt(companyCodeId as string));
    }
    
    if (accountType) {
      query += ` AND rea.account_type = $${paramCount++}`;
      params.push(accountType);
    }
    
    if (active !== undefined) {
      query += ` AND rea.is_active = $${paramCount++}`;
      params.push(active === 'true');
    }
    
    query += ` ORDER BY cc.code, rea.account_type`;
    
    const result = await pool.query(query, params);
    
    const formatted = result.rows.map((row: any) => ({
      id: row.id,
      companyCodeId: row.company_code_id,
      companyCode: row.company_code,
      companyName: row.company_name,
      glAccountId: row.gl_account_id,
      glAccountNumber: row.gl_account_number,
      glAccountName: row.gl_account_name,
      fiscalYearVariantId: row.fiscal_year_variant_id,
      fiscalYearVariantCode: row.fiscal_year_variant_code,
      fiscalYearVariantDescription: row.fiscal_year_variant_description,
      accountType: row.account_type,
      description: row.description,
      carryForwardProfit: row.carry_forward_profit,
      carryForwardLoss: row.carry_forward_loss,
      automaticCarryForward: row.automatic_carry_forward,
      useForYearEndClosing: row.use_for_year_end_closing,
      closingAccountType: row.closing_account_type,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    }));
    
    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching retained earnings accounts:", error);
    return res.status(500).json({ message: "Failed to fetch retained earnings accounts" });
  }
});

// GET /api/master-data/retained-earnings-accounts/:id - Get retained earnings account by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query(`
      SELECT 
        rea.*,
        cc.code as company_code,
        cc.name as company_name,
        ga.account_number as gl_account_number,
        ga.account_name as gl_account_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM retained_earnings_accounts rea
      LEFT JOIN company_codes cc ON rea.company_code_id = cc.id
      LEFT JOIN gl_accounts ga ON rea.gl_account_id = ga.id
      LEFT JOIN fiscal_year_variants fyv ON rea.fiscal_year_variant_id = fyv.id
      WHERE rea.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Retained earnings account not found" });
    }
    
    const row = result.rows[0];
    const formatted = {
      id: row.id,
      companyCodeId: row.company_code_id,
      companyCode: row.company_code,
      companyName: row.company_name,
      glAccountId: row.gl_account_id,
      glAccountNumber: row.gl_account_number,
      glAccountName: row.gl_account_name,
      fiscalYearVariantId: row.fiscal_year_variant_id,
      fiscalYearVariantCode: row.fiscal_year_variant_code,
      fiscalYearVariantDescription: row.fiscal_year_variant_description,
      accountType: row.account_type,
      description: row.description,
      carryForwardProfit: row.carry_forward_profit,
      carryForwardLoss: row.carry_forward_loss,
      automaticCarryForward: row.automatic_carry_forward,
      useForYearEndClosing: row.use_for_year_end_closing,
      closingAccountType: row.closing_account_type,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
    
    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching retained earnings account:", error);
    return res.status(500).json({ message: "Failed to fetch retained earnings account" });
  }
});

// POST /api/master-data/retained-earnings-accounts - Create new retained earnings account
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = createRetainedEarningsAccountSchema.parse(req.body);
    
    // Check if company code exists
    const companyCheck = await pool.query(
      `SELECT id FROM company_codes WHERE id = $1`,
      [validatedData.companyCodeId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ message: "Company code not found" });
    }
    
    // Check if GL account exists
    const glAccountCheck = await pool.query(
      `SELECT id, account_type FROM gl_accounts WHERE id = $1`,
      [validatedData.glAccountId]
    );
    
    if (glAccountCheck.rows.length === 0) {
      return res.status(404).json({ message: "GL account not found" });
    }
    
    // Verify GL account is an equity account
    const glAccount = glAccountCheck.rows[0];
    if (glAccount.account_type !== 'EQUITY') {
      return res.status(400).json({ 
        message: "GL account must be of type EQUITY to be used as a retained earnings account" 
      });
    }
    
    // Check if fiscal year variant exists (if provided)
    if (validatedData.fiscalYearVariantId) {
      const variantCheck = await pool.query(
        `SELECT id FROM fiscal_year_variants WHERE id = $1`,
        [validatedData.fiscalYearVariantId]
      );
      
      if (variantCheck.rows.length === 0) {
        return res.status(404).json({ message: "Fiscal year variant not found" });
      }
    }
    
    // Check for duplicate company code and account type combination
    const duplicateCheck = await pool.query(`
      SELECT id FROM retained_earnings_accounts
      WHERE company_code_id = $1 AND account_type = $2
    `, [validatedData.companyCodeId, validatedData.accountType]);
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ 
        message: `Retained earnings account of type ${validatedData.accountType} already exists for this company code` 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO retained_earnings_accounts (
        company_code_id, gl_account_id, fiscal_year_variant_id,
        account_type, description,
        carry_forward_profit, carry_forward_loss, automatic_carry_forward,
        use_for_year_end_closing, closing_account_type, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      validatedData.companyCodeId,
      validatedData.glAccountId,
      validatedData.fiscalYearVariantId || null,
      validatedData.accountType,
      validatedData.description || null,
      validatedData.carryForwardProfit,
      validatedData.carryForwardLoss,
      validatedData.automaticCarryForward,
      validatedData.useForYearEndClosing,
      validatedData.closingAccountType || null,
      validatedData.isActive,
    ]);
    
    const row = result.rows[0];
    
    // Fetch with joins for complete response
    const fullResult = await pool.query(`
      SELECT 
        rea.*,
        cc.code as company_code,
        cc.name as company_name,
        ga.account_number as gl_account_number,
        ga.account_name as gl_account_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM retained_earnings_accounts rea
      LEFT JOIN company_codes cc ON rea.company_code_id = cc.id
      LEFT JOIN gl_accounts ga ON rea.gl_account_id = ga.id
      LEFT JOIN fiscal_year_variants fyv ON rea.fiscal_year_variant_id = fyv.id
      WHERE rea.id = $1
    `, [row.id]);
    
    const fullRow = fullResult.rows[0];
    const formatted = {
      id: fullRow.id,
      companyCodeId: fullRow.company_code_id,
      companyCode: fullRow.company_code,
      companyName: fullRow.company_name,
      glAccountId: fullRow.gl_account_id,
      glAccountNumber: fullRow.gl_account_number,
      glAccountName: fullRow.gl_account_name,
      fiscalYearVariantId: fullRow.fiscal_year_variant_id,
      fiscalYearVariantCode: fullRow.fiscal_year_variant_code,
      fiscalYearVariantDescription: fullRow.fiscal_year_variant_description,
      accountType: fullRow.account_type,
      description: fullRow.description,
      carryForwardProfit: fullRow.carry_forward_profit,
      carryForwardLoss: fullRow.carry_forward_loss,
      automaticCarryForward: fullRow.automatic_carry_forward,
      useForYearEndClosing: fullRow.use_for_year_end_closing,
      closingAccountType: fullRow.closing_account_type,
      isActive: fullRow.is_active,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
      createdBy: fullRow.created_by,
      updatedBy: fullRow.updated_by,
    };
    
    return res.status(201).json(formatted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    if ((error as any).code === '23505') {
      return res.status(409).json({ message: "Retained earnings account already exists for this company and account type" });
    }
    console.error("Error creating retained earnings account:", error);
    return res.status(500).json({ message: "Failed to create retained earnings account" });
  }
});

// PUT /api/master-data/retained-earnings-accounts/:id - Update retained earnings account
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const updateSchema = createRetainedEarningsAccountSchema.partial();
    const validatedData = updateSchema.parse(req.body);
    
    // Check if exists
    const existingCheck = await pool.query(
      `SELECT * FROM retained_earnings_accounts WHERE id = $1`,
      [id]
    );
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Retained earnings account not found" });
    }
    
    // If GL account is being updated, verify it exists and is EQUITY type
    if (validatedData.glAccountId) {
      const glAccountCheck = await pool.query(
        `SELECT id, account_type FROM gl_accounts WHERE id = $1`,
        [validatedData.glAccountId]
      );
      
      if (glAccountCheck.rows.length === 0) {
        return res.status(404).json({ message: "GL account not found" });
      }
      
      const glAccount = glAccountCheck.rows[0];
      if (glAccount.account_type !== 'EQUITY') {
        return res.status(400).json({ 
          message: "GL account must be of type EQUITY to be used as a retained earnings account" 
        });
      }
    }
    
    // If account type is being updated, check for duplicate
    if (validatedData.accountType) {
      const existing = existingCheck.rows[0];
      const duplicateCheck = await pool.query(`
        SELECT id FROM retained_earnings_accounts
        WHERE company_code_id = $1 AND account_type = $2 AND id != $3
      `, [existing.company_code_id, validatedData.accountType, id]);
      
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ 
          message: `Retained earnings account of type ${validatedData.accountType} already exists for this company code` 
        });
      }
    }
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(`${dbKey} = $${paramCount++}`);
        values.push(value);
      }
    });
    
    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE retained_earnings_accounts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    await pool.query(query, values);
    
    // Fetch with joins
    const fullResult = await pool.query(`
      SELECT 
        rea.*,
        cc.code as company_code,
        cc.name as company_name,
        ga.account_number as gl_account_number,
        ga.account_name as gl_account_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM retained_earnings_accounts rea
      LEFT JOIN company_codes cc ON rea.company_code_id = cc.id
      LEFT JOIN gl_accounts ga ON rea.gl_account_id = ga.id
      LEFT JOIN fiscal_year_variants fyv ON rea.fiscal_year_variant_id = fyv.id
      WHERE rea.id = $1
    `, [id]);
    
    const fullRow = fullResult.rows[0];
    const formatted = {
      id: fullRow.id,
      companyCodeId: fullRow.company_code_id,
      companyCode: fullRow.company_code,
      companyName: fullRow.company_name,
      glAccountId: fullRow.gl_account_id,
      glAccountNumber: fullRow.gl_account_number,
      glAccountName: fullRow.gl_account_name,
      fiscalYearVariantId: fullRow.fiscal_year_variant_id,
      fiscalYearVariantCode: fullRow.fiscal_year_variant_code,
      fiscalYearVariantDescription: fullRow.fiscal_year_variant_description,
      accountType: fullRow.account_type,
      description: fullRow.description,
      carryForwardProfit: fullRow.carry_forward_profit,
      carryForwardLoss: fullRow.carry_forward_loss,
      automaticCarryForward: fullRow.automatic_carry_forward,
      useForYearEndClosing: fullRow.use_for_year_end_closing,
      closingAccountType: fullRow.closing_account_type,
      isActive: fullRow.is_active,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
      createdBy: fullRow.created_by,
      updatedBy: fullRow.updated_by,
    };
    
    return res.status(200).json(formatted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating retained earnings account:", error);
    return res.status(500).json({ message: "Failed to update retained earnings account" });
  }
});

// DELETE /api/master-data/retained-earnings-accounts/:id - Delete retained earnings account
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query(
      `DELETE FROM retained_earnings_accounts WHERE id = $1 RETURNING id, company_code_id, account_type`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Retained earnings account not found" });
    }
    
    return res.status(200).json({ 
      message: "Retained earnings account deleted successfully",
      deleted: result.rows[0]
    });
  } catch (error) {
    if ((error as any).code === '23503') {
      return res.status(400).json({ message: "Cannot delete retained earnings account. It is referenced by other records." });
    }
    console.error("Error deleting retained earnings account:", error);
    return res.status(500).json({ message: "Failed to delete retained earnings account" });
  }
});

export default router;

