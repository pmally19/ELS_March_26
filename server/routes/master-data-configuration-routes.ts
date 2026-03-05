import { Request, Response, Router } from "express";
import { masterDataConfigurationService } from "../services/master-data-configuration-service";
import { z } from "zod";
import { db } from "../db";
import {
  chartOfAccounts,
  fiscalYearVariants,
  globalCompanyCodes
} from "@shared/schema";
import { creditControlAreas } from "@shared/organizational-schema";
import { fiscalPeriods } from "@shared/financial-schema";
import { eq, sql } from "drizzle-orm";
import { pool } from "../db";

const router = Router();

// Ensure chart_of_accounts exists with required columns for GET to work
async function ensureChartOfAccountsTable(): Promise<void> {
  try {
    const result = await pool.query("SELECT to_regclass('public.chart_of_accounts') as exists");
    const exists = result.rows[0]?.exists !== null;
    if (exists) return;
  } catch {
    // proceed to create
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      language TEXT NOT NULL DEFAULT 'EN',
      country_code TEXT NOT NULL DEFAULT 'US',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
}

// Ensure vat_registrations exists with required columns for VAT endpoints
async function ensureVatRegistrationsTable(): Promise<void> {
  try {
    const result = await pool.query("SELECT to_regclass('public.vat_registrations') as exists");
    const exists = result.rows[0]?.exists !== null;
    if (exists) return;
  } catch {
    // proceed to create
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.vat_registrations (
      id SERIAL PRIMARY KEY,
      registration_key VARCHAR(20) NOT NULL,
      company_code_id INTEGER NULL,
      country VARCHAR(3) NOT NULL,
      vat_number VARCHAR(50) NOT NULL,
      tax_type VARCHAR(20) NOT NULL DEFAULT 'VAT',
      valid_from DATE NOT NULL,
      valid_to DATE NULL,
      tax_office VARCHAR(100) NULL,
      tax_officer_name VARCHAR(100) NULL,
      exemption_certificate VARCHAR(50) NULL,
      active_status BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS vat_registrations_registration_key_key ON public.vat_registrations (registration_key);
    CREATE INDEX IF NOT EXISTS vat_registrations_company_idx ON public.vat_registrations (company_code_id);
    CREATE INDEX IF NOT EXISTS vat_registrations_country_idx ON public.vat_registrations (country);
  `);
}

// Chart of Accounts Routes
router.get("/chart-of-accounts", async (req: Request, res: Response) => {
  try {
    // Query only required fields
    const result = await pool.query(`
      SELECT 
        coa.id,
        coa.chart_id,
        coa.description,
        coa.language,
        coa.account_length,
        coa.controlling_integration,
        coa.group_chart_id,
        coa.active,
        coa.manual_creation_allowed,
        coa.maintenance_language,
        coa.created_at,
        coa.updated_at,
        coa.created_by,
        coa.updated_by,
        coa."_tenantId" as "tenantId",
        grp.chart_id as group_chart_id_code,
        grp.description as group_chart_description
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts grp ON coa.group_chart_id = grp.id
      ORDER BY coa.chart_id, coa.description
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

router.get("/chart-of-accounts/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await pool.query(`
      SELECT 
        coa.id,
        coa.chart_id,
        coa.description,
        coa.language,
        coa.account_length,
        coa.controlling_integration,
        coa.group_chart_id,
        coa.active,
        coa.manual_creation_allowed,
        coa.maintenance_language,
        coa.created_at,
        coa.updated_at,
        coa.created_by,
        coa.updated_by,
        coa."_tenantId" as "tenantId",
        grp.chart_id as group_chart_id_code,
        grp.description as group_chart_description
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts grp ON coa.group_chart_id = grp.id
      WHERE coa.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chart of accounts not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching chart of accounts by ID:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

router.post("/chart-of-accounts", async (req: Request, res: Response) => {
  try {
    console.log('📦 [POST /chart-of-accounts] Request body type:', typeof req.body);
    console.log('📦 [POST /chart-of-accounts] Request body:', JSON.stringify(req.body));

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
        console.log('✅ [POST /chart-of-accounts] Parsed string body as JSON');
      } catch (e) {
        console.error('❌ [POST /chart-of-accounts] Failed to parse string body:', e);
      }
    }

    const {
      chartKey,
      chart_id,
      description,
      language,
      account_length,
      controlling_integration,
      group_chart_id,
      blockIndicator,
      active,
      manual_creation_allowed,
      maintenance_language
    } = body;

    // Map to database field names
    const chartId = chartKey || chart_id;
    const chartDescription = description;
    const defaultLanguage = language;
    const accountLength = account_length;
    const controllingIntegration = controlling_integration !== undefined ? controlling_integration : false;
    const groupChartId = group_chart_id;
    const isActive = blockIndicator !== undefined ? !blockIndicator : (active !== undefined ? active : true);
    const manualCreationAllowed = manual_creation_allowed !== undefined ? manual_creation_allowed : true;
    const maintenanceLanguage = maintenance_language;

    // Validate required fields
    if (!chartKey && !chart_id) {
      return res.status(400).json({ error: 'Chart of Accounts ID is required' });
    }

    if (!chartDescription) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Check if chart_id already exists
    const existingCheck = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE chart_id = $1',
      [chartId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Chart of accounts with this ID already exists' });
    }

    const userId = (req as any).user?.id || 1;
    const tenantId = (req as any).user?.tenantId || '001';

    // Insert into database with only required fields
    const result = await pool.query(`
      INSERT INTO chart_of_accounts (
        chart_id,
        description,
        language,
        account_length,
        controlling_integration,
        group_chart_id,
        active,
        manual_creation_allowed,
        maintenance_language,
        created_by,
        updated_by,
        "_tenantId",
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      chartId,
      chartDescription,
      defaultLanguage || null,
      accountLength || null,
      controllingIntegration,
      groupChartId || null,
      isActive,
      manualCreationAllowed,
      maintenanceLanguage || null,
      userId,
      userId,
      tenantId
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating chart of accounts:', error);

    if (error.code === '23505') {
      res.status(409).json({ error: 'Chart of accounts with this ID already exists' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference (group chart)' });
    } else {
      res.status(500).json({ error: 'Failed to create chart of accounts', message: error.message });
    }
  }
});

router.put("/chart-of-accounts/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    console.log(`📦 [PUT /chart-of-accounts/${id}] Request body type:`, typeof req.body);
    console.log(`📦 [PUT /chart-of-accounts/${id}] Request body:`, JSON.stringify(req.body));

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
        console.log(`✅ [PUT /chart-of-accounts/${id}] Parsed string body as JSON`);
      } catch (e) {
        console.error(`❌ [PUT /chart-of-accounts/${id}] Failed to parse string body:`, e);
      }
    }

    const {
      chartKey,
      chart_id,
      description,
      language,
      account_length,
      controlling_integration,
      group_chart_id,
      blockIndicator,
      active,
      manual_creation_allowed,
      maintenance_language
    } = body;

    // Map to database field names
    const chartId = chartKey || chart_id;
    const chartDescription = description;
    const defaultLanguage = language;
    const accountLength = account_length;
    const controllingIntegration = controlling_integration !== undefined ? controlling_integration : false;
    const groupChartId = group_chart_id;
    const isActive = blockIndicator !== undefined ? !blockIndicator : (active !== undefined ? active : true);
    const manualCreationAllowed = manual_creation_allowed !== undefined ? manual_creation_allowed : true;
    const maintenanceLanguage = maintenance_language;

    // Validate required fields
    if (!chartKey && !chart_id) {
      return res.status(400).json({ error: 'Chart of Accounts ID is required' });
    }

    if (!chartDescription) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Check if chart exists
    const existingCheck = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chart of accounts not found' });
    }

    // Check if chart_id is being changed and if the new one already exists
    if (chartId) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM chart_of_accounts WHERE chart_id = $1 AND id != $2',
        [chartId, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Chart of accounts with this ID already exists' });
      }
    }

    const userId = (req as any).user?.id || 1;

    // Update in database
    const result = await pool.query(`
      UPDATE chart_of_accounts SET
        chart_id = $1,
        description = $2,
        language = $3,
        account_length = $4,
        controlling_integration = $5,
        group_chart_id = $6,
        active = $7,
        manual_creation_allowed = $8,
        maintenance_language = $9,
        updated_by = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      chartId,
      chartDescription,
      defaultLanguage || null,
      accountLength || null,
      controllingIntegration,
      groupChartId || null,
      isActive,
      manualCreationAllowed,
      maintenanceLanguage || null,
      userId,
      id
    ]);

    // Fetch updated record with group chart info and audit fields
    const updatedResult = await pool.query(`
      SELECT 
        coa.id, coa.chart_id, coa.description, coa.language,
        coa.account_length, coa.controlling_integration, coa.group_chart_id,
        coa.active, coa.manual_creation_allowed, coa.maintenance_language,
        coa.created_at, coa.updated_at,
        coa.created_by, coa.updated_by,
        coa."_tenantId" as "tenantId",
        grp.chart_id as group_chart_id_code,
        grp.description as group_chart_description
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts grp ON coa.group_chart_id = grp.id
      WHERE coa.id = $1
    `, [id]);

    res.json(updatedResult.rows[0]);
  } catch (error: any) {
    console.error('Error updating chart of accounts:', error);

    if (error.code === '23505') {
      res.status(409).json({ error: 'Chart of accounts with this ID already exists' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference (group chart)' });
    } else {
      res.status(500).json({ error: 'Failed to update chart of accounts', message: error.message });
    }
  }
});

router.delete("/chart-of-accounts/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if the chart exists and if it's referenced by other charts
    const existingCheck = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chart of accounts not found' });
    }

    // Check if this chart is referenced by other charts (consolidation or group)
    const referenceCheck = await pool.query(
      `SELECT COUNT(*) as count FROM chart_of_accounts 
       WHERE consolidation_chart_id = $1 OR group_chart_id = $1`,
      [id]
    );

    if (parseInt(referenceCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete chart of accounts. It is referenced by other charts as consolidation or group chart.'
      });
    }

    // Check if GL accounts are using this chart
    const glAccountsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM gl_accounts WHERE chart_of_accounts_id = $1',
      [id]
    );

    if (parseInt(glAccountsCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete chart of accounts. It is assigned to GL accounts.'
      });
    }

    // Check if this chart is used as a group chart by other charts
    const usedAsGroupCheck = await pool.query(
      'SELECT COUNT(*) as count FROM chart_of_accounts WHERE group_chart_id = $1',
      [id]
    );

    if (parseInt(usedAsGroupCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete chart of accounts. It is referenced as a group chart by other charts.'
      });
    }

    await pool.query('DELETE FROM chart_of_accounts WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting chart of accounts:', error);
    if (error.code === '23503') {
      res.status(409).json({ error: 'Cannot delete chart of accounts. It is referenced by other records.' });
    } else {
      res.status(500).json({ error: 'Failed to delete chart of accounts', message: error.message });
    }
  }
});

