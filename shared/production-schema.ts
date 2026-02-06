import { pgTable, text, serial, integer, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { materials } from "./core-schema";

// Common fields for audit and versioning
const commonFields = {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
};

// Bill of Materials (BOM) Header
export const bomHeaders = pgTable("bom_headers", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  materialId: integer("material_id").notNull().references(() => materials.id), // Finished product
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("draft"), // draft, active, obsolete
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  plantId: integer("plant_id"), // Plant where this BOM is valid
  batchSize: numeric("batch_size").default("1"), // Standard batch size for production
  batchSizeUomId: integer("batch_size_uom_id"), // UoM for batch size
  altBomFlag: boolean("alt_bom_flag").default(false), // Indicates if this is an alternative BOM
  altBomGroup: text("alt_bom_group"), // Group for alternative BOMs
  isEngineering: boolean("is_engineering").default(false), // Engineering BOM vs Manufacturing BOM
  engineeringChangeNumber: text("engineering_change_number"), // ECN reference
  isPrimary: boolean("is_primary").default(true), // Indicates primary BOM
  costingVersion: text("costing_version"), // Version for costing purposes
  approvedBy: integer("approved_by"), // User who approved the BOM
  approvalDate: timestamp("approval_date"),
});

// BOM Items - Components that make up the finished product
export const bomItems = pgTable("bom_items", {
  ...commonFields,
  bomHeaderId: integer("bom_header_id").notNull().references(() => bomHeaders.id),
  materialId: integer("material_id").notNull().references(() => materials.id), // Component material
  position: integer("position").notNull(), // Position/sequence in BOM
  quantity: numeric("quantity").notNull(), // Quantity needed
  uomId: integer("uom_id").notNull(), // Unit of measure
  componentType: text("component_type").default("standard"), // standard, option, alternative, etc.
  itemCategory: text("item_category"), // raw material, semi-finished, packaging, etc.
  isAssembly: boolean("is_assembly").default(false), // If this component has its own BOM
  scrap: numeric("scrap").default("0"), // Scrap percentage
  proportionalScrap: boolean("proportional_scrap").default(true), // If scrap is proportional to batch size
  fixedQty: boolean("fixed_qty").default(false), // If quantity is fixed regardless of batch size
  operationNumber: text("operation_number"), // Associated operation in routing
  storageLocationId: integer("storage_location_id"), // Preferred storage location
  alternateGroupId: text("alternate_group_id"), // Group for alternates
  coProdByProduct: text("co_prod_by_product"), // Co-product or by-product indicator
  consumptionType: text("consumption_type").default("normal"), // Normal, backflushing, manual
  phantomItem: boolean("phantom_item").default(false), // If this is a phantom assembly (not physically built)
  relevantForCosting: boolean("relevant_for_costing").default(true), // If this component is included in costing
});

// Relations for BOM Header
export const bomHeaderRelations = relations(bomHeaders, ({ one, many }) => ({
  material: one(materials, {
    fields: [bomHeaders.materialId],
    references: [materials.id]
  }),
  items: many(bomItems)
}));

// Relations for BOM Items
export const bomItemRelations = relations(bomItems, ({ one }) => ({
  bomHeader: one(bomHeaders, {
    fields: [bomItems.bomHeaderId],
    references: [bomHeaders.id]
  }),
  material: one(materials, {
    fields: [bomItems.materialId],
    references: [materials.id]
  })
}));

// Insert Schemas
export const insertBomHeaderSchema = createInsertSchema(bomHeaders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

export const insertBomItemSchema = createInsertSchema(bomItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
});

// Types
export type InsertBomHeader = z.infer<typeof insertBomHeaderSchema>;
export type BomHeader = typeof bomHeaders.$inferSelect;

export type InsertBomItem = z.infer<typeof insertBomItemSchema>;
export type BomItem = typeof bomItems.$inferSelect;