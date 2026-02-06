import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, decimal, varchar, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Fiscal Year Variants
export const fiscalYearVariants = pgTable("fiscal_year_variants", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  postingPeriods: integer("posting_periods").default(12).notNull(),
  specialPeriods: integer("special_periods").default(4).notNull(),
  yearShift: integer("year_shift").default(0), // For non-calendar year
  isCalendarYear: boolean("is_calendar_year").default(true),
  startMonth: integer("start_month").default(1), // 1=January
  endMonth: integer("end_month").default(12), // 12=December
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Number Ranges
export const documentNumberRanges = pgTable("document_number_ranges", {
  id: serial("id").primaryKey(),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  documentType: varchar("document_type", { length: 10 }).notNull(),
  fiscalYear: varchar("fiscal_year", { length: 4 }).notNull(),
  numberRangeObject: varchar("number_range_object", { length: 10 }).notNull(),
  fromNumber: varchar("from_number", { length: 20 }).notNull(),
  toNumber: varchar("to_number", { length: 20 }).notNull(),
  currentNumber: varchar("current_number", { length: 20 }).notNull(),
  isExternal: boolean("is_external").default(false), // External or internal numbering
  intervalLength: integer("interval_length").default(1),
  warningPercent: decimal("warning_percent", { precision: 5, scale: 2 }).default("90"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Field Status Variants
export const fieldStatusVariants = pgTable("field_status_variants", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Field Status Groups
export const fieldStatusGroups = pgTable("field_status_groups", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id").notNull().references(() => fieldStatusVariants.id),
  groupCode: varchar("group_code", { length: 10 }).notNull(),
  fieldName: varchar("field_name", { length: 50 }).notNull(),
  fieldStatus: varchar("field_status", { length: 1 }).notNull(), // M=Mandatory, O=Optional, S=Suppressed
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tolerance Groups
export const toleranceGroups = pgTable("tolerance_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  userType: varchar("user_type", { length: 20 }).notNull(), // Employee, GL_Account, Customer, Vendor
  upperAmountLimit: decimal("upper_amount_limit", { precision: 15, scale: 2 }),
  percentageLimit: decimal("percentage_limit", { precision: 5, scale: 2 }),
  absoluteAmountLimit: decimal("absolute_amount_limit", { precision: 15, scale: 2 }),
  paymentDifferenceTolerance: decimal("payment_difference_tolerance", { precision: 15, scale: 2 }),
  cashDiscountTolerance: decimal("cash_discount_tolerance", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Configuration
export const taxCodes = pgTable("tax_codes", {
  id: serial("id").primaryKey(),
  companyCodeId: integer("company_code_id"),
  taxCode: varchar("tax_code", { length: 10 }).notNull().unique(),
  description: text("description"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  taxType: varchar("tax_type", { length: 20 }), // Input, Output, Both
  country: varchar("country", { length: 3 }),
  jurisdiction: varchar("jurisdiction", { length: 50 }),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  taxAccount: varchar("tax_account", { length: 10 }),
  taxBaseAccount: varchar("tax_base_account", { length: 10 }),
});

// Exchange Rate Types
export const exchangeRateTypes = pgTable("exchange_rate_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  rateSource: varchar("rate_source", { length: 20 }).notNull(), // Manual, Automatic, Bank
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exchange Rates
export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  rateTypeId: integer("rate_type_id").notNull().references(() => exchangeRateTypes.id),
  fromCurrency: varchar("from_currency", { length: 3 }).notNull(),
  toCurrency: varchar("to_currency", { length: 3 }).notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 5 }).notNull(),
  ratio: integer("ratio").default(1), // For currencies with large denomination differences
  isInverted: boolean("is_inverted").default(false),
  source: varchar("source", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Functional Areas
export const functionalAreas = pgTable("functional_areas", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  parentFunctionalArea: varchar("parent_functional_area", { length: 10 }),
  consolidationFunction: varchar("consolidation_function", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit Control Areas
// NOTE: creditControlAreas moved to organizational-schema.ts to match database structure
// This schema definition is deprecated - use organizational-schema.ts instead

// Purchasing Groups
export const purchasingGroups = pgTable("purchasing_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  responsiblePerson: varchar("responsible_person", { length: 50 }),
  emailAddress: varchar("email_address", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  faxNumber: varchar("fax_number", { length: 20 }),
  plantCode: varchar("plant_code", { length: 10 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchasing Organizations
export const purchasingOrganizations = pgTable("purchasing_organizations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  companyCode: varchar("company_code", { length: 10 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  addressId: integer("address_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost Elements
export const costElements = pgTable("cost_elements", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 20 }).notNull(), // Primary, Secondary
  costElementClass: varchar("cost_element_class", { length: 10 }).notNull(),
  glAccount: varchar("gl_account", { length: 10 }),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }),
  isStatistical: boolean("is_statistical").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Internal Orders
export const internalOrders = pgTable("internal_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).unique().notNull(),
  orderType: varchar("order_type", { length: 10 }).notNull(),
  description: text("description"),
  responsibleCostCenter: varchar("responsible_cost_center", { length: 10 }),
  planningProfile: varchar("planning_profile", { length: 10 }),
  budgetAmount: decimal("budget_amount", { precision: 15, scale: 2 }),
  actualAmount: decimal("actual_amount", { precision: 15, scale: 2 }).default("0"),
  commitmentAmount: decimal("commitment_amount", { precision: 15, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  status: varchar("status", { length: 20 }).default("planned"), // planned, released, locked, closed
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Centers
export const workCenters = pgTable("work_centers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  plantId: integer("plant_id"),
  description: text("description"),
  capacity: decimal("capacity", { precision: 10, scale: 2 }),
  capacityUnit: varchar("capacity_unit", { length: 20 }),
  costRate: decimal("cost_rate", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("active"),
  costCenterId: integer("cost_center_id"),
  companyCodeId: integer("company_code_id"),
  active: boolean("active").default(true),
});

// Bill of Materials (BOM)
export const billOfMaterials = pgTable("bill_of_materials", {
  id: serial("id").primaryKey(),
  bomNumber: varchar("bom_number", { length: 20 }).unique().notNull(),
  materialId: integer("material_id").notNull(),
  plant: varchar("plant", { length: 10 }).notNull(),
  bomUsage: varchar("bom_usage", { length: 10 }), // Production, Costing, etc. - No default
  bomStatus: varchar("bom_status", { length: 10 }), // No default
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  baseQuantity: decimal("base_quantity", { precision: 15, scale: 3 }), // No default
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }),
  alternativeBom: varchar("alternative_bom", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// BOM Items
export const bomItems = pgTable("bom_items", {
  id: serial("id").primaryKey(),
  bomId: integer("bom_id").notNull().references(() => billOfMaterials.id),
  itemNumber: varchar("item_number", { length: 10 }).notNull(),
  componentMaterialId: integer("component_material_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }),
  scrapPercent: decimal("scrap_percent", { precision: 5, scale: 2 }), // No default
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  isActive: boolean("is_active"), // No default
  createdAt: timestamp("created_at").defaultNow(),
});

// Production Orders
export const productionOrders = pgTable("production_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).unique().notNull(),
  materialId: integer("material_id"),
  bomId: integer("bom_id"),
  plantId: integer("plant_id"),
  workCenterId: integer("work_center_id"),
  orderType: varchar("order_type", { length: 20 }).notNull(),
  plannedQuantity: decimal("planned_quantity", { precision: 15, scale: 3 }).notNull(),
  actualQuantity: decimal("actual_quantity", { precision: 15, scale: 3 }).default("0"),
  scrapQuantity: decimal("scrap_quantity", { precision: 15, scale: 3 }).default("0"),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }),
  plannedStartDate: date("planned_start_date").notNull(),
  plannedEndDate: date("planned_end_date").notNull(),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  priority: varchar("priority", { length: 10 }).default("NORMAL"),
  status: varchar("status", { length: 20 }).default("CREATED"), // CREATED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
  costCenterId: integer("cost_center_id"),
  createdBy: integer("created_by"),
  releasedBy: integer("released_by"),
  releaseDate: timestamp("release_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  active: boolean("active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for API validation
// Helper for insert schemas: omit auto-generated id
const omitId: any = { id: true };

export const insertFiscalYearVariantSchema = createInsertSchema(fiscalYearVariants).omit(omitId);
export const insertDocumentNumberRangeSchema = createInsertSchema(documentNumberRanges).omit(omitId);
export const insertFieldStatusVariantSchema = createInsertSchema(fieldStatusVariants).omit(omitId);
export const insertToleranceGroupSchema = createInsertSchema(toleranceGroups).omit(omitId);
export const insertTaxCodeSchema = createInsertSchema(taxCodes).omit(omitId);
export const insertExchangeRateTypeSchema = createInsertSchema(exchangeRateTypes).omit(omitId);
export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit(omitId);
export const insertFunctionalAreaSchema = createInsertSchema(functionalAreas).omit(omitId);
// NOTE: CreditControlArea schemas are defined in organizational-schema.ts
export const insertPurchasingGroupSchema = createInsertSchema(purchasingGroups).omit(omitId);
export const insertPurchasingOrganizationSchema = createInsertSchema(purchasingOrganizations).omit(omitId);
export const insertCostElementSchema = createInsertSchema(costElements).omit(omitId);
export const insertInternalOrderSchema = createInsertSchema(internalOrders).omit(omitId);
export const insertWorkCenterSchema = createInsertSchema(workCenters).omit(omitId);
export const insertBillOfMaterialsSchema = createInsertSchema(billOfMaterials).omit(omitId);
export const insertProductionOrderSchema = createInsertSchema(productionOrders).omit(omitId);

// Type exports
export type FiscalYearVariant = typeof fiscalYearVariants.$inferSelect;
export type DocumentNumberRange = typeof documentNumberRanges.$inferSelect;
export type FieldStatusVariant = typeof fieldStatusVariants.$inferSelect;
export type ToleranceGroup = typeof toleranceGroups.$inferSelect;
export type TaxCode = typeof taxCodes.$inferSelect;
export type ExchangeRateType = typeof exchangeRateTypes.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type FunctionalArea = typeof functionalAreas.$inferSelect;
// NOTE: CreditControlArea type moved to organizational-schema.ts
export type PurchasingGroup = typeof purchasingGroups.$inferSelect;
export type PurchasingOrganization = typeof purchasingOrganizations.$inferSelect;
export type CostElement = typeof costElements.$inferSelect;
export type InternalOrder = typeof internalOrders.$inferSelect;
export type WorkCenter = typeof workCenters.$inferSelect;
export type BillOfMaterials = typeof billOfMaterials.$inferSelect;
export type ProductionOrder = typeof productionOrders.$inferSelect;