import { pgTable, text, serial, integer, boolean, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { numberRanges } from "./schema";

// Purchase Order Document Types Master Data
export const poDocumentTypes = pgTable("po_document_types", {
    id: serial("id").primaryKey(),

    // Basic identification (3 chars)
    code: varchar("code", { length: 3 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    // Number Range - Foreign Key to number_ranges table
    numberRangeId: integer("number_range_id").references(() => numberRanges.id),

    // Item numbering control
    itemInterval: integer("item_interval").notNull().default(10),

    // Field control
    fieldSelectionKey: varchar("field_selection_key", { length: 3 }).notNull(),

    // Allowed categories (stored as JSON arrays)
    itemCategoriesAllowed: json("item_categories_allowed").$type<string[]>().notNull(),
    accountAssignmentCategories: json("account_assignment_categories").$type<string[]>().notNull(),

    // Partner and message control
    partnerDeterminationSchema: varchar("partner_determination_schema", { length: 10 }).notNull(),
    messageSchema: varchar("message_schema", { length: 10 }).notNull(),

    // Approval workflow
    releaseProcedureRequired: boolean("release_procedure_required").notNull().default(false),

    // Status and timestamps
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPODocumentTypeSchema = createInsertSchema(poDocumentTypes).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type PODocumentType = typeof poDocumentTypes.$inferSelect;
export type InsertPODocumentType = typeof insertPODocumentTypeSchema._type;
