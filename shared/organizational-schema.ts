import { pgTable, text, serial, integer, boolean, timestamp, foreignKey, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Common fields for audit and versioning
const commonFields = {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
};

// Company Code - Legal entities in your organization
export const companyCodes = pgTable("company_codes", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").notNull(), // Currency code (e.g., 'USD', 'EUR') - integrated with currencies table via frontend
  country: text("country").notNull(),
  taxId: text("tax_id"),
  fiscalYear: text("fiscal_year").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoUrl: text("logo_url"),
});

export const companyCodeRelations = relations(companyCodes, ({ one, many }) => ({
  plants: many(plants),
}));

// Plant - Manufacturing sites and warehouses
export const plants = pgTable("plants", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  type: text("type").notNull(), // manufacturing, warehouse, distribution, etc.
  category: text("category"), // classification of plant
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  manager: text("manager"),
  status: text("status").default("active").notNull(),
  timezone: text("timezone"),
  operatingHours: text("operating_hours"), // e.g., "9:00-17:00"
  coordinates: text("coordinates"), // latitude,longitude
});

export const plantRelations = relations(plants, ({ one, many }) => ({
  companyCode: one(companyCodes, {
    fields: [plants.companyCodeId],
    references: [companyCodes.id],
  }),
  storageLocations: many(storageLocations),
}));

// Storage Location - Physical inventory locations within plants
export const storageLocations = pgTable("storage_locations", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  plantId: integer("plant_id").notNull().references(() => plants.id),
  type: text("type").notNull(), // raw material, finished goods, work in process, etc.
  isMrpRelevant: boolean("is_mrp_relevant").default(true),
  isNegativeStockAllowed: boolean("is_negative_stock_allowed").default(false),
  isGoodsReceiptRelevant: boolean("is_goods_receipt_relevant").default(true),
  isGoodsIssueRelevant: boolean("is_goods_issue_relevant").default(true),
  isInterimStorage: boolean("is_interim_storage").default(false),
  isTransitStorage: boolean("is_transit_storage").default(false),
  isRestrictedUse: boolean("is_restricted_use").default(false),
  status: text("status").default("active").notNull(),
});

export const storageLocationRelations = relations(storageLocations, ({ one }) => ({
  plant: one(plants, {
    fields: [storageLocations.plantId],
    references: [plants.id],
  }),
}));

// Sales Organization - Entities for sales and distribution
export const salesOrganizations = pgTable("sales_organizations", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  currency: text("currency").default("USD"),
  region: text("region"), // EMEA, APAC, NA, etc.
  distributionChannel: text("distribution_channel"), // retail, wholesale, online, etc.
  industry: text("industry"), // automotive, healthcare, etc.
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  manager: text("manager"),
  status: text("status").default("active").notNull(),
});

export const salesOrganizationRelations = relations(salesOrganizations, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [salesOrganizations.companyCodeId],
    references: [companyCodes.id],
  }),
}));

// Purchase Organization - Entities for procurement activities
export const purchaseOrganizations = pgTable("purchase_organizations", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  currency: text("currency").default("USD"),
  purchasingGroup: text("purchasing_group"), // category of purchasing
  supplyType: text("supply_type"), // direct, indirect, services, etc.
  approvalLevel: text("approval_level"), // approval thresholds
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  manager: text("manager"),
  status: text("status").default("active").notNull(),
  notes: text("notes"),
});

export const purchaseOrganizationRelations = relations(purchaseOrganizations, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [purchaseOrganizations.companyCodeId],
    references: [companyCodes.id],
  }),
}));

// Credit Control Area - For managing customer credit limits
export const creditControlAreas = pgTable("credit_control_areas", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  creditCheckingGroup: text("credit_checking_group"), // risk category
  creditPeriod: integer("credit_period").default(30), // days
  gracePercentage: numeric("grace_percentage").default("10"), // % over credit limit allowed
  blockingReason: text("blocking_reason"), // reasons for blocking credit
  reviewFrequency: text("review_frequency").default("monthly"), // credit review cadence
  currency: text("currency").default("USD"),
  creditApprover: text("credit_approver"), // responsible person
  status: text("status").default("active").notNull(),
});

export const creditControlAreaRelations = relations(creditControlAreas, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [creditControlAreas.companyCodeId],
    references: [companyCodes.id],
  }),
}));

// Create insert schemas
export const insertCompanyCodeSchema = createInsertSchema(companyCodes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

export const insertPlantSchema = createInsertSchema(plants).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

export const insertSalesOrgSchema = createInsertSchema(salesOrganizations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

export const insertPurchaseOrgSchema = createInsertSchema(purchaseOrganizations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

export const insertCreditControlSchema = createInsertSchema(creditControlAreas).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

// Create types
export type InsertCompanyCode = z.infer<typeof insertCompanyCodeSchema>;
export type CompanyCode = typeof companyCodes.$inferSelect;

export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type Plant = typeof plants.$inferSelect;

export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;
export type StorageLocation = typeof storageLocations.$inferSelect;

export type InsertSalesOrg = z.infer<typeof insertSalesOrgSchema>;
export type SalesOrg = typeof salesOrganizations.$inferSelect;

export type InsertPurchaseOrg = z.infer<typeof insertPurchaseOrgSchema>;
export type PurchaseOrg = typeof purchaseOrganizations.$inferSelect;

export type InsertCreditControl = z.infer<typeof insertCreditControlSchema>;
export type CreditControl = typeof creditControlAreas.$inferSelect;

// Chart of Accounts - Financial account structure - moved from core schema to organizational
export const chartOfAccounts = pgTable("chart_of_accounts", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  accountType: text("account_type").notNull(), // asset, liability, equity, revenue, expense
  accountSubtype: text("account_subtype"), // current asset, fixed asset, etc.
  accountGroup: text("account_group"), // grouping for reporting
  balanceSheetCategory: text("balance_sheet_category"),
  incomeStatementCategory: text("income_statement_category"),
  debitCredit: text("debit_credit"), // normal balance: debit or credit
  isBalanceSheet: boolean("is_balance_sheet").default(true),
  isIncomeStatement: boolean("is_income_statement").default(false),
  isCashFlow: boolean("is_cash_flow").default(false),
  isTaxRelevant: boolean("is_tax_relevant").default(false),
  isControlAccount: boolean("is_control_account").default(false),
  isReconciliationRequired: boolean("is_reconciliation_required").default(false),
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  parentAccountId: integer("parent_account_id"), // for hierarchical chart of accounts
});

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [chartOfAccounts.companyCodeId],
    references: [companyCodes.id],
  }),
}));

export const insertChartOfAccountsSchema = createInsertSchema(chartOfAccounts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true
});

export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountsSchema>;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;