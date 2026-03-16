import { pgTable, serial, integer, varchar, text, decimal, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companyCodes, currencies, glAccounts, costCenters, profitCenters, users } from "./schema";

// Step 1: Reversal Reasons
export const reversalReasons = pgTable("reversal_reasons", {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 10 }).notNull().unique(),
    description: varchar("description", { length: 100 }).notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Step 2: Provision Types
export const provisionTypes = pgTable("provision_types", {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    description: varchar("description", { length: 100 }).notNull(),
    defaultExpenseAccountId: integer("default_expense_account_id").references(() => glAccounts.id),
    defaultProvisionAccountId: integer("default_provision_account_id").references(() => glAccounts.id),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Step 3: Provision Entries
export const provisionEntries = pgTable("provision_entries", {
    id: serial("id").primaryKey(),
    companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
    documentNumber: varchar("document_number", { length: 50 }).unique(),
    provisionTypeId: integer("provision_type_id").notNull().references(() => provisionTypes.id),

    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull().references(() => currencies.id),

    postingDate: date("posting_date").notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    fiscalPeriod: integer("fiscal_period").notNull(),

    expenseAccountId: integer("expense_account_id").notNull().references(() => glAccounts.id),
    provisionAccountId: integer("provision_account_id").notNull().references(() => glAccounts.id),
    costCenterId: integer("cost_center_id").references(() => costCenters.id),
    profitCenterId: integer("profit_center_id").references(() => profitCenters.id),

    isAccrual: boolean("is_accrual").default(false),
    description: text("description"),

    status: varchar("status", { length: 20 }).default("DRAFT"), // DRAFT, PENDING_APPROVAL, APPROVED, POSTED, REVERSED, REJECTED

    reversalDate: date("reversal_date"),
    reversalReasonId: integer("reversal_reason_id").references(() => reversalReasons.id),
    reversalDocumentNumber: varchar("reversal_document_number", { length: 50 }),

    journalEntryId: integer("journal_entry_id"), // Database level FK to journal_entries.id

    createdBy: integer("created_by").references(() => users.id),
    approvedBy: integer("approved_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const reversalReasonsRelations = relations(reversalReasons, ({ many }) => ({
    provisionEntries: many(provisionEntries),
}));

export const provisionTypesRelations = relations(provisionTypes, ({ one, many }) => ({
    defaultExpenseAccount: one(glAccounts, {
        fields: [provisionTypes.defaultExpenseAccountId],
        references: [glAccounts.id],
    }),
    defaultProvisionAccount: one(glAccounts, {
        fields: [provisionTypes.defaultProvisionAccountId],
        references: [glAccounts.id],
    }),
    entries: many(provisionEntries),
}));

export const provisionEntriesRelations = relations(provisionEntries, ({ one }) => ({
    companyCode: one(companyCodes, {
        fields: [provisionEntries.companyCodeId],
        references: [companyCodes.id],
    }),
    provisionType: one(provisionTypes, {
        fields: [provisionEntries.provisionTypeId],
        references: [provisionTypes.id],
    }),
    currency: one(currencies, {
        fields: [provisionEntries.currencyId],
        references: [currencies.id],
    }),
    expenseAccount: one(glAccounts, {
        fields: [provisionEntries.expenseAccountId],
        references: [glAccounts.id],
    }),
    provisionAccount: one(glAccounts, {
        fields: [provisionEntries.provisionAccountId],
        references: [glAccounts.id],
    }),
    costCenter: one(costCenters, {
        fields: [provisionEntries.costCenterId],
        references: [costCenters.id],
    }),
    profitCenter: one(profitCenters, {
        fields: [provisionEntries.profitCenterId],
        references: [profitCenters.id],
    }),
    reversalReason: one(reversalReasons, {
        fields: [provisionEntries.reversalReasonId],
        references: [reversalReasons.id],
    }),
    // journalEntry reference omitted because journalEntries is not yet defined in schema.ts
    creator: one(users, {
        fields: [provisionEntries.createdBy],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [provisionEntries.approvedBy],
        references: [users.id],
    }),
}));

// Zod schemas
export const insertReversalReasonSchema = createInsertSchema(reversalReasons);
export type InsertReversalReason = z.infer<typeof insertReversalReasonSchema>;
export type ReversalReason = typeof reversalReasons.$inferSelect;

export const insertProvisionTypeSchema = createInsertSchema(provisionTypes);
export type InsertProvisionType = z.infer<typeof insertProvisionTypeSchema>;
export type ProvisionType = typeof provisionTypes.$inferSelect;

export const insertProvisionEntrySchema = createInsertSchema(provisionEntries);
export type InsertProvisionEntry = z.infer<typeof insertProvisionEntrySchema>;
export type ProvisionEntry = typeof provisionEntries.$inferSelect;
