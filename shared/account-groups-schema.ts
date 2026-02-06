import { pgTable, serial, varchar, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Account Groups table - align with actual DB columns (code, name, description, account_type, number_range_from/to)
export const accountGroups = pgTable("account_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  accountType: varchar("account_type", { length: 20 }).notNull(), // CUSTOMER, VENDOR, GL
  numberRangeFrom: varchar("number_range_from", { length: 20 }),
  numberRangeTo: varchar("number_range_to", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAccountGroupSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  accountType: z.string().min(1).max(20),
  numberRangeFrom: z.string().optional(),
  numberRangeTo: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const selectAccountGroupSchema = createSelectSchema(accountGroups);

export type InsertAccountGroup = z.infer<typeof insertAccountGroupSchema>;
export type AccountGroup = typeof accountGroups.$inferSelect;