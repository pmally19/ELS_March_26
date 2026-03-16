import { pgTable, serial, varchar, text, decimal, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Interest Calculators Master Data
export const interestCalculators = pgTable("interest_calculators", {
    id: serial("id").primaryKey(),

    // Core Identification
    calculatorCode: varchar("calculator_code", { length: 20 }).notNull().unique(),
    calculatorName: varchar("calculator_name", { length: 100 }).notNull(),

    // Interest Configuration
    interestType: varchar("interest_type", { length: 20 }).notNull(),
    calculationBasis: varchar("calculation_basis", { length: 20 }).notNull(),
    frequency: varchar("frequency", { length: 20 }).notNull(),

    // Calculation Details
    formula: text("formula"),
    defaultRate: decimal("default_rate", { precision: 10, scale: 4 }),

    // Rounding Configuration
    roundingMethod: varchar("rounding_method", { length: 20 }).default("round_nearest"),
    roundingPrecision: integer("rounding_precision").default(2),

    // Documentation
    description: text("description"),

    // Status & Audit
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInterestCalculatorSchema = createInsertSchema(interestCalculators).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InterestCalculator = typeof interestCalculators.$inferSelect;
export type InsertInterestCalculator = typeof insertInterestCalculatorSchema._type;
