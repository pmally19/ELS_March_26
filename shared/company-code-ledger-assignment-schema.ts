import { pgTable, serial, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companyCodes } from "./schema";
import { ledgers } from "./ledgers-schema";

/**
 * Company Code Ledger Assignments - Assigns ledgers to company codes
 * In S4 HANA-like systems, ledgers must be assigned to company codes
 * No SAP terminology used
 */
export const companyCodeLedgerAssignments = pgTable("company_code_ledger_assignments", {
  id: serial("id").primaryKey(),
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id, { onDelete: "cascade" }),
  ledgerId: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
  
  // Currency Configuration (ledger-specific per company code)
  companyCodeCurrencyCode: varchar("company_code_currency_code", { length: 3 }),
  groupCurrencyCode: varchar("group_currency_code", { length: 3 }),
  hardCurrencyCode: varchar("hard_currency_code", { length: 3 }),
  
  // Accounting Principle
  accountingPrinciple: varchar("accounting_principle", { length: 50 }), // IFRS, US_GAAP, LOCAL_GAAP
  
  // Posting Period Control
  postingPeriodControlId: integer("posting_period_control_id"),
  
  // Assignment Settings
  isPrimaryLedger: boolean("is_primary_ledger").default(false),
  isMandatory: boolean("is_mandatory").default(false),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  assignedDate: timestamp("assigned_date").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => ({
  uniqueCompanyLedger: {
    columns: [table.companyCodeId, table.ledgerId],
  },
}));

export const companyCodeLedgerAssignmentRelations = relations(companyCodeLedgerAssignments, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [companyCodeLedgerAssignments.companyCodeId],
    references: [companyCodes.id],
  }),
  ledger: one(ledgers, {
    fields: [companyCodeLedgerAssignments.ledgerId],
    references: [ledgers.id],
  }),
}));

export const insertCompanyCodeLedgerAssignmentSchema = createInsertSchema(companyCodeLedgerAssignments, {
  companyCodeId: z.number().int().positive(),
  ledgerId: z.number().int().positive(),
  accountingPrinciple: z.enum(["IFRS", "US_GAAP", "LOCAL_GAAP", "TAX_BASIS"]).optional(),
  companyCodeCurrencyCode: z.string().length(3).optional(),
  groupCurrencyCode: z.string().length(3).optional(),
  hardCurrencyCode: z.string().length(3).optional(),
  isPrimaryLedger: z.boolean().default(false),
  isMandatory: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  assignedDate: true,
});

export const updateCompanyCodeLedgerAssignmentSchema = insertCompanyCodeLedgerAssignmentSchema.partial();

export type CompanyCodeLedgerAssignment = typeof companyCodeLedgerAssignments.$inferSelect;
export type InsertCompanyCodeLedgerAssignment = z.infer<typeof insertCompanyCodeLedgerAssignmentSchema>;
export type UpdateCompanyCodeLedgerAssignment = z.infer<typeof updateCompanyCodeLedgerAssignmentSchema>;

