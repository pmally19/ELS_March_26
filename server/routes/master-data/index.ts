import { Express, Request, Response } from "express";
import * as purchaseReferences from "./purchase-references";
import * as creditControl from "./credit-control";
import * as approvalLevel from "./approval-level";
import * as plant from "./plant";
import * as sdDocumentTypes from "./sd-document-types";
import * as documentTypes from "./document-types";
import * as batchClasses from "./batch-classes";
import * as companyCode from "./company-code";
import * as storageLocation from "./storage-location";
import * as supplyTypes from "./supply-types";
import * as purchasingGroups from "./purchasing-groups";
import vendorGroupsRouter from "./vendor-groups";
import customerGroupsRouter from "./customer-groups";
import customerTypesRouter from "./customer-types";
import countriesRouter from "./countries";
import statesRouter from "./states";
import regionsRouter from "./regions";
import accountGroupsRouter from "./account-groups";
import reconciliationAccountsRouter from "./reconciliation-accounts";
import customerRouter from "./customer";
import { taxConfigurationRouter } from "./tax-configuration";
import { toleranceGroupsRouter } from "./tolerance-groups";
import { toleranceGroups as toleranceGroupsSchema } from "@shared/tolerance-groups-schema";
import currencyDenominationRouter from "./currency-denomination";
import exchangeRateTypeRouter from "./exchange-rate-type";
import * as supplyTypesFixed from "./supply-types-fixed";
import * as materialGroups from "./material-groups";
import * as documentCategories from "./document-categories";
import * as salesDocumentCategories from "./sales-document-categories";
import * as accountTypes from "./account-types";
import * as distributionChannelsFixed from "./distribution-channels-fixed";
import * as divisionsFixed from "./divisions-fixed";
import * as salesAreasFixed from "./sales-areas-fixed";
import { pool } from "../../db";
import { db } from "../../db";
import { ensureActivePool } from "../../database";
import { discountGroups as discountGroupsTable } from "@shared/schema";
import profitCentersRouter from "./profit-centers";
import businessAreasRouter from "./business-areas";
import { registerProductionMasterDataRoutes } from "./production-ready";
import serialNumberProfilesRouter from "./serial-number-profiles";
import allMasterDataRoutes from "./all-master-data-routes";
import taxProfilesRouter from "./tax-profiles";
import taxRulesRouter from "./tax-rules";
import taxProceduresRouter from "./tax-procedures";
import taxAccountDeterminationRouter from "./tax-account-determination";
import taxClassificationsRouter from "./tax-classifications";
import taxCodesRouter from "./tax-codes";
import taxCalculationRouter from "./tax-calculation";
import taxJurisdictionsRouter from "./tax-jurisdictions";
import mrpControllersRouter from "./mrp-controllers";
import loadingGroupsRouter from "./loading-groups";
import shippingConditionKeysRouter from "./shipping-condition-keys";
import weightGroupsRouter from "./weight-groups";
import productionVersionsRouter from "./production-versions";
import productionOrderTypesRouter from "./production-order-types";
import industrySectorRouter from "./industry-sector-routes";
import paymentTermsRouter from "./payment-terms";
import itemCategoriesRouter from "./item-categories";
import conditionCategoriesRouter from "./condition-categories";
import conditionClassesRouter from "./condition-classes";
import calculationMethodsRouter from "./calculation-methods";
import itemCategoryGroupsRouter from "./item-category-groups";
import itemCategoryDeterminationRouter from "./item-category-determination";
import salesProcessTypesRouter from "./sales-process-types";
import materialRouter from "./material";
import * as customerAccountAssignmentGroups from "./customer-account-assignment-groups";
import * as materialAccountAssignmentGroups from "./material-account-assignment-groups";
import purchasingItemCategoriesRouter from './purchasing-item-categories';
import reasonCodesRouter from './reason-codes';
import transactionKeysRouter from './transaction-keys';
import postingKeysRouter from './posting-keys';
import fieldStatusVariantsRouter from './field-status-variants';
import fieldStatusGroupsRouter from './field-status-groups';
import taxCategoriesRouter from './tax-categories';
import routesMasterRouter from './routes-master';
import transportationGroupsRouter from './transportation-groups';
import shippingPointDeterminationRouter from './shipping-point-determination';
import taxConditionRecordsRouter from './tax-condition-records';
import sourceListsRouter from './source-lists';
import mrpConfigRouter from './mrp-config';




// Import the route handlers for master data tables
import { getSalesOrganization, createSalesOrganization, updateSalesOrganization, deleteSalesOrganization } from "./sales-organization";
import getPurchaseOrganization, { createPurchaseOrganization, updatePurchaseOrganization, deletePurchaseOrganization } from "./purchase-organization";
import getStorageLocation from "./storage-location";
import * as currency from "./currency";
import getUom from "./uom";
import * as uomConversions from "./uom-conversions";
import getFiscalPeriod, { createFiscalPeriod, updateFiscalPeriod, deleteFiscalPeriod } from "./fiscal-period";
import getMaterial from "./material";
import bomRouter from "./bom";
// Import functions will be replaced with direct route registration
import workCentersRoutes from "./work-centers";
import assetsRouter from "./assets";
import depreciationMethodsRouter from "./depreciation-methods";
import depreciationAreasRouter from "./depreciation-areas";
import assetClassesRouter from "./asset-classes";
import assetAccountDeterminationRouter from "./asset-account-determination";
import accountCategoriesRouter from "./account-categories";
import transactionTypesRouter from "./transaction-types";
import assetAccountProfilesRouter from "./asset-account-profiles";
import accountKeysRouter from "./account-keys";
import accountDeterminationMappingRouter, { getGLAccountsBySalesArea, getConditionTypesBySalesArea } from "./account-determination-mapping";
import bankMasterRouter from "./bank-master";
import accountIdRouter from "./account-id";
import glAccountsRouter from "./gl-accounts";
import glAccountAutoNumberRouter from "./gl-account-auto-number";
import glAccountGroupsRouter from "./gl-account-groups";
import postingPeriodControlsRouter from "./posting-period-controls";
import retainedEarningsAccountsRouter from "./retained-earnings-accounts";
import materialAccountDeterminationRouter from "./material-account-determination";
import chartOfDepreciationRouter from "./chart-of-depreciation";
import numberRangeObjectsRouter from "./number-range-objects";
import transportationZonesRouter from "./transportation-zones";
import routingRouter from "./routing";
import ledgersRouter from "./ledgers";
import documentSplittingRouter from "./document-splitting-routes";
import fiscalYearVariantsRouter from "./fiscal-year-variants";
import accountingPrinciplesRouter from "./accounting-principles";
import employeesRouter from "./employees";
import * as managementControlAreas from "./management-control-areas";
import controllingAreaAssignmentsRouter from "./controlling-area-assignments";
import costCenterCategoriesRouter from "./cost-center-categories";
import valuationGroupingCodesRouter from "./valuation-grouping-codes";
import * as accountCategoryReferences from "./account-category-references";

import customerPricingProceduresRouter from "./customer-pricing-procedures";
import documentPricingProceduresRouter from "./document-pricing-procedures";
import factoryCalendarRouter from "./factory-calendar";
import holidayCalendarRouter from "./holiday-calendar";
import * as shippingPoint from "./shipping-point";
import pricingProcedureDeterminationRoutes from "./pricing-procedure-determination";


