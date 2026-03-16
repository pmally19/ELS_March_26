import { pgTable, serial, varchar, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Tolerance Groups - Posting tolerance limits for financial document processing
 * No SAP terminology used
 */
export const toleranceGroups = pgTable("tolerance_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  companyCode: varchar("company_code", { length: 4 }).notNull(),
  userType: varchar("user_type", { length: 20 }).notNull(), // EMPLOYEE, CUSTOMER, VENDOR
  upperAmountLimit: numeric("upper_amount_limit", { precision: 15, scale: 2 }),
  percentageLimit: numeric("percentage_limit", { precision: 5, scale: 2 }),
  absoluteAmountLimit: numeric("absolute_amount_limit", { precision: 15, scale: 2 }),
  paymentDifferenceTolerance: numeric("payment_difference_tolerance", { precision: 15, scale: 2 }),
  cashDiscountTolerance: numeric("cash_discount_tolerance", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Validation Schema
export const insertToleranceGroupSchema = createInsertSchema(toleranceGroups, {
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  companyCode: z.string().min(1, "Company code is required").max(4, "Company code must be 4 characters or less"),
  userType: z.enum(["EMPLOYEE", "CUSTOMER", "VENDOR"], {
    errorMap: () => ({ message: "User type must be EMPLOYEE, CUSTOMER, or VENDOR" }),
  }),
  upperAmountLimit: z.string().optional().or(z.number().optional()).transform(val => val ? String(val) : null),
  percentageLimit: z.string().optional().or(z.number().optional()).transform(val => val ? String(val) : null),
  absoluteAmountLimit: z.string().optional().or(z.number().optional()).transform(val => val ? String(val) : null),
  paymentDifferenceTolerance: z.string().optional().or(z.number().optional()).transform(val => val ? String(val) : null),
  cashDiscountTolerance: z.string().optional().or(z.number().optional()).transform(val => val ? String(val) : null),
  isActive: z.boolean().optional(),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});

export const updateToleranceGroupSchema = insertToleranceGroupSchema.partial();

// Types
export type ToleranceGroup = typeof toleranceGroups.$inferSelect;
export type InsertToleranceGroup = z.infer<typeof insertToleranceGroupSchema>;
export type UpdateToleranceGroup = z.infer<typeof updateToleranceGroupSchema>;
