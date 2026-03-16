import { Request, Response } from 'express';
import { ensureActivePool } from '../../database';

const pool = ensureActivePool();

// GET /api/controlling-areas - Get all management control areas
export async function getManagementControlAreas(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT 
        mca.*,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_description
      FROM management_control_areas mca
      LEFT JOIN fiscal_year_variants fyv ON mca.fiscal_year_variant_id = fyv.id
      LEFT JOIN chart_of_accounts coa ON mca.chart_of_accounts_id = coa.id
      ORDER BY mca.area_code ASC
    `);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching management control areas:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/controlling-areas/:id - Get management control area by ID
export async function getManagementControlAreaById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        mca.*,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_description,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_description
      FROM management_control_areas mca
      LEFT JOIN fiscal_year_variants fyv ON mca.fiscal_year_variant_id = fyv.id
      LEFT JOIN chart_of_accounts coa ON mca.chart_of_accounts_id = coa.id
      WHERE mca.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Management control area not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching management control area:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/controlling-areas - Create a new management control area
export async function createManagementControlArea(req: Request, res: Response) {
  try {
    const {
      area_code,
      area_name,
      description,
      operating_concern,
      person_responsible,
      currency,
      fiscal_year_variant,
      chart_of_accounts,
      cost_center_standard_hierarchy,
      profit_center_standard_hierarchy,
      activity_type_version,
      costing_version,
      price_calculation_control,
      actual_costing_enabled,
      plan_costing_enabled,
      variance_calculation,
      settlement_method,
      allocation_cycle_posting,
      profit_center_accounting,
      active
    } = req.body;

    // Validation
    if (!area_code || !area_name) {
      return res.status(400).json({
        error: "Validation error",
        message: "Area code and area name are required"
      });
    }

    // Check if area code already exists
    const existingResult = await pool.query(`
      SELECT id FROM management_control_areas WHERE area_code = $1
    `, [area_code.toUpperCase().trim()]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "Management control area code already exists"
      });
    }

    // Handle fiscal_year_variant - convert variant_id to id
    let fiscalYearVariantId = null;
    if (fiscal_year_variant) {
      const fyvResult = await pool.query(`
        SELECT id FROM fiscal_year_variants WHERE variant_id = $1
      `, [fiscal_year_variant]);
      if (fyvResult.rows.length > 0) {
        fiscalYearVariantId = fyvResult.rows[0].id;
      }
    }

    // Handle chart_of_accounts - convert chart_id to id
    let chartOfAccountsId = null;
    if (chart_of_accounts) {
      const coaResult = await pool.query(`
        SELECT id FROM chart_of_accounts WHERE chart_id = $1
      `, [chart_of_accounts]);
      if (coaResult.rows.length > 0) {
        chartOfAccountsId = coaResult.rows[0].id;
      }
    }

    const result = await pool.query(`
      INSERT INTO management_control_areas (
        area_code, area_name, description, operating_concern_code, person_responsible,
        currency_code, fiscal_year_variant_id, chart_of_accounts_id,
        cost_center_hierarchy_code, profit_center_hierarchy_code,
        activity_type_version, costing_version,
        price_calculation_enabled, actual_costing_enabled, plan_costing_enabled,
        variance_calculation_enabled, settlement_method,
        allocation_cycle_posting_enabled, profit_center_accounting_enabled,
        is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *
    `, [
      area_code.toUpperCase().trim(),
      area_name.trim(),
      description || null,
      operating_concern || null,
      person_responsible || null,
      currency || null,
      fiscalYearVariantId,
      chartOfAccountsId,
      cost_center_standard_hierarchy || null,
      profit_center_standard_hierarchy || null,
      activity_type_version || null,
      costing_version || null,
      price_calculation_control !== undefined ? price_calculation_control : true,
      actual_costing_enabled !== undefined ? actual_costing_enabled : true,
      plan_costing_enabled !== undefined ? plan_costing_enabled : true,
      variance_calculation !== undefined ? variance_calculation : true,
      settlement_method || 'full',
      allocation_cycle_posting !== undefined ? allocation_cycle_posting : false,
      profit_center_accounting !== undefined ? profit_center_accounting : false,
      active !== undefined ? active : true
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating management control area:", error);

    if (error.code === '23505') {
      return res.status(409).json({
        error: "Conflict",
        message: "Management control area code already exists"
      });
    }

    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PATCH /api/controlling-areas/:id - Update a management control area
export async function updateManagementControlArea(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if management control area exists
    const existingResult = await pool.query(`
      SELECT * FROM management_control_areas WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Management control area not found" });
    }

    const {
      area_code,
      area_name,
      description,
      operating_concern,
      person_responsible,
      company_code_id,
      currency,
      fiscal_year_variant,
      chart_of_accounts,
      cost_center_standard_hierarchy,
      profit_center_standard_hierarchy,
      activity_type_version,
      costing_version,
      price_calculation_control,
      actual_costing_enabled,
      plan_costing_enabled,
      variance_calculation,
      settlement_method,
      allocation_cycle_posting,
      profit_center_accounting,
      active
    } = req.body;

    // If code is being changed, check it doesn't conflict
    if (area_code && area_code !== existingResult.rows[0].area_code) {
      const conflictCheck = await pool.query(`
        SELECT id FROM management_control_areas 
        WHERE area_code = $1 AND id != $2
      `, [area_code.toUpperCase(), id]);

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({
          error: "Conflict",
          message: "Management control area code already exists"
        });
      }
    }

    // Handle fiscal_year_variant - convert variant_id to id
    let fiscalYearVariantId = existingResult.rows[0].fiscal_year_variant_id;
    if (fiscal_year_variant !== undefined) {
      if (fiscal_year_variant) {
        const fyvResult = await pool.query(`
          SELECT id FROM fiscal_year_variants WHERE variant_id = $1
        `, [fiscal_year_variant]);
        if (fyvResult.rows.length > 0) {
          fiscalYearVariantId = fyvResult.rows[0].id;
        } else {
          fiscalYearVariantId = null;
        }
      } else {
        fiscalYearVariantId = null;
      }
    }

    // Handle chart_of_accounts - convert chart_id to id
    let chartOfAccountsId = existingResult.rows[0].chart_of_accounts_id;
    if (chart_of_accounts !== undefined) {
      if (chart_of_accounts) {
        const coaResult = await pool.query(`
          SELECT id FROM chart_of_accounts WHERE chart_id = $1
        `, [chart_of_accounts]);
        if (coaResult.rows.length > 0) {
          chartOfAccountsId = coaResult.rows[0].id;
        } else {
          chartOfAccountsId = null;
        }
      } else {
        chartOfAccountsId = null;
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (area_code !== undefined) {
      updateFields.push(`area_code = $${paramIndex++}`);
      updateValues.push(area_code.toUpperCase().trim());
    }
    if (area_name !== undefined) {
      updateFields.push(`area_name = $${paramIndex++}`);
      updateValues.push(area_name.trim());
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description || null);
    }
    if (operating_concern !== undefined) {
      updateFields.push(`operating_concern_code = $${paramIndex++}`);
      updateValues.push(operating_concern || null);
    }
    if (person_responsible !== undefined) {
      updateFields.push(`person_responsible = $${paramIndex++}`);
      updateValues.push(person_responsible || null);
    }
    if (currency !== undefined) {
      updateFields.push(`currency_code = $${paramIndex++}`);
      updateValues.push(currency || null);
    }
    if (fiscal_year_variant !== undefined) {
      updateFields.push(`fiscal_year_variant_id = $${paramIndex++}`);
      updateValues.push(fiscalYearVariantId);
    }
    if (chart_of_accounts !== undefined) {
      updateFields.push(`chart_of_accounts_id = $${paramIndex++}`);
      updateValues.push(chartOfAccountsId);
    }
    if (cost_center_standard_hierarchy !== undefined) {
      updateFields.push(`cost_center_hierarchy_code = $${paramIndex++}`);
      updateValues.push(cost_center_standard_hierarchy || null);
    }
    if (profit_center_standard_hierarchy !== undefined) {
      updateFields.push(`profit_center_hierarchy_code = $${paramIndex++}`);
      updateValues.push(profit_center_standard_hierarchy || null);
    }
    if (activity_type_version !== undefined) {
      updateFields.push(`activity_type_version = $${paramIndex++}`);
      updateValues.push(activity_type_version || null);
    }
    if (costing_version !== undefined) {
      updateFields.push(`costing_version = $${paramIndex++}`);
      updateValues.push(costing_version || null);
    }
    if (price_calculation_control !== undefined) {
      updateFields.push(`price_calculation_enabled = $${paramIndex++}`);
      updateValues.push(price_calculation_control);
    }
    if (actual_costing_enabled !== undefined) {
      updateFields.push(`actual_costing_enabled = $${paramIndex++}`);
      updateValues.push(actual_costing_enabled);
    }
    if (plan_costing_enabled !== undefined) {
      updateFields.push(`plan_costing_enabled = $${paramIndex++}`);
      updateValues.push(plan_costing_enabled);
    }
    if (variance_calculation !== undefined) {
      updateFields.push(`variance_calculation_enabled = $${paramIndex++}`);
      updateValues.push(variance_calculation);
    }
    if (settlement_method !== undefined) {
      updateFields.push(`settlement_method = $${paramIndex++}`);
      updateValues.push(settlement_method);
    }
    if (allocation_cycle_posting !== undefined) {
      updateFields.push(`allocation_cycle_posting_enabled = $${paramIndex++}`);
      updateValues.push(allocation_cycle_posting);
    }
    if (profit_center_accounting !== undefined) {
      updateFields.push(`profit_center_accounting_enabled = $${paramIndex++}`);
      updateValues.push(profit_center_accounting);
    }
    if (active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await pool.query(`
      UPDATE management_control_areas 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating management control area:", error);

    if (error.code === '23505') {
      return res.status(409).json({
        error: "Conflict",
        message: "Management control area code already exists"
      });
    }

    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// DELETE /api/controlling-areas/:id - Delete a management control area
export async function deleteManagementControlArea(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if management control area exists
    const existingResult = await pool.query(`
      SELECT id FROM management_control_areas WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Management control area not found" });
    }

    await pool.query(`DELETE FROM management_control_areas WHERE id = $1`, [id]);

    return res.status(200).json({ message: "Management control area deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting management control area:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

