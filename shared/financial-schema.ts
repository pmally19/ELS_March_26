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