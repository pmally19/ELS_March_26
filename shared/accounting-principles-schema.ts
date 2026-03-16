import { pgTable, serial, varchar, text, date, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Accounting Principles - Accounting standards and principles for financial reporting
 * No SAP terminology used
 */
export const accountingPrinciples = pgTable("accounting_principles", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  standardType: varchar("standard_type", { length: 50 }), // INTERNATIONAL, NATIONAL, REGIONAL
  jurisdiction: varchar("jurisdiction", { length: 100 }), // Country or region
  effectiveDate: date("effective_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Validation Schema
export const insertAccountingPrincipleSchema = createInsertSchema(accountingPrinciples, {
  code: z.string().min(1, "Code is required").max(20, "Code must be 20 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  standardType: z.enum(["INTERNATIONAL", "NATIONAL", "REGIONAL"]).optional(),
  jurisdiction: z.string().max(100).optional(),
  effectiveDate: z.string().optional().or(z.date().optional()),
  isActive: z.boolean().default(true),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const updateAccountingPrincipleSchema = insertAccountingPrincipleSchema.partial();

// Types
export type AccountingPrinciple = typeof accountingPrinciples.$inferSelect;
export type InsertAccountingPrinciple = z.infer<typeof insertAccountingPrincipleSchema>;
export type UpdateAccountingPrinciple = z.infer<typeof updateAccountingPrincipleSchema>;

