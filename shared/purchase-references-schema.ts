import { pgTable, text, boolean, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Common fields for all tables
const commonFields = {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  version: integer("version").default(1).notNull(),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validTo: timestamp("valid_to"),
  _tenantId: text("_tenantId").default('001').notNull(),
  _deletedAt: timestamp("_deletedAt", { withTimezone: true }),
};

// Purchase Group - For categorizing procurement activities
export const purchaseGroups = pgTable("purchase_groups", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});

// Supply Type - For categorizing procurement supplies (direct, indirect, etc.)
export const supplyTypes = pgTable("supply_types", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});

// Approval Level - For purchase approval thresholds
export const approvalLevels = pgTable("approval_levels", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  thresholdAmount: text("threshold_amount"),
  currencyCode: text("currency_code"),
  approverRole: text("approver_role"),
  isActive: boolean("is_active").default(true).notNull(),
});

// Create insert schemas
export const insertPurchaseGroupSchema = createInsertSchema(purchaseGroups, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  version: z.number().optional(),
  validFrom: z.date().optional(),
  validTo: z.date().optional(),
  _tenantId: z.string().optional(),
  _deletedAt: z.date().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true,
  validFrom: true,
  validTo: true,
  _tenantId: true,
  _deletedAt: true
});

export const insertSupplyTypeSchema = createInsertSchema(supplyTypes, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  version: z.number().optional(),
  validFrom: z.date().optional(),
  validTo: z.date().optional(),
  _tenantId: z.string().optional(),
  _deletedAt: z.date().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true,
  validFrom: true,
  validTo: true,
  _tenantId: true,
  _deletedAt: true
});

export const insertApprovalLevelSchema = createInsertSchema(approvalLevels, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  version: z.number().optional(),
  validFrom: z.date().optional(),
  validTo: z.date().optional(),
  _tenantId: z.string().optional(),
  _deletedAt: z.date().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  version: true,
  validFrom: true,
  validTo: true,
  _tenantId: true,
  _deletedAt: true
});

// Create types
export type InsertPurchaseGroup = z.infer<typeof insertPurchaseGroupSchema>;
export type PurchaseGroup = typeof purchaseGroups.$inferSelect;

export type InsertSupplyType = z.infer<typeof insertSupplyTypeSchema>;
export type SupplyType = typeof supplyTypes.$inferSelect;

export type InsertApprovalLevel = z.infer<typeof insertApprovalLevelSchema>;
export type ApprovalLevel = typeof approvalLevels.$inferSelect;