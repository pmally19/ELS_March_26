import { pgTable, serial, varchar, boolean, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Reconciliation Accounts table - GL account assignments
export const reconciliationAccounts = pgTable("reconciliation_accounts", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  glAccountId: integer("gl_account_id").notNull(),
  accountType: varchar("account_type", { length: 20 }).notNull(),
  companyCodeId: integer("company_code_id").notNull(),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const insertReconciliationAccountSchema = createInsertSchema(reconciliationAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectReconciliationAccountSchema = createSelectSchema(reconciliationAccounts);

export type InsertReconciliationAccount = z.infer<typeof insertReconciliationAccountSchema>;
export type ReconciliationAccount = typeof reconciliationAccounts.$inferSelect;