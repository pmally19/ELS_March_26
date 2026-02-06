import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAccountTypeSchema = createInsertSchema(accountTypes, {
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateAccountTypeSchema = insertAccountTypeSchema.partial();

export type InsertAccountType = z.infer<typeof insertAccountTypeSchema>;
export type UpdateAccountType = z.infer<typeof updateAccountTypeSchema>;
export type AccountType = typeof accountTypes.$inferSelect;

