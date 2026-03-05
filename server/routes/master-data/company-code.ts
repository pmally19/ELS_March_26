import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { companyCodeSchema } from '../../schemas/company-code-schema';
import { oneProjectSyncAgent } from '../../services/oneproject-sync-agent';

// GET /api/master-data/company-code - Get all company codes (excludes soft-deleted)
export async function getCompanyCodes(req: Request, res: Response) {
  try {
    const result = await db.execute(sql`
      SELECT 
        cc.*,
        fyv.variant_id as fiscal_year,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_description,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_name
      FROM company_codes cc
      LEFT JOIN fiscal_year_variants fyv ON cc.fiscal_year_variant_id = fyv.id
      LEFT JOIN chart_of_accounts coa ON cc.chart_of_accounts_id = coa.id
      WHERE cc."_isActive" IS NOT false
      ORDER BY cc.code
    `);

    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching company codes:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/master-data/company-code/:id - Get company code by ID (excludes soft-deleted)
export async function getCompanyCodeById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await db.execute(sql`
      SELECT 
        cc.*,
        fyv.variant_id as fiscal_year,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_description,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_name
      FROM company_codes cc
      LEFT JOIN fiscal_year_variants fyv ON cc.fiscal_year_variant_id = fyv.id
      LEFT JOIN chart_of_accounts coa ON cc.chart_of_accounts_id = coa.id
      WHERE cc.id = ${id}
        AND cc."_isActive" IS NOT false
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Company code not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching company code:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/company-code - Create a new company code
export async function createCompanyCode(req: Request, res: Response) {
  try {
    console.log("Received company code creation request:", req.body);

    let requestBody = req.body;
    if (typeof requestBody === 'string') {
      try {
        requestBody = JSON.parse(requestBody);
        console.log(`✅ [POST /company-code] Parsed string body as JSON`);
      } catch (e) {
        console.error(`❌ [POST /company-code] Failed to parse string body:`, e);
      }
    }

    const validation = companyCodeSchema.safeParse(requestBody);

    if (!validation.success) {
      console.log("Validation failed:", validation.error);
      return res.status(400).json({
        error: "Validation error",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;
    console.log("Validated data:", data);

    // Check if company code already exists
    const existingResult = await db.execute(sql`SELECT id FROM company_codes WHERE code = ${data.code}`);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "Company code already exists" });
    }

    // Get chart_of_accounts_id from chartOfAccounts (chart_id string)
    let chartOfAccountsId = null;
    if (data.chartOfAccounts && data.chartOfAccounts.trim() !== '') {
      const trimmedChartId = data.chartOfAccounts.trim();
      console.log(`🔍 Looking up chart of accounts with chart_id: "${trimmedChartId}"`);

      const coaResult = await db.execute(sql`SELECT id FROM chart_of_accounts WHERE chart_id = ${trimmedChartId}`);

      if (coaResult.rows.length > 0) {
        chartOfAccountsId = coaResult.rows[0].id;
        console.log(`✅ Found chart of accounts: "${trimmedChartId}" -> ID: ${chartOfAccountsId}`);
      } else {
        console.warn(`⚠️ Chart of accounts not found: "${trimmedChartId}" - will be set to NULL`);
      }
    }

    // Get fiscal_year_variant_id from fiscalYear (variant_id string)
    let fiscalYearVariantId = null;
    if (data.fiscalYear && data.fiscalYear.trim() !== '') {
      const trimmedFiscalYear = data.fiscalYear.trim();
      console.log(`🔍 Looking up fiscal year variant with variant_id: "${trimmedFiscalYear}"`);

      const fyvResult = await db.execute(sql`SELECT id FROM fiscal_year_variants WHERE variant_id = ${trimmedFiscalYear}`);

      if (fyvResult.rows.length > 0) {
        fiscalYearVariantId = fyvResult.rows[0].id;
        console.log(`✅ Found fiscal year variant: "${trimmedFiscalYear}" -> ID: ${fiscalYearVariantId}`);
      } else {
        console.error(`❌ Fiscal year variant not found in database: "${trimmedFiscalYear}"`);
        return res.status(400).json({
          error: "Validation error",
          message: `Fiscal year variant "${trimmedFiscalYear}" not found. Please ensure the fiscal year variant exists in the system.`
        });
      }
    } else {
      console.error('❌ Fiscal year is required but was not provided');
      return res.status(400).json({
        error: "Validation error",
        message: "Fiscal year is required"
      });
    }

    // Audit trail: resolve userId from session if available, default to 1
    const userId: number = (req as any).user?.id ?? 1;
    // _tenantId is CHAR(3), range '001'-'999'. Default '001' = Default Tenant
    // (will be replaced by req.user.tenantId once auth middleware is active)
    const tenantId: string = (req as any).user?.tenantId ?? '001';

    // Create company code — 5 audit trail fields (_tenantId, _createdBy, _updatedBy, _isActive, _deletedAt)
    // created_at / updated_at already exist on the table (not redundant)
    const insertResult = await db.execute(sql`
      INSERT INTO company_codes (
        code, name, city, country, currency, language, active,
        description, tax_id, address, state, postal_code, phone, email, website, logo_url,
        fiscal_year_variant_id, chart_of_accounts_id,
        created_at, updated_at,
        "_tenantId", "_createdBy", "_updatedBy",
        "_isActive", "_deletedAt"
      )
      VALUES (
        ${data.code}, ${data.name}, ${data.city || null}, ${data.country}, ${data.currency}, ${data.language || null}, ${data.active},
        ${data.description || null}, ${data.taxId || null}, ${data.address || null}, ${data.state || null}, ${data.postalCode || null}, ${data.phone || null}, ${data.email || null}, ${data.website || null}, ${data.logoUrl || null},
        ${fiscalYearVariantId}, ${chartOfAccountsId},
        NOW(), NOW(),
        ${tenantId}, ${userId}, ${userId},
        true, NULL
      )
      RETURNING *
    `);

    console.log("Insert result:", insertResult);

    if (insertResult.rows && insertResult.rows.length > 0) {
      const newCompanyCode = insertResult.rows[0];

      // Sync to OneProject table
      try {
        await oneProjectSyncAgent.syncBusinessToOneProject('company_codes', newCompanyCode.id.toString(), 'INSERT', newCompanyCode);
        console.log(`✅ Company code ${newCompanyCode.code} synced to OneProject table`);
      } catch (syncError) {
        console.error(`❌ Failed to sync company code ${newCompanyCode.code} to OneProject:`, syncError);
        // Don't fail the request, just log the sync error
      }

      return res.status(201).json(newCompanyCode);
    } else {
      return res.status(500).json({ error: "Failed to create company code", message: "No data returned from insert" });
    }
  } catch (error: any) {
    console.error("Error creating company code:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
      stack: error.stack
    });
  }
}

// PUT /api/master-data/company-code/:id - Update a company code
export async function updateCompanyCode(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    let requestBody = req.body;
    if (typeof requestBody === 'string') {
      try {
        requestBody = JSON.parse(requestBody);
        console.log(`✅ [PUT /company-code/${id}] Parsed string body as JSON`);
      } catch (e) {
        console.error(`❌ [PUT /company-code/${id}] Failed to parse string body:`, e);
      }
    }

    const validation = companyCodeSchema.safeParse(requestBody);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Check if company code exists
    const existingResult = await db.execute(sql`SELECT * FROM company_codes WHERE id = ${id}`);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Company code not found" });
    }

    const existingCompanyCode = existingResult.rows[0];

    // If code is being changed, check it doesn't conflict with another company code
    if (data.code !== existingCompanyCode.code) {
      const duplicateResult = await db.execute(sql`SELECT id FROM company_codes WHERE code = ${data.code} AND id != ${id}`);

      if (duplicateResult.rows.length > 0) {
        return res.status(409).json({ error: "Conflict", message: "Company code already exists" });
      }
    }

    // Get chart_of_accounts_id from chartOfAccounts (chart_id string)
    let chartOfAccountsId = null;
    if (data.chartOfAccounts && data.chartOfAccounts.trim() !== '') {
      const trimmedChartId = data.chartOfAccounts.trim();
      console.log(`🔍 Looking up chart of accounts with chart_id: "${trimmedChartId}"`);

      const coaResult = await db.execute(sql`SELECT id FROM chart_of_accounts WHERE chart_id = ${trimmedChartId}`);

      if (coaResult.rows.length > 0) {
        chartOfAccountsId = coaResult.rows[0].id;
        console.log(`✅ Found chart of accounts: "${trimmedChartId}" -> ID: ${chartOfAccountsId}`);
      } else {
        console.warn(`⚠️ Chart of accounts not found: "${trimmedChartId}" - will be set to NULL`);
      }
    } else {
      // For updates, if chartOfAccounts is not provided, keep the existing value
      const existingCoaResult = await db.execute(sql`SELECT chart_of_accounts_id FROM company_codes WHERE id = ${id}`);
      if (existingCoaResult.rows.length > 0) {
        chartOfAccountsId = existingCoaResult.rows[0].chart_of_accounts_id;
        console.log(`ℹ️ No chart of accounts provided in update, keeping existing chart_of_accounts_id: ${chartOfAccountsId}`);
      }
    }

    // Get fiscal_year_variant_id from fiscalYear (variant_id string)
    let fiscalYearVariantId = null;
    if (data.fiscalYear && data.fiscalYear.trim() !== '') {
      const trimmedFiscalYear = data.fiscalYear.trim();
      console.log(`🔍 Looking up fiscal year variant with variant_id: "${trimmedFiscalYear}"`);

      const fyvResult = await db.execute(sql`SELECT id FROM fiscal_year_variants WHERE variant_id = ${trimmedFiscalYear}`);

      if (fyvResult.rows.length > 0) {
        fiscalYearVariantId = fyvResult.rows[0].id;
        console.log(`✅ Found fiscal year variant: "${trimmedFiscalYear}" -> ID: ${fiscalYearVariantId}`);
      } else {
        console.error(`❌ Fiscal year variant not found in database: "${trimmedFiscalYear}"`);
        return res.status(400).json({
          error: "Validation error",
          message: `Fiscal year variant "${trimmedFiscalYear}" not found. Please ensure the fiscal year variant exists in the system.`
        });
      }
    } else {
      // For updates, if fiscalYear is not provided, keep the existing value
      const existingFyvResult = await db.execute(sql`SELECT fiscal_year_variant_id FROM company_codes WHERE id = ${id}`);
      if (existingFyvResult.rows.length > 0) {
        fiscalYearVariantId = existingFyvResult.rows[0].fiscal_year_variant_id;
        console.log(`ℹ️ No fiscal year provided in update, keeping existing fiscal_year_variant_id: ${fiscalYearVariantId}`);
      }
    }

    // Audit trail: resolve userId from session if available, default to 1
    const userId: number = (req as any).user?.id ?? 1;

    // Update company code — _updatedBy set for audit trail
    // updated_at is auto-refreshed by DB trigger (ACID-safe)
    const updateResult = await db.execute(sql`
      UPDATE company_codes 
      SET 
        code = ${data.code}, 
        name = ${data.name}, 
        city = ${data.city || null}, 
        country = ${data.country}, 
        currency = ${data.currency}, 
        language = ${data.language || null}, 
        active = ${data.active},
        description = ${data.description || null},
        tax_id = ${data.taxId || null},
        address = ${data.address || null},
        state = ${data.state || null},
        postal_code = ${data.postalCode || null},
        phone = ${data.phone || null},
        email = ${data.email || null},
        website = ${data.website || null},
        logo_url = ${data.logoUrl || null},
        fiscal_year_variant_id = ${fiscalYearVariantId}, 
        chart_of_accounts_id = ${chartOfAccountsId}, 
        updated_at = NOW(),
        "_updatedBy" = ${userId}
      WHERE id = ${id}
        AND "_isActive" IS NOT false
      RETURNING *
    `);

    const updatedCompanyCode = updateResult.rows[0];

    // Sync to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('company_codes', updatedCompanyCode.id.toString(), 'UPDATE', updatedCompanyCode);
      console.log(`✅ Company code ${updatedCompanyCode.code} updated in OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync company code ${updatedCompanyCode.code} update to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    return res.status(200).json(updatedCompanyCode);
  } catch (error: any) {
    console.error("Error updating company code:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// DELETE /api/master-data/company-code/:id - Soft-delete a company code
// Sets isActive=false and deletedAt=NOW() — data is preserved for audit trail
export async function deleteCompanyCode(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Audit trail: resolve userId from session if available, default to 1
    const userId: number = (req as any).user?.id ?? 1;

    // Check if company code exists and is not already soft-deleted
    const existingResult = await db.execute(sql`
      SELECT * FROM company_codes WHERE id = ${id} AND "_isActive" IS NOT false
    `);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Company code not found" });
    }

    const companyCodeToDelete = existingResult.rows[0];

    // Soft-delete: set isActive=false, deletedAt=NOW(), updatedBy=userId
    // Data is preserved in DB — ACID compliant (atomic with the same transaction)
    const softDeleteResult = await db.execute(sql`
      UPDATE company_codes
      SET
        "_isActive"  = false,
        "_deletedAt" = NOW(),
        "_updatedBy" = ${userId},
        updated_at   = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    const deletedCompanyCode = softDeleteResult.rows[0];

    // Sync soft-deletion to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('company_codes', deletedCompanyCode.id.toString(), 'DELETE', deletedCompanyCode);
      console.log(`✅ Company code ${deletedCompanyCode.code} soft-deletion synced to OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync company code ${deletedCompanyCode.code} soft-deletion to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    return res.status(200).json({ message: "Company code deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting company code:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/company-code/:id/deactivate - Deactivate a company code (soft delete)
export async function deactivateCompanyCode(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if company code exists
    const existingResult = await db.execute(sql`SELECT * FROM company_codes WHERE id = ${id}`);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Company code not found" });
    }

    const existingCompanyCode = existingResult.rows[0];

    // Deactivate company code
    const updateResult = await db.execute(sql`
      UPDATE company_codes 
      SET active = false, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    const deactivatedCompanyCode = updateResult.rows[0];

    // Sync deactivation to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('company_codes', deactivatedCompanyCode.id.toString(), 'UPDATE', deactivatedCompanyCode);
      console.log(`✅ Company code ${deactivatedCompanyCode.code} deactivation synced to OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync company code ${deactivatedCompanyCode.code} deactivation to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    return res.status(200).json({
      message: "Company code deactivated successfully",
      companyCode: deactivatedCompanyCode
    });
  } catch (error: any) {
    console.error("Error deactivating company code:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/company-code/bulk-import - Bulk import company codes
export async function bulkImportCompanyCodes(req: Request, res: Response) {
  try {
    const { companyCodes } = req.body;

    if (!Array.isArray(companyCodes)) {
      return res.status(400).json({ error: "Invalid input", message: "companyCodes must be an array" });
    }

    const results = [];
    const errors = [];

    for (const companyCodeData of companyCodes) {
      try {
        const validation = companyCodeSchema.safeParse(companyCodeData);

        if (!validation.success) {
          errors.push({
            data: companyCodeData,
            error: validation.error.errors.map(e => e.message).join(", ")
          });
          continue;
        }

        const data = validation.data;

        // Check if company code already exists
        const existingResult = await db.execute(sql`SELECT id FROM company_codes WHERE code = ${data.code}`);

        if (existingResult.rows.length > 0) {
          errors.push({
            data: companyCodeData,
            error: "Company code already exists"
          });
          continue;
        }

        // Create company code
        const insertResult = await db.execute(sql`
          INSERT INTO company_codes (code, name, city, country, currency, language, active, created_at, updated_at)
          VALUES (${data.code}, ${data.name}, ${data.city || null}, ${data.country}, ${data.currency}, ${data.language || null}, ${data.active}, NOW(), NOW())
          RETURNING *
        `);

        const newCompanyCode = insertResult.rows[0];

        // Sync to OneProject table
        try {
          await oneProjectSyncAgent.syncBusinessToOneProject('company_codes', newCompanyCode.id.toString(), 'INSERT', newCompanyCode);
        } catch (syncError) {
          console.error(`❌ Failed to sync company code ${newCompanyCode.code} to OneProject:`, syncError);
        }

        results.push(newCompanyCode);
      } catch (error: any) {
        errors.push({
          data: companyCodeData,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: `Bulk import completed. ${results.length} created, ${errors.length} failed.`,
      created: results,
      errors: errors
    });
  } catch (error: any) {
    console.error("Error in bulk import:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}
