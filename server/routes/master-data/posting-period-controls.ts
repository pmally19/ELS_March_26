import { Request, Response, Router } from "express";
import { pool } from "../../db";
import { z } from "zod";

const router = Router();

// Validation Schema
// Validation Schema
const baseSchema = z.object({
  companyCodeId: z.number().int().positive(),
  fiscalYearVariantId: z.number().int().positive().optional(),
  fiscalYear: z.number().int().min(1900).max(9999),
  periodFrom: z.number().int().min(1).max(16),
  periodTo: z.number().int().min(1).max(16),
  postingStatus: z.enum(["OPEN", "CLOSED", "LOCKED"]).default("OPEN"),
  allowPosting: z.boolean().default(true),
  allowAdjustments: z.boolean().default(false),
  allowReversals: z.boolean().default(true),
  controlReason: z.string().optional(),
  isActive: z.boolean().default(true),
  module: z.enum(['ALL', 'ASSETS', 'CUSTOMERS', 'VENDORS', 'INVENTORY', 'GL']).default('ALL'),
});

const createPostingPeriodControlSchema = baseSchema.refine(
  (data) => data.periodTo >= data.periodFrom,
  {
    message: "Period To must be greater than or equal to Period From",
    path: ["periodTo"],
  }
);

// GET /api/master-data/posting-period-controls - Get all posting period controls
router.get("/", async (req: Request, res: Response) => {
  try {
    const { companyCodeId, fiscalYear, status, active, module } = req.query;

    let query = `
      SELECT 
        ppc.*,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM posting_period_controls ppc
      LEFT JOIN company_codes cc ON ppc.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON ppc.fiscal_year_variant_id = fyv.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (companyCodeId) {
      query += ` AND ppc.company_code_id = $${paramCount++}`;
      params.push(parseInt(companyCodeId as string));
    }

    if (fiscalYear) {
      query += ` AND ppc.fiscal_year = $${paramCount++}`;
      params.push(parseInt(fiscalYear as string));
    }

    if (status) {
      query += ` AND ppc.posting_status = $${paramCount++}`;
      params.push(status);
    }

    if (active !== undefined) {
      query += ` AND ppc.is_active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (module) {
      query += ` AND ppc.module = $${paramCount++}`;
      params.push(module);
    }

    query += ` ORDER BY ppc.company_code_id, ppc.fiscal_year DESC, ppc.period_from`;

    const result = await pool.query(query, params);

    const formatted = result.rows.map((row: any) => ({
      id: row.id,
      companyCodeId: row.company_code_id,
      companyCode: row.company_code,
      companyName: row.company_name,
      fiscalYearVariantId: row.fiscal_year_variant_id,
      fiscalYearVariantCode: row.fiscal_year_variant_code,
      fiscalYearVariantDescription: row.fiscal_year_variant_description,
      fiscalYear: row.fiscal_year,
      periodFrom: row.period_from,
      periodTo: row.period_to,
      postingStatus: row.posting_status,
      allowPosting: row.allow_posting,
      allowAdjustments: row.allow_adjustments,
      allowReversals: row.allow_reversals,
      controlReason: row.control_reason,
      controlledBy: row.controlled_by,
      controlledAt: row.controlled_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row["_tenantId"],
      module: row.module || 'ALL',
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching posting period controls:", error);
    return res.status(500).json({ message: "Failed to fetch posting period controls" });
  }
});

// GET /api/master-data/posting-period-controls/:id - Get posting period control by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        ppc.*,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM posting_period_controls ppc
      LEFT JOIN company_codes cc ON ppc.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON ppc.fiscal_year_variant_id = fyv.id
      WHERE ppc.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Posting period control not found" });
    }

    const row = result.rows[0];
    const formatted = {
      id: row.id,
      companyCodeId: row.company_code_id,
      companyCode: row.company_code,
      companyName: row.company_name,
      fiscalYearVariantId: row.fiscal_year_variant_id,
      fiscalYearVariantCode: row.fiscal_year_variant_code,
      fiscalYearVariantDescription: row.fiscal_year_variant_description,
      fiscalYear: row.fiscal_year,
      periodFrom: row.period_from,
      periodTo: row.period_to,
      postingStatus: row.posting_status,
      allowPosting: row.allow_posting,
      allowAdjustments: row.allow_adjustments,
      allowReversals: row.allow_reversals,
      controlReason: row.control_reason,
      controlledBy: row.controlled_by,
      controlledAt: row.controlled_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row["_tenantId"],
      module: row.module || 'ALL',
    };

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching posting period control:", error);
    return res.status(500).json({ message: "Failed to fetch posting period control" });
  }
});

// POST /api/master-data/posting-period-controls - Create new posting period control
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = createPostingPeriodControlSchema.parse(req.body);

    // Check if company code exists
    const companyCheck = await pool.query(
      `SELECT id FROM company_codes WHERE id = $1`,
      [validatedData.companyCodeId]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ message: "Company code not found" });
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

    // Check for overlapping period ranges for the same company and fiscal year AND module
    const overlapCheck = await pool.query(`
      SELECT id FROM posting_period_controls
      WHERE company_code_id = $1
        AND fiscal_year = $2
        AND module = $5
        AND is_active = TRUE
        AND (
          (period_from <= $3 AND period_to >= $3) OR
          (period_from <= $4 AND period_to >= $4) OR
          (period_from >= $3 AND period_to <= $4)
        )
    `, [
      validatedData.companyCodeId,
      validatedData.fiscalYear,
      validatedData.periodFrom,
      validatedData.periodTo,
      validatedData.module,
    ]);

    if (overlapCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Period range overlaps with existing posting period control for this company, fiscal year, and module"
      });
    }

    const userId = (req as any).user?.id || 1;
    const tenantId = (req as any).user?.tenantId || '001';

    const result = await pool.query(`
      INSERT INTO posting_period_controls (
        company_code_id, fiscal_year_variant_id, fiscal_year,
        period_from, period_to, posting_status,
        allow_posting, allow_adjustments, allow_reversals,
        control_reason, is_active, module,
        created_by, updated_by, "_tenantId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      validatedData.companyCodeId,
      validatedData.fiscalYearVariantId || null,
      validatedData.fiscalYear,
      validatedData.periodFrom,
      validatedData.periodTo,
      validatedData.postingStatus,
      validatedData.allowPosting,
      validatedData.allowAdjustments,
      validatedData.allowReversals,
      validatedData.controlReason || null,
      validatedData.isActive,
      validatedData.module,
      userId,
      userId,
      tenantId,
    ]);

    const row = result.rows[0];

    // Fetch with joins for complete response
    const fullResult = await pool.query(`
      SELECT 
        ppc.*,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM posting_period_controls ppc
      LEFT JOIN company_codes cc ON ppc.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON ppc.fiscal_year_variant_id = fyv.id
      WHERE ppc.id = $1
    `, [row.id]);

    const fullRow = fullResult.rows[0];
    const formatted = {
      id: fullRow.id,
      companyCodeId: fullRow.company_code_id,
      companyCode: fullRow.company_code,
      companyName: fullRow.company_name,
      fiscalYearVariantId: fullRow.fiscal_year_variant_id,
      fiscalYearVariantCode: fullRow.fiscal_year_variant_code,
      fiscalYearVariantDescription: fullRow.fiscal_year_variant_description,
      fiscalYear: fullRow.fiscal_year,
      periodFrom: fullRow.period_from,
      periodTo: fullRow.period_to,
      postingStatus: fullRow.posting_status,
      allowPosting: fullRow.allow_posting,
      allowAdjustments: fullRow.allow_adjustments,
      allowReversals: fullRow.allow_reversals,
      controlReason: fullRow.control_reason,
      controlledBy: fullRow.controlled_by,
      controlledAt: fullRow.controlled_at,
      isActive: fullRow.is_active,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
      createdBy: fullRow.created_by,
      updatedBy: fullRow.updated_by,
      tenantId: fullRow["_tenantId"],
      module: fullRow.module || 'ALL',
    };

    return res.status(201).json(formatted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    if ((error as any).code === '23505') {
      return res.status(409).json({ message: "Posting period control already exists for this combination" });
    }
    console.error("Error creating posting period control:", error);
    return res.status(500).json({ message: "Failed to create posting period control" });
  }
});

// PUT /api/master-data/posting-period-controls/:id - Update posting period control
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const updateSchema = baseSchema.partial();
    const validatedData = updateSchema.parse(req.body);

    // Check if exists
    const existingCheck = await pool.query(
      `SELECT * FROM posting_period_controls WHERE id = $1`,
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Posting period control not found" });
    }

    const existing = existingCheck.rows[0];

    // If period range or module is being updated, check for overlaps
    if (validatedData.periodFrom !== undefined || validatedData.periodTo !== undefined || validatedData.module !== undefined) {
      const periodFrom = validatedData.periodFrom ?? existing.period_from;
      const periodTo = validatedData.periodTo ?? existing.period_to;
      const companyCodeId = validatedData.companyCodeId ?? existing.company_code_id;
      const fiscalYear = validatedData.fiscalYear ?? existing.fiscal_year;
      const module = validatedData.module ?? existing.module ?? 'ALL';

      const overlapCheck = await pool.query(`
        SELECT id FROM posting_period_controls
        WHERE company_code_id = $1
          AND fiscal_year = $2
          AND module = $6
          AND id != $3
          AND is_active = TRUE
          AND (
            (period_from <= $4 AND period_to >= $4) OR
            (period_from <= $5 AND period_to >= $5) OR
            (period_from >= $4 AND period_to <= $5)
          )
      `, [companyCodeId, fiscalYear, id, periodFrom, periodTo, module]);

      if (overlapCheck.rows.length > 0) {
        return res.status(409).json({
          message: "Period range overlaps with existing posting period control"
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

    const userId = (req as any).user?.id || 1;

    // If status is being changed to CLOSED or LOCKED, set controlled_at
    if (validatedData.postingStatus &&
      (validatedData.postingStatus === 'CLOSED' || validatedData.postingStatus === 'LOCKED')) {
      updates.push(`controlled_at = NOW()`);
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push(userId);
    values.push(id);

    const query = `
      UPDATE posting_period_controls
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // Fetch with joins
    const fullResult = await pool.query(`
      SELECT 
        ppc.*,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description
      FROM posting_period_controls ppc
      LEFT JOIN company_codes cc ON ppc.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON ppc.fiscal_year_variant_id = fyv.id
      WHERE ppc.id = $1
    `, [id]);

    const fullRow = fullResult.rows[0];
    const formatted = {
      id: fullRow.id,
      companyCodeId: fullRow.company_code_id,
      companyCode: fullRow.company_code,
      companyName: fullRow.company_name,
      fiscalYearVariantId: fullRow.fiscal_year_variant_id,
      fiscalYearVariantCode: fullRow.fiscal_year_variant_code,
      fiscalYearVariantDescription: fullRow.fiscal_year_variant_description,
      fiscalYear: fullRow.fiscal_year,
      periodFrom: fullRow.period_from,
      periodTo: fullRow.period_to,
      postingStatus: fullRow.posting_status,
      allowPosting: fullRow.allow_posting,
      allowAdjustments: fullRow.allow_adjustments,
      allowReversals: fullRow.allow_reversals,
      controlReason: fullRow.control_reason,
      controlledBy: fullRow.controlled_by,
      controlledAt: fullRow.controlled_at,
      isActive: fullRow.is_active,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
      createdBy: fullRow.created_by,
      updatedBy: fullRow.updated_by,
      tenantId: fullRow["_tenantId"],
      module: fullRow.module || 'ALL',
    };

    return res.status(200).json(formatted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating posting period control:", error);
    return res.status(500).json({ message: "Failed to update posting period control" });
  }
});