// Credit Control Areas Routes
router.get("/credit-control-areas", async (req: Request, res: Response) => {
  try {
    const areas = await db.select().from(creditControlAreas);
    res.json(areas);
  } catch (error) {
    console.error('Error fetching credit control areas:', error);
    res.status(500).json({ error: 'Failed to fetch credit control areas' });
  }
});

router.post("/credit-control-areas", async (req: Request, res: Response) => {
  try {
    const [area] = await db.insert(creditControlAreas).values(req.body).returning();
    res.status(201).json(area);
  } catch (error) {
    console.error('Error creating credit control area:', error);
    res.status(500).json({ error: 'Failed to create credit control area' });
  }
});

router.put("/credit-control-areas/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [area] = await db.update(creditControlAreas).set(req.body).where(eq(creditControlAreas.id, id)).returning();
    res.json(area);
  } catch (error) {
    console.error('Error updating credit control area:', error);
    res.status(500).json({ error: 'Failed to update credit control area' });
  }
});

router.delete("/credit-control-areas/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(creditControlAreas).where(eq(creditControlAreas.id, id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting credit control area:', error);
    res.status(500).json({ error: 'Failed to delete credit control area' });
  }
});

// Fiscal Calendars Routes - Get fiscal periods with year and period information
router.get("/fiscal-calendars", async (req: Request, res: Response) => {
  try {
    console.log('📋 [GET /fiscal-calendars] Fetching fiscal calendars...');
    // Get fiscal periods grouped by year, showing period information
    const result = await pool.query(`
      SELECT 
        year as id,
        year,
        'Fiscal Year ' || year::text || ' (Periods: ' || 
        STRING_AGG(DISTINCT period::text, ', ' ORDER BY period::text) || ')' as name,
        COUNT(DISTINCT period) as period_count,
        STRING_AGG(DISTINCT period::text, ', ' ORDER BY period::text) as periods
      FROM fiscal_periods
      GROUP BY year
      ORDER BY year DESC
    `);

    // Always return an array, even if empty
    const calendars = result.rows || [];
    console.log('✅ [GET /fiscal-calendars] Successfully fetched:', calendars.length, 'calendars');
    res.json(calendars);
  } catch (error: any) {
    console.error('❌ [GET /fiscal-calendars] Error fetching fiscal calendars:', error);
    // Return empty array on error to prevent JSON parsing issues
    res.status(500).json({
      message: 'Failed to fetch fiscal calendars',
      error: error.message,
    });
  }
});

