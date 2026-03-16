import { Request, Response, Router } from "express";
import { pool } from "../../db";
import { z } from "zod";

const router = Router();

// Validation Schema
const createGlAccountGroupSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  accountCategory: z.enum(["ASSETS", "LIABILITIES", "EQUITY", "REVENUE", "EXPENSES"]),
  accountSubcategory: z.string().max(50).optional(),
  numberRangeId: z.number().int().positive().optional(),
  accountNameRequired: z.boolean().default(true),
  descriptionRequired: z.boolean().default(false),
  currencyRequired: z.boolean().default(true),
  taxSettingsRequired: z.boolean().default(false),
  allowPosting: z.boolean().default(true),
  requiresReconciliation: z.boolean().default(false),
  allowCashPosting: z.boolean().default(false),
  requiresCostCenter: z.boolean().default(false),
  requiresProfitCenter: z.boolean().default(false),
  displayLayout: z.string().max(10).optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// GET /api/master-data/gl-account-groups - Get all GL account groups
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, active } = req.query;

    let query = `
      SELECT 
        gag.*,
        nr.id as nr_id,
        nr.number_range_code,
        nr.description as nr_description,
        nr.number_range_object,
        nr.range_from as nr_range_from,
        nr.range_to as nr_range_to
      FROM gl_account_groups gag
      LEFT JOIN number_ranges nr ON gag.number_range_id = nr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND gag.account_category = $${paramCount++}`;
      params.push(category);
    }

    if (active !== undefined) {
      query += ` AND gag.is_active = $${paramCount++}`;
      params.push(active === 'true');
    }

    query += ` ORDER BY gag.sort_order, gag.code`;

    const result = await pool.query(query, params);

    const formatted = result.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      accountCategory: row.account_category,
      accountSubcategory: row.account_subcategory,
      numberRangeId: row.nr_id,
      numberRangeCode: row.number_range_code,
      numberRangeDescription: row.nr_description,
      numberRangeObject: row.number_range_object,
      numberRangeFrom: row.nr_range_from,
      numberRangeTo: row.nr_range_to,
      accountNameRequired: row.account_name_required,
      descriptionRequired: row.description_required,
      currencyRequired: row.currency_required,
      taxSettingsRequired: row.tax_settings_required,
      allowPosting: row.allow_posting,
      requiresReconciliation: row.requires_reconciliation,
      allowCashPosting: row.allow_cash_posting,
      requiresCostCenter: row.requires_cost_center,
      requiresProfitCenter: row.requires_profit_center,
      displayLayout: row.display_layout,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row["_tenantId"],
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching GL account groups:", error);
    return res.status(500).json({ message: "Failed to fetch GL account groups" });
  }
});

// GET /api/master-data/gl-account-groups/:id - Get GL account group by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        gag.*,
        nr.id as number_range_id,
        nr.number_range_code,
        nr.description as number_range_description,
        nr.number_range_object,
        nr.range_from as number_range_from,
        nr.range_to as number_range_to
      FROM gl_account_groups gag
      LEFT JOIN number_ranges nr ON gag.number_range_id = nr.id
      WHERE gag.id = $1
      ORDER BY gag.sort_order, gag.code
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "GL account group not found" });
    }

    const row = result.rows[0];
    const formatted = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      accountCategory: row.account_category,
      accountSubcategory: row.account_subcategory,
      accountNumberPattern: row.account_number_pattern,
      accountNumberMinLength: row.account_number_min_length,
      accountNumberMaxLength: row.account_number_max_length,
      numberRangeStart: row.number_range_start,
      numberRangeEnd: row.number_range_end,
      fieldControlGroup: row.field_control_group,
      accountNameRequired: row.account_name_required,
      descriptionRequired: row.description_required,
      currencyRequired: row.currency_required,
      taxSettingsRequired: row.tax_settings_required,
      allowPosting: row.allow_posting,
      requiresReconciliation: row.requires_reconciliation,
      allowCashPosting: row.allow_cash_posting,
      requiresCostCenter: row.requires_cost_center,
      requiresProfitCenter: row.requires_profit_center,
      displayLayout: row.display_layout,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row["_tenantId"],
    };

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching GL account group:", error);
    return res.status(500).json({ message: "Failed to fetch GL account group" });
  }
});

