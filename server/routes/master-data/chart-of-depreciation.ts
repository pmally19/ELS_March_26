import { Request, Response, Router } from "express";
import { pool } from "../../db";
import { 
  insertChartOfDepreciationSchema, 
  updateChartOfDepreciationSchema,
  depreciationMethodValues,
  baseMethodValues,
  depreciationCalculationValues,
  periodControlValues,
} from "@shared/chart-of-depreciation-schema";

const router = Router();

// Get all chart of depreciation records
router.get("/", async (req: Request, res: Response) => {
  try {
    const { company_code_id, active, fiscal_year_variant_id } = req.query;
    
    let query = `
      SELECT 
        cod.id,
        cod.code,
        cod.name,
        cod.description,
        cod.company_code_id,
        cod.fiscal_year_variant_id,
        cod.currency,
        cod.country,
        cod.depreciation_method,
        cod.base_method,
        cod.depreciation_calculation,
        cod.period_control,
        cod.allow_manual_depreciation,
        cod.allow_accelerated_depreciation,
        cod.allow_special_depreciation,
        cod.require_depreciation_key,
        cod.allow_negative_depreciation,
        cod.depreciation_start_date,
        cod.depreciation_end_date,
        cod.is_active,
        cod.created_at,
        cod.updated_at,
        cod.created_by,
        cod.updated_by,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_name
      FROM chart_of_depreciation cod
      LEFT JOIN company_codes cc ON cod.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON cod.fiscal_year_variant_id = fyv.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (company_code_id) {
      query += ` AND cod.company_code_id = $${paramIndex}`;
      params.push(parseInt(company_code_id as string));
      paramIndex++;
    }
    
    if (fiscal_year_variant_id) {
      query += ` AND cod.fiscal_year_variant_id = $${paramIndex}`;
      params.push(parseInt(fiscal_year_variant_id as string));
      paramIndex++;
    }
    
    if (active !== undefined) {
      query += ` AND cod.is_active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }
    
    query += " ORDER BY cod.code";
    
    const result = await pool.query(query, params);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching chart of depreciation:", error);
    return res.status(500).json({ 
      message: "Failed to fetch chart of depreciation", 
      error: error.message || "Unknown error" 
    });
  }
});

// Get dropdown options (live from shared schema)
router.get("/options", async (_req: Request, res: Response) => {
  return res.json({
    depreciationMethods: depreciationMethodValues,
    baseMethods: baseMethodValues,
    depreciationCalculations: depreciationCalculationValues,
    periodControls: periodControlValues,
  });
});

// Get chart of depreciation by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query(`
      SELECT 
        cod.*,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_name
      FROM chart_of_depreciation cod
      LEFT JOIN company_codes cc ON cod.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON cod.fiscal_year_variant_id = fyv.id
      WHERE cod.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chart of depreciation not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching chart of depreciation:", error);
    return res.status(500).json({ 
      message: "Failed to fetch chart of depreciation", 
      error: error.message || "Unknown error" 
    });
  }
});

// Create new chart of depreciation
router.post("/", async (req: Request, res: Response) => {
  try {
    const normalizeBaseMethod = (val: any) => {
      if (val === "ACQUISITION_VALUE") return "ACQUISITION_COST";
      if (val === "REPLACEMENT_VALUE") return "REPLACEMENT_COST";
      return val;
    };
    const normalizeDepCalculation = (val: any) => {
      if (val === "FULL_YEAR") return "FULL_PERIOD";
      if (val === "PRO_RATA") return "PROPORTIONAL";
      return val;
    };

    const validatedData = insertChartOfDepreciationSchema.parse({
      ...req.body,
      baseMethod: normalizeBaseMethod(req.body.baseMethod),
      depreciationCalculation: normalizeDepCalculation(req.body.depreciationCalculation),
    });
    
    // Check if code already exists
    const existingCode = await pool.query(
      "SELECT id FROM chart_of_depreciation WHERE code = $1",
      [validatedData.code]
    );
    if (existingCode.rows.length > 0) {
      return res.status(409).json({ message: "Chart of depreciation code already exists" });
    }
    
    // Verify company code exists
    const companyCheck = await pool.query("SELECT id FROM company_codes WHERE id = $1", [validatedData.companyCodeId]);
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ message: "Company code not found" });
    }
    
    // Verify fiscal year variant if provided
    if (validatedData.fiscalYearVariantId) {
      const fyvCheck = await pool.query("SELECT id FROM fiscal_year_variants WHERE id = $1", [validatedData.fiscalYearVariantId]);
      if (fyvCheck.rows.length === 0) {
        return res.status(404).json({ message: "Fiscal year variant not found" });
      }
    }
    
    // Normalize date strings to datetime format for PostgreSQL
    // If only date (YYYY-MM-DD) is provided, convert to datetime at midnight UTC
    const normalizeDate = (dateStr: string | null | undefined): string | null => {
      if (!dateStr) return null;
      // If already in datetime format, return as is
      if (dateStr.includes('T')) return dateStr;
      // If only date format, append time component
      return `${dateStr}T00:00:00.000Z`;
    };
    
    const depreciationStartDate = normalizeDate(validatedData.depreciationStartDate);
    const depreciationEndDate = normalizeDate(validatedData.depreciationEndDate);
    
    const result = await pool.query(`
      INSERT INTO chart_of_depreciation (
        code, name, description, company_code_id, fiscal_year_variant_id,
        currency, country, depreciation_method, base_method, depreciation_calculation,
        period_control, allow_manual_depreciation, allow_accelerated_depreciation,
        allow_special_depreciation, require_depreciation_key, allow_negative_depreciation,
        depreciation_start_date, depreciation_end_date, is_active, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `, [
      validatedData.code,
      validatedData.name,
      validatedData.description || null,
      validatedData.companyCodeId,
      validatedData.fiscalYearVariantId || null,
      validatedData.currency,
      validatedData.country || null,
      validatedData.depreciationMethod || null,
      validatedData.baseMethod || null,
      validatedData.depreciationCalculation || null,
      validatedData.periodControl || null,
      validatedData.allowManualDepreciation ?? false,
      validatedData.allowAcceleratedDepreciation ?? false,
      validatedData.allowSpecialDepreciation ?? false,
      validatedData.requireDepreciationKey ?? true,
      validatedData.allowNegativeDepreciation ?? false,
      depreciationStartDate,
      depreciationEndDate,
      validatedData.isActive ?? true,
      validatedData.createdBy || null,
      validatedData.updatedBy || null,
    ]);
    
    // Fetch with joins for complete response
    const fullResult = await pool.query(`
      SELECT 
        cod.*,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_name
      FROM chart_of_depreciation cod
      LEFT JOIN company_codes cc ON cod.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON cod.fiscal_year_variant_id = fyv.id
      WHERE cod.id = $1
    `, [result.rows[0].id]);
    
    return res.status(201).json(fullResult.rows[0]);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const errorDetails = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      console.error("Validation error:", errorDetails);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: errorDetails
      });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: "Chart of depreciation code already exists" });
    }
    console.error("Error creating chart of depreciation:", error);
    return res.status(500).json({ 
      message: "Failed to create chart of depreciation", 
      error: error.message || "Unknown error" 
    });
  }
});

