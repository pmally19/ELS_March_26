import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const costCenterCategories = pgTable("cost_center_categories", {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 2 }).notNull().unique(), // e.g., 'W', 'F'
    name: text("name").notNull(), // e.g., 'Administration'
    description: text("description"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

export const insertCostCenterCategorySchema = createInsertSchema(costCenterCategories).omit({
    id: true,
    created_at: true,
    updated_at: true
});

export type CostCenterCategory = typeof costCenterCategories.$inferSelect;
export type InsertCostCenterCategory = typeof insertCostCenterCategorySchema.$inferInsert;
