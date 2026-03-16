import { pgTable, serial, text, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { companyCodes } from "./organizational-schema";
import { fiscalYearVariants } from "./schema";

// Currencies
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimalPlaces: text("decimal_places").notNull(),
  conversionRate: text("conversion_rate").notNull(), // Conversion rate to base currency
  baseCurrency: boolean("base_currency").default(false), // Is this the base currency
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  notes: text("notes"),
});

// Fiscal Periods for accounting and reporting
export const fiscalPeriods = pgTable("fiscal_periods", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  version: integer("version").default(1),
  fiscalYearVariantId: integer("fiscal_year_variant_id").references(() => fiscalYearVariants.id),
  year: integer("year").notNull(),
  period: integer("period").notNull(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull(), // Open, Closed, Locked
  companyCodeId: integer("company_code_id"), // Optional - links to company_codes table
  active: boolean("active").default(true),
  postingAllowed: boolean("posting_allowed").default(true),
});

// Define relations
export const currencyRelations = relations(currencies, ({ one, many }) => ({
  // Add relations here when we create more financial tables
}));

export const fiscalPeriodRelations = relations(fiscalPeriods, ({ one }) => ({
  fiscalYearVariant: one(fiscalYearVariants, {
    fields: [fiscalPeriods.fiscalYearVariantId],
    references: [fiscalYearVariants.id],
  }),
}));

// Create Zod schemas for validation  
export const insertCurrencySchema = z.object({
  code: z.string().min(3).max(3),
  name: z.string().min(1),
  symbol: z.string().min(1),
  decimalPlaces: z.string(),
  conversionRate: z.string(),
  baseCurrency: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const insertFiscalPeriodSchema = z.object({
  fiscalYearVariantId: z.number().int().optional(),
  year: z.number().int(),
  period: z.number().int().min(1).max(16), // Max 16 to allow for special periods (12 regular + 4 special)
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["Open", "Closed", "Locked"]),
  active: z.boolean().optional(),
  postingAllowed: z.boolean().optional(),
});

// Type definitions
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currencies.$inferSelect;

export type InsertFiscalPeriod = z.infer<typeof insertFiscalPeriodSchema>;
export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;

// Financial Report Templates (Header)
export const financialReportTemplates = pgTable("financial_report_templates", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  maintLanguage: text("maint_language").default("EN"),
  chartOfAccountsId: integer("chart_of_accounts_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Report Template Nodes (Hierarchy)
export const reportTemplateNodes = pgTable("report_template_nodes", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => financialReportTemplates.id, { onDelete: 'cascade' }),
  parentNodeId: integer("parent_node_id"),
  nodeType: text("node_type").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  // SAP OB58 additional fields
  startOfGroupText: text("start_of_group_text"),
  endOfGroupText: text("end_of_group_text"),
  displayTotalFlag: boolean("display_total_flag").default(true),
  graduatedTotalText: text("graduated_total_text"),
  displayGraduatedTotalFlag: boolean("display_graduated_total_flag").default(false),
  drCrShift: boolean("dr_cr_shift").default(false),
  checkSign: boolean("check_sign").default(false),
  displayBalance: boolean("display_balance").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Report Node Accounts (GL Mappings)
export const reportNodeAccounts = pgTable("report_node_accounts", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull().references(() => reportTemplateNodes.id, { onDelete: 'cascade' }),
  fromAccount: text("from_account").notNull(),
  toAccount: text("to_account").notNull(),
  balanceType: text("balance_type").default("BOTH"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const financialReportTemplatesRelations = relations(financialReportTemplates, ({ many }) => ({
  nodes: many(reportTemplateNodes),
}));

export const reportTemplateNodesRelations = relations(reportTemplateNodes, ({ one, many }) => ({
  template: one(financialReportTemplates, {
    fields: [reportTemplateNodes.templateId],
    references: [financialReportTemplates.id],
  }),
  parent: one(reportTemplateNodes, {
    fields: [reportTemplateNodes.parentNodeId],
    references: [reportTemplateNodes.id],
    relationName: "parent_child",
  }),
  children: many(reportTemplateNodes, {
    relationName: "parent_child",
  }),
  accounts: many(reportNodeAccounts),
}));

export const reportNodeAccountsRelations = relations(reportNodeAccounts, ({ one }) => ({
  node: one(reportTemplateNodes, {
    fields: [reportNodeAccounts.nodeId],
    references: [reportTemplateNodes.id],
  }),
}));

// Zod schemas
export const insertFinancialReportTemplateSchema = createInsertSchema(financialReportTemplates);
export const insertReportTemplateNodeSchema = createInsertSchema(reportTemplateNodes);
export const insertReportNodeAccountSchema = createInsertSchema(reportNodeAccounts);

export type FinancialReportTemplate = typeof financialReportTemplates.$inferSelect;
export type ReportTemplateNode = typeof reportTemplateNodes.$inferSelect;
export type ReportNodeAccount = typeof reportNodeAccounts.$inferSelect;