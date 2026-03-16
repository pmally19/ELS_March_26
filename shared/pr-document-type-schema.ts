import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Purchase Requisition Document Types Master Data
export const prDocumentTypes = pgTable("pr_document_types", {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 10 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPRDocumentTypeSchema = createInsertSchema(prDocumentTypes).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type PRDocumentType = typeof prDocumentTypes.$inferSelect;
export type InsertPRDocumentType = typeof insertPRDocumentTypeSchema._type;
