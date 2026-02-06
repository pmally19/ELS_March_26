import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { glAccounts } from "./schema";

/**
 * GL Account Groups - Classification system for General Ledger accounts
 * Controls account creation rules, number assignments, and field requirements
 */
export const glAccountGroups = pgTable("gl_account_groups", {
  id: serial("id").primaryKey(),
  // Basic Information
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Account Classification
  accountCategory: varchar("account_category", { length: 20 }).notNull(), // ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSES
  accountSubcategory: varchar("account_subcategory", { length: 50 }), // Current Assets, Fixed Assets, etc.
  
  // Number Assignment Rules
  accountNumberPattern: varchar("account_number_pattern", { length: 50 }), // Pattern for account numbers
  accountNumberMinLength: integer("account_number_min_length").default(4),
  accountNumberMaxLength: integer("account_number_max_length").default(10),
  numberRangeStart: varchar("number_range_start", { length: 20 }),
  numberRangeEnd: varchar("number_range_end", { length: 20 }),
  
  // Field Control Settings
  fieldControlGroup: varchar("field_control_group", { length: 10 }), // Controls which fields are required/optional/hidden
  accountNameRequired: boolean("account_name_required").default(true),
  descriptionRequired: boolean("description_required").default(false),
  currencyRequired: boolean("currency_required").default(true),
  taxSettingsRequired: boolean("tax_settings_required").default(false),
  
  // Account Behavior Settings
  allowPosting: boolean("allow_posting").default(true),
  requiresReconciliation: boolean("requires_reconciliation").default(false),
  allowCashPosting: boolean("allow_cash_posting").default(false),
  requiresCostCenter: boolean("requires_cost_center").default(false),
  requiresProfitCenter: boolean("requires_profit_center").default(false),
  
  // Display and Layout
  displayLayout: varchar("display_layout", { length: 10 }), // Controls screen layout
  sortOrder: integer("sort_order").default(0),
  
  // Status and Metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const glAccountGroupRelations = relations(glAccountGroups, ({ many }) => ({
  glAccounts: many(glAccounts),
}));

// Validation Schema
export const insertGlAccountGroupSchema = createInsertSchema(glAccountGroups).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateGlAccountGroupSchema = insertGlAccountGroupSchema.partial();

// Types
export type InsertGlAccountGroup = z.infer<typeof insertGlAccountGroupSchema>;
export type UpdateGlAccountGroup = z.infer<typeof updateGlAccountGroupSchema>;
export type GlAccountGroup = typeof glAccountGroups.$inferSelect;