// DELETE /api/master-data/posting-period-controls/:id - Delete posting period control
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await pool.query(
      `DELETE FROM posting_period_controls WHERE id = $1 RETURNING id, company_code_id, fiscal_year`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Posting period control not found" });
    }

    return res.status(200).json({
      message: "Posting period control deleted successfully",
      deleted: result.rows[0]
    });
  } catch (error) {
    if ((error as any).code === '23503') {
      return res.status(400).json({ message: "Cannot delete posting period control. It is referenced by other records." });
    }
    console.error("Error deleting posting period control:", error);
    return res.status(500).json({ message: "Failed to delete posting period control" });
  }
});

// GET /api/master-data/posting-period-controls/check/:companyCodeId/:fiscalYear/:period - Check if posting is allowed
router.get("/check/:companyCodeId/:fiscalYear/:period", async (req: Request, res: Response) => {
  try {
    const companyCodeId = parseInt(req.params.companyCodeId);
    const fiscalYear = parseInt(req.params.fiscalYear);
    const period = parseInt(req.params.period);
    const module = (req.query.module as string) || 'ALL';

    if (isNaN(companyCodeId) || isNaN(fiscalYear) || isNaN(period)) {
      return res.status(400).json({ message: "Invalid parameters" });
    }

    const result = await pool.query(`
      SELECT 
        posting_status,
        allow_posting,
        allow_adjustments,
        allow_reversals,
        control_reason,
        module
      FROM posting_period_controls
      WHERE company_code_id = $1
        AND fiscal_year = $2
        AND period_from <= $3
        AND period_to >= $3
        AND is_active = TRUE
        AND module IN ($4, 'ALL')
      ORDER BY 
        CASE WHEN module = $4 THEN 1 ELSE 2 END,
        period_from DESC
      LIMIT 1
    `, [companyCodeId, fiscalYear, period, module]);

    if (result.rows.length === 0) {
      // No control found - default to allowing posting
      return res.status(200).json({
        allowed: true,
        postingStatus: "OPEN",
        allowPosting: true,
        allowAdjustments: false,
        allowReversals: true,
        message: "No posting period control found - posting allowed by default",
        module: 'NONE'
      });
    }

    const control = result.rows[0];
    return res.status(200).json({
      allowed: control.allow_posting && control.posting_status === 'OPEN',
      postingStatus: control.posting_status,
      allowPosting: control.allow_posting,
      allowAdjustments: control.allow_adjustments,
      allowReversals: control.allow_reversals,
      controlReason: control.control_reason,
      module: control.module
    });
  } catch (error) {
    console.error("Error checking posting permission:", error);
    return res.status(500).json({ message: "Failed to check posting permission" });
  }
});

export default router;