// POST /api/master-data/gl-account-groups - Create new GL account group
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = createGlAccountGroupSchema.parse(req.body);

    // Check if code already exists
    const existingCheck = await pool.query(
      `SELECT id FROM gl_account_groups WHERE code = $1`,
      [validatedData.code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ message: "GL account group code already exists" });
    }

    const userId = (req as any).user?.id || 1;
    const tenantId = (req as any).user?.tenantId || '001';

    const result = await pool.query(`
      INSERT INTO gl_account_groups (
        code, name, description, account_category, account_subcategory,
        number_range_id,
        account_name_required, description_required, currency_required, tax_settings_required,
        allow_posting, requires_reconciliation, allow_cash_posting,
        requires_cost_center, requires_profit_center, display_layout, sort_order, is_active,
        created_by, updated_by, "_tenantId"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `, [
      validatedData.code,
      validatedData.name,
      validatedData.description || null,
      validatedData.accountCategory,
      validatedData.accountSubcategory || null,
      validatedData.numberRangeId || null,
      validatedData.accountNameRequired,
      validatedData.descriptionRequired,
      validatedData.currencyRequired,
      validatedData.taxSettingsRequired,
      validatedData.allowPosting,
      validatedData.requiresReconciliation,
      validatedData.allowCashPosting,
      validatedData.requiresCostCenter,
      validatedData.requiresProfitCenter,
      validatedData.displayLayout || null,
      validatedData.sortOrder,
      validatedData.isActive,
      userId,
      userId,
      tenantId,
    ]);

    const row = result.rows[0];
    const formatted = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      accountCategory: row.account_category,
      accountSubcategory: row.account_subcategory,
      numberRangeId: row.number_range_id,
      accountNameRequired: row.account_name_required,
      descriptionRequired: row.description_required,
      currencyRequired: row.currency_required,
      taxSettingsRequired: row.tax_settings_required,
      allowPosting: row.allow_posting,
      requiresReconciliation: row.requires_reconciliation,
      allowCashPosting: row.allow_cash_posting,
      requiresCostCenter: row.requires_cost_center,
      requiresProfitCenter: row.requires_profit_center,
      displayLayout: row.display_layout,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row["_tenantId"],
    };

    return res.status(201).json(formatted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    if ((error as any).code === '23505') {
      return res.status(409).json({ message: "GL account group code already exists" });
    }
    console.error("Error creating GL account group:", error);
    return res.status(500).json({ message: "Failed to create GL account group" });
  }
});

// PUT /api/master-data/gl-account-groups/:id - Update GL account group
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const updateSchema = createGlAccountGroupSchema.partial();
    const validatedData = updateSchema.parse(req.body);

    // Check if exists
    const existingCheck = await pool.query(
      `SELECT id FROM gl_account_groups WHERE id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "GL account group not found" });
    }

    // Check code uniqueness if code is being updated
    if (validatedData.code) {
      const codeCheck = await pool.query(
        `SELECT id FROM gl_account_groups WHERE code = $1 AND id != $2`,
        [validatedData.code, id]
      );

      if (codeCheck.rows.length > 0) {
        return res.status(409).json({ message: "GL account group code already exists" });
      }
    }

    const userId = (req as any).user?.id || 1;

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
    updates.push(`updated_by = $${paramCount++}`);
    values.push(userId);
    values.push(id);

    const query = `
      UPDATE gl_account_groups
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    const row = result.rows[0];
    const formatted = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      accountCategory: row.account_category,
      accountSubcategory: row.account_subcategory,
      numberRangeId: row.number_range_id,
      accountNameRequired: row.account_name_required,
      descriptionRequired: row.description_required,
      currencyRequired: row.currency_required,
      taxSettingsRequired: row.tax_settings_required,
      allowPosting: row.allow_posting,
      requiresReconciliation: row.requires_reconciliation,
      allowCashPosting: row.allow_cash_posting,
      requiresCostCenter: row.requires_cost_center,
      requiresProfitCenter: row.requires_profit_center,
      displayLayout: row.display_layout,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row["_tenantId"],
    };

    return res.status(200).json(formatted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating GL account group:", error);
    return res.status(500).json({ message: "Failed to update GL account group" });
  }
});

// DELETE /api/master-data/gl-account-groups/:id - Delete GL account group
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Check if any GL accounts are using this group
    const accountsCheck = await pool.query(
      `SELECT COUNT(*) as count FROM gl_accounts WHERE account_group = (SELECT code FROM gl_account_groups WHERE id = $1)`,
      [id]
    );

    const accountCount = parseInt(accountsCheck.rows[0].count);
    if (accountCount > 0) {
      return res.status(400).json({
        message: `Cannot delete GL account group. It is used by ${accountCount} GL account(s).`
      });
    }

    const result = await pool.query(
      `DELETE FROM gl_account_groups WHERE id = $1 RETURNING id, code, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "GL account group not found" });
    }

    return res.status(200).json({
      message: "GL account group deleted successfully",
      deleted: result.rows[0]
    });
  } catch (error) {
    if ((error as any).code === '23503') {
      return res.status(400).json({ message: "Cannot delete GL account group. It is referenced by other records." });
    }
    console.error("Error deleting GL account group:", error);
    return res.status(500).json({ message: "Failed to delete GL account group" });
  }
});

export default router;

