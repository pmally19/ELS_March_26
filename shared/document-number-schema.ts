import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Document Number Sequences Table
 * Manages automatic number generation for various document types
 * without hardcoded values or SAP terminology
 */
export const documentNumberSequences = pgTable("document_number_sequences", {
    id: serial("id").primaryKey(),
    documentType: varchar("document_type", { length: 20 }).notNull().unique(),
    prefix: varchar("prefix", { length: 10 }).notNull(),
    currentNumber: integer("current_number").notNull().default(0),
    resetFrequency: varchar("reset_frequency", { length: 20 }).default("NEVER"), // DAILY, MONTHLY, YEARLY, NEVER
    lastResetDate: timestamp("last_reset_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentNumberSequenceSchema = createInsertSchema(documentNumberSequences).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type DocumentNumberSequence = typeof documentNumberSequences.$inferSelect;
export type InsertDocumentNumberSequence = z.infer<typeof insertDocumentNumberSequenceSchema>;