// Fiscal Year Variants Routes - MOVED TO server/routes/master-data/fiscal-year-variants.ts
// These routes are now handled by the dedicated fiscal-year-variants router
// Commented out to avoid conflicts with the dedicated route file
/*
router.get("/fiscal-year-variants", async (req: Request, res: Response) => {
  try {
    console.log('📋 [GET /fiscal-year-variants] Fetching fiscal year variants...');
    const variants = await db.select().from(fiscalYearVariants);
    console.log('✅ [GET /fiscal-year-variants] Successfully fetched:', variants.length, 'variants');
    res.json(variants);
  } catch (error: any) {
    console.error('❌ [GET /fiscal-year-variants] Error fetching fiscal year variants:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch fiscal year variants',
      error: error.message,
      details: error.toString()
    });
  }
});

router.get("/fiscal-year-variants/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const [variant] = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.id, id));
    
    if (!variant) {
      return res.status(404).json({ error: 'Fiscal year variant not found' });
    }
    
    res.json(variant);
  } catch (error) {
    console.error('Error fetching fiscal year variant by ID:', error);
    res.status(500).json({ error: 'Failed to fetch fiscal year variant' });
  }
});

router.post("/fiscal-year-variants", async (req: Request, res: Response) => {
  try {
    // Validate required fields
    const { variant_id, description, posting_periods, special_periods, year_shift, fiscal_calendar_id, active } = req.body;
    
    if (!variant_id || !description) {
      return res.status(400).json({ error: 'Variant ID and description are required' });
    }
    
    // Validate variant_id format (should be 1-10 characters)
    if (variant_id.length < 1 || variant_id.length > 10) {
      return res.status(400).json({ error: 'Variant ID must be between 1 and 10 characters' });
    }
    
    // Validate posting_periods (1-16)
    if (posting_periods && (posting_periods < 1 || posting_periods > 16)) {
      return res.status(400).json({ error: 'Posting periods must be between 1 and 16' });
    }
    
    // Validate special_periods (0-4)
    if (special_periods && (special_periods < 0 || special_periods > 4)) {
      return res.status(400).json({ error: 'Special periods must be between 0 and 4' });
    }
    
    // Validate year_shift (-1 to 1)
    if (year_shift && (year_shift < -1 || year_shift > 1)) {
      return res.status(400).json({ error: 'Year shift must be between -1 and 1' });
    }
    
    // Check if variant_id already exists
    const existingVariant = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.variant_id, variant_id));
    if (existingVariant.length > 0) {
      return res.status(409).json({ error: 'Fiscal year variant with this ID already exists' });
    }
    
    // Prepare data with defaults
    const variantData: any = {
      variant_id,
      description,
      posting_periods: posting_periods || 12,
      special_periods: special_periods || 0,
      year_shift: year_shift || 0,
      active: active !== undefined ? active : true
    };
    
    // Add fiscal_calendar_id if provided
    if (fiscal_calendar_id !== undefined && fiscal_calendar_id !== null) {
      variantData.fiscal_calendar_id = fiscal_calendar_id;
    }
    
    const [variant] = await db.insert(fiscalYearVariants).values(variantData).returning();
    res.status(201).json(variant);
  } catch (error) {
    console.error('Error creating fiscal year variant:', error);
    
    // Handle specific database errors
    if (error.code === '23505') {
      if (error.constraint === 'fiscal_year_variants_variant_id_key') {
        res.status(409).json({ error: 'Fiscal year variant with this ID already exists' });
      } else {
        res.status(409).json({ error: 'Duplicate entry detected' });
      }
    } else {
      res.status(500).json({ error: 'Failed to create fiscal year variant' });
    }
  }
});

router.put("/fiscal-year-variants/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if the variant exists first
    const [existingVariant] = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.id, id));
    
    if (!existingVariant) {
      return res.status(404).json({ error: 'Fiscal year variant not found' });
    }
    
    // Validate fields if provided
    const { variant_id, description, posting_periods, special_periods, year_shift, fiscal_calendar_id, active } = req.body;
    
    if (variant_id && (variant_id.length < 1 || variant_id.length > 10)) {
      return res.status(400).json({ error: 'Variant ID must be between 1 and 10 characters' });
    }
    
    if (posting_periods && (posting_periods < 1 || posting_periods > 16)) {
      return res.status(400).json({ error: 'Posting periods must be between 1 and 16' });
    }
    
    if (special_periods && (special_periods < 0 || special_periods > 4)) {
      return res.status(400).json({ error: 'Special periods must be between 0 and 4' });
    }
    
    if (year_shift && (year_shift < -1 || year_shift > 1)) {
      return res.status(400).json({ error: 'Year shift must be between -1 and 1' });
    }
    
    // Check if variant_id already exists (if being changed)
    if (variant_id && variant_id !== existingVariant.variant_id) {
      const existingVariantWithId = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.variant_id, variant_id));
      if (existingVariantWithId.length > 0) {
        return res.status(409).json({ error: 'Fiscal year variant with this ID already exists' });
      }
    }
    
    // Prepare update data
    const updateData: any = {
      ...(variant_id && { variant_id }),
      ...(description && { description }),
      ...(posting_periods !== undefined && { posting_periods }),
      ...(special_periods !== undefined && { special_periods }),
      ...(year_shift !== undefined && { year_shift }),
      ...(active !== undefined && { active }),
      updated_at: new Date()
    };
    
    // Add fiscal_calendar_id if provided
    if (fiscal_calendar_id !== undefined) {
      updateData.fiscal_calendar_id = fiscal_calendar_id;
    }
    
    const [variant] = await db.update(fiscalYearVariants)
      .set(updateData)
      .where(eq(fiscalYearVariants.id, id))
      .returning();
    
    res.json(variant);
  } catch (error) {
    console.error('Error updating fiscal year variant:', error);
    
    if (error.code === '23505') {
      if (error.constraint === 'fiscal_year_variants_variant_id_key') {
        res.status(409).json({ error: 'Fiscal year variant with this ID already exists' });
      } else {
        res.status(409).json({ error: 'Duplicate entry detected' });
      }
    } else {
      res.status(500).json({ error: 'Failed to update fiscal year variant' });
    }
  }
});

router.patch("/fiscal-year-variants/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if the variant exists first
    const [existingVariant] = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.id, id));
    
    if (!existingVariant) {
      return res.status(404).json({ error: 'Fiscal year variant not found' });
    }
    
    // Validate fields if provided
    const { variant_id, description, posting_periods, special_periods, year_shift, fiscal_calendar_id, active } = req.body;
    
    if (variant_id && (variant_id.length < 1 || variant_id.length > 10)) {
      return res.status(400).json({ error: 'Variant ID must be between 1 and 10 characters' });
    }
    
    if (posting_periods && (posting_periods < 1 || posting_periods > 16)) {
      return res.status(400).json({ error: 'Posting periods must be between 1 and 16' });
    }
    
    if (special_periods && (special_periods < 0 || special_periods > 4)) {
      return res.status(400).json({ error: 'Special periods must be between 0 and 4' });
    }
    
    if (year_shift && (year_shift < -1 || year_shift > 1)) {
      return res.status(400).json({ error: 'Year shift must be between -1 and 1' });
    }
    
    // Check if variant_id already exists (if being changed)
    if (variant_id && variant_id !== existingVariant.variant_id) {
      const existingVariantWithId = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.variant_id, variant_id));
      if (existingVariantWithId.length > 0) {
        return res.status(409).json({ error: 'Fiscal year variant with this ID already exists' });
      }
    }
    
    // Prepare update data (only include provided fields)
    const updateData: any = {
      ...(variant_id && { variant_id }),
      ...(description && { description }),
      ...(posting_periods !== undefined && { posting_periods }),
      ...(special_periods !== undefined && { special_periods }),
      ...(year_shift !== undefined && { year_shift }),
      ...(active !== undefined && { active }),
      updated_at: new Date()
    };
    
    // Add fiscal_calendar_id if provided
    if (fiscal_calendar_id !== undefined) {
      updateData.fiscal_calendar_id = fiscal_calendar_id;
    }
    
    const [variant] = await db.update(fiscalYearVariants)
      .set(updateData)
      .where(eq(fiscalYearVariants.id, id))
      .returning();
    
    res.json(variant);
  } catch (error) {
    console.error('Error updating fiscal year variant:', error);
    
    if (error.code === '23505') {
      if (error.constraint === 'fiscal_year_variants_variant_id_key') {
        res.status(409).json({ error: 'Fiscal year variant with this ID already exists' });
      } else {
        res.status(409).json({ error: 'Duplicate entry detected' });
      }
    } else {
      res.status(500).json({ error: 'Failed to update fiscal year variant' });
    }
  }
});

router.delete("/fiscal-year-variants/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if the variant exists first
    const [existingVariant] = await db.select().from(fiscalYearVariants).where(eq(fiscalYearVariants.id, id));
    
    if (!existingVariant) {
      return res.status(404).json({ error: 'Fiscal year variant not found' });
    }
    
    await db.delete(fiscalYearVariants).where(eq(fiscalYearVariants.id, id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting fiscal year variant:', error);
    res.status(500).json({ error: 'Failed to delete fiscal year variant' });
  }
});
*/

