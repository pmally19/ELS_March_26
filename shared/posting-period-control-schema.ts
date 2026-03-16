import { pgTable, serial, integer, text, boolean, timestamp, date, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { companyCodes } from "./schema";
import { fiscalYearVariants } from "./schema";

/**
 * Posting Period Control - Controls when transactions can be posted to the general ledger
 * Links company codes, fiscal years, and periods with posting permissions
 */
export const postingPeriodControls = pgTable("posting_period_controls", {
  id: serial("id").primaryKey(),
  
  // Company and Fiscal Year Association
  companyCodeId: integer("company_code_id").notNull().references(() => companyCodes.id),
  fiscalYearVariantId: integer("fiscal_year_variant_id").references(() => fiscalYearVariants.id),
  fiscalYear: integer("fiscal_year").notNull(), // e.g., 2024, 2025
  
  // Period Range Control
  periodFrom: integer("period_from").notNull(), // Starting period (1-16)
  periodTo: integer("period_to").notNull(), // Ending period (1-16)
  
  // Posting Control Status
  postingStatus: varchar("posting_status", { length: 20 }).notNull().default("OPEN"), // OPEN, CLOSED, LOCKED
  allowPosting: boolean("allow_posting").default(true).notNull(),
  allowAdjustments: boolean("allow_adjustments").default(false).notNull(), // Allow adjustment entries
  allowReversals: boolean("allow_reversals").default(true).notNull(), // Allow reversal entries
  
  // Control Details
  controlReason: text("control_reason"), // Reason for closing/locking
  controlledBy: integer("controlled_by"), // User ID who set the control
  controlledAt: timestamp("controlled_at"), // When the control was set
  
  // Status and Metadata
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

export const postingPeriodControlRelations = relations(postingPeriodControls, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [postingPeriodControls.companyCodeId],
    references: [companyCodes.id],
  }),
  fiscalYearVariant: one(fiscalYearVariants, {
    fields: [postingPeriodControls.fiscalYearVariantId],
    references: [fiscalYearVariants.id],
  }),
}));

// Validation Schema - Manual Zod schema to avoid type issues with createInsertSchema
const baseInsertSchema = z.object({
  companyCodeId: z.number().int().positive(),
  fiscalYearVariantId: z.number().int().positive().optional(),
  fiscalYear: z.number().int().min(1900).max(9999),
  periodFrom: z.number().int().min(1).max(16),
  periodTo: z.number().int().min(1).max(16),
  postingStatus: z.enum(["OPEN", "CLOSED", "LOCKED"]),
  allowPosting: z.boolean().default(true),
  allowAdjustments: z.boolean().default(false),
  allowReversals: z.boolean().default(true),
  controlReason: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertPostingPeriodControlSchema = baseInsertSchema.refine(
  (data) => data.periodTo >= data.periodFrom,
  {
    message: "Period To must be greater than or equal to Period From",
    path: ["periodTo"],
  }
);

export const updatePostingPeriodControlSchema = baseInsertSchema.partial().refine(
  (data) => {
    if (data.periodFrom !== undefined && data.periodTo !== undefined) {
      return data.periodTo >= data.periodFrom;
    }
    return true;
  },
  {
    message: "Period To must be greater than or equal to Period From",
    path: ["periodTo"],
  }
);

// Types
export type InsertPostingPeriodControl = z.infer<typeof insertPostingPeriodControlSchema>;
export type UpdatePostingPeriodControl = z.infer<typeof updatePostingPeriodControlSchema>;
export type PostingPeriodControl = typeof postingPeriodControls.$inferSelect;