// Update chart of depreciation
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const validatedData = updateChartOfDepreciationSchema.parse(req.body);
    
    // Check if record exists
    const existing = await pool.query("SELECT * FROM chart_of_depreciation WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Chart of depreciation not found" });
    }
    
    // Check if new code conflicts with existing (excluding current record)
    if (validatedData.code && validatedData.code !== existing.rows[0].code) {
      const codeConflict = await pool.query(
        "SELECT id FROM chart_of_depreciation WHERE code = $1 AND id != $2",
        [validatedData.code, id]
      );
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({ message: "Chart of depreciation code already exists" });
      }
    }
    
    // Verify company code if provided
    if (validatedData.companyCodeId) {
      const companyCheck = await pool.query("SELECT id FROM company_codes WHERE id = $1", [validatedData.companyCodeId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ message: "Company code not found" });
      }
    }
    
    // Verify fiscal year variant if provided
    if (validatedData.fiscalYearVariantId !== undefined) {
      if (validatedData.fiscalYearVariantId) {
        const fyvCheck = await pool.query("SELECT id FROM fiscal_year_variants WHERE id = $1", [validatedData.fiscalYearVariantId]);
        if (fyvCheck.rows.length === 0) {
          return res.status(404).json({ message: "Fiscal year variant not found" });
        }
      }
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (validatedData.code !== undefined) {
      updates.push(`code = $${paramCount++}`);
      values.push(validatedData.code);
    }
    if (validatedData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(validatedData.name);
    }
    if (validatedData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(validatedData.description || null);
    }
    if (validatedData.companyCodeId !== undefined) {
      updates.push(`company_code_id = $${paramCount++}`);
      values.push(validatedData.companyCodeId);
    }
    if (validatedData.fiscalYearVariantId !== undefined) {
      updates.push(`fiscal_year_variant_id = $${paramCount++}`);
      values.push(validatedData.fiscalYearVariantId || null);
    }
    if (validatedData.currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(validatedData.currency);
    }
    if (validatedData.country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      values.push(validatedData.country || null);
    }
    if (validatedData.depreciationMethod !== undefined) {
      updates.push(`depreciation_method = $${paramCount++}`);
      values.push(validatedData.depreciationMethod || null);
    }
    if (validatedData.baseMethod !== undefined) {
      updates.push(`base_method = $${paramCount++}`);
      values.push(validatedData.baseMethod || null);
    }
    if (validatedData.depreciationCalculation !== undefined) {
      updates.push(`depreciation_calculation = $${paramCount++}`);
      values.push(validatedData.depreciationCalculation || null);
    }
    if (validatedData.periodControl !== undefined) {
      updates.push(`period_control = $${paramCount++}`);
      values.push(validatedData.periodControl || null);
    }
    if (validatedData.allowManualDepreciation !== undefined) {
      updates.push(`allow_manual_depreciation = $${paramCount++}`);
      values.push(validatedData.allowManualDepreciation);
    }
    if (validatedData.allowAcceleratedDepreciation !== undefined) {
      updates.push(`allow_accelerated_depreciation = $${paramCount++}`);
      values.push(validatedData.allowAcceleratedDepreciation);
    }
    if (validatedData.allowSpecialDepreciation !== undefined) {
      updates.push(`allow_special_depreciation = $${paramCount++}`);
      values.push(validatedData.allowSpecialDepreciation);
    }
    if (validatedData.requireDepreciationKey !== undefined) {
      updates.push(`require_depreciation_key = $${paramCount++}`);
      values.push(validatedData.requireDepreciationKey);
    }
    if (validatedData.allowNegativeDepreciation !== undefined) {
      updates.push(`allow_negative_depreciation = $${paramCount++}`);
      values.push(validatedData.allowNegativeDepreciation);
    }
    // Normalize date strings to datetime format for PostgreSQL
    const normalizeDate = (dateStr: string | null | undefined): string | null => {
      if (!dateStr) return null;
      // If already in datetime format, return as is
      if (dateStr.includes('T')) return dateStr;
      // If only date format, append time component
      return `${dateStr}T00:00:00.000Z`;
    };
    if (validatedData.depreciationStartDate !== undefined) {
      updates.push(`depreciation_start_date = $${paramCount++}`);
      values.push(normalizeDate(validatedData.depreciationStartDate));
    }
    if (validatedData.depreciationEndDate !== undefined) {
      updates.push(`depreciation_end_date = $${paramCount++}`);
      values.push(normalizeDate(validatedData.depreciationEndDate));
    }
    if (validatedData.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(validatedData.isActive);
    }
    if (validatedData.updatedBy !== undefined) {
      updates.push(`updated_by = $${paramCount++}`);
      values.push(validatedData.updatedBy || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE chart_of_depreciation 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    await pool.query(query, values);
    
    // Fetch with joins for complete response
    const fullResult = await pool.query(`
      SELECT 
        cod.*,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_name
      FROM chart_of_depreciation cod
      LEFT JOIN company_codes cc ON cod.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON cod.fiscal_year_variant_id = fyv.id
      WHERE cod.id = $1
    `, [id]);
    
    return res.status(200).json(fullResult.rows[0]);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const errorDetails = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      console.error("Validation error:", errorDetails);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: errorDetails
      });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: "Chart of depreciation code already exists" });
    }
    console.error("Error updating chart of depreciation:", error);
    return res.status(500).json({ 
      message: "Failed to update chart of depreciation", 
      error: error.message || "Unknown error" 
    });
  }
});

// Delete chart of depreciation
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if chart of depreciation is referenced by other records
    // This would need to check asset master data or depreciation areas if they exist
    // For now, we'll just check if it exists and delete it
    
    const result = await pool.query(
      "DELETE FROM chart_of_depreciation WHERE id = $1 RETURNING id, code, name",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chart of depreciation not found" });
    }
    
    return res.status(200).json({ 
      message: "Chart of depreciation deleted successfully", 
      deleted: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23503') {
      return res.status(400).json({ message: "Cannot delete chart of depreciation. It is referenced by other records." });
    }
    console.error("Error deleting chart of depreciation:", error);
    return res.status(500).json({ 
      message: "Failed to delete chart of depreciation", 
      error: error.message || "Unknown error" 
    });
  }
});

export default router;

