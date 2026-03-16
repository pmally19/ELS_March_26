import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { fiscalYearVariants, chartOfAccounts, companyCodes } from "./schema";
import { ledgerGroups } from "./ledger-groups-schema";

/**
 * Ledgers (Accounting Books) - Multiple accounting books for parallel accounting
 * Allows maintaining separate books for different accounting standards, reporting requirements, etc.
 * No SAP terminology used
 */
export const ledgers = pgTable("ledgers", {
  id: serial("id").primaryKey(),
  
  // Basic Information
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Classification
  ledgerType: varchar("ledger_type", { length: 20 }).notNull().default("PRIMARY"), // PRIMARY, SECONDARY, REPORTING
  ledgerCategory: varchar("ledger_category", { length: 50 }), // FINANCIAL_REPORTING, TAX_REPORTING, MANAGEMENT_REPORTING
  
  // Configuration
  fiscalYearVariantId: integer("fiscal_year_variant_id").references(() => fiscalYearVariants.id),
  defaultCurrencyCode: varchar("default_currency_code", { length: 3 }).notNull().default("USD"),
  parallelCurrencyCode: varchar("parallel_currency_code", { length: 3 }), // For parallel currency accounting
  
  // Ledger Group Assignment
  ledgerGroupId: integer("ledger_group_id").references(() => ledgerGroups.id),
  
  // Accounting Principle and Extension Settings
  accountingPrinciple: varchar("accounting_principle", { length: 50 }), // IFRS, US_GAAP, LOCAL_GAAP
  baseLedgerId: integer("base_ledger_id").references(() => ledgers.id), // For extension ledgers (self-reference)
  extensionType: varchar("extension_type", { length: 20 }), // ADJUSTMENT, REPORTING, TAX
  
  // Chart of Accounts
  chartOfAccountsId: integer("chart_of_accounts_id").references(() => chartOfAccounts.id),
  
  // Company Code Assignment
  companyCodeId: integer("company_code_id").references(() => companyCodes.id), // Optional - can be global ledger
  
  // Currency Settings
  companyCodeCurrencyActive: boolean("company_code_currency_active").default(true),
  groupCurrencyActive: boolean("group_currency_active").default(false),
  hardCurrencyActive: boolean("hard_currency_active").default(false),
  indexCurrencyActive: boolean("index_currency_active").default(false),
  indexCurrencyCode: varchar("index_currency_code", { length: 3 }),
  
  // Document Splitting
  documentSplittingActive: boolean("document_splitting_active").default(false),
  
  // Posting Control
  postingPeriodControlId: integer("posting_period_control_id"), // Reference to posting_period_controls
  allowPostings: boolean("allow_postings").default(true),
  isConsolidationLedger: boolean("is_consolidation_ledger").default(false), // For consolidation purposes
  requiresApproval: boolean("requires_approval").default(false),
  
  // Display and Sorting
  displayOrder: integer("display_order").default(0),
  sortKey: varchar("sort_key", { length: 10 }),
  
  // Status and Metadata
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").default(false), // Only one default ledger per company
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

export const ledgerRelations = relations(ledgers, ({ one, many }) => ({
  fiscalYearVariant: one(fiscalYearVariants, {
    fields: [ledgers.fiscalYearVariantId],
    references: [fiscalYearVariants.id],
  }),
  ledgerGroup: one(ledgerGroups, {
    fields: [ledgers.ledgerGroupId],
    references: [ledgerGroups.id],
  }),
  chartOfAccounts: one(chartOfAccounts, {
    fields: [ledgers.chartOfAccountsId],
    references: [chartOfAccounts.id],
  }),
  companyCode: one(companyCodes, {
    fields: [ledgers.companyCodeId],
    references: [companyCodes.id],
  }),
  baseLedger: one(ledgers, {
    fields: [ledgers.baseLedgerId],
    references: [ledgers.id],
    relationName: "baseLedger",
  }),
  extensionLedgers: many(ledgers, {
    relationName: "baseLedger",
  }),
}));

// Validation Schema
export const insertLedgerSchema = createInsertSchema(ledgers, {
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  ledgerType: z.enum(["PRIMARY", "SECONDARY", "REPORTING"], {
    errorMap: () => ({ message: "Ledger type must be PRIMARY, SECONDARY, or REPORTING" }),
  }),
  ledgerCategory: z.enum(["FINANCIAL_REPORTING", "TAX_REPORTING", "MANAGEMENT_REPORTING"]).optional(),
  defaultCurrencyCode: z.string().length(3, "Currency code must be 3 characters"),
  parallelCurrencyCode: z.string().length(3, "Currency code must be 3 characters").optional().or(z.literal("")),
  fiscalYearVariantId: z.union([z.number().int().positive(), z.null()]).optional(),
  ledgerGroupId: z.union([z.number().int().positive(), z.null()]).optional(),
  accountingPrinciple: z.string().max(50, "Accounting principle code must be 50 characters or less").optional().or(z.literal("")),
  baseLedgerId: z.union([z.number().int().positive(), z.null()]).optional(),
  extensionType: z.enum(["ADJUSTMENT", "REPORTING", "TAX"]).optional(),
  chartOfAccountsId: z.union([z.number().int().positive(), z.null()]).optional(),
  companyCodeId: z.union([z.number().int().positive(), z.null()]).optional(),
  companyCodeCurrencyActive: z.boolean().default(true),
  groupCurrencyActive: z.boolean().default(false),
  hardCurrencyActive: z.boolean().default(false),
  indexCurrencyActive: z.boolean().default(false),
  indexCurrencyCode: z.string().length(3, "Currency code must be 3 characters").optional().or(z.literal("")),
  documentSplittingActive: z.boolean().default(false),
  postingPeriodControlId: z.union([z.number().int().positive(), z.null()]).optional(),
  allowPostings: z.boolean().default(true),
  isConsolidationLedger: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  sortKey: z.string().max(10).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const updateLedgerSchema = insertLedgerSchema.partial();

// Types
export type Ledger = typeof ledgers.$inferSelect;
export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type UpdateLedger = z.infer<typeof updateLedgerSchema>;

