import { pgTable, serial, integer, text, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { companyCodes } from "./schema";
import { glAccounts } from "./schema";
import { fiscalYearVariants } from "./schema";

/**
 * Retained Earnings Accounts - Accounts used to carry forward profit/loss from one fiscal year to another
 * Links company codes with GL accounts for year-end closing and profit/loss carry forward
 */
export const retainedEarningsAccounts = pgTable("retained_earnings_accounts", {
  id: serial("id").primaryKey(),
  
  // Company and Account Association
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  glAccountId: integer("gl_account_id").notNull().references(() => glAccounts.id),
  fiscalYearVariantId: integer("fiscal_year_variant_id").references(() => fiscalYearVariants.id),
  
  // Account Configuration
  accountType: varchar("account_type", { length: 20 }).notNull().default("RETAINED_EARNINGS"), // RETAINED_EARNINGS, PROFIT_CARRY_FORWARD, LOSS_CARRY_FORWARD
  description: text("description"), // Description of the account purpose
  
  // Carry Forward Settings
  carryForwardProfit: boolean("carry_forward_profit").default(true).notNull(), // Carry forward profit to this account
  carryForwardLoss: boolean("carry_forward_loss").default(true).notNull(), // Carry forward loss to this account
  automaticCarryForward: boolean("automatic_carry_forward").default(false).notNull(), // Automatically carry forward at year-end
  
  // Year-End Closing Settings
  useForYearEndClosing: boolean("use_for_year_end_closing").default(true).notNull(), // Use this account for year-end closing
  closingAccountType: varchar("closing_account_type", { length: 20 }), // Type of closing (PROFIT, LOSS, BOTH)
  
  // Status and Metadata
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

export const retainedEarningsAccountRelations = relations(retainedEarningsAccounts, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [retainedEarningsAccounts.companyCodeId],
    references: [companyCodes.id],
  }),
  glAccount: one(glAccounts, {
    fields: [retainedEarningsAccounts.glAccountId],
    references: [glAccounts.id],
  }),
  fiscalYearVariant: one(fiscalYearVariants, {
    fields: [retainedEarningsAccounts.fiscalYearVariantId],
    references: [fiscalYearVariants.id],
  }),
}));

// Validation Schema
const baseInsertSchema = z.object({
  companyCodeId: z.number().int().positive(),
  glAccountId: z.number().int().positive(),
  fiscalYearVariantId: z.number().int().positive().optional(),
  accountType: z.enum(["RETAINED_EARNINGS", "PROFIT_CARRY_FORWARD", "LOSS_CARRY_FORWARD"]).default("RETAINED_EARNINGS"),
  description: z.string().optional(),
  carryForwardProfit: z.boolean().default(true),
  carryForwardLoss: z.boolean().default(true),
  automaticCarryForward: z.boolean().default(false),
  useForYearEndClosing: z.boolean().default(true),
  closingAccountType: z.enum(["PROFIT", "LOSS", "BOTH"]).optional(),
  isActive: z.boolean().default(true),
});

export const insertRetainedEarningsAccountSchema = baseInsertSchema;

export const updateRetainedEarningsAccountSchema = baseInsertSchema.partial();

// Types
export type InsertRetainedEarningsAccount = z.infer<typeof insertRetainedEarningsAccountSchema>;
export type UpdateRetainedEarningsAccount = z.infer<typeof updateRetainedEarningsAccountSchema>;
export type RetainedEarningsAccount = typeof retainedEarningsAccounts.$inferSelect;

