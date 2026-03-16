import { pgTable, serial, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const numberRangeObjects = pgTable("number_range_objects", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

export const insertNumberRangeObjectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true).optional(),
  createdBy: z.number().int().optional().nullable(),
  updatedBy: z.number().int().optional().nullable(),
});

export const updateNumberRangeObjectSchema = insertNumberRangeObjectSchema.partial();

export type InsertNumberRangeObject = z.infer<typeof insertNumberRangeObjectSchema>;
export type UpdateNumberRangeObject = z.infer<typeof updateNumberRangeObjectSchema>;
export type NumberRangeObject = typeof numberRangeObjects.$inferSelect;

