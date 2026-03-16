import { pgTable, serial, integer, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { companyCodes } from "./organizational-schema";
import { fiscalYearVariants } from "./schema";

// Shared option lists so UI can fetch at runtime instead of hardcoding
export const depreciationMethodValues = [
  "STRAIGHT_LINE",
  "DECLINING_BALANCE",
  "UNITS_OF_PRODUCTION",
  "SUM_OF_YEARS",
  "DOUBLE_DECLINING",
] as const;

export const baseMethodValues = [
  "ACQUISITION_VALUE",
  "REPLACEMENT_VALUE",
  "BOOK_VALUE",
] as const;

export const depreciationCalculationValues = [
  "PRO_RATA",
  "FULL_YEAR",
  "HALF_YEAR",
] as const;

export const periodControlValues = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
] as const;

export const chartOfDepreciation = pgTable("chart_of_depreciation", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  fiscalYearVariantId: integer("fiscal_year_variant_id").references(() => fiscalYearVariants.id),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  country: varchar("country", { length: 3 }),
  depreciationMethod: varchar("depreciation_method", { length: 50 }), // e.g., STRAIGHT_LINE, DECLINING_BALANCE, UNITS_OF_PRODUCTION
  baseMethod: varchar("base_method", { length: 50 }), // e.g., ACQUISITION_VALUE, REPLACEMENT_VALUE
  depreciationCalculation: varchar("depreciation_calculation", { length: 50 }), // e.g., PRO_RATA, FULL_YEAR
  periodControl: varchar("period_control", { length: 20 }), // e.g., MONTHLY, QUARTERLY, ANNUAL
  allowManualDepreciation: boolean("allow_manual_depreciation").default(false).notNull(),
  allowAcceleratedDepreciation: boolean("allow_accelerated_depreciation").default(false).notNull(),
  allowSpecialDepreciation: boolean("allow_special_depreciation").default(false).notNull(),
  requireDepreciationKey: boolean("require_depreciation_key").default(true).notNull(),
  allowNegativeDepreciation: boolean("allow_negative_depreciation").default(false).notNull(),
  depreciationStartDate: timestamp("depreciation_start_date"),
  depreciationEndDate: timestamp("depreciation_end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

export const chartOfDepreciationRelations = relations(chartOfDepreciation, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [chartOfDepreciation.companyCodeId],
    references: [companyCodes.id],
  }),
  fiscalYearVariant: one(fiscalYearVariants, {
    fields: [chartOfDepreciation.fiscalYearVariantId],
    references: [fiscalYearVariants.id],
  }),
}));

// Helper to handle enum fields that may receive empty strings from frontend
const enumOrEmpty = <T extends z.ZodEnum<any>>(enumSchema: T) => {
  return z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    enumSchema.optional().nullable()
  );
};

export const insertChartOfDepreciationSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(255),
  description: z.preprocess((val) => (val === "" ? null : val), z.string().optional().nullable()),
  companyCodeId: z.number().int().positive(),
  fiscalYearVariantId: z.number().int().positive().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  country: z.preprocess((val) => (val === "" ? null : val), z.string().max(3).optional().nullable()),
  // Accept either predefined enum values or custom codes (e.g., DB method codes like SL-01)
  depreciationMethod: z.preprocess(
    (val) => (val === "" ? null : val),
    z.union([
      z.enum(depreciationMethodValues),
      z.string().max(50),
      z.null(),
    ]).optional().nullable()
  ),
  baseMethod: enumOrEmpty(z.enum(baseMethodValues)),
  depreciationCalculation: enumOrEmpty(z.enum(depreciationCalculationValues)),
  periodControl: enumOrEmpty(z.enum(periodControlValues)),
  allowManualDepreciation: z.boolean().default(false).optional(),
  allowAcceleratedDepreciation: z.boolean().default(false).optional(),
  allowSpecialDepreciation: z.boolean().default(false).optional(),
  requireDepreciationKey: z.boolean().default(true).optional(),
  allowNegativeDepreciation: z.boolean().default(false).optional(),
  depreciationStartDate: z.string()
    .refine((val) => {
      if (!val || val === null || val === '') return true; // Allow empty/null
      // Accept ISO datetime (2025-12-10T00:00:00.000Z) or date format (2025-12-10)
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return dateRegex.test(val);
    }, { message: "Date must be in YYYY-MM-DD or ISO datetime format" })
    .optional()
    .nullable(),
  depreciationEndDate: z.string()
    .refine((val) => {
      if (!val || val === null || val === '') return true; // Allow empty/null
      // Accept ISO datetime (2025-12-10T00:00:00.000Z) or date format (2025-12-10)
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      return dateRegex.test(val);
    }, { message: "Date must be in YYYY-MM-DD or ISO datetime format" })
    .optional()
    .nullable(),
  isActive: z.boolean().default(true).optional(),
  createdBy: z.number().int().optional().nullable(),
  updatedBy: z.number().int().optional().nullable(),
});

export const updateChartOfDepreciationSchema = insertChartOfDepreciationSchema.partial();

export type InsertChartOfDepreciation = z.infer<typeof insertChartOfDepreciationSchema>;
export type UpdateChartOfDepreciation = z.infer<typeof updateChartOfDepreciationSchema>;
export type ChartOfDepreciation = typeof chartOfDepreciation.$inferSelect;