export function registerMasterDataRoutes(app: Express) {
  // Register Customer Account Assignment Groups
  app.get("/api/master-data/customer-account-assignment-groups", customerAccountAssignmentGroups.getCustomerAccountAssignmentGroups);
  app.get("/api/master-data/customer-account-assignment-groups/:id", customerAccountAssignmentGroups.getCustomerAccountAssignmentGroupById);
  app.post("/api/master-data/customer-account-assignment-groups", customerAccountAssignmentGroups.createCustomerAccountAssignmentGroup);
  app.put("/api/master-data/customer-account-assignment-groups/:id", customerAccountAssignmentGroups.updateCustomerAccountAssignmentGroup);
  app.delete("/api/master-data/customer-account-assignment-groups/:id", customerAccountAssignmentGroups.deleteCustomerAccountAssignmentGroup);

  // Register Material Account Assignment Groups
  app.get("/api/master-data/material-account-assignment-groups", materialAccountAssignmentGroups.getMaterialAccountAssignmentGroups);
  app.get("/api/master-data/material-account-assignment-groups/:id", materialAccountAssignmentGroups.getMaterialAccountAssignmentGroupById);
  app.post("/api/master-data/material-account-assignment-groups", materialAccountAssignmentGroups.createMaterialAccountAssignmentGroup);
  app.put("/api/master-data/material-account-assignment-groups/:id", materialAccountAssignmentGroups.updateMaterialAccountAssignmentGroup);
  app.delete("/api/master-data/material-account-assignment-groups/:id", materialAccountAssignmentGroups.deleteMaterialAccountAssignmentGroup);


  // Register production master data routes (includes vendor-materials endpoints)
  registerProductionMasterDataRoutes(app);

  // Shipping Point Determination
  app.use("/api/master-data/shipping-point-determination", shippingPointDeterminationRouter);

  // Register material router (modular approach with Zod validation)
  app.use('/api/master-data/material', materialRouter);

  // Canonical helper for material UOMs: always uses `uom` table (FK target for materials.uom_id)
  const getOrCreateUomId = async (code: string, category: string): Promise<number> => {
    const cleanCode = (code || "").trim() || "PC";
    const cleanCategory = category || "Quantity";

    const result = await pool.query(
      `INSERT INTO uom (code, name, description, category, is_base, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, true, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           category = EXCLUDED.category
       RETURNING id`,
      [cleanCode, cleanCode, `${cleanCode} (auto-created)`, cleanCategory]
    );

    return result.rows[0].id;
  };

  // Mount critical dedicated routers BEFORE the aggregate router to ensure correct handlers
  app.use('/api/master-data/account-groups', accountGroupsRouter);
  app.use('/api/master-data/vendor-groups', vendorGroupsRouter);
  app.use('/api/master-data/customer-groups', customerGroupsRouter);
  app.use('/api/master-data/customer-types', customerTypesRouter);
  app.use('/api/master-data/countries', countriesRouter);
  app.use('/api/master-data/states', statesRouter);
  app.use('/api/master-data/regions', regionsRouter);
  app.use('/api/master-data/reconciliation-accounts', reconciliationAccountsRouter);
  app.use('/api/master-data/tax-configuration', taxConfigurationRouter);
  // Tax master (profiles, rules, and codes)
  app.use('/api/master-data/tax-profiles', taxProfilesRouter);
  app.use('/api/master-data/tax-rules', taxRulesRouter);
  app.use('/api/master-data/tax-codes', taxCodesRouter);
  app.use('/api/master-data/tax-categories', taxCategoriesRouter);
  app.use('/api/master-data/tax-calculation', taxCalculationRouter);
  app.use('/api/master-data/tax-jurisdictions', taxJurisdictionsRouter);
  app.use('/api/master-data/mrp-config', mrpConfigRouter);
  app.use('/api/master-data/tax-classifications', taxClassificationsRouter);
  app.use('/api/master-data/tax-procedures', taxProceduresRouter);
  app.use('/api/master-data/tax-account-determination', taxAccountDeterminationRouter);
  app.use('/api/master-data/tax-condition-records', taxConditionRecordsRouter);
  app.use('/api/master-data/tolerance-groups', toleranceGroupsRouter);
  app.use('/api/master-data/mrp-controllers', mrpControllersRouter);
  app.use('/api/master-data/routing', routingRouter);
  app.use('/api/master-data/production-versions', productionVersionsRouter);
  app.use('/api/master-data/production-versions', productionVersionsRouter);
  app.use('/api/master-data/production-order-types', productionOrderTypesRouter);

  // Register Reason Codes CRUD
  app.use('/api/master-data/reason-codes', reasonCodesRouter);

  // Register Industry Sector routes
  app.use('/api/master-data/industry-sector', industrySectorRouter);

  // Register Payment Terms routes
  app.use('/api/master-data/payment-terms', paymentTermsRouter);

  // Register Customer Pricing Procedures routes
  app.use('/api/master-data/customer-pricing-procedures', customerPricingProceduresRouter);

  // Register Loading Groups routes
  app.use('/api/master-data/loading-groups', loadingGroupsRouter);

  // Register Shipping Condition Keys routes
  app.use('/api/master-data/shipping-condition-keys', shippingConditionKeysRouter);

  // Register Weight Groups routes
  app.use('/api/master-data/weight-groups', weightGroupsRouter);

  app.use('/api/master-data/customer', customerRouter);

  // Register Document Pricing Procedures routes
  app.use('/api/master-data/document-pricing-procedures', documentPricingProceduresRouter);

  // Register Routes Master Data
  app.use('/api/master-data/routes', routesMasterRouter);

  // Register Transportation Groups routes
  app.use('/api/master-data/transportation-groups', transportationGroupsRouter);

  // Register Item Categories routes
  app.use('/api/master-data/item-categories', itemCategoriesRouter);

  // Register Condition Categories routes
  app.use('/api/master-data/condition-categories', conditionCategoriesRouter);

  // Register Condition Classes routes
  app.use('/api/master-data/condition-classes', conditionClassesRouter);



  // Register Calculation Methods routes
  app.use('/api/master-data/calculation-methods', calculationMethodsRouter);

  // Register Item Category Groups routes
  app.use('/api/master-data/item-category-groups', itemCategoryGroupsRouter);

  // Register Item Category Determination routes
  app.use('/api/master-data/item-category-determination', itemCategoryDeterminationRouter);

  // Register Sales Process Types routes
  app.use('/api/master-data/sales-process-types', salesProcessTypesRouter);

  // Register Material Account Determination routes
  app.use('/api/master-data/material-account-determination', materialAccountDeterminationRouter);

  // Register Factory Calendar routes (at /api level for /api/factory-calendars)
  app.use('/api', factoryCalendarRouter);

  // Register Holiday Calendar routes (at /api level for /api/holiday-calendars)
  app.use('/api', holidayCalendarRouter);

  // Fiscal Period routes MUST be registered before the aggregate router to avoid being shadowed
  app.get("/api/master-data/fiscal-period", getFiscalPeriod);
  app.post("/api/master-data/fiscal-period", createFiscalPeriod);
  app.put("/api/master-data/fiscal-period/:id", updateFiscalPeriod);
  app.delete("/api/master-data/fiscal-period/:id", deleteFiscalPeriod);

  // Fiscal Calendars route - Get fiscal periods grouped by year
  app.get("/api/master-data/fiscal-calendars", async (req: Request, res: Response) => {
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
      res.json([]);
    }
  });

  // Incoterms routes - Get all active incoterms from database
  app.get("/api/master-data/incoterms", async (req: Request, res: Response) => {
    try {
      const { salesDistributionService } = await import("../../services/sales-distribution-service");
      const incotermsList = await salesDistributionService.getAllIncoterms();
      res.json(incotermsList);
    } catch (error: any) {
      console.error("Error fetching incoterms:", error);
      res.status(500).json({ message: "Failed to fetch incoterms", error: error.message });
    }
  });

  // Register Work Centers Routes EARLY to avoid being shadowed by aggregate router
  app.use('/api/master-data/work-center', workCentersRoutes);

  // Register Depreciation Methods Routes
  app.use('/api/master-data/depreciation-methods', depreciationMethodsRouter);

  // Register Depreciation Areas Routes
  app.use('/api/master-data/depreciation-areas', depreciationAreasRouter);

  app.use('/api/master-data/asset-classes', assetClassesRouter);
  app.use('/api/master-data/asset-account-determination', assetAccountDeterminationRouter);
  app.use('/api/master-data/account-categories', accountCategoriesRouter);
  app.use('/api/master-data/transaction-types', transactionTypesRouter);
  app.use('/api/master-data/asset-account-profiles', assetAccountProfilesRouter);
  app.use('/api/master-data/account-keys', accountKeysRouter);
  app.use('/api/master-data/account-determination-mapping', accountDeterminationMappingRouter);

  // Register Bank Master Routes
  app.use('/api/master-data/bank-master', bankMasterRouter);

  // Register Account ID Routes
  app.use('/api/master-data/account-id', accountIdRouter);

  // Register GL Accounts Routes
  app.use('/api/master-data/gl-accounts', glAccountsRouter);
  app.use('/api/master-data/gl-account-auto-number', glAccountAutoNumberRouter);

  // Register Transportation Zones Routes
  app.use('/api/master-data/transportation-zones', transportationZonesRouter);

  // Register Pricing Procedure Determination Routes
  // @ts-ignore
  app.use('/api/master-data/pricing-procedure-determination', pricingProcedureDeterminationRoutes);

  // Fixed Divisions routes (new implementation) - Register BEFORE allMasterDataRoutes to ensure precedence
  app.get("/api/master-data/divisions", divisionsFixed.getDivisions);
  app.get("/api/master-data/divisions/:id", divisionsFixed.getDivisionById);
  app.post("/api/master-data/divisions", divisionsFixed.createDivision);
  app.put("/api/master-data/divisions/:id", divisionsFixed.updateDivision);
  app.delete("/api/master-data/divisions/:id", divisionsFixed.deleteDivision);
  app.post("/api/master-data/divisions/bulk-import", divisionsFixed.bulkImportDivisions);

  // Fixed Sales Areas routes (new implementation) - Register BEFORE allMasterDataRoutes to ensure precedence
  app.get("/api/master-data/sales-areas/gl-accounts/:id", getGLAccountsBySalesArea);
  app.get("/api/master-data/sales-areas/condition-types/:id", getConditionTypesBySalesArea);

  // Valuation Grouping Codes routes
  app.use("/api/master-data/valuation-grouping-codes", valuationGroupingCodesRouter);

  // Account Category References routes
  app.get("/api/master-data/account-category-references", accountCategoryReferences.getAccountCategoryReferences);
  app.get("/api/master-data/account-category-references/:id", accountCategoryReferences.getAccountCategoryReferenceById);
  app.post("/api/master-data/account-category-references", accountCategoryReferences.createAccountCategoryReference);
  app.put("/api/master-data/account-category-references/:id", accountCategoryReferences.updateAccountCategoryReference);
  app.delete("/api/master-data/account-category-references/:id", accountCategoryReferences.deleteAccountCategoryReference);

  app.get("/api/master-data/sales-areas", salesAreasFixed.getSalesAreas);
  app.get("/api/master-data/sales-areas/:id", salesAreasFixed.getSalesAreaById);
  app.post("/api/master-data/sales-areas", salesAreasFixed.createSalesArea);
  app.put("/api/master-data/sales-areas/:id", salesAreasFixed.updateSalesArea);
  app.delete("/api/master-data/sales-areas/:id", salesAreasFixed.deleteSalesArea);
  app.post("/api/master-data/sales-areas/bulk-import", salesAreasFixed.bulkImportSalesAreas);

  // Register Price Lists routes BEFORE allMasterDataRoutes to ensure precedence
  // These routes are from masterDataCRUDRoutes but mounted at correct path
  app.get('/api/master-data/price-lists', async (req, res) => {
    try {
      const pool = ensureActivePool();
      const result = await pool.query('SELECT * FROM price_lists WHERE "_deletedAt" IS NULL ORDER BY price_list_code');

      // Map database columns (snake_case) to frontend format (camelCase)
      const records = (result.rows || []).map((r: any) => ({
        id: r.id,
        priceListCode: r.price_list_code,
        name: r.name,
        description: r.description || null,
        currency: r.currency,
        validFrom: r.valid_from ? new Date(r.valid_from).toISOString().split('T')[0] : null,
        validTo: r.valid_to ? new Date(r.valid_to).toISOString().split('T')[0] : null,
        priceListType: r.price_list_type || 'standard',
        isActive: r.is_active !== undefined ? r.is_active : true,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
        createdBy: r.created_by,
        updatedBy: r.updated_by,
        tenantId: r._tenantId,
        deletedAt: r._deletedAt
      }));

      res.json(records);
    } catch (error) {
      console.error('Error fetching price lists:', error);
      res.status(500).json({ message: 'Failed to fetch price lists' });
    }
  });

  app.post('/api/master-data/price-lists', async (req: any, res) => {
    try {
      const pool = ensureActivePool();
      const { priceListCode, name, description, currency, validFrom, validTo, priceListType, isActive } = req.body;
      const tenantId = req.user?.tenantId || '001';
      const userId = req.user?.id || 1;

      if (!priceListCode || !name || !currency || !validFrom) {
        return res.status(400).json({ message: 'Missing required fields: priceListCode, name, currency, validFrom' });
      }

      const query = `
        INSERT INTO price_lists (price_list_code, name, description, currency, valid_from, valid_to, price_list_type, is_active, "_tenantId", created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *
      `;

      const result = await pool.query(query, [
        priceListCode,
        name,
        description || null,
        currency,
        validFrom,
        validTo || null,
        validTo || null,
        priceListType || 'standard',
        isActive !== undefined ? isActive : true,
        tenantId,
        userId,
        userId
      ]);

      const r = result.rows[0];
      res.status(201).json({
        id: r.id,
        priceListCode: r.price_list_code,
        name: r.name,
        description: r.description || null,
        currency: r.currency,
        validFrom: r.valid_from ? new Date(r.valid_from).toISOString().split('T')[0] : null,
        validTo: r.valid_to ? new Date(r.valid_to).toISOString().split('T')[0] : null,
        priceListType: r.price_list_type || 'standard',
        isActive: r.is_active !== undefined ? r.is_active : true,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
        createdBy: r.created_by,
        updatedBy: r.updated_by,
        tenantId: r._tenantId,
        deletedAt: r._deletedAt
      });
    } catch (error: any) {
      console.error('Error creating price list:', error);
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Price list code already exists' });
      }
      res.status(500).json({ message: 'Failed to create price list', error: error.message });
    }
  });

  app.put('/api/master-data/price-lists/:id', async (req: any, res) => {
    try {
      const pool = ensureActivePool();
      const id = parseInt(req.params.id);
      const { priceListCode, name, description, currency, validFrom, validTo, priceListType, isActive } = req.body;
      const userId = req.user?.id || 1;

      if (!priceListCode || !name || !currency || !validFrom) {
        return res.status(400).json({ message: 'Missing required fields: priceListCode, name, currency, validFrom' });
      }

      const query = `
        UPDATE price_lists 
        SET price_list_code = $1, name = $2, description = $3, currency = $4, valid_from = $5, valid_to = $6, price_list_type = $7, is_active = $8, updated_at = NOW(), updated_by = $9
        WHERE id = $10 AND "_deletedAt" IS NULL
        RETURNING *
      `;

      const result = await pool.query(query, [
        priceListCode,
        name,
        description || null,
        currency,
        validFrom,
        validTo || null,
        priceListType || 'standard',
        isActive !== undefined ? isActive : true,
        userId,
        id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Price list not found' });
      }

      const r = result.rows[0];
      res.json({
        id: r.id,
        priceListCode: r.price_list_code,
        name: r.name,
        description: r.description || null,
        currency: r.currency,
        validFrom: r.valid_from ? new Date(r.valid_from).toISOString().split('T')[0] : null,
        validTo: r.valid_to ? new Date(r.valid_to).toISOString().split('T')[0] : null,
        priceListType: r.price_list_type || 'standard',
        isActive: r.is_active !== undefined ? r.is_active : true,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
      });
    } catch (error: any) {
      console.error('Error updating price list:', error);
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Price list code already exists' });
      }
      res.status(500).json({ message: 'Failed to update price list', error: error.message });
    }
  });

  app.delete('/api/master-data/price-lists/:id', async (req: any, res) => {
    try {
      const pool = ensureActivePool();
      const id = parseInt(req.params.id);
      const userId = req.user?.id || 1;

      const result = await pool.query('UPDATE price_lists SET "_deletedAt" = NOW(), updated_by = $1, updated_at = NOW() WHERE id = $2 AND "_deletedAt" IS NULL RETURNING id', [userId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Price list not found' });
      }

      res.json({ message: 'Price list deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting price list:', error);
      res.status(500).json({ message: 'Failed to delete price list', error: error.message });
    }
  });

  // Register controlling area assignments routes
  app.use('/api/master-data/controlling-area-assignments', controllingAreaAssignmentsRouter);

  // Register Cost Center Categories route
  app.use('/api/master-data/cost-center-categories', costCenterCategoriesRouter);


  // Register all 21 new Master Data routes (keep after dedicated routers)
  app.use('/api/master-data/source-lists', sourceListsRouter);
  app.use('/api/master-data', allMasterDataRoutes);

  // Seed Discount Groups - generates sample data based on real-time patterns from existing data
  app.post("/api/master-data/discount-groups/seed", async (req: Request, res: Response) => {
    try {
      // Check existing discount groups to avoid duplicates
      const existing = await db.select().from(discountGroupsTable);
      const existingCodes = new Set(existing.map((g: any) => g.code));

      // Fetch existing customer groups to derive discount patterns
      const customerGroupsResult = await pool.query(`
        SELECT code, name FROM customer_groups WHERE is_active = true ORDER BY created_at DESC LIMIT 10
      `).catch(() => ({ rows: [] }));

      // Fetch existing price lists to understand pricing structure
      const priceListsResult = await pool.query(`
        SELECT price_list_code, name FROM price_lists WHERE is_active = true ORDER BY created_at DESC LIMIT 5
      `).catch(() => ({ rows: [] }));

      // Fetch existing sales orders to understand discount patterns
      const salesOrdersResult = await pool.query(`
        SELECT DISTINCT discount_percent, discount_type 
        FROM sales_orders 
        WHERE discount_percent IS NOT NULL AND discount_percent > 0
        ORDER BY discount_percent DESC
        LIMIT 5
      `).catch(() => ({ rows: [] }));

      // Generate seed data based on real-time patterns from existing data
      const seed: any[] = [];

      // Generate discounts based on customer group patterns (real-time data)
      customerGroupsResult.rows.forEach((cg: any, index: number) => {
        const code = `CG_${cg.code}`;
        if (!existingCodes.has(code) && index < 5) {
          // Calculate discount based on customer group index (5%, 10%, 15%, etc.)
          const discountPercent = ((index + 1) * 5).toString();
          seed.push({
            code: code,
            name: `${cg.name} Discount`,
            description: `Discount group for ${cg.name} customers`,
            discountPercent: `${discountPercent}.00`,
            discountType: "PERCENTAGE",
            minimumOrderValue: ((index + 1) * 100).toString() + ".00",
            maximumDiscount: ((index + 1) * 500).toString() + ".00",
            isActive: true,
          });
        }
      });

      // Generate discounts based on price list patterns (real-time data)
      priceListsResult.rows.forEach((pl: any, index: number) => {
        const code = `PL_${pl.price_list_code}`;
        if (!existingCodes.has(code) && index < 3) {
          const amount = ((index + 1) * 25).toString();
          seed.push({
            code: code,
            name: `${pl.name} Fixed Discount`,
            description: `Fixed discount for ${pl.name} price list`,
            discountPercent: amount + ".00",
            discountType: "FIXED_AMOUNT",
            minimumOrderValue: ((index + 1) * 100).toString() + ".00",
            maximumDiscount: null,
            isActive: true,
          });
        }
      });

      // Generate discounts based on actual sales order discount patterns (real-time data)
      salesOrdersResult.rows.forEach((so: any, index: number) => {
        const code = `SO_DISC_${so.discount_percent}`;
        if (!existingCodes.has(code) && index < 3) {
          seed.push({
            code: code,
            name: `Sales Order Discount ${so.discount_percent}%`,
            description: `Discount pattern based on existing sales orders (${so.discount_type || 'PERCENTAGE'})`,
            discountPercent: so.discount_percent.toString(),
            discountType: so.discount_type || "PERCENTAGE",
            minimumOrderValue: "0.00",
            maximumDiscount: null,
            isActive: true,
          });
        }
      });

      // Only insert if we have new data to add based on real-time patterns
      if (seed.length === 0) {
        return res.status(200).json({
          message: "No new discount groups to seed. Either all groups already exist or there's no existing data to base seed data on.",
          existingCount: existing.length,
          suggestion: "Create customer groups, price lists, or sales orders first to generate discount groups based on real patterns."
        });
      }

      const inserted = await db.insert(discountGroupsTable).values(seed).returning();
      return res.status(201).json({
        message: "Seeded discount groups based on real-time data patterns",
        count: inserted.length,
        data: inserted,
        source: {
          customerGroups: customerGroupsResult.rows.length,
          priceLists: priceListsResult.rows.length,
          salesOrders: salesOrdersResult.rows.length
        }
      });
    } catch (error: any) {
      console.error("Error seeding discount groups:", error);
      return res.status(500).json({ message: "Failed to seed discount groups", error: error.message });
    }
  });

  // Mount dedicated profit centers router
  app.use('/api/master-data/profit-center', profitCentersRouter);
  // Plural alias for compatibility with UI expecting plural endpoint
  app.use('/api/master-data/profit-centers', profitCentersRouter);

  // Posting Keys (OB41) for Account Determination - dedicated router using posting_keys table
  app.use('/api/master-data/posting-keys', postingKeysRouter);

  // Field Status Configuration (OBC4)
  app.use('/api/master-data/field-status-variants', fieldStatusVariantsRouter);
  app.use('/api/master-data/field-status-groups', fieldStatusGroupsRouter);

  // Transaction Keys (legacy) still available separately
  app.use('/api/master-data/transaction-keys', transactionKeysRouter);

  app.use('/api/master-data/business-areas', businessAreasRouter);

  // Serial Number Profiles routes (create-if-missing)
  app.use('/api/master-data/serial-number-profiles', serialNumberProfilesRouter);

  // Cross-reference analysis endpoints
  app.get("/api/master-data/cross-reference-summary", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          cc.code as company_code, 
          cc.name as company_name,
          COUNT(DISTINCT p.id) as plants,
          COUNT(DISTINCT sl.id) as storage_locations,
          COUNT(DISTINCT c.id) as customers,
          COUNT(DISTINCT ev.id) as vendors,
          COUNT(DISTINCT m.id) as materials,
          COUNT(DISTINCT dt.id) as document_types,
          COUNT(DISTINCT nr.id) as number_ranges
        FROM company_codes cc
        LEFT JOIN plants p ON p.company_code_id = cc.id
        LEFT JOIN storage_locations sl ON sl.plant_id = p.id
        LEFT JOIN erp_customers c ON c.company_code_id = cc.id
        LEFT JOIN erp_vendors ev ON ev.company_code_id = cc.id
        LEFT JOIN materials m ON m.is_active = true
        LEFT JOIN document_types dt ON dt.company_code_id = cc.id
        LEFT JOIN number_ranges nr ON nr.company_code_id = cc.id
        GROUP BY cc.id, cc.code, cc.name
        ORDER BY cc.code
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching cross-reference summary:", error);
      res.status(500).json({ message: "Failed to fetch cross-reference summary" });
    }
  });

  app.get("/api/master-data/company-details/:companyCode", async (req: Request, res: Response) => {
    try {
      const { companyCode } = req.params;
      const companyResult = await pool.query("SELECT id FROM company_codes WHERE code = $1", [companyCode]);

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ message: "Company code not found" });
      }

      const companyId = companyResult.rows[0].id;

      const [customers, vendors, plants, documentTypesResult, numberRanges] = await Promise.all([
        pool.query("SELECT id, customer_code as code, name, is_active FROM erp_customers WHERE company_code_id = $1", [companyId]),
        pool.query("SELECT id, vendor_code as code, name, is_active FROM erp_vendors WHERE company_code_id = $1", [companyId]),
        pool.query("SELECT id, code, name, is_active FROM plants WHERE company_code_id = $1", [companyId]),
        pool.query("SELECT id, document_type_code as code, description as name, is_active FROM document_types WHERE company_code_id = $1", [companyId]),
        pool.query("SELECT id, number_range_code as code, description as name, is_active FROM number_ranges WHERE company_code_id = $1", [companyId])
      ]);

      res.json({
        customers: customers.rows,
        vendors: vendors.rows,
        plants: plants.rows,
        document_types: documentTypesResult.rows,
        number_ranges: numberRanges.rows
      });
    } catch (error) {
      console.error("Error fetching company details:", error);
      res.status(500).json({ message: "Failed to fetch company details" });
    }
  });

  // (moved earlier)

  // Vendor routes are handled directly in this file at /api/master-data/vendor (singular)

  // Register Assets (Asset Master) Routes
  app.use('/api/master-data/assets', assetsRouter);
  // Compatibility alias (some UIs call singular path)
  app.use('/api/master-data/asset', assetsRouter);

  // Register new standardized master data routes
  // These routes will be imported dynamically when the route files are created

  // Register vendor contact routes
  app.get("/api/master-data/vendor-contact", async (req: Request, res: Response) => {
    try {
      // Return empty array for now - this endpoint exists for compatibility
      res.json([]);
    } catch (error) {
      console.error("Error fetching vendor contacts:", error);
      res.status(500).json({ message: "Failed to fetch vendor contacts" });
    }
  });

  // Add vendor route for backward compatibility
  app.get("/api/master-data/vendor", async (req: Request, res: Response) => {
    try {
      // Query the database for actual vendor data with all fields
      const result = await pool.query(`
        SELECT 
          id, code, name, legal_name, name_2, name_3, name_4, search_term, sort_field, title,
          type, category_id,           account_group, account_group_id, industry, industry_key, industry_classification,
          tax_id, tax_id_2, tax_id_3, tax_office, vat_number, fiscal_address, registration_number,
          address, address_2, address_3, address_4, address_5, district, city, state, country,
          postal_code, po_box, po_box_postal_code, region, county, time_zone, tax_jurisdiction,
          phone, alt_phone, email, website,
          currency, payment_terms, payment_method, reconciliation_account_id, alternative_payee, payment_block, house_bank, check_double_invoice,
          bank_name, bank_account, bank_routing_number, swift_code, iban, bank_country, bank_key, account_type, bank_type_key,
          incoterms, minimum_order_value, evaluation_score, lead_time, purchasing_group_id,
          authorization_group, corporate_group,
          withholding_tax_country, withholding_tax_type, withholding_tax_code, withholding_tax_liable,
          exemption_number, exemption_percentage, exemption_reason, exemption_from, exemption_to,
          status, central_posting_block, central_deletion_flag,
          posting_block_company_code, deletion_flag_company_code,
          posting_block_purchasing_org, deletion_flag_purchasing_org,
          blacklisted, blacklist_reason, notes, tags, company_code_id,
          is_active, created_at, updated_at, created_by, updated_by, version,
          "_tenantId" as "tenantId"
        FROM vendors 
        WHERE is_active = true AND ("_deletedAt" IS NULL)
        ORDER BY name ASC
      `);

      // Map database snake_case to frontend camelCase
      const mappedVendors = result.rows.map(vendor => ({
        id: vendor.id,
        code: vendor.code,
        name: vendor.name,
        legalName: vendor.legal_name,
        name2: vendor.name_2,
        name3: vendor.name_3,
        name4: vendor.name_4,
        searchTerm: vendor.search_term,
        sortField: vendor.sort_field,
        title: vendor.title,
        type: vendor.type,
        categoryId: vendor.category_id,
        accountGroup: vendor.account_group,
        industry: vendor.industry,
        industryKey: vendor.industry_key,
        industryClassification: vendor.industry_classification,
        taxId: vendor.tax_id,
        taxId2: vendor.tax_id_2,
        taxId3: vendor.tax_id_3,
        taxOffice: vendor.tax_office,
        vatNumber: vendor.vat_number,
        fiscalAddress: vendor.fiscal_address,
        registrationNumber: vendor.registration_number,
        address: vendor.address,
        address2: vendor.address_2,
        address3: vendor.address_3,
        address4: vendor.address_4,
        address5: vendor.address_5,
        district: vendor.district,
        city: vendor.city,
        state: vendor.state,
        country: vendor.country,
        postalCode: vendor.postal_code,
        poBox: vendor.po_box,
        poBoxPostalCode: vendor.po_box_postal_code,
        region: vendor.region,
        county: vendor.county,
        timeZone: vendor.time_zone,
        taxJurisdiction: vendor.tax_jurisdiction,
        phone: vendor.phone,
        altPhone: vendor.alt_phone,
        email: vendor.email,
        website: vendor.website,
        currency: vendor.currency,
        paymentTerms: vendor.payment_terms,
        paymentMethod: vendor.payment_method,
        reconciliationAccountId: vendor.reconciliation_account_id,
        alternativePayee: vendor.alternative_payee,
        paymentBlock: vendor.payment_block,
        houseBank: vendor.house_bank,
        checkDoubleInvoice: vendor.check_double_invoice,
        bankName: vendor.bank_name,
        bankAccount: vendor.bank_account,
        bankRoutingNumber: vendor.bank_routing_number,
        swiftCode: vendor.swift_code,
        iban: vendor.iban,
        bankCountry: vendor.bank_country,
        bankKey: vendor.bank_key,
        accountType: vendor.account_type,
        bankTypeKey: vendor.bank_type_key,
        incoterms: vendor.incoterms,
        minimumOrderValue: vendor.minimum_order_value,
        evaluationScore: vendor.evaluation_score,
        leadTime: vendor.lead_time,
        purchasingGroupId: vendor.purchasing_group_id,
        authorizationGroup: vendor.authorization_group,
        corporateGroup: vendor.corporate_group,
        withholdingTaxCountry: vendor.withholding_tax_country,
        withholdingTaxType: vendor.withholding_tax_type,
        withholdingTaxCode: vendor.withholding_tax_code,
        withholdingTaxLiable: vendor.withholding_tax_liable,
        exemptionNumber: vendor.exemption_number,
        exemptionPercentage: vendor.exemption_percentage,
        exemptionReason: vendor.exemption_reason,
        exemptionFrom: vendor.exemption_from,
        exemptionTo: vendor.exemption_to,
        status: vendor.status,
        centralPostingBlock: vendor.central_posting_block,
        centralDeletionFlag: vendor.central_deletion_flag,
        postingBlockCompanyCode: vendor.posting_block_company_code,
        deletionFlagCompanyCode: vendor.deletion_flag_company_code,
        postingBlockPurchasingOrg: vendor.posting_block_purchasing_org,
        deletionFlagPurchasingOrg: vendor.deletion_flag_purchasing_org,
        blacklisted: vendor.blacklisted,
        blacklistReason: vendor.blacklist_reason,
        notes: vendor.notes,
        tags: vendor.tags,
        companyCodeId: vendor.company_code_id,
        purchaseOrganizationId: vendor.purchase_organization_id,
        isActive: vendor.is_active,
        createdAt: vendor.created_at,
        updatedAt: vendor.updated_at,
        createdBy: vendor.created_by,
        updatedBy: vendor.updated_by,
        tenantId: vendor.tenantId,
        version: vendor.version
      }));

      console.log(`✅ Vendors fetched from database: ${mappedVendors.length} records`);
      return res.status(200).json(mappedVendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      return res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // GET /api/master-data/vendor/generate-code?accountGroupId=:id - Generate next vendor code for account group
  app.get("/api/master-data/vendor/generate-code", async (req: Request, res: Response) => {
    try {
      const { accountGroupId } = req.query;

      if (!accountGroupId) {
        return res.status(400).json({
          message: "Account Group ID is required",
          error: "accountGroupId query parameter is required"
        });
      }

      // Fetch account group details to get number range for code generation
      const accountGroupResult = await pool.query(`
        SELECT 
          ag.id,
          ag.code as account_group_code,
          ag.number_range_from,
          ag.number_range_to,
          ag.number_range_id,
          nr.current_number,
          nr.range_from,
          nr.range_to
        FROM account_groups ag
        LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
        WHERE ag.id = $1 AND ag.account_type = 'VENDOR' AND ag.is_active = true
      `, [accountGroupId]);

      if (accountGroupResult.rows.length === 0) {
        return res.status(400).json({
          message: "Invalid Account Group",
          error: "Account group not found or not valid for vendors"
        });
      }

      const accountGroup = accountGroupResult.rows[0];

      // Generate code from number range (preview only - don't update current_number yet)
      const numberRangeFrom = accountGroup.number_range_from || accountGroup.range_from;
      const numberRangeTo = accountGroup.number_range_to || accountGroup.range_to;
      const currentNumber = accountGroup.current_number || 0;

      let vendorCode = '';

      if (numberRangeFrom && numberRangeTo) {
        // Check existing vendors to find the highest number in range
        const existingVendorsResult = await pool.query(`
          SELECT code 
          FROM vendors 
          WHERE code ~ '^[0-9]+$' 
            AND CAST(code AS INTEGER) >= $1 
            AND CAST(code AS INTEGER) <= $2
          ORDER BY CAST(code AS INTEGER) DESC
          LIMIT 1
        `, [parseInt(numberRangeFrom), parseInt(numberRangeTo)]);

        let nextNumber: number;
        if (existingVendorsResult.rows.length > 0) {
          // Use the highest existing code + 1
          const highestCode = parseInt(existingVendorsResult.rows[0].code);
          nextNumber = Math.max(highestCode + 1, parseInt(numberRangeFrom));
        } else {
          // Start from range_from
          nextNumber = Math.max(parseInt(currentNumber) || 0, parseInt(numberRangeFrom) || 0) + 1;
        }

        // Ensure it's within range
        if (nextNumber > parseInt(numberRangeTo)) {
          return res.status(400).json({
            message: "Number Range Exceeded",
            error: `Vendor code range ${numberRangeFrom}-${numberRangeTo} is full`
          });
        }

        // Format vendor code (pad with zeros based on range length)
        const rangeLength = numberRangeFrom.length;
        vendorCode = String(nextNumber).padStart(rangeLength, '0');
      } else {
        // Fallback: generate timestamp-based code
        vendorCode = `VEN${Date.now().toString().slice(-8)}`;
      }

      return res.status(200).json({
        code: vendorCode,
        accountGroupId: parseInt(accountGroupId as string),
        numberRangeFrom,
        numberRangeTo
      });
    } catch (error: any) {
      console.error("Error generating vendor code:", error);
      return res.status(500).json({
        message: "Failed to generate vendor code",
        error: error.message
      });
    }
  });

  app.post("/api/master-data/vendor", async (req: Request, res: Response) => {
    console.log('🔍 POST /api/master-data/vendor endpoint called');
    console.log('Request body:', req.body);
    try {
      const data = req.body;

      // Validate account group is provided
      if (!data.accountGroupId) {
        return res.status(400).json({
          message: "Account Group is required",
          error: "accountGroupId is mandatory for vendor creation"
        });
      }

      // Fetch account group details to get number range for code generation
      const accountGroupResult = await pool.query(`
        SELECT 
          ag.id,
          ag.code as account_group_code,
          ag.number_range_from,
          ag.number_range_to,
          ag.number_range_id,
          nr.current_number,
          nr.range_from,
          nr.range_to
        FROM account_groups ag
        LEFT JOIN number_ranges nr ON ag.number_range_id = nr.id
        WHERE ag.id = $1 AND ag.account_type = 'VENDOR' AND ag.is_active = true
      `, [data.accountGroupId]);

      if (accountGroupResult.rows.length === 0) {
        return res.status(400).json({
          message: "Invalid Account Group",
          error: "Account group not found or not valid for vendors"
        });
      }

      const accountGroup = accountGroupResult.rows[0];

      // Auto-generate vendor code based on account group number range
      let vendorCode = data.code?.trim(); // Use provided code if exists and not empty

      // If code is empty, null, or undefined, generate it
      if (!vendorCode || vendorCode === '') {
        // Generate code from number range
        const numberRangeFrom = accountGroup.number_range_from || accountGroup.range_from;
        const numberRangeTo = accountGroup.number_range_to || accountGroup.range_to;
        const currentNumber = accountGroup.current_number || 0;

        if (numberRangeFrom && numberRangeTo) {
          // Check existing vendors to find the highest number in range
          const existingVendorsResult = await pool.query(`
            SELECT code 
            FROM vendors 
            WHERE code ~ '^[0-9]+$' 
              AND CAST(code AS INTEGER) >= $1 
              AND CAST(code AS INTEGER) <= $2
            ORDER BY CAST(code AS INTEGER) DESC
            LIMIT 1
          `, [parseInt(numberRangeFrom), parseInt(numberRangeTo)]);

          let nextNumber: number;
          if (existingVendorsResult.rows.length > 0) {
            // Use the highest existing code + 1
            const highestCode = parseInt(existingVendorsResult.rows[0].code);
            nextNumber = Math.max(highestCode + 1, parseInt(numberRangeFrom));
          } else {
            // Start from range_from
            nextNumber = Math.max(parseInt(currentNumber) || 0, parseInt(numberRangeFrom) || 0) + 1;
          }

          // Ensure it's within range
          if (nextNumber > parseInt(numberRangeTo)) {
            return res.status(400).json({
              message: "Number Range Exceeded",
              error: `Vendor code range ${numberRangeFrom}-${numberRangeTo} is full`
            });
          }

          // Format vendor code (pad with zeros based on range length)
          const rangeLength = numberRangeFrom.length;
          vendorCode = String(nextNumber).padStart(rangeLength, '0');

          // Update number range current number
          if (accountGroup.number_range_id) {
            await pool.query(`
              UPDATE number_ranges 
              SET current_number = $1, updated_at = NOW()
              WHERE id = $2
            `, [nextNumber, accountGroup.number_range_id]);
          }
        } else {
          // Fallback: generate timestamp-based code
          vendorCode = `VEN${Date.now().toString().slice(-8)}`;
        }
      }

      // Map frontend camelCase to database snake_case
      const fieldMapping: Record<string, string> = {
        name: 'name',
        legalName: 'legal_name',
        name2: 'name_2',
        name3: 'name_3',
        name4: 'name_4',
        searchTerm: 'search_term',
        sortField: 'sort_field',
        title: 'title',
        type: 'type',
        categoryId: 'category_id',
        accountGroup: 'account_group',
        industry: 'industry',
        industryKey: 'industry_key',
        industryClassification: 'industry_classification',
        taxId: 'tax_id',
        taxId2: 'tax_id_2',
        taxId3: 'tax_id_3',
        taxOffice: 'tax_office',
        vatNumber: 'vat_number',
        fiscalAddress: 'fiscal_address',
        registrationNumber: 'registration_number',
        address: 'address',
        address2: 'address_2',
        address3: 'address_3',
        address4: 'address_4',
        address5: 'address_5',
        district: 'district',
        city: 'city',
        state: 'state',
        country: 'country',
        postalCode: 'postal_code',
        poBox: 'po_box',
        poBoxPostalCode: 'po_box_postal_code',
        region: 'region',
        county: 'county',
        timeZone: 'time_zone',
        taxJurisdiction: 'tax_jurisdiction',
        phone: 'phone',
        altPhone: 'alt_phone',
        email: 'email',
        website: 'website',
        currency: 'currency',
        paymentTerms: 'payment_terms',
        paymentMethod: 'payment_method',
        reconciliationAccountId: 'reconciliation_account_id',
        alternativePayee: 'alternative_payee',
        paymentBlock: 'payment_block',
        houseBank: 'house_bank',
        checkDoubleInvoice: 'check_double_invoice',
        bankName: 'bank_name',
        bankAccount: 'bank_account',
        bankRoutingNumber: 'bank_routing_number',
        swiftCode: 'swift_code',
        iban: 'iban',
        bankCountry: 'bank_country',
        bankKey: 'bank_key',
        accountType: 'account_type',
        bankTypeKey: 'bank_type_key',
        incoterms: 'incoterms',
        minimumOrderValue: 'minimum_order_value',
        evaluationScore: 'evaluation_score',
        leadTime: 'lead_time',
        purchasingGroupId: 'purchasing_group_id',
        authorizationGroup: 'authorization_group',
        corporateGroup: 'corporate_group',
        withholdingTaxCountry: 'withholding_tax_country',
        withholdingTaxType: 'withholding_tax_type',
        withholdingTaxCode: 'withholding_tax_code',
        withholdingTaxLiable: 'withholding_tax_liable',
        exemptionNumber: 'exemption_number',
        exemptionPercentage: 'exemption_percentage',
        exemptionReason: 'exemption_reason',
        exemptionFrom: 'exemption_from',
        exemptionTo: 'exemption_to',
        status: 'status',
        centralPostingBlock: 'central_posting_block',
        centralDeletionFlag: 'central_deletion_flag',
        postingBlockCompanyCode: 'posting_block_company_code',
        deletionFlagCompanyCode: 'deletion_flag_company_code',
        postingBlockPurchasingOrg: 'posting_block_purchasing_org',
        deletionFlagPurchasingOrg: 'deletion_flag_purchasing_org',
        blacklisted: 'blacklisted',
        blacklistReason: 'blacklist_reason',
        notes: 'notes',
        tags: 'tags',
        companyCodeId: 'company_code_id',
        purchaseOrganizationId: 'purchase_organization_id',
        isActive: 'is_active'
      };

      // Build dynamic INSERT query
      const fields: string[] = [];
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      // Always include required fields: code, name, type, account_group_id
      fields.push('code', 'name', 'type', 'account_group_id');
      values.push(
        vendorCode,
        data.name || '',
        data.type || 'supplier',
        data.accountGroupId
      );
      placeholders.push('$' + paramIndex++, '$' + paramIndex++, '$' + paramIndex++, '$' + paramIndex++);

      // Add optional fields that are provided
      // Handle special case: treat 0 as null for ID fields (purchasingGroupId, purchaseOrganizationId, companyCodeId)
      for (const [frontendKey, dbKey] of Object.entries(fieldMapping)) {
        if (data[frontendKey] !== undefined && data[frontendKey] !== null && frontendKey !== 'code' && frontendKey !== 'name' && frontendKey !== 'type' && frontendKey !== 'accountGroupId') {
          // Convert 0 to null for ID fields to avoid invalid foreign key references
          let value = data[frontendKey];
          if ((frontendKey === 'purchasingGroupId' || frontendKey === 'purchaseOrganizationId' || frontendKey === 'companyCodeId') && value === 0) {
            value = null;
          }
          fields.push(dbKey);
          values.push(value);
          placeholders.push('$' + paramIndex++);
        }
      }

      // Set defaults for critical fields if not provided
      if (!data.isActive && data.isActive !== false) {
        fields.push('is_active');
        values.push(true);
        placeholders.push('$' + paramIndex++);
      }

      // Add audit trail fields
      const userId = (req as any).user?.id || 1;
      const tenantId = (req as any).user?.tenantId || '001';

      // Add created_at and updated_at
      fields.push('created_at', 'updated_at', 'created_by', 'updated_by', '"_tenantId"');
      placeholders.push('NOW()', 'NOW()', '$' + paramIndex++, '$' + paramIndex++, '$' + paramIndex++);
      values.push(userId, userId, tenantId);

      const query = `
        INSERT INTO public.vendors (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      console.log('Executing query:', query);
      console.log('With values:', values);

      const result = await pool.query(query, values);

      console.log('✅ Vendor created successfully:', result.rows[0]);
      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error("Error creating vendor:", error);
      return res.status(500).json({ message: "Failed to create vendor", error: error.message });
    }
  });

  app.put("/api/master-data/vendor/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { code, name, email, type } = req.body;
      const result = await pool.query(`
        UPDATE vendors 
        SET code = $1, name = $2, email = $3, type = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [code, name, email, type || 'Supplier', id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor", error: error.message });
    }
  });

  app.patch("/api/master-data/vendor/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const data = req.body;

      // Map frontend camelCase to database snake_case
      const fieldMapping: Record<string, string> = {
        code: 'code',
        name: 'name',
        legalName: 'legal_name',
        name2: 'name_2',
        name3: 'name_3',
        name4: 'name_4',
        searchTerm: 'search_term',
        sortField: 'sort_field',
        title: 'title',
        type: 'type',
        categoryId: 'category_id',
        accountGroup: 'account_group',
        industry: 'industry',
        industryKey: 'industry_key',
        industryClassification: 'industry_classification',
        taxId: 'tax_id',
        taxId2: 'tax_id_2',
        taxId3: 'tax_id_3',
        taxOffice: 'tax_office',
        vatNumber: 'vat_number',
        fiscalAddress: 'fiscal_address',
        registrationNumber: 'registration_number',
        address: 'address',
        address2: 'address_2',
        address3: 'address_3',
        address4: 'address_4',
        address5: 'address_5',
        district: 'district',
        city: 'city',
        state: 'state',
        country: 'country',
        postalCode: 'postal_code',
        poBox: 'po_box',
        poBoxPostalCode: 'po_box_postal_code',
        region: 'region',
        county: 'county',
        timeZone: 'time_zone',
        taxJurisdiction: 'tax_jurisdiction',
        phone: 'phone',
        altPhone: 'alt_phone',
        email: 'email',
        website: 'website',
        currency: 'currency',
        paymentTerms: 'payment_terms',
        paymentMethod: 'payment_method',
        reconciliationAccountId: 'reconciliation_account_id',
        alternativePayee: 'alternative_payee',
        paymentBlock: 'payment_block',
        houseBank: 'house_bank',
        checkDoubleInvoice: 'check_double_invoice',
        bankName: 'bank_name',
        bankAccount: 'bank_account',
        bankRoutingNumber: 'bank_routing_number',
        swiftCode: 'swift_code',
        iban: 'iban',
        bankCountry: 'bank_country',
        bankKey: 'bank_key',
        accountType: 'account_type',
        bankTypeKey: 'bank_type_key',
        incoterms: 'incoterms',
        minimumOrderValue: 'minimum_order_value',
        evaluationScore: 'evaluation_score',
        leadTime: 'lead_time',
        purchasingGroupId: 'purchasing_group_id',
        authorizationGroup: 'authorization_group',
        corporateGroup: 'corporate_group',
        withholdingTaxCountry: 'withholding_tax_country',
        withholdingTaxType: 'withholding_tax_type',
        withholdingTaxCode: 'withholding_tax_code',
        withholdingTaxLiable: 'withholding_tax_liable',
        exemptionNumber: 'exemption_number',
        exemptionPercentage: 'exemption_percentage',
        exemptionReason: 'exemption_reason',
        exemptionFrom: 'exemption_from',
        exemptionTo: 'exemption_to',
        status: 'status',
        centralPostingBlock: 'central_posting_block',
        centralDeletionFlag: 'central_deletion_flag',
        postingBlockCompanyCode: 'posting_block_company_code',
        deletionFlagCompanyCode: 'deletion_flag_company_code',
        postingBlockPurchasingOrg: 'posting_block_purchasing_org',
        deletionFlagPurchasingOrg: 'deletion_flag_purchasing_org',
        blacklisted: 'blacklisted',
        blacklistReason: 'blacklist_reason',
        notes: 'notes',
        tags: 'tags',
        companyCodeId: 'company_code_id',
        purchaseOrganizationId: 'purchase_organization_id',
        isActive: 'is_active'
      };

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 2; // Start from 2 since $1 is the id

      // Add fields that are provided (excluding id, created_at, updated_at)
      // Handle special case: treat 0 as null for ID fields (purchasingGroupId, purchaseOrganizationId, companyCodeId)
      for (const [frontendKey, dbKey] of Object.entries(fieldMapping)) {
        if (data[frontendKey] !== undefined && data[frontendKey] !== null) {
          // Convert 0 to null for ID fields to avoid invalid foreign key references
          let value = data[frontendKey];
          if ((frontendKey === 'purchasingGroupId' || frontendKey === 'purchaseOrganizationId' || frontendKey === 'companyCodeId') && value === 0) {
            value = null;
          }
          fields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      // Inject updated_by from authenticated user
      const userId = (req as any).user?.id || 1;
      fields.push(`updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      // Always update updated_at
      fields.push(`updated_at = NOW()`);
      values.unshift(id); // Add id as first parameter

      const query = `
        UPDATE vendors 
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const v = result.rows[0];
      console.log('✅ Vendor updated successfully:', v);
      res.json({
        id: v.id,
        code: v.code,
        name: v.name,
        legalName: v.legal_name,
        type: v.type,
        industry: v.industry,
        taxId: v.tax_id,
        vatNumber: v.vat_number,
        address: v.address,
        city: v.city,
        state: v.state,
        country: v.country,
        postalCode: v.postal_code,
        region: v.region,
        phone: v.phone,
        altPhone: v.alt_phone,
        email: v.email,
        website: v.website,
        currency: v.currency,
        paymentTerms: v.payment_terms,
        paymentMethod: v.payment_method,
        reconciliationAccountId: v.reconciliation_account_id,  // ← fixed: camelCase for frontend
        minimumOrderValue: v.minimum_order_value,
        evaluationScore: v.evaluation_score,
        leadTime: v.lead_time,
        purchasingGroupId: v.purchasing_group_id,
        companyCodeId: v.company_code_id,
        purchaseOrganizationId: v.purchase_organization_id,
        accountGroupId: v.account_group_id,
        accountGroup: v.account_group,
        status: v.status,
        blacklisted: v.blacklisted,
        blacklistReason: v.blacklist_reason,
        notes: v.notes,
        isActive: v.is_active,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        createdBy: v.created_by,
        updatedBy: v.updated_by,
      });
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor", error: error.message });
    }
  });

  app.delete("/api/master-data/vendor/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      const userId = (req as any).user?.id || 1;

      // Soft delete by setting is_active to false and recording deletion time
      const result = await pool.query(`
        UPDATE vendors 
        SET is_active = false, "_deletedAt" = NOW(), updated_by = $2, updated_at = NOW()
        WHERE id = $1 AND ("_deletedAt" IS NULL)
        RETURNING *
      `, [id, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      console.log('✅ Vendor deactivated successfully:', result.rows[0]);
      res.json({ message: "Vendor deactivated successfully" });
    } catch (error: any) {
      console.error("Error deactivating vendor:", error);
      res.status(500).json({ message: "Failed to deactivate vendor", error: error.message });
    }
  });

  app.post("/api/master-data/vendor/bulk-import", async (req: Request, res: Response) => {
    try {
      // For now, return a simple response indicating the endpoint exists
      // In a real implementation, you would parse the uploaded file and insert multiple vendors
      console.log('✅ Bulk import endpoint called');
      res.json({
        message: "Bulk import endpoint ready",
        success: 0,
        failed: 0,
        note: "File processing implementation needed"
      });
    } catch (error: any) {
      console.error("Error in bulk import:", error);
      res.status(500).json({ message: "Failed to process bulk import", error: error.message });
    }
  });
  // Company Code routes
  app.get("/api/master-data/company-codes", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const result = await pool.query("SELECT * FROM company_codes");
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching company codes:", error);
      return res.status(500).json({ message: "Failed to fetch company codes" });
    }
  });

  // Plants routes - Use proper plant handler for consistent field mapping
  app.get("/api/master-data/plants", plant.getPlants);

  // Alias route for /api/plants (for backward compatibility)
  app.get("/api/plants", plant.getPlants);

  // Company Code routes - using proper handler with fiscal year JOIN
  app.get("/api/master-data/company-code", companyCode.getCompanyCodes);
  app.get("/api/master-data/company-code/:id", companyCode.getCompanyCodeById);
  app.post("/api/master-data/company-code", companyCode.createCompanyCode);
  app.post("/api/master-data/company-code/bulk-import", companyCode.bulkImportCompanyCodes);
  app.put("/api/master-data/company-code/:id", companyCode.updateCompanyCode);
  app.put("/api/master-data/company-code/:id/deactivate", companyCode.deactivateCompanyCode);
  app.delete("/api/master-data/company-code/:id", companyCode.deleteCompanyCode);

  // Plant routes  
  app.get("/api/master-data/plant", plant.getPlants);
  app.get("/api/master-data/plant/:id", plant.getPlantById);
  app.post("/api/master-data/plant", plant.createPlant);
  app.post("/api/master-data/plant/bulk-import", plant.bulkImportPlants);
  app.put("/api/master-data/plant/:id", plant.updatePlant);
  app.put("/api/master-data/plant/:id/deactivate", plant.deactivatePlant);
  app.delete("/api/master-data/plant/:id", plant.deletePlant);

  // SD Document Types routes
  app.get("/api/master-data/sd-document-types", sdDocumentTypes.getSDDocumentTypes);
  app.get("/api/master-data/sd-document-types/:id", sdDocumentTypes.getSDDocumentTypeById);
  app.post("/api/master-data/sd-document-types", sdDocumentTypes.createSDDocumentType);
  app.put("/api/master-data/sd-document-types/:id", sdDocumentTypes.updateSDDocumentType);
  app.put("/api/master-data/sd-document-types/:id/deactivate", sdDocumentTypes.deactivateSDDocumentType);
  app.delete("/api/master-data/sd-document-types/:id", sdDocumentTypes.deleteSDDocumentType);

  // Batch Classes routes
  app.get("/api/master-data/batch-classes", batchClasses.getBatchClasses);
  app.get("/api/master-data/batch-classes/:id", batchClasses.getBatchClassById);
  app.post("/api/master-data/batch-classes", batchClasses.createBatchClass);
  app.put("/api/master-data/batch-classes/:id", batchClasses.updateBatchClass);
  app.put("/api/master-data/batch-classes/:id/deactivate", batchClasses.deactivateBatchClass);
  app.delete("/api/master-data/batch-classes/:id", batchClasses.deleteBatchClass);

  // Storage Location routes
  app.get("/api/master-data/storage-location", storageLocation.getStorageLocations);
  app.get("/api/master-data/storage-location/:id", storageLocation.getStorageLocationById);
  app.post("/api/master-data/storage-location", storageLocation.createStorageLocation);
  app.put("/api/master-data/storage-location/:id", storageLocation.updateStorageLocation);
  app.put("/api/master-data/storage-location/:id/deactivate", storageLocation.deactivateStorageLocation);
  app.delete("/api/master-data/storage-location/:id", storageLocation.deleteStorageLocation);

  // Currency routes
  app.get("/api/master-data/currency", currency.getCurrencies);
  app.get("/api/master-data/currency/:id", currency.getCurrencyById);
  app.post("/api/master-data/currency", currency.createCurrency);
  app.post("/api/master-data/currency/bulk-import", currency.bulkImportCurrencies);
  app.put("/api/master-data/currency/:id", currency.updateCurrency);
  app.delete("/api/master-data/currency/:id", currency.deleteCurrency);

  // Shipping Point routes
  app.get("/api/master-data/shipping-point", shippingPoint.getShippingPoints);
  app.get("/api/master-data/shipping-point/:id", shippingPoint.getShippingPointById);
  app.post("/api/master-data/shipping-point", shippingPoint.createShippingPoint);
  app.put("/api/master-data/shipping-point/:id", shippingPoint.updateShippingPoint);
  app.delete("/api/master-data/shipping-point/:id", shippingPoint.deleteShippingPoint);

  // Profit Center routes moved to dedicated router mounted above

  // Supply Types routes - NEW MISSING MASTER DATA TILE
  app.get("/api/master-data/supply-type", supplyTypes.getSupplyTypes);
  app.get("/api/master-data/supply-type/:id", supplyTypes.getSupplyTypeById);
  app.post("/api/master-data/supply-type", supplyTypes.createSupplyType);
  app.patch("/api/master-data/supply-type/:id", supplyTypes.updateSupplyType);
  app.delete("/api/master-data/supply-type/:id", supplyTypes.deleteSupplyType);

  // Purchasing Groups routes - NEW MISSING MASTER DATA TILE  
  app.get("/api/master-data/purchasing-group", purchasingGroups.getPurchasingGroups);
  app.get("/api/master-data/purchasing-group/:id", purchasingGroups.getPurchasingGroupById);
  app.post("/api/master-data/purchasing-group", purchasingGroups.createPurchasingGroup);
  app.post("/api/master-data/purchasing-group/bulk-import", purchasingGroups.bulkImportPurchasingGroups);
  app.patch("/api/master-data/purchasing-group/:id", purchasingGroups.updatePurchasingGroup);
  app.delete("/api/master-data/purchasing-group/:id", purchasingGroups.deletePurchasingGroup);

  // (moved up) Dedicated routers already mounted before aggregate router

  // Materials routes
  app.get("/api/master-data/materials", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const result = await pool.query(`
        SELECT m.*, COALESCE(wu.code, wu2.code, m.dimensions->>'weight_unit') AS weight_unit_code
        FROM materials m
        LEFT JOIN units_of_measure wu ON wu.id = m.weight_uom_id
        LEFT JOIN uom wu2 ON wu2.id = m.weight_uom_id
      `);

      // Transform database fields to frontend expected format
      const transformedResult = result.rows.map((material: any) => ({
        id: material.id,
        material_code: material.code,
        description: material.name || material.description,
        material_type: material.type,
        base_unit: material.base_uom,
        industry_sector: material.industry_sector || 'M',
        material_group: material.material_group || '',
        base_price: material.base_unit_price ?? 0,
        gross_weight: material.gross_weight ?? material.weight ?? 0,
        net_weight: material.net_weight ?? material.weight ?? 0,
        weight_unit: material.weight_unit_code || 'KG',
        volume: material.volume ?? 0,
        volume_unit: material.volume_unit || 'L',
        is_active: material.is_active,
        created_at: material.created_at,
        updated_at: material.updated_at,
        plant_ids: material.plant_code ? [material.plant_code] : [], // Map plant_ids to [plant_code] if present
        plant_code: material.plant_code || null,
        profit_center: material.profit_center || null,
        cost_center: material.cost_center || null,
        min_stock: material.min_stock || 0,
        max_stock: material.max_stock || 0,
        lead_time: material.lead_time || 0,
        price_control: material.price_control || null,
        purchase_organization: material.purchase_organization || null,
        purchasing_group: material.purchasing_group || null,
        production_storage_location: material.production_storage_location || null
      }));

      return res.status(200).json(transformedResult);
    } catch (error) {
      console.error("Error fetching materials:", error);
      return res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.get("/api/master-data/material", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const result = await pool.query(`
        SELECT m.*, COALESCE(wu.code, wu2.code, m.dimensions->>'weight_unit') AS weight_unit_code
        FROM materials m
        LEFT JOIN units_of_measure wu ON wu.id = m.weight_uom_id
        LEFT JOIN uom wu2 ON wu2.id = m.weight_uom_id
      `);

      // Get plant assignments for all materials
      // Legacy logic removed

      // Transform database fields to frontend expected format
      const transformedResult = result.rows.map((material: any) => ({
        id: material.id,
        material_code: material.code,
        description: material.name || material.description,
        material_type: material.type,
        valuation_class: material.valuation_class || null,
        mrp_type: material.mrp_type || null,
        procurement_type: material.procurement_type || null,
        lot_size: material.lot_size || null,
        reorder_point: material.reorder_point || null,
        safety_stock: material.safety_stock || null,
        planned_delivery_time: material.planned_delivery_time || null,
        production_time: material.production_time || null,
        mrp_controller: material.mrp_controller || null,
        base_unit: material.base_uom,
        industry_sector: material.industry_sector || 'M',
        material_group: material.material_group || '',
        base_price: material.base_unit_price ?? 0,
        gross_weight: material.gross_weight ?? material.weight ?? 0,
        net_weight: material.net_weight ?? material.weight ?? 0,
        weight_unit: material.weight_unit || material.weight_unit_code || 'KG',
        volume: material.volume ?? 0,
        volume_unit: material.volume_unit || 'L',
        purchase_organization: material.purchase_organization || null,
        purchasing_group: material.purchasing_group || null,
        production_storage_location: material.production_storage_location || null,
        is_active: material.is_active,
        created_at: material.created_at,
        updated_at: material.updated_at,
        plant_ids: material.plant_code ? [material.plant_code] : [], // Map plant_ids to [plant_code] if present
        plant_code: material.plant_code || null,
        profit_center: material.profit_center || null,
        cost_center: material.cost_center || null,
        min_stock: material.min_stock || 0,
        max_stock: material.max_stock || 0,
        lead_time: material.lead_time || 0,
        price_control: material.price_control || null
      }));

      return res.status(200).json(transformedResult);
    } catch (error) {
      console.error("Error fetching materials:", error);
      return res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  // Sales Organizations - GET endpoint for dropdowns
  app.get("/api/master-data/sales-organizations", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          is_active
        FROM sd_sales_organizations
        WHERE is_active = true
        ORDER BY code ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching sales organizations:", error);
      return res.status(500).json({ message: "Failed to fetch sales organizations" });
    }
  });

  // Distribution Channels - GET endpoint for dropdowns
  app.get("/api/master-data/distribution-channels", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          is_active
        FROM distribution_channels
        WHERE is_active = true
        ORDER BY code ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching distribution channels:", error);
      return res.status(500).json({ message: "Failed to fetch distribution channels" });
    }
  });

  // Divisions - GET endpoint for dropdowns
  app.get("/api/master-data/divisions", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          division_code as code,
          division_name as name,
          is_active
        FROM divisions
        WHERE is_active = true
        ORDER BY division_code ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching divisions:", error);
      return res.status(500).json({ message: "Failed to fetch divisions" });
    }
  });

  // Sales Organizations - GET endpoint for dropdowns (using sd_ table)
  app.get("/api/master-data/sales-organizations", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          is_active
        FROM sd_sales_organizations
        WHERE is_active = true
        ORDER BY code ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching sales organizations:", error);
      return res.status(500).json({ message: "Failed to fetch sales organizations" });
    }
  });

  // Distribution Channels - GET endpoint for dropdowns (using sd_ table)
  app.get("/api/master-data/distribution-channels", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          is_active
        FROM distribution_channels
        WHERE is_active = true
        ORDER BY code ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching distribution channels:", error);
      return res.status(500).json({ message: "Failed to fetch distribution channels" });
    }
  });

  // Divisions - GET endpoint for dropdowns (using sd_ table)
  app.get("/api/master-data/divisions", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          division_code as code,
          division_name as name,
          is_active
        FROM sd_divisions
        WHERE is_active = true
        ORDER BY division_code ASC
      `);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching divisions:", error);
      return res.status(500).json({ message: "Failed to fetch divisions" });
    }
  });

  // ===================================================================
  // MATERIAL ROUTES IN THIS FILE ARE DISABLED
  // Using material.ts router instead (registered at line 108-114)
  // These routes below (POST, PUT, GET, DELETE) are kept for reference only
  // They will NOT be executed because material.ts router is registered first
  // ===================================================================

  app.post("/api/master-data/material", async (req: Request, res: Response) => {
    try {
      console.log('POST /api/master-data/material - Received material data:', req.body);
      const { material_code, description, material_type, valuation_class, mrp_type, procurement_type, lot_size, reorder_point, safety_stock, planned_delivery_time, production_time, mrp_controller, base_unit, industry_sector, material_group, base_price, gross_weight, net_weight, weight_unit, volume, volume_unit, is_active, plant_ids, profit_center, cost_center } = req.body;

      console.log('POST /api/master-data/material - Valuation class details:', {
        valuation_class,
        valuation_class_type: typeof valuation_class,
        valuation_class_value: valuation_class
      });

      // Validate valuation class if provided
      if (valuation_class && material_type) {
        // Check if the material type is allowed for this valuation class
        // NOTE: Using product_types table (not material_types) since frontend uses product_types
        const validationResult = await pool.query(`
          SELECT EXISTS (
            SELECT 1 
            FROM valuation_class_material_types vcmt
            JOIN valuation_classes vc ON vc.id = vcmt.valuation_class_id
            JOIN product_types pt ON pt.id = vcmt.material_type_id
            WHERE vc.class_code = $1 
            AND pt.code = $2
            AND vc.active = true
          ) as is_allowed
        `, [valuation_class, material_type]);

        const isAllowed = validationResult.rows[0]?.is_allowed;

        // Check if this specific valuation class has restrictions
        const vcRestrictions = await pool.query(`
          SELECT COUNT(*) as count 
          FROM valuation_class_material_types vcmt
          JOIN valuation_classes vc ON vc.id = vcmt.valuation_class_id
          WHERE vc.class_code = $1
        `, [valuation_class]);

        // Only validate if the valuation class has restrictions defined
        // If no restrictions, allow any material type
        if (vcRestrictions.rows[0]?.count > 0 && !isAllowed) {
          return res.status(400).json({
            message: `Material type "${material_type}" is not allowed for valuation class "${valuation_class}". Please select a compatible valuation class.`
          });
        }
      }

      // Map frontend field names to database field names
      const code = material_code;
      const name = description;
      const type = material_type || 'FERT';
      const baseUom = base_unit || 'EA';

      // Determine weight and weight UOM
      const weightValue = (typeof net_weight === 'number' && !Number.isNaN(net_weight))
        ? net_weight
        : ((typeof gross_weight === 'number' && !Number.isNaN(gross_weight)) ? gross_weight : 0);
      const weightUomCode = weight_unit || 'KG';

      // Resolve UOM IDs using canonical `uom` table (FK target for materials.uom_id)
      const uomId = await getOrCreateUomId(baseUom, 'Quantity');
      const weightUomId = await getOrCreateUomId(weightUomCode, 'Weight');

      // Handle valuation_class: use null if empty string or undefined, otherwise use the value
      const valuationClassValue = (valuation_class && valuation_class.trim() !== '') ? valuation_class : null;

      // Handle MRP fields: use null if empty string or undefined, otherwise use the value
      const mrpTypeValue = (mrp_type && mrp_type.trim() !== '') ? mrp_type : null;
      const procurementTypeValue = (procurement_type && procurement_type.trim() !== '') ? procurement_type : null;
      const lotSizeValue = (lot_size && lot_size.trim() !== '') ? lot_size : null;
      const reorderPointValue = (reorder_point !== undefined && reorder_point !== null) ? reorder_point : null;
      const safetyStockValue = (safety_stock !== undefined && safety_stock !== null) ? safety_stock : null;
      const plannedDeliveryTimeValue = (planned_delivery_time !== undefined && planned_delivery_time !== null) ? planned_delivery_time : null;
      const productionTimeValue = (production_time !== undefined && production_time !== null) ? production_time : null;
      const mrpControllerValue = (mrp_controller && mrp_controller.trim() !== '') ? mrp_controller : null;

      // Handle profit_center and cost_center: use null if empty string or undefined
      const profitCenterValue = (profit_center && profit_center.trim() !== '') ? profit_center : null;
      const costCenterValue = (cost_center && cost_center.trim() !== '') ? cost_center : null;

      console.log('POST /api/master-data/material - Mapped values:', {
        code, name, type, valuation_class: valuationClassValue, mrp_type: mrpTypeValue, procurement_type: procurementTypeValue, lot_size: lotSizeValue, reorder_point: reorderPointValue, safety_stock: safetyStockValue, planned_delivery_time: plannedDeliveryTimeValue, production_time: productionTimeValue, mrp_controller: mrpControllerValue, baseUom, base_price, uomId, weightValue, weightUomCode, weightUomId, industry_sector, material_group, volume, volume_unit, gross_weight, net_weight, plant_ids
      });

      // Try full insert with all fields including new ones
      try {
        // Handle profit_center and cost_center: use null if empty string or undefined
        const profitCenterValue = (profit_center && profit_center.trim() !== '') ? profit_center : null;
        const costCenterValue = (cost_center && cost_center.trim() !== '') ? cost_center : null;

        const insertParams = [
          code, name, description, type, valuationClassValue, mrpTypeValue, procurementTypeValue, lotSizeValue,
          reorderPointValue, safetyStockValue, plannedDeliveryTimeValue, productionTimeValue, mrpControllerValue,
          baseUom, base_price ?? 0, uomId, weightValue, weightUomId, null, weightUomCode, is_active !== false,
          industry_sector || 'M', material_group || '', volume ?? 0, volume_unit || 'L', gross_weight ?? 0,
          net_weight ?? 0, profitCenterValue, costCenterValue,
          req.body.purchase_organization || null,
          req.body.purchasing_group || null,
          req.body.production_storage_location || null,
          req.body.min_stock || 0,
          req.body.max_stock || 0,
          req.body.lead_time || 0,
          req.body.price_control || null,
          req.body.plant_code || null,
          req.body.item_category_group || null,
          req.body.sales_organization || null,
          req.body.distribution_channel || null,
          req.body.division || null
        ];

        console.log('DEBUG: INSERT Params (Indices 30-41):', insertParams.slice(29));
        console.log('DEBUG: req.body.plant_code:', req.body.plant_code);
        console.log('DEBUG: req.body.min_stock:', req.body.min_stock);

        const result = await pool.query(`
          INSERT INTO materials(
          code, name, description, type, valuation_class, mrp_type, procurement_type, lot_size,
          reorder_point, safety_stock, planned_delivery_time, production_time, mrp_controller,
          base_uom, base_unit_price, uom_id, weight, weight_uom_id, dimensions, is_active,
          created_at, updated_at, industry_sector, material_group, volume, volume_unit,
          gross_weight, net_weight, profit_center, cost_center,
          purchase_organization, purchasing_group, production_storage_location,
          min_stock, max_stock, lead_time, price_control, plant_code, item_category_group,
          sales_organization, distribution_channel, division
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          jsonb_set(COALESCE($19::jsonb, '{}'::jsonb), '{weight_unit}', to_jsonb($20::text), true),
          $21, NOW(), NOW(), $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
        )
        RETURNING *
          `, insertParams);

        console.log('POST /api/master-data/material - Insert result:', {
          inserted_id: result.rows[0]?.id,
          inserted_valuation_class: result.rows[0]?.valuation_class
        });
        const material = result.rows[0];
        // Handle plant assignments if provided
        const materialId = material.id;
        let assignedPlantIds: number[] = [];


        console.log('POST /api/master-data/material - Processing plant assignments: Skipped (Legacy table removed)');


        const transformedMaterial = {
          id: material.id,
          material_code: material.code,
          description: material.name || material.description,
          material_type: material.type,
          valuation_class: material.valuation_class || null,
          base_unit: material.base_uom,
          industry_sector: material.industry_sector || 'M',
          material_group: material.material_group || '',
          item_category_group: material.item_category_group || null,
          base_price: material.base_unit_price ?? 0,
          gross_weight: material.gross_weight ?? material.weight ?? 0,
          net_weight: material.net_weight ?? material.weight ?? 0,
          weight_unit: weightUomCode,
          volume: material.volume ?? 0,
          volume_unit: material.volume_unit || 'L',
          is_active: material.is_active,
          created_at: material.created_at,
          updated_at: material.updated_at,
          plant_ids: assignedPlantIds,
          profit_center: material.profit_center || null,
          cost_center: material.cost_center || null,
          sales_organization: material.sales_organization || null,
          distribution_channel: material.distribution_channel || null,
          division: material.division || null,
          purchase_organization: material.purchase_organization || null,
          purchasing_group: material.purchasing_group || null,
          production_storage_location: material.production_storage_location || null,
          plant_code: material.plant_code || null,
          price_control: material.price_control || null,
          mrp_type: material.mrp_type || null
        };
        return res.status(201).json(transformedMaterial);
      } catch (e: any) {
        console.log('First query failed:', e.message);
        // If weight columns are missing in DB, retry without them
        if (String(e.message || '').includes('weight') || String(e.code || '') === '42703') {
          const fallback = await pool.query(`
            INSERT INTO materials(
            code, name, description, type, valuation_class, base_uom, base_unit_price, uom_id,
            dimensions, is_active, created_at, updated_at, industry_sector, material_group,
            volume, volume_unit, gross_weight, net_weight, profit_center, cost_center,
            purchase_organization, purchasing_group, production_storage_location,
            min_stock, max_stock, lead_time, price_control, plant_code
          )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8,
          jsonb_set(COALESCE($9:: jsonb, '{}':: jsonb), '{weight_unit}', to_jsonb($10:: text), true),
          $11, NOW(), NOW(), $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27
        )
        RETURNING *
          `, [
            code, name, description, type, valuationClassValue, baseUom, base_price ?? 0, uomId, null,
            weightUomCode, is_active !== false, industry_sector || 'M', material_group || '',
            volume ?? 0, volume_unit || 'L', gross_weight ?? 0, net_weight ?? 0, profitCenterValue, costCenterValue,
            req.body.purchase_organization || null,
            req.body.purchasing_group || null,
            req.body.production_storage_location || null,
            req.body.min_stock || 0,
            req.body.max_stock || 0,
            req.body.lead_time || 0,
            req.body.price_control || null,
            req.body.plant_code || null
          ]);
          const m = fallback.rows[0];
          const materialId = m.id;
          let assignedPlantIds: number[] = [];

          // Handle plant assignments in fallback too

          // Handle plant assignments in fallback: Skipped (Legacy table removed)


          return res.status(201).json({
            id: m.id,
            material_code: m.code,
            description: m.name || m.description,
            material_type: m.type,
            base_unit: m.base_uom,
            industry_sector: m.industry_sector || 'M',
            material_group: m.material_group || '',
            base_price: m.base_unit_price ?? 0,
            gross_weight: m.gross_weight ?? m.weight ?? 0,
            net_weight: m.net_weight ?? m.weight ?? 0,
            weight_unit: weightUomCode,
            volume: m.volume ?? 0,
            volume_unit: m.volume_unit || 'L',
            is_active: m.is_active,
            created_at: m.created_at,
            updated_at: m.updated_at,
            plant_ids: assignedPlantIds,
            profit_center: m.profit_center || null,
            cost_center: m.cost_center || null
          });
        }
        throw e;
      }
    } catch (error) {
      console.error("Error creating material:", error);
      return res.status(500).json({ message: "Failed to create material", error: (error as any).message });
    }
  });

  // PUT - Update material
  app.put("/api/master-data/material/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { material_code, description, material_type, valuation_class, mrp_type, procurement_type, lot_size, reorder_point, safety_stock, planned_delivery_time, production_time, mrp_controller, base_unit, industry_sector, material_group, item_category_group, base_price, gross_weight, net_weight, weight_unit, volume, volume_unit, is_active, plant_ids, plant_code, profit_center, cost_center, purchase_organization, purchasing_group, division, production_storage_location } = req.body;

      console.log('PUT /api/master-data/material/:id - Received data:', {
        id,
        material_code,
        material_type,
        item_category_group,
        valuation_class,
        valuation_class_type: typeof valuation_class,
        valuation_class_value: valuation_class,
        material_group: material_group,
        material_group_type: typeof material_group,
        purchase_organization,
        purchasing_group,
        division
      });

      // Validate valuation class if provided (non-blocking - just log warning)
      if (valuation_class && material_type) {
        try {
          const validationResult = await pool.query(`
            SELECT EXISTS(
            SELECT 1 
              FROM valuation_class_material_types vcmt
              JOIN valuation_classes vc ON vc.id = vcmt.valuation_class_id
              JOIN product_types pt ON pt.id = vcmt.material_type_id
              WHERE vc.class_code = $1 
              AND pt.code = $2
              AND vc.active = true
          ) as is_allowed
        `, [valuation_class, material_type]);

          const isAllowed = validationResult.rows[0]?.is_allowed;

          // Check if this specific valuation class has restrictions
          const vcRestrictions = await pool.query(`
            SELECT COUNT(*) as count 
            FROM valuation_class_material_types vcmt
            JOIN valuation_classes vc ON vc.id = vcmt.valuation_class_id
            WHERE vc.class_code = $1
          `, [valuation_class]);

          // Only warn if the valuation class has restrictions defined and it's not allowed
          // But don't block the update - allow it to proceed
          if (vcRestrictions.rows[0]?.count > 0 && !isAllowed) {
            console.warn(`Warning: Material type "${material_type}" may not be compatible with valuation class "${valuation_class}", but allowing update to proceed.`);
            // Don't return error - just log warning and continue
          }
        } catch (validationError: any) {
          // If validation query fails, just log and continue (don't block update)
          console.warn('Valuation class validation check failed:', validationError.message);
        }
      }

      // Map frontend field names to database field names
      const code = material_code;
      const name = description;
      const type = material_type;
      const baseUom = base_unit;

      // Handle valuation_class: use null if empty string or undefined, otherwise use the value
      const valuationClassValue = (valuation_class && valuation_class.trim() !== '') ? valuation_class : null;

      // Handle mrp_type: use null if empty string or undefined, otherwise use the value
      const mrpTypeValue = (mrp_type && mrp_type.trim() !== '') ? mrp_type : null;

      // Handle MRP fields: use null if empty string or undefined, otherwise use the value
      const procurementTypeValue = (procurement_type && procurement_type.trim() !== '') ? procurement_type : null;
      const lotSizeValue = (lot_size && lot_size.trim() !== '') ? lot_size : null;
      const reorderPointValue = (reorder_point !== undefined && reorder_point !== null) ? reorder_point : null;
      const safetyStockValue = (safety_stock !== undefined && safety_stock !== null) ? safety_stock : null;
      const plannedDeliveryTimeValue = (planned_delivery_time !== undefined && planned_delivery_time !== null) ? planned_delivery_time : null;
      const productionTimeValue = (production_time !== undefined && production_time !== null) ? production_time : null;
      const mrpControllerValue = (mrp_controller && mrp_controller.trim() !== '') ? mrp_controller : null;

      // Handle material_group: use empty string if undefined or null, otherwise use the value
      const materialGroupValue = material_group !== undefined && material_group !== null ? material_group : '';

      // Handle profit_center and cost_center: use null if empty string or undefined
      const profitCenterValue = (profit_center && profit_center.trim() !== '') ? profit_center : null;
      const costCenterValue = (cost_center && cost_center.trim() !== '') ? cost_center : null;
      const purchaseOrganizationValue = (purchase_organization && purchase_organization.trim() !== '') ? purchase_organization : null;
      const purchasingGroupValue = (purchasing_group && purchasing_group.trim() !== '') ? purchasing_group : null;
      const divisionValue = (division && division.trim() !== '') ? division : null;
      const productionStorageLocationValue = (production_storage_location && production_storage_location.trim() !== '') ? production_storage_location : null;
      // Safer check for plant_code
      const plantCodeValue = (req.body.plant_code && req.body.plant_code.trim() !== '')
        ? req.body.plant_code
        : ((req.body.plantCode && req.body.plantCode.trim() !== '') ? req.body.plantCode : null);

      // Determine weight and weight UOM
      const weightValue = (typeof net_weight === 'number' && !Number.isNaN(net_weight))
        ? net_weight
        : ((typeof gross_weight === 'number' && !Number.isNaN(gross_weight)) ? gross_weight : 0);
      const weightUomCode = weight_unit || 'KG';

      // Resolve UOM IDs using canonical `uom` table (FK target for materials.uom_id)
      const uomId = await getOrCreateUomId(baseUom, 'Quantity');
      const weightUomId = await getOrCreateUomId(weightUomCode, 'Weight');

      console.log('PUT /api/master-data/material/:id - Mapped values:', {
        code,
        name,
        type,
        valuation_class: valuationClassValue,
        mrp_type: mrpTypeValue,
        baseUom,
        base_price: base_price ?? 0,
        is_active,
        id,
        plant_code: plantCodeValue,
        plant_ids,
        plant_ids_type: typeof plant_ids,
        is_array: Array.isArray(plant_ids),
        length: plant_ids?.length || 0,
        material_group: materialGroupValue,
        industry_sector: industry_sector || 'M',
        weightValue,
        weightUomId,
        volume: volume ?? 0,
        volume_unit: volume_unit || 'L',
        gross_weight: gross_weight ?? 0,
        net_weight: net_weight ?? 0
      });

      const result = await pool.query(`
        UPDATE materials 
        SET code = $1,
          name = $2,
          description = $3,
          type = $4,
          valuation_class = $5,
          mrp_type = $6,
          procurement_type = $7,
          lot_size = $8,
          reorder_point = $9,
          safety_stock = $10,
          planned_delivery_time = $11,
          production_time = $12,
          mrp_controller = $13,
          base_uom = $14,
          base_unit_price = $15,
          uom_id = $16,
          weight = $17,
          weight_uom_id = $18,
          dimensions = jsonb_set(COALESCE(dimensions:: jsonb, '{}':: jsonb), '{weight_unit}', to_jsonb($19:: text), true),
          is_active = $20,
          industry_sector = $21,
          material_group = $22,
          volume = $23,
          volume_unit = $24,
          gross_weight = $25,
          net_weight = $26,
          profit_center = $27,
          cost_center = $28,
          purchase_organization = $29,
          purchasing_group = $30,
          production_storage_location = $31,
          plant_code = $32,
          min_stock = $33,
          max_stock = $34,
          lead_time = $35,
          price_control = $36,
          division = $37,
          item_category_group = $38,
          updated_at = NOW()
        WHERE id = $39
        RETURNING *
          `, [
        code,
        name,
        description,
        type,
        valuationClassValue,
        mrpTypeValue,
        procurementTypeValue,
        lotSizeValue,
        reorderPointValue,
        safetyStockValue,
        plannedDeliveryTimeValue,
        productionTimeValue,
        mrpControllerValue,
        baseUom,
        base_price ?? 0,
        uomId,
        weightValue,
        weightUomId,
        weightUomCode,
        is_active !== false,
        industry_sector || 'M',
        materialGroupValue,
        volume ?? 0,
        volume_unit || 'L',
        gross_weight ?? 0,
        net_weight ?? 0,
        profitCenterValue,
        costCenterValue,
        purchaseOrganizationValue,
        purchasingGroupValue,
        productionStorageLocationValue,
        plantCodeValue,
        req.body.min_stock || 0,
        req.body.max_stock || 0,
        req.body.lead_time || 0,
        req.body.price_control || null,
        divisionValue,
        item_category_group || null,
        id
      ]);

      console.log('PUT /api/master-data/material/:id - Update result:', {
        rows_updated: result.rowCount,
        updated_valuation_class: result.rows[0]?.valuation_class,
        updated_mrp_type: result.rows[0]?.mrp_type,
        updated_material_group: result.rows[0]?.material_group,
        updated_item_category_group: result.rows[0]?.item_category_group,
        updated_purchase_organization: result.rows[0]?.purchase_organization,
        updated_purchasing_group: result.rows[0]?.purchasing_group,
        updated_division: result.rows[0]?.division
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Material not found" });
      }

      // Lookup weight unit code from either units_of_measure or uom
      const materialRow = result.rows[0];
      let weightUnitCode = 'KG';
      if (materialRow.weight_uom_id) {
        const weightCodeLookup = await pool.query(`
          SELECT COALESCE(wu.code, wu2.code) AS code
        FROM(SELECT $1:: int AS id) x
          LEFT JOIN units_of_measure wu ON wu.id = x.id
          LEFT JOIN uom wu2 ON wu2.id = x.id
          `, [materialRow.weight_uom_id]);
        weightUnitCode = weightCodeLookup.rows[0]?.code || 'KG';
      }

      // Handle plant assignments if provided
      let assignedPlantIds: number[] = [];


      console.log('PUT /api/master-data/material/:id - Processing plant assignments: Skipped (Legacy table removed)');


      // Transform back to frontend format
      const transformedMaterial = {
        id: materialRow.id,
        plant_code: materialRow.plant_code || null,
        material_code: materialRow.code,
        description: materialRow.name || materialRow.description,
        material_type: materialRow.type,
        valuation_class: materialRow.valuation_class || null,
        base_unit: materialRow.base_uom,
        industry_sector: materialRow.industry_sector || 'M',
        material_group: materialRow.material_group || '',
        base_price: materialRow.base_unit_price ?? 0,
        gross_weight: materialRow.gross_weight ?? materialRow.weight ?? 0,
        net_weight: materialRow.net_weight ?? materialRow.weight ?? 0,
        weight_unit: weightUnitCode,
        volume: materialRow.volume ?? 0,
        volume_unit: materialRow.volume_unit || 'L',
        is_active: materialRow.is_active,
        created_at: materialRow.created_at,
        updated_at: materialRow.updated_at,
        plant_ids: assignedPlantIds,
        profit_center: materialRow.profit_center || null,
        cost_center: materialRow.cost_center || null,
        item_category_group: materialRow.item_category_group || null,
        sales_organization: materialRow.sales_organization || null,
        distribution_channel: materialRow.distribution_channel || null,
        division: materialRow.division || null,
        purchase_organization: materialRow.purchase_organization || null,
        purchasing_group: materialRow.purchasing_group || null,
        production_storage_location: materialRow.production_storage_location || null,
        price_control: materialRow.price_control || null,
        mrp_type: materialRow.mrp_type || null
      };

      return res.status(200).json(transformedMaterial);
    } catch (error) {
      console.error("Error updating material:", error);
      return res.status(500).json({ message: "Failed to update material", error: error.message });
    }
  });

  // DELETE - Delete material
  app.delete("/api/master-data/material/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        DELETE FROM materials 
        WHERE id = $1
        RETURNING *
          `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Material not found" });
      }

      return res.status(200).json({ message: "Material deleted successfully" });
    } catch (error) {
      console.error("Error deleting material:", error);
      return res.status(500).json({ message: "Failed to delete material", error: error.message });
    }
  });

  // Customer Contact routes
  app.get("/api/master-data/customer-contact", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.query;

      if (!customerId) {
        return res.status(400).json({ message: "Customer ID is required" });
      }

      const result = await pool.query(`
  SELECT * FROM erp_customer_contacts 
        WHERE customer_id = $1 AND is_active = true 
        ORDER BY is_primary DESC, first_name, last_name
    `, [customerId]);

      // Transform the data to match frontend expectations
      const transformedData = result.rows.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        firstName: row.first_name,
        lastName: row.last_name,
        position: row.position,
        phone: row.phone,
        email: row.email,
        isPrimary: row.is_primary,
        department: row.department,
        mobile: row.mobile,
        isBilling: row.is_billing,
        isShipping: row.is_shipping,
        isTechnical: row.is_technical,
        isMarketing: row.is_marketing,
        preferredLanguage: row.preferred_language,
        notes: row.notes,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      console.log(`✅ Customer contacts fetched: ${transformedData.length} records for customer ${customerId}`);
      return res.status(200).json(transformedData);
    } catch (error) {
      console.error("Error fetching customer contacts:", error);
      return res.status(500).json({ message: "Failed to fetch customer contacts" });
    }
  });

  app.post("/api/master-data/customer/:customerId/contacts", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { firstName, lastName, position, phone, email, isPrimary, department, mobile } = req.body;

      const result = await pool.query(`
        INSERT INTO erp_customer_contacts(
      customer_id, first_name, last_name, position, phone, email,
      is_primary, department, mobile, is_active, created_at, updated_at
    )
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
  RETURNING *
    `, [customerId, firstName, lastName, position, phone, email, isPrimary, department, mobile]);

      const newContact = result.rows[0];
      const transformedData = {
        id: newContact.id,
        customerId: newContact.customer_id,
        firstName: newContact.first_name,
        lastName: newContact.last_name,
        position: newContact.position,
        phone: newContact.phone,
        email: newContact.email,
        isPrimary: newContact.is_primary,
        department: newContact.department,
        mobile: newContact.mobile,
        isBilling: newContact.is_billing,
        isShipping: newContact.is_shipping,
        isTechnical: newContact.is_technical,
        isMarketing: newContact.is_marketing,
        preferredLanguage: newContact.preferred_language,
        notes: newContact.notes,
        isActive: newContact.is_active,
        createdAt: newContact.created_at,
        updatedAt: newContact.updated_at
      };

      console.log('✅ Customer contact created successfully:', transformedData);
      return res.status(201).json(transformedData);
    } catch (error) {
      console.error("Error creating customer contact:", error);
      return res.status(500).json({ message: "Failed to create customer contact", error: error.message });
    }
  });

  // Vendors routes
  app.get("/api/master-data/vendors", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const result = await pool.query("SELECT * FROM vendors");
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      return res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });



  // Units of Measure routes
  app.get("/api/master-data/units-of-measure", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const result = await pool.query('SELECT * FROM units_of_measure WHERE "_deletedAt" IS NULL');

      // Transform the data to match frontend expectations
      const transformedData = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        category: row.category || 'Other',
        isBase: row.is_base || false,
        isActive: row.is_active !== false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        _tenantId: row._tenantId,
        _deletedAt: row._deletedAt
      }));

      return res.status(200).json(transformedData);
    } catch (error) {
      console.error("Error fetching units of measure:", error);
      return res.status(500).json({ message: "Failed to fetch units of measure" });
    }
  });

  // POST - Create new UOM
  app.post("/api/master-data/units-of-measure", async (req: Request, res: Response) => {
    try {
      const { code, name, description, category, isBase, isActive } = req.body;
      const userId = (req as any).user?.id || 1;
      const tenantId = (req as any).user?.tenantId || '001';

      const result = await pool.query(`
        INSERT INTO units_of_measure(code, name, description, category, dimension, is_base, is_active, active, created_at, updated_at, created_by, updated_by, "_tenantId")
        VALUES($1, $2, $3, $4, $4, $5, $6, $6, NOW(), NOW(), $7, $8, $9)
        RETURNING *
      `, [code, name, description, category || 'Other', isBase, isActive !== false, userId, userId, tenantId]);

      const newUom = result.rows[0];
      const transformedData = {
        id: newUom.id,
        code: newUom.code,
        name: newUom.name,
        description: newUom.description,
        category: newUom.category || 'Other',
        isBase: newUom.is_base || false,
        isActive: newUom.is_active !== false,
        createdAt: newUom.created_at,
        updatedAt: newUom.updated_at,
        createdBy: newUom.created_by,
        updatedBy: newUom.updated_by,
        _tenantId: newUom._tenantId,
        _deletedAt: newUom._deletedAt
      };

      return res.status(201).json(transformedData);
    } catch (error) {
      console.error("Error creating unit of measure:", error);
      return res.status(500).json({ message: "Failed to create unit of measure" });
    }
  });

  // PATCH/PUT - Update UOM
  const updateUomHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { code, name, description, category, isBase, isActive } = req.body;
      const userId = (req as any).user?.id || 1;

      const result = await pool.query(`
        UPDATE units_of_measure 
        SET code = COALESCE($1, code),
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            category = COALESCE($4, category),
            dimension = COALESCE($4, dimension),
            is_base = COALESCE($5, is_base),
            is_active = COALESCE($6, is_active),
            active = COALESCE($6, active),
            updated_at = NOW(),
            updated_by = $7
        WHERE id = $8
        RETURNING *
      `, [code, name, description, category, isBase, isActive, userId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Unit of measure not found" });
      }

      const updatedUom = result.rows[0];
      const transformedData = {
        id: updatedUom.id,
        code: updatedUom.code,
        name: updatedUom.name,
        description: updatedUom.description,
        category: updatedUom.category || 'Other',
        isBase: updatedUom.is_base || false,
        isActive: updatedUom.is_active !== false,
        createdAt: updatedUom.created_at,
        updatedAt: updatedUom.updated_at,
        createdBy: updatedUom.created_by,
        updatedBy: updatedUom.updated_by,
        _tenantId: updatedUom._tenantId,
        _deletedAt: updatedUom._deletedAt
      };

      return res.status(200).json(transformedData);
    } catch (error) {
      console.error("Error updating unit of measure:", error);
      return res.status(500).json({ message: "Failed to update unit of measure" });
    }
  };

  app.patch("/api/master-data/units-of-measure/:id", updateUomHandler);
  app.put("/api/master-data/units-of-measure/:id", updateUomHandler);

  // DELETE - Delete UOM
  app.delete("/api/master-data/units-of-measure/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 1;

      const result = await pool.query(`
        UPDATE units_of_measure SET is_active = false, active = false, "_deletedAt" = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $1 RETURNING *
      `, [id, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Unit of measure not found" });
      }

      return res.status(200).json({ message: "Unit of measure deleted successfully" });
    } catch (error) {
      console.error("Error deleting unit of measure:", error);
      return res.status(500).json({ message: "Failed to delete unit of measure" });
    }
  });

  // UOM routes (alias for units-of-measure)
  app.get("/api/master-data/uom", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const result = await pool.query('SELECT * FROM units_of_measure WHERE "_deletedAt" IS NULL');
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching UOMs:", error);
      return res.status(500).json({ message: "Failed to fetch UOMs" });
    }
  });

  // Currencies routes
  // Ensure plural alias returns the same mapped format as singular route
  app.get("/api/master-data/currencies", (req: Request, res: Response) => {
    return currency.getCurrencies(req, res);
  });

  // Cost Centers routes
  app.get("/api/master-data/cost-centers", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      // Join with profit_centers to get profit center code for auto-fill functionality
      const result = await pool.query(`
        SELECT 
          *,
          cost_center as code,
          description as name,
          "_tenantId" as tenant_id,
          created_by,
          updated_by
        FROM cost_centers
        ORDER BY cost_center, id
      `);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
      return res.status(500).json({ message: "Failed to fetch cost centers" });
    }
  });

  // Purchase Groups (both singular and plural routes for compatibility)
  app.get("/api/master-data/purchase-group", purchaseReferences.getPurchaseGroups);
  app.get("/api/master-data/purchase-group/:id", purchaseReferences.getPurchaseGroupById);
  app.post("/api/master-data/purchase-group", purchaseReferences.createPurchaseGroup);
  app.put("/api/master-data/purchase-group/:id", purchaseReferences.updatePurchaseGroup);
  app.delete("/api/master-data/purchase-group/:id", purchaseReferences.deletePurchaseGroup);

  // Purchasing Groups (plural routes)
  app.get("/api/master-data/purchasing-groups", purchaseReferences.getPurchaseGroups);
  app.get("/api/master-data/purchasing-groups/:id", purchaseReferences.getPurchaseGroupById);
  app.post("/api/master-data/purchasing-groups", purchaseReferences.createPurchaseGroup);
  app.put("/api/master-data/purchasing-groups/:id", purchaseReferences.updatePurchaseGroup);
  app.delete("/api/master-data/purchasing-groups/:id", purchaseReferences.deletePurchaseGroup);

  // Supply Types (both singular and plural routes for compatibility)
  app.get("/api/master-data/supply-type", purchaseReferences.getSupplyTypes);
  app.get("/api/master-data/supply-type/:id", purchaseReferences.getSupplyTypeById);
  app.post("/api/master-data/supply-type", purchaseReferences.createSupplyType);
  app.put("/api/master-data/supply-type/:id", purchaseReferences.updateSupplyType);
  app.delete("/api/master-data/supply-type/:id", purchaseReferences.deleteSupplyType);

  // Fixed Supply Types routes (plural routes working)
  app.get("/api/master-data/supply-types", supplyTypesFixed.getSupplyTypes);
  app.get("/api/master-data/supply-types/:id", supplyTypesFixed.getSupplyTypeById);
  app.post("/api/master-data/supply-types", supplyTypesFixed.createSupplyType);
  app.put("/api/master-data/supply-types/:id", supplyTypesFixed.updateSupplyType);
  app.delete("/api/master-data/supply-types/:id", supplyTypesFixed.deleteSupplyType);
  app.post("/api/master-data/supply-types/bulk-import", supplyTypesFixed.bulkImportSupplyTypes);

  // Credit Control Areas
  app.get("/api/master-data/credit-control", creditControl.getCreditControlAreas);
  app.get("/api/master-data/credit-control/:id", creditControl.getCreditControlAreaById);
  app.post("/api/master-data/credit-control", creditControl.createCreditControlArea);
  app.put("/api/master-data/credit-control/:id", creditControl.updateCreditControlArea);
  app.delete("/api/master-data/credit-control/:id", creditControl.deleteCreditControlArea);

  // Credit Control Areas - aliases for compatibility
  app.get("/api/credit-control-areas", creditControl.getCreditControlAreas);
  app.get("/api/credit-control-areas/:id", creditControl.getCreditControlAreaById);
  app.post("/api/credit-control-areas", creditControl.createCreditControlArea);
  app.put("/api/credit-control-areas/:id", creditControl.updateCreditControlArea);
  app.delete("/api/credit-control-areas/:id", creditControl.deleteCreditControlArea);
  app.get("/credit-control-areas", creditControl.getCreditControlAreas);
  app.get("/credit-control-areas/:id", creditControl.getCreditControlAreaById);
  app.post("/credit-control-areas", creditControl.createCreditControlArea);
  app.put("/credit-control-areas/:id", creditControl.updateCreditControlArea);
  app.delete("/credit-control-areas/:id", creditControl.deleteCreditControlArea);

  // GL Account Groups
  app.use("/api/master-data/gl-account-groups", glAccountGroupsRouter);

  // Posting Period Controls
  app.use("/api/master-data/posting-period-controls", postingPeriodControlsRouter);

  // Retained Earnings Accounts
  app.use("/api/master-data/retained-earnings-accounts", retainedEarningsAccountsRouter);

  // Fiscal Year Variants
  app.use("/api/master-data/fiscal-year-variants", fiscalYearVariantsRouter);

  // Approval Levels
  app.get("/api/master-data/approval-level", approvalLevel.getApprovalLevels);
  app.get("/api/master-data/approval-level/:id", approvalLevel.getApprovalLevelById);
  app.post("/api/master-data/approval-level", approvalLevel.createApprovalLevel);
  app.put("/api/master-data/approval-level/:id", approvalLevel.updateApprovalLevel);
  app.delete("/api/master-data/approval-level/:id", approvalLevel.deleteApprovalLevel);

  // Register routes for master data tables
  app.get("/api/master-data/sales-organization", getSalesOrganization);
  app.put("/api/master-data/sales-organization/:id", updateSalesOrganization);
  app.delete("/api/master-data/sales-organization/:id", deleteSalesOrganization);

  // Purchase Organization routes (both singular and plural for compatibility)
  app.get("/api/master-data/purchase-organization", getPurchaseOrganization);
  app.get("/api/master-data/purchase-organizations", getPurchaseOrganization);  // Plural alias
  app.post("/api/master-data/purchase-organization", createPurchaseOrganization);
  app.post("/api/master-data/purchase-organizations", createPurchaseOrganization);  // Plural alias
  app.put("/api/master-data/purchase-organization/:id", updatePurchaseOrganization);
  app.put("/api/master-data/purchase-organizations/:id", updatePurchaseOrganization);  // Plural alias
  app.delete("/api/master-data/purchase-organization/:id", deletePurchaseOrganization);
  app.delete("/api/master-data/purchase-organizations/:id", deletePurchaseOrganization);  // Plural alias
  // Remove duplicate route - already registered above
  // app.get("/api/master-data/storage-location", getStorageLocation);
  // Removed duplicate currency GET; currency routes are defined above
  app.get("/api/master-data/uom", getUom);

  // UOM Conversions routes
  app.get("/api/master-data/uom-conversions", uomConversions.getAllConversions);
  app.get("/api/master-data/uom-conversions/:id", uomConversions.getConversionById);
  app.post("/api/master-data/uom-conversions", uomConversions.createConversion);
  app.put("/api/master-data/uom-conversions/:id", uomConversions.updateConversion);
  app.delete("/api/master-data/uom-conversions/:id", uomConversions.deleteConversion);

  app.get("/api/master-data/fiscal-period", getFiscalPeriod);
  app.post("/api/master-data/fiscal-period", createFiscalPeriod);
  app.put("/api/master-data/fiscal-period/:id", updateFiscalPeriod);
  app.delete("/api/master-data/fiscal-period/:id", deleteFiscalPeriod);
  app.use("/api/master-data/material", getMaterial);

  // BOM routes
  app.use("/api/master-data/bom", bomRouter);

  // POST routes that were missing - adding them here to be properly registered

  // Purchasing Groups routes
  app.get("/api/master-data/purchasing-groups", purchasingGroups.getPurchasingGroups);
  app.get("/api/master-data/purchasing-groups/:id", purchasingGroups.getPurchasingGroupById);
  app.post("/api/master-data/purchasing-groups", purchasingGroups.createPurchasingGroup);

  // Sales Organization POST route
  app.post("/api/master-data/sales-organization", createSalesOrganization);

  // Purchase Organization POST route - Already registered above with plural alias (line ~2585)

  // Cost Center POST route
  app.post("/api/master-data/cost-center", async (req: Request, res: Response) => {
    try {
      console.log('📥 Cost Center CREATE request body (master-data):', JSON.stringify(req.body, null, 2));

      const {
        cost_center, description, cost_center_category, company_code_id,
        controlling_area, hierarchy_area, responsible_person, valid_from, valid_to, active
      } = req.body;

      // Validate required fields
      if (!cost_center || !description || !cost_center_category) {
        return res.status(400).json({
          message: 'Cost center, description, and category are required'
        });
      }

      // Validate cost_center format (should be 1-10 characters)
      if (cost_center.length < 1 || cost_center.length > 10) {
        return res.status(400).json({ message: 'Cost center code must be between 1 and 10 characters' });
      }

      // Validate description format (should be 1-100 characters)
      if (description.length < 1 || description.length > 100) {
        return res.status(400).json({ message: 'Description must be between 1 and 100 characters' });
      }

      // Check if cost_center already exists
      const existingCenter = await pool.query(
        'SELECT id FROM cost_centers WHERE cost_center = $1',
        [cost_center]
      );

      if (existingCenter.rows.length > 0) {
        return res.status(409).json({ message: 'Cost center with this code already exists' });
      }

      // Debug the parameters before query
      const params = [
        cost_center, description, cost_center_category, company_code_id || null,
        controlling_area || 'A000', hierarchy_area || null, responsible_person || null,
        valid_from, valid_to || null, active !== false,
        (req as any).user?.id || 1, (req as any).user?.id || 1, (req as any).user?.tenantId || '001'
      ];

      console.log('📤 SQL Parameters (master-data):', params);
      console.log('📤 Parameter types (master-data):', params.map(p => typeof p));

      const result = await pool.query(`
        INSERT INTO cost_centers(
      cost_center, description, cost_center_category, company_code_id,
      controlling_area, hierarchy_area, responsible_person, valid_from, valid_to,
      active, created_at, updated_at, created_by, updated_by, "_tenantId"
    )
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), $11, $12, $13)
  RETURNING *
    `, params);

      console.log('✅ Cost Center created successfully (master-data):', result.rows[0]);
      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error("❌ Error creating cost center (master-data):", error);
      return res.status(500).json({ message: "Failed to create cost center", error: error.message });
    }
  });

  // Cost Center PUT route
  app.put("/api/master-data/cost-center/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        cost_center, description, cost_center_category, company_code_id,
        controlling_area, hierarchy_area, responsible_person, valid_from, valid_to, active
      } = req.body;

      // Check if cost_center exists
      const existingCenter = await pool.query('SELECT id FROM cost_centers WHERE id = $1', [id]);
      if (existingCenter.rows.length === 0) {
        return res.status(404).json({ message: 'Cost center not found' });
      }

      // Check for code conflict
      const codeCheck = await pool.query(
        'SELECT id FROM cost_centers WHERE cost_center = $1 AND id != $2',
        [cost_center, id]
      );
      if (codeCheck.rows.length > 0) {
        return res.status(409).json({ message: 'Cost center with this code already exists' });
      }

      const params = [
        cost_center, description, cost_center_category, company_code_id || null,
        controlling_area || 'A000', hierarchy_area || null, responsible_person || null,
        valid_from, valid_to || null, active !== false,
        (req as any).user?.id || 1,
        id
      ];

      const result = await pool.query(`
        UPDATE cost_centers SET
          cost_center = $1, description = $2, cost_center_category = $3, company_code_id = $4,
          controlling_area = $5, hierarchy_area = $6, responsible_person = $7, valid_from = $8, valid_to = $9,
          active = $10, updated_at = NOW(), updated_by = $11
        WHERE id = $12
        RETURNING *
      `, params);

      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error("❌ Error updating cost center:", error);
      return res.status(500).json({ message: "Failed to update cost center", error: error.message });
    }
  });

  // Cost Center DELETE route
  app.delete("/api/master-data/cost-center/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM cost_centers WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Cost center deleted successfully' });
    } catch (error: any) {
      console.error("❌ Error deleting cost center:", error);
      return res.status(500).json({ message: "Failed to delete cost center", error: error.message });
    }
  });

  // Register Currency Denomination routes
  app.use("/api/master-data/currency-denomination", currencyDenominationRouter);

  // Register Exchange Rate Type routes
  app.use("/api/master-data/exchange-rate-type", exchangeRateTypeRouter);

  // Fixed Material Groups routes (new implementation)
  app.get("/api/master-data/material-groups", materialGroups.getMaterialGroups);
  app.get("/api/master-data/material-groups/:id", materialGroups.getMaterialGroupById);
  app.post("/api/master-data/material-groups", materialGroups.createMaterialGroup);
  app.put("/api/master-data/material-groups/:id", materialGroups.updateMaterialGroup);
  app.delete("/api/master-data/material-groups/:id", materialGroups.deleteMaterialGroup);
  app.post("/api/master-data/material-groups/bulk-import", materialGroups.bulkImportMaterialGroups);

  // Document Categories routes
  app.get("/api/master-data/document-categories", documentCategories.getDocumentCategories);
  app.get("/api/master-data/document-categories/:id", documentCategories.getDocumentCategoryById);
  app.post("/api/master-data/document-categories", documentCategories.createDocumentCategory);
  app.put("/api/master-data/document-categories/:id", documentCategories.updateDocumentCategory);
  app.delete("/api/master-data/document-categories/:id", documentCategories.deleteDocumentCategory);
  app.post("/api/master-data/document-categories/bulk-import", documentCategories.bulkImportDocumentCategories);

  // Sales Document Categories routes
  app.get("/api/master-data/sales-document-categories", salesDocumentCategories.getSalesDocumentCategories);
  app.get("/api/master-data/sales-document-categories/:id", salesDocumentCategories.getSalesDocumentCategoryById);
  app.post("/api/master-data/sales-document-categories", salesDocumentCategories.createSalesDocumentCategory);
  app.put("/api/master-data/sales-document-categories/:id", salesDocumentCategories.updateSalesDocumentCategory);
  app.delete("/api/master-data/sales-document-categories/:id", salesDocumentCategories.deleteSalesDocumentCategory);

  // Account Types routes
  app.get("/api/master-data/account-types", accountTypes.getAccountTypes);
  app.get("/api/master-data/account-types/:id", accountTypes.getAccountTypeById);
  app.post("/api/master-data/account-types", accountTypes.createAccountType);
  app.put("/api/master-data/account-types/:id", accountTypes.updateAccountType);
  app.delete("/api/master-data/account-types/:id", accountTypes.deleteAccountType);

  // Document Types routes
  app.get("/api/master-data/document-types", documentTypes.getDocumentTypes);
  app.get("/api/master-data/document-types/:id", documentTypes.getDocumentTypeById);
  app.post("/api/master-data/document-types", documentTypes.createDocumentType);
  app.put("/api/master-data/document-types/:id", documentTypes.updateDocumentType);
  app.delete("/api/master-data/document-types/:id", documentTypes.deleteDocumentType);

  // Accounting Principles routes
  app.use("/api/master-data/accounting-principles", accountingPrinciplesRouter);

  // Fixed Distribution Channels routes (new implementation) - Register BEFORE allMasterDataRoutes to ensure precedence
  app.get("/api/master-data/distribution-channels", distributionChannelsFixed.getDistributionChannels);
  app.get("/api/master-data/distribution-channels/:id", distributionChannelsFixed.getDistributionChannelById);
  app.post("/api/master-data/distribution-channels", distributionChannelsFixed.createDistributionChannel);
  app.put("/api/master-data/distribution-channels/:id", distributionChannelsFixed.updateDistributionChannel);
  app.delete("/api/master-data/distribution-channels/:id", distributionChannelsFixed.deleteDistributionChannel);
  app.post("/api/master-data/distribution-channels/bulk-import", distributionChannelsFixed.bulkImportDistributionChannels);

  // Sales Areas routes (salesAreasFixed implementation)
  app.get("/api/master-data/sales-areas", salesAreasFixed.getSalesAreas);
  app.get("/api/master-data/sales-areas/:id", salesAreasFixed.getSalesAreaById);
  app.post("/api/master-data/sales-areas", salesAreasFixed.createSalesArea);
  app.put("/api/master-data/sales-areas/:id", salesAreasFixed.updateSalesArea);
  app.delete("/api/master-data/sales-areas/:id", salesAreasFixed.deleteSalesArea);
  app.post("/api/master-data/sales-areas/bulk-import", salesAreasFixed.bulkImportSalesAreas);

  // Chart of Depreciation routes
  app.use("/api/master-data/chart-of-depreciation", chartOfDepreciationRouter);

  // Number Range Objects routes
  app.use("/api/master-data/number-range-objects", numberRangeObjectsRouter);

  // Ledgers routes
  app.use("/api/master-data/ledgers", ledgersRouter);

  // Document Splitting Configuration Routes
  app.use("/api/master-data/document-splitting", documentSplittingRouter);

  // Management Control Areas routes
  app.get("/api/controlling-areas", managementControlAreas.getManagementControlAreas);
  app.get("/api/controlling-areas/:id", managementControlAreas.getManagementControlAreaById);
  app.post("/api/controlling-areas", managementControlAreas.createManagementControlArea);
  app.patch("/api/controlling-areas/:id", managementControlAreas.updateManagementControlArea);
  app.delete("/api/controlling-areas/:id", managementControlAreas.deleteManagementControlArea);

  // Employees routes
  app.use("/api/master-data/employees", employeesRouter);

  // Purchasing Item Categories
  app.use("/api/master-data/purchasing-item-categories", purchasingItemCategoriesRouter);

  // Transaction Keys routes
  app.use("/api/master-data/transaction-keys", transactionKeysRouter);
}