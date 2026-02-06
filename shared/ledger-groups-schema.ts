import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Ledger Groups - Groups of related accounting ledgers
 * No SAP terminology used
 */
export const ledgerGroups = pgTable("ledger_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  groupType: varchar("group_type", { length: 50 }),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

export const insertLedgerGroupSchema = createInsertSchema(ledgerGroups, {
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  groupType: z.enum(["STANDARD", "CONSOLIDATION", "TAX_REPORTING"]).optional(),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const updateLedgerGroupSchema = insertLedgerGroupSchema.partial();

export type LedgerGroup = typeof ledgerGroups.$inferSelect;
export type InsertLedgerGroup = z.infer<typeof insertLedgerGroupSchema>;
export type UpdateLedgerGroup = z.infer<typeof updateLedgerGroupSchema>;

