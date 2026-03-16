import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

export const managementControlAreas = pgTable("management_control_areas", {
  id: serial("id").primaryKey(),
  areaCode: varchar("area_code", { length: 10 }).notNull().unique(),
  areaName: varchar("area_name", { length: 100 }).notNull(),
  description: text("description"),
  operatingConcernCode: varchar("operating_concern_code", { length: 10 }),
  personResponsible: varchar("person_responsible", { length: 100 }),
  companyCodeId: integer("company_code_id"),
  currencyCode: varchar("currency_code", { length: 3 }),
  fiscalYearVariantId: integer("fiscal_year_variant_id"),
  chartOfAccountsId: integer("chart_of_accounts_id"),
  costCenterHierarchyCode: varchar("cost_center_hierarchy_code", { length: 20 }),
  profitCenterHierarchyCode: varchar("profit_center_hierarchy_code", { length: 20 }),
  activityTypeVersion: varchar("activity_type_version", { length: 10 }),
  costingVersion: varchar("costing_version", { length: 10 }),
  priceCalculationEnabled: boolean("price_calculation_enabled").default(true),
  actualCostingEnabled: boolean("actual_costing_enabled").default(true),
  planCostingEnabled: boolean("plan_costing_enabled").default(true),
  varianceCalculationEnabled: boolean("variance_calculation_enabled").default(true),
  settlementMethod: varchar("settlement_method", { length: 20 }).default("full"),
  allocationCyclePostingEnabled: boolean("allocation_cycle_posting_enabled").default(false),
  profitCenterAccountingEnabled: boolean("profit_center_accounting_enabled").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Zod schemas for validation
export const insertManagementControlAreaSchema = createInsertSchema(managementControlAreas, {
  areaCode: z.string().min(1).max(10),
  areaName: z.string().min(1).max(100),
  description: z.string().optional(),
  operatingConcernCode: z.string().max(10).optional().or(z.literal("")),
  personResponsible: z.string().max(100).optional().or(z.literal("")),
  companyCodeId: z.number().int().positive().optional(),
  currencyCode: z.string().length(3).optional().or(z.literal("")),
  fiscalYearVariantId: z.number().int().positive().optional(),
  chartOfAccountsId: z.number().int().positive().optional(),
  costCenterHierarchyCode: z.string().max(20).optional().or(z.literal("")),
  profitCenterHierarchyCode: z.string().max(20).optional().or(z.literal("")),
  activityTypeVersion: z.string().max(10).optional().or(z.literal("")),
  costingVersion: z.string().max(10).optional().or(z.literal("")),
  settlementMethod: z.enum(["full", "delta", "statistical"]).optional(),
});

export const updateManagementControlAreaSchema = createUpdateSchema(managementControlAreas, {
  areaCode: z.string().min(1).max(10).optional(),
  areaName: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  operatingConcernCode: z.string().max(10).optional().or(z.literal("")),
  personResponsible: z.string().max(100).optional().or(z.literal("")),
  companyCodeId: z.number().int().positive().optional(),
  currencyCode: z.string().length(3).optional().or(z.literal("")),
  fiscalYearVariantId: z.number().int().positive().optional(),
  chartOfAccountsId: z.number().int().positive().optional(),
  costCenterHierarchyCode: z.string().max(20).optional().or(z.literal("")),
  profitCenterHierarchyCode: z.string().max(20).optional().or(z.literal("")),
  activityTypeVersion: z.string().max(10).optional().or(z.literal("")),
  costingVersion: z.string().max(10).optional().or(z.literal("")),
  settlementMethod: z.enum(["full", "delta", "statistical"]).optional(),
});

export type ManagementControlArea = typeof managementControlAreas.$inferSelect;
export type InsertManagementControlArea = z.infer<typeof insertManagementControlAreaSchema>;
export type UpdateManagementControlArea = z.infer<typeof updateManagementControlAreaSchema>;