// Global Company Codes Routes
router.get("/global-company-codes", async (req: Request, res: Response) => {
  try {
    const codes = await db.select().from(globalCompanyCodes);
    res.json(codes);
  } catch (error) {
    console.error('Error fetching global company codes:', error);
    res.status(500).json({ error: 'Failed to fetch global company codes' });
  }
});

router.post("/global-company-codes", async (req: Request, res: Response) => {
  try {
    const [code] = await db.insert(globalCompanyCodes).values(req.body).returning();
    res.status(201).json(code);
  } catch (error) {
    console.error('Error creating global company code:', error);
    res.status(500).json({ error: 'Failed to create global company code' });
  }
});

router.put("/global-company-codes/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [code] = await db.update(globalCompanyCodes).set(req.body).where(eq(globalCompanyCodes.id, id)).returning();
    res.json(code);
  } catch (error) {
    console.error('Error updating global company code:', error);
    res.status(500).json({ error: 'Failed to update global company code' });
  }
});

router.delete("/global-company-codes/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(globalCompanyCodes).where(eq(globalCompanyCodes.id, id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting global company code:', error);
    res.status(500).json({ error: 'Failed to delete global company code' });
  }
});

// VAT Registration Numbers Routes
// VAT Registration Numbers Routes (use raw SQL aligned to public.vat_registrations)
router.get("/vat-registration", async (req: Request, res: Response) => {
  try {
    await ensureVatRegistrationsTable();

    const result = await pool.query(`
      SELECT id, registration_key, company_code_id, country, vat_number, tax_type, valid_from, valid_to, 
             tax_office, tax_officer_name, exemption_certificate, active_status, created_at, updated_at,
             created_by, updated_by, "_deletedAt", "_tenantId" as tenant_id
      FROM public.vat_registrations
      WHERE "_deletedAt" IS NULL
      ORDER BY id DESC
    `);
    const mapped = result.rows.map((r: any) => ({
      id: r.id,
      registrationKey: r.registration_key,
      companyCodeId: r.company_code_id,
      country: r.country,
      vatNumber: r.vat_number,
      taxType: r.tax_type,
      validFrom: r.valid_from,
      validTo: r.valid_to,
      taxOffice: r.tax_office,
      taxOfficerName: r.tax_officer_name,
      exemptionCertificate: r.exemption_certificate,
      activeStatus: r.active_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      deletedAt: r._deletedAt,
      tenantId: r.tenant_id,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching VAT registrations:', error);
    res.status(500).json({ error: 'Failed to fetch VAT registrations' });
  }
});

router.post("/vat-registration", async (req: Request, res: Response) => {
  try {
    await ensureVatRegistrationsTable();
    const body = req.body || {};
    const registration_key = body.registrationKey ?? body.registration_key;
    const raw_company_code_id = body.companyCodeId ?? body.company_code_id;
    const company_code_id = raw_company_code_id === '' || raw_company_code_id === null || raw_company_code_id === undefined
      ? null
      : Number(raw_company_code_id);
    const country = (body.country ?? '').toString().trim();
    const vat_number = (body.vatNumber ?? body.vat_number ?? '').toString().trim();
    const tax_type = body.taxType ?? body.tax_type ?? 'VAT';
    const valid_from = body.validFrom ?? body.valid_from;
    const valid_to_raw = body.validTo ?? body.valid_to;
    const valid_to = valid_to_raw === '' || valid_to_raw === undefined ? null : valid_to_raw;
    const tax_office_raw = body.taxOffice ?? body.tax_office;
    const tax_office = tax_office_raw === '' || tax_office_raw === undefined ? null : tax_office_raw;
    const tax_officer_name_raw = body.taxOfficerName ?? body.tax_officer_name;
    const tax_officer_name = tax_officer_name_raw === '' || tax_officer_name_raw === undefined ? null : tax_officer_name_raw;
    const exemption_certificate_raw = body.exemptionCertificate ?? body.exemption_certificate;
    const exemption_certificate = exemption_certificate_raw === '' || exemption_certificate_raw === undefined ? null : exemption_certificate_raw;
    const active_status = body.activeStatus ?? body.active_status ?? true;

    // validate required
    const missing: string[] = [];
    if (!registration_key) missing.push('registrationKey');
    if (!country) missing.push('country');
    if (!vat_number) missing.push('vatNumber');
    if (!valid_from) missing.push('validFrom');
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });

    // optional: validate company code exists
    let companyIdToUse: number | null = null;
    if (company_code_id !== null && !Number.isNaN(company_code_id)) {
      const cc = await pool.query('SELECT id FROM public.company_codes WHERE id=$1', [company_code_id]);
      if (cc.rowCount) companyIdToUse = company_code_id;
    }

    const result = await pool.query(
      `INSERT INTO public.vat_registrations 
       (registration_key, company_code_id, country, vat_number, tax_type, valid_from, valid_to, tax_office, tax_officer_name, exemption_certificate, active_status, created_by, updated_by, "_tenantId", created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       RETURNING id, registration_key, company_code_id, country, vat_number, tax_type, valid_from, valid_to, 
                 tax_office, tax_officer_name, exemption_certificate, active_status, created_at, updated_at,
                 created_by, updated_by, "_deletedAt", "_tenantId" as tenant_id`,
      [registration_key, companyIdToUse, country, vat_number, tax_type, valid_from, valid_to, tax_office, tax_officer_name, exemption_certificate, !!active_status, (req as any).user?.id || 1, (req as any).user?.id || 1, (req as any).user?.tenantId || '001']
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      registrationKey: r.registration_key,
      companyCodeId: r.company_code_id,
      country: r.country,
      vatNumber: r.vat_number,
      taxType: r.tax_type,
      validFrom: r.valid_from,
      validTo: r.valid_to,
      taxOffice: r.tax_office,
      taxOfficerName: r.tax_officer_name,
      exemptionCertificate: r.exemption_certificate,
      activeStatus: r.active_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      tenantId: r.tenant_id,
    });
  } catch (error) {
    console.error('Error creating VAT registration:', error);
    const msg = (error as any)?.message || String(error);
    if (/duplicate|unique|constraint/i.test(msg)) {
      return res.status(409).json({ error: 'Duplicate VAT registration', details: msg });
    }
    if (/invalid input syntax for type date/i.test(msg)) {
      return res.status(400).json({ error: 'Invalid date value', details: msg });
    }
    res.status(500).json({ error: 'Failed to create VAT registration' });
  }
});

router.put("/vat-registration/:id", async (req: Request, res: Response) => {
  try {
    await ensureVatRegistrationsTable();
    const id = Number(req.params.id);
    const body = req.body || {};
    const registration_key = body.registrationKey ?? body.registration_key;
    const raw_company_code_id = body.companyCodeId ?? body.company_code_id;
    const company_code_id = raw_company_code_id === '' || raw_company_code_id === null || raw_company_code_id === undefined
      ? null
      : Number(raw_company_code_id);
    const country = body.country;
    const vat_number = (body.vatNumber ?? body.vat_number ?? '').toString().trim();
    const tax_type = body.taxType ?? body.tax_type;
    const valid_from = body.validFrom ?? body.valid_from;
    const valid_to_raw = body.validTo ?? body.valid_to;
    const valid_to = valid_to_raw === '' ? null : valid_to_raw;
    const tax_office_raw = body.taxOffice ?? body.tax_office;
    const tax_office = tax_office_raw === '' ? null : tax_office_raw;
    const tax_officer_name_raw = body.taxOfficerName ?? body.tax_officer_name;
    const tax_officer_name = tax_officer_name_raw === '' ? null : tax_officer_name_raw;
    const exemption_certificate_raw = body.exemptionCertificate ?? body.exemption_certificate;
    const exemption_certificate = exemption_certificate_raw === '' ? null : exemption_certificate_raw;
    const active_status = body.activeStatus ?? body.active_status;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (registration_key !== undefined) { fields.push(`registration_key = $${idx++}`); values.push(registration_key); }
    if (company_code_id !== undefined) { fields.push(`company_code_id = $${idx++}`); values.push(company_code_id); }
    if (country !== undefined) { fields.push(`country = $${idx++}`); values.push(country); }
    if (vat_number !== undefined) { fields.push(`vat_number = $${idx++}`); values.push(vat_number); }
    if (tax_type !== undefined) { fields.push(`tax_type = $${idx++}`); values.push(tax_type); }
    if (valid_from !== undefined) { fields.push(`valid_from = $${idx++}`); values.push(valid_from); }
    if (valid_to !== undefined) { fields.push(`valid_to = $${idx++}`); values.push(valid_to); }
    if (tax_office !== undefined) { fields.push(`tax_office = $${idx++}`); values.push(tax_office); }
    if (tax_officer_name !== undefined) { fields.push(`tax_officer_name = $${idx++}`); values.push(tax_officer_name); }
    if (exemption_certificate !== undefined) { fields.push(`exemption_certificate = $${idx++}`); values.push(exemption_certificate); }
    if (active_status !== undefined) { fields.push(`active_status = $${idx++}`); values.push(!!active_status); }
    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${idx++}`); values.push((req as any).user?.id || 1);

    if (fields.length <= 2) return res.status(400).json({ error: 'No valid fields to update' });

    const result = await pool.query(
      `UPDATE public.vat_registrations SET ${fields.join(', ')} WHERE id = $${idx} AND "_deletedAt" IS NULL 
       RETURNING id, registration_key, company_code_id, country, vat_number, tax_type, valid_from, valid_to, 
                 tax_office, tax_officer_name, exemption_certificate, active_status, created_at, updated_at,
                 created_by, updated_by, "_deletedAt", "_tenantId" as tenant_id`,
      [...values, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'VAT registration not found' });
    const r = result.rows[0];
    res.json({
      id: r.id,
      registrationKey: r.registration_key,
      companyCodeId: r.company_code_id,
      country: r.country,
      vatNumber: r.vat_number,
      taxType: r.tax_type,
      validFrom: r.valid_from,
      validTo: r.valid_to,
      taxOffice: r.tax_office,
      taxOfficerName: r.tax_officer_name,
      exemptionCertificate: r.exemption_certificate,
      activeStatus: r.active_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      tenantId: r.tenant_id,
    });
  } catch (error) {
    console.error('Error updating VAT registration:', error);
    res.status(500).json({ error: 'Failed to update VAT registration' });
  }
});

router.delete("/vat-registration/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await pool.query('SELECT id FROM public.vat_registrations WHERE id = $1 AND "_deletedAt" IS NULL', [id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'VAT registration not found' });

    await pool.query('UPDATE public.vat_registrations SET "_deletedAt" = NOW(), updated_by = $2 WHERE id = $1', [id, (req as any).user?.id || 1]);
    res.status(200).json({ message: 'VAT registration deleted successfully' });
  } catch (error) {
    console.error('Error deleting VAT registration:', error);
    res.status(500).json({ error: 'Failed to delete VAT registration' });
  }
});

// Initialize Complete Master Data Configuration
router.post("/initialize-complete", async (req: Request, res: Response) => {
  try {
    const result = await masterDataConfigurationService.initializeCompleteConfiguration();

    res.json({
      success: result.success,
      message: result.success ? "Complete master data configuration initialized successfully" : "Configuration initialization had errors",
      componentsInitialized: result.componentsInitialized,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Master data configuration error:", error);
    res.status(500).json({
      success: false,
      message: "Master data configuration initialization failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get Configuration Status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = await masterDataConfigurationService.getConfigurationStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Configuration status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get configuration status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;