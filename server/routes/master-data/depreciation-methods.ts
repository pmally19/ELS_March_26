import express, { Request, Response } from "express";
import { pool } from "../../db";
import { ensureActivePool } from "../../database";

const router = express.Router();

// Shared option lists for dropdowns
const calculationTypeValues = [
  "STRAIGHT_LINE",
  "DECLINING_BALANCE",
  "UNITS_OF_PRODUCTION",
  "SUM_OF_YEARS",
  "CUSTOM",
] as const;

const baseValueTypeValues = [
  "ACQUISITION_COST",
  "CURRENT_VALUE",
  "REPLACEMENT_COST",
  "FAIR_VALUE",
] as const;

const timeBasisValues = [
  "DAILY",
  "MONTHLY",
  "ANNUAL",
] as const;

// GET dropdown options to avoid hardcoded UI lists
router.get("/options", async (_req: Request, res: Response) => {
  res.json({
    calculationTypes: calculationTypeValues,
    baseValueTypes: baseValueTypeValues,
    timeBases: timeBasisValues,
  });
});

// GET all depreciation methods
router.get("/", async (req: Request, res: Response) => {
  try {
    ensureActivePool();

    const { company_code_id, is_active, calculation_type } = req.query;

    let query = `
      SELECT 
        dm.*,
        cc.code as company_code,
        cc.name as company_name
      FROM depreciation_methods dm
      LEFT JOIN company_codes cc ON dm.company_code_id = cc.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (company_code_id) {
      paramCount++;
      query += ` AND dm.company_code_id = $${paramCount}`;
      params.push(company_code_id);
    }

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND dm.is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    if (calculation_type) {
      paramCount++;
      query += ` AND dm.calculation_type = $${paramCount}`;
      params.push(calculation_type);
    }

    query += ` ORDER BY dm.code ASC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching depreciation methods:", error);
    res.status(500).json({
      message: "Failed to fetch depreciation methods",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET single depreciation method by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();

    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        dm.*,
        cc.code as company_code,
        cc.name as company_name
      FROM depreciation_methods dm
      LEFT JOIN company_codes cc ON dm.company_code_id = cc.id
      WHERE dm.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Depreciation method not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching depreciation method:", error);
    res.status(500).json({
      message: "Failed to fetch depreciation method",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST create new depreciation method
router.post("/", async (req: Request, res: Response) => {
  try {
    ensureActivePool();

    const {
      code,
      name,
      description,
      calculation_type,
      base_value_type,
      depreciation_rate,
      useful_life_years,
      residual_value_percent,
      // legacy fields
      allow_partial_year,
      prorata_basis,
      switch_method_allowed,
      // canonical fields
      supports_partial_periods,
      time_basis,
      method_switching_allowed,
      company_code_id,
      applicable_to_asset_class,
      is_active,
      is_default,
      created_by
    } = req.body;

    // Validate required fields
    if (!code || !name || !calculation_type || !base_value_type) {
      return res.status(400).json({
        message: "Missing required fields: code, name, calculation_type, base_value_type"
      });
    }

    // Check if code already exists
    const existingCheck = await pool.query(
      "SELECT id FROM depreciation_methods WHERE code = $1",
      [code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Depreciation method with this code already exists"
      });
    }

    // If setting as default, unset other defaults for the same company
    if (is_default && company_code_id) {
      await pool.query(
        `UPDATE depreciation_methods 
         SET is_default = false 
         WHERE company_code_id = $1 AND is_default = true`,
        [company_code_id]
      );
    }

    const partialPeriods = supports_partial_periods ?? (allow_partial_year !== undefined ? allow_partial_year : true);
    const timeBasis = time_basis ?? (prorata_basis ? (
      prorata_basis === "DAYS" ? "DAILY" :
        prorata_basis === "MONTHS" ? "MONTHLY" :
          prorata_basis === "FULL_YEAR" ? "ANNUAL" : prorata_basis
    ) : "MONTHLY");
    const methodSwitchAllowed = method_switching_allowed ?? (switch_method_allowed !== undefined ? switch_method_allowed : false);

    const result = await pool.query(`
      INSERT INTO depreciation_methods (
        code, name, description, calculation_type, base_value_type,
        depreciation_rate, useful_life_years, residual_value_percent,
        supports_partial_periods, time_basis, method_switching_allowed,
        company_code_id, applicable_to_asset_class,
        is_active, is_default, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      code,
      name,
      description || null,
      calculation_type,
      base_value_type,
      depreciation_rate || null,
      useful_life_years || null,
      residual_value_percent || 0,
      partialPeriods,
      timeBasis,
      methodSwitchAllowed,
      company_code_id || null,
      applicable_to_asset_class || null,
      is_active !== undefined ? is_active : true,
      is_default !== undefined ? is_default : false,
      created_by || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating depreciation method:", error);
    res.status(500).json({
      message: "Failed to create depreciation method",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// PUT update depreciation method
router.put("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();

    const { id } = req.params;
    const {
      code,
      name,
      description,
      calculation_type,
      base_value_type,
      depreciation_rate,
      useful_life_years,
      residual_value_percent,
      allow_partial_year,
      prorata_basis,
      switch_method_allowed,
      supports_partial_periods,
      time_basis,
      method_switching_allowed,
      company_code_id,
      applicable_to_asset_class,
      is_active,
      is_default,
      updated_by
    } = req.body;

    // Check if method exists
    const existingCheck = await pool.query(
      "SELECT id, code, company_code_id FROM depreciation_methods WHERE id = $1",
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Depreciation method not found" });
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingCheck.rows[0].code) {
      const duplicateCheck = await pool.query(
        "SELECT id FROM depreciation_methods WHERE code = $1 AND id != $2",
        [code, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          message: "Depreciation method with this code already exists"
        });
      }
    }

    // If setting as default, unset other defaults for the same company
    if (is_default && company_code_id) {
      await pool.query(
        `UPDATE depreciation_methods 
         SET is_default = false 
         WHERE company_code_id = $1 AND is_default = true AND id != $2`,
        [company_code_id, id]
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (code !== undefined) {
      paramCount++;
      updates.push(`code = $${paramCount}`);
      values.push(code);
    }
    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }
    if (calculation_type !== undefined) {
      paramCount++;
      updates.push(`calculation_type = $${paramCount}`);
      values.push(calculation_type);
    }
    if (base_value_type !== undefined) {
      paramCount++;
      updates.push(`base_value_type = $${paramCount}`);
      values.push(base_value_type);
    }
    if (depreciation_rate !== undefined) {
      paramCount++;
      updates.push(`depreciation_rate = $${paramCount}`);
      values.push(depreciation_rate);
    }
    if (useful_life_years !== undefined) {
      paramCount++;
      updates.push(`useful_life_years = $${paramCount}`);
      values.push(useful_life_years);
    }
    if (residual_value_percent !== undefined) {
      paramCount++;
      updates.push(`residual_value_percent = $${paramCount}`);
      values.push(residual_value_percent);
    }
    if (supports_partial_periods !== undefined || allow_partial_year !== undefined) {
      paramCount++;
      updates.push(`supports_partial_periods = $${paramCount}`);
      values.push(supports_partial_periods !== undefined ? supports_partial_periods : allow_partial_year);
    }
    if (time_basis !== undefined || prorata_basis !== undefined) {
      paramCount++;
      const mapped = time_basis ?? (prorata_basis ? (
        prorata_basis === "DAYS" ? "DAILY" :
          prorata_basis === "MONTHS" ? "MONTHLY" :
            prorata_basis === "FULL_YEAR" ? "ANNUAL" : prorata_basis
      ) : null);
      updates.push(`time_basis = $${paramCount}`);
      values.push(mapped);
    }
    if (method_switching_allowed !== undefined || switch_method_allowed !== undefined) {
      paramCount++;
      updates.push(`method_switching_allowed = $${paramCount}`);
      values.push(method_switching_allowed !== undefined ? method_switching_allowed : switch_method_allowed);
    }
    if (company_code_id !== undefined) {
      paramCount++;
      updates.push(`company_code_id = $${paramCount}`);
      values.push(company_code_id);
    }
    if (applicable_to_asset_class !== undefined) {
      paramCount++;
      updates.push(`applicable_to_asset_class = $${paramCount}`);
      values.push(applicable_to_asset_class);
    }
    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }
    if (is_default !== undefined) {
      paramCount++;
      updates.push(`is_default = $${paramCount}`);
      values.push(is_default);
    }
    if (updated_by !== undefined) {
      paramCount++;
      updates.push(`updated_by = $${paramCount}`);
      values.push(updated_by);
    }

    // Always update updated_at (no parameter needed)
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Add id as the last parameter
    paramCount++;
    values.push(id);

    const query = `
      UPDATE depreciation_methods 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating depreciation method:", error);
    res.status(500).json({
      message: "Failed to update depreciation method",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// DELETE depreciation method
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();

    const { id } = req.params;

    // Check if method exists
    const existingCheck = await pool.query(
      "SELECT id FROM depreciation_methods WHERE id = $1",
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Depreciation method not found" });
    }

    // Soft delete by setting is_active = false
    await pool.query(
      `UPDATE depreciation_methods 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    res.json({ message: "Depreciation method deactivated successfully" });
  } catch (error) {
    console.error("Error deleting depreciation method:", error);
    res.status(500).json({
      message: "Failed to delete depreciation method",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;

