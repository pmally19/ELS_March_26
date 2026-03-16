import { pgTable, text, serial, integer, boolean, numeric, timestamp, jsonb, foreignKey, pgEnum, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========================
// PHASE 1: MASTER DATA
// ========================

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

// Status enum for approval workflows
export const approvalStatusEnum = pgEnum('approval_status', [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'superseded'
]);

// Users and Authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").default("user").notNull(),
  department: text("department"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
});

export const userRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  createdCategories: many(categories, { relationName: "categoryCreator" }),
  updatedCategories: many(categories, { relationName: "categoryUpdater" }),
}));

// Roles and Permissions
export const roles = pgTable("roles", {
  ...commonFields,
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  ...commonFields,
  name: text("name").notNull().unique(),
  description: text("description"),
  module: text("module").notNull(),
  action: text("action").notNull(), // create, read, update, delete
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id),
  permissionId: integer("permission_id").notNull().references(() => permissions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  roleId: integer("role_id").notNull().references(() => roles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Units of Measure
export const uom = pgTable("units_of_measure", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  dimension: text("dimension"),
  conversionFactor: numeric("conversion_factor").default("1"),
  baseUomId: integer("base_uom_id"),
  isBase: boolean("is_base").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  active: boolean("active").default(true),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
  _tenantId: text("_tenantId").default("001"),
  _deletedAt: timestamp("_deletedAt", { withTimezone: true }),
});

export const uomRelations = relations(uom, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [uom.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [uom.updatedBy],
    references: [users.id],
  }),
  fromConversions: many(uomConversions, { relationName: "fromUom" }),
  toConversions: many(uomConversions, { relationName: "toUom" }),
  products: many(products, { relationName: "productUom" }),
  productWeightUom: many(products, { relationName: "weightUom" }),
  materials: many(materials, { relationName: "materialUom" }),
  boms: many(bom, { relationName: "bomUom" }),
  bomItems: many(bomItems, { relationName: "bomItemUom" }),
}));

export const uomConversions = pgTable("uom_conversions", {
  id: serial("id").primaryKey(),
  fromUomId: integer("from_uom_id").notNull().references(() => uom.id),
  toUomId: integer("to_uom_id").notNull().references(() => uom.id),
  conversionFactor: numeric("conversion_factor").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  active: boolean("active").default(true),
  notes: text("notes"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
});

export const uomConversionRelations = relations(uomConversions, ({ one }) => ({
  fromUom: one(uom, {
    fields: [uomConversions.fromUomId],
    references: [uom.id],
    relationName: "fromUom",
  }),
  toUom: one(uom, {
    fields: [uomConversions.toUomId],
    references: [uom.id],
    relationName: "toUom",
  }),
  createdBy: one(users, {
    fields: [uomConversions.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [uomConversions.updatedBy],
    references: [users.id],
  }),
}));

// Locations (Warehouses, Stores, Production Sites)
export const locations = pgTable("locations", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // warehouse, store, production, etc.
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  isDefault: boolean("is_default").default(false),
});

export const locationRelations = relations(locations, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [locations.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [locations.updatedBy],
    references: [users.id],
  }),
  storageAreas: many(storageAreas),
}));

// Storage areas within locations
export const storageAreas = pgTable("storage_areas", {
  ...commonFields,
  locationId: integer("location_id").notNull().references(() => locations.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  capacity: numeric("capacity"),
  capacityUomId: integer("capacity_uom_id").references(() => uom.id),
});

export const storageAreaRelations = relations(storageAreas, ({ one }) => ({
  location: one(locations, {
    fields: [storageAreas.locationId],
    references: [locations.id],
  }),
  capacityUom: one(uom, {
    fields: [storageAreas.capacityUomId],
    references: [uom.id],
  }),
  createdBy: one(users, {
    fields: [storageAreas.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [storageAreas.updatedBy],
    references: [users.id],
  }),
}));

// Categories (Product/Material Categories)
export const categories = pgTable("categories", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id").references(() => categories.id), // for hierarchy
  path: text("path"), // for efficient hierarchy queries
  level: integer("level").default(1).notNull(), // hierarchy level
  glAccountId: integer("gl_account_id"), // for financial integration
});

export const categoryRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  createdBy: one(users, {
    fields: [categories.createdBy],
    references: [users.id],
    relationName: "categoryCreator",
  }),
  updatedBy: one(users, {
    fields: [categories.updatedBy],
    references: [users.id],
    relationName: "categoryUpdater",
  }),
  children: many(categories),
  products: many(products),
  materials: many(materials),
}));

// Products (Finished Goods)
export const products = pgTable("products", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  uomId: integer("uom_id").notNull().references(() => uom.id),
  defaultPrice: numeric("default_price"),
  cost: numeric("cost"),
  weight: numeric("weight"),
  weightUomId: integer("weight_uom_id").references(() => uom.id),
  dimensions: jsonb("dimensions").$type<{
    length: number,
    width: number,
    height: number,
    uomId: number
  }>(),
  minStock: numeric("min_stock").default("0"),
  maxStock: numeric("max_stock"),
  reorderPoint: numeric("reorder_point"),
  leadTime: integer("lead_time"), // in days
  shelfLife: integer("shelf_life"), // in days
  isSellable: boolean("is_sellable").default(true),
  attributes: jsonb("attributes").$type<Record<string, string>>(), // flexible attributes
  taxRate: numeric("tax_rate").default("0"),
  hasImage: boolean("has_image").default(false),
  tags: text("tags").array(),
});

export const productRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  uom: one(uom, {
    fields: [products.uomId],
    references: [uom.id],
    relationName: "productUom",
  }),
  weightUom: one(uom, {
    fields: [products.weightUomId],
    references: [uom.id],
    relationName: "weightUom",
  }),
  createdBy: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [products.updatedBy],
    references: [users.id],
  }),
  boms: many(bom),
}));

// Raw Materials
export const materials = pgTable("materials", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  uomId: integer("uom_id").notNull().references(() => uom.id),
  cost: numeric("cost"),
  leadTime: integer("lead_time"), // in days
  minStock: numeric("min_stock").default("0"),
  maxStock: numeric("max_stock"),
  reorderPoint: numeric("reorder_point"),
  attributes: jsonb("attributes").$type<Record<string, string>>(), // flexible attributes
});

export const materialRelations = relations(materials, ({ one, many }) => ({
  category: one(categories, {
    fields: [materials.categoryId],
    references: [categories.id],
  }),
  uom: one(uom, {
    fields: [materials.uomId],
    references: [uom.id],
    relationName: "materialUom",
  }),
  createdBy: one(users, {
    fields: [materials.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [materials.updatedBy],
    references: [users.id],
  }),
  bomItems: many(bomItems),
  vendorMaterials: many(vendorMaterials),
}));

// Bill of Materials (BOM)
export const bom = pgTable("bom", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  productId: integer("product_id").notNull().references(() => products.id),
  effectiveDate: timestamp("effective_date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  status: approvalStatusEnum("status").default("draft").notNull(),
  baseQuantity: numeric("base_quantity").default("1").notNull(), // base quantity of finished product
  baseUomId: integer("base_uom_id").notNull().references(() => uom.id),
});

export const bomRelations = relations(bom, ({ one, many }) => ({
  product: one(products, {
    fields: [bom.productId],
    references: [products.id],
  }),
  uom: one(uom, {
    fields: [bom.baseUomId],
    references: [uom.id],
    relationName: "bomUom",
  }),
  createdBy: one(users, {
    fields: [bom.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [bom.updatedBy],
    references: [users.id],
  }),
  items: many(bomItems),
}));

// BOM Items
export const bomItems = pgTable("bom_items", {
  ...commonFields,
  bomId: integer("bom_id").notNull().references(() => bom.id),
  materialId: integer("material_id").notNull().references(() => materials.id),
  quantity: numeric("quantity").notNull(),
  uomId: integer("uom_id").notNull().references(() => uom.id),
  scrapPercentage: numeric("scrap_percentage").default("0"),
  isOptional: boolean("is_optional").default(false),
});

export const bomItemRelations = relations(bomItems, ({ one }) => ({
  bom: one(bom, {
    fields: [bomItems.bomId],
    references: [bom.id],
  }),
  material: one(materials, {
    fields: [bomItems.materialId],
    references: [materials.id],
  }),
  uom: one(uom, {
    fields: [bomItems.uomId],
    references: [uom.id],
    relationName: "bomItemUom",
  }),
  createdBy: one(users, {
    fields: [bomItems.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [bomItems.updatedBy],
    references: [users.id],
  }),
}));

// Customers and Customer Categories
export const customerCategories = pgTable("customer_categories", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  discountPercentage: numeric("discount_percentage").default("0"),
});

export const customerCategoryRelations = relations(customerCategories, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [customerCategories.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [customerCategories.updatedBy],
    references: [users.id],
  }),
  customers: many(customers),
}));

export const customers = pgTable("customers", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // individual, company, etc.
  email: text("email"),
  phone: text("phone"),
  taxId: text("tax_id"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  creditLimit: numeric("credit_limit"),
  paymentTerms: text("payment_terms"),
  status: text("status").default("active"),
  categoryId: integer("category_id").references(() => customerCategories.id),
});

export const customerRelations = relations(customers, ({ one, many }) => ({
  category: one(customerCategories, {
    fields: [customers.categoryId],
    references: [customerCategories.id],
  }),
  createdBy: one(users, {
    fields: [customers.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [customers.updatedBy],
    references: [users.id],
  }),
  contacts: many(customerContacts),
}));

export const customerContacts = pgTable("customer_contacts", {
  ...commonFields,
  customerId: integer("customer_id").notNull().references(() => customers.id),
  name: text("name").notNull(),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").default(false),
});

export const customerContactRelations = relations(customerContacts, ({ one }) => ({
  customer: one(customers, {
    fields: [customerContacts.customerId],
    references: [customers.id],
  }),
  createdBy: one(users, {
    fields: [customerContacts.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [customerContacts.updatedBy],
    references: [users.id],
  }),
}));

// Vendors/Suppliers
export const vendorCategories = pgTable("vendor_categories", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
});

export const vendorCategoryRelations = relations(vendorCategories, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [vendorCategories.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [vendorCategories.updatedBy],
    references: [users.id],
  }),
  vendors: many(vendors),
}));

export const vendors = pgTable("vendors", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  taxId: text("tax_id"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  paymentTerms: text("payment_terms"),
  leadTime: integer("lead_time"), // in days
  status: text("status").default("active"),
  categoryId: integer("category_id").references(() => vendorCategories.id),
});

export const vendorRelations = relations(vendors, ({ one, many }) => ({
  category: one(vendorCategories, {
    fields: [vendors.categoryId],
    references: [vendorCategories.id],
  }),
  createdBy: one(users, {
    fields: [vendors.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [vendors.updatedBy],
    references: [users.id],
  }),
  contacts: many(vendorContacts),
  materials: many(vendorMaterials),
}));

export const vendorContacts = pgTable("vendor_contacts", {
  ...commonFields,
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  name: text("name").notNull(),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").default(false),
});

export const vendorContactRelations = relations(vendorContacts, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorContacts.vendorId],
    references: [vendors.id],
  }),
  createdBy: one(users, {
    fields: [vendorContacts.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [vendorContacts.updatedBy],
    references: [users.id],
  }),
}));

export const vendorMaterials = pgTable("vendor_materials", {
  ...commonFields,
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  materialId: integer("material_id").notNull().references(() => materials.id),
  price: numeric("price"),
  leadTime: integer("lead_time"), // in days
  minOrderQty: numeric("min_order_qty"),
  isPreferred: boolean("is_preferred").default(false),
});

export const vendorMaterialRelations = relations(vendorMaterials, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorMaterials.vendorId],
    references: [vendors.id],
  }),
  material: one(materials, {
    fields: [vendorMaterials.materialId],
    references: [materials.id],
  }),
  createdBy: one(users, {
    fields: [vendorMaterials.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [vendorMaterials.updatedBy],
    references: [users.id],
  }),
}));

export const sourceLists = pgTable("source_lists", {
  ...commonFields,
  materialId: integer("material_id").notNull().references(() => materials.id),
  plantId: integer("plant_id"), // Plant ID without cross-file FK for now
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to").notNull(),
  isFixed: boolean("is_fixed").default(false),
  isBlocked: boolean("is_blocked").default(false),
});

export const sourceListRelations = relations(sourceLists, ({ one }) => ({
  material: one(materials, {
    fields: [sourceLists.materialId],
    references: [materials.id],
  }),
  // Removing plant relation to avoid complex cross-schema imports
  vendor: one(vendors, {
    fields: [sourceLists.vendorId],
    references: [vendors.id],
  }),
  createdBy: one(users, {
    fields: [sourceLists.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [sourceLists.updatedBy],
    references: [users.id],
  }),
}));

// Chart of Accounts
export const glAccounts = pgTable("gl_accounts", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // asset, liability, equity, revenue, expense
  subtype: text("subtype"), // e.g., current asset, fixed asset
  parentId: integer("parent_id").references(() => glAccounts.id), // for hierarchy
  path: text("path"), // for efficient hierarchy queries
  level: integer("level").default(1).notNull(), // hierarchy level
  isPostable: boolean("is_postable").default(true), // can transactions be posted to this account?
});

export const glAccountRelations = relations(glAccounts, ({ one, many }) => ({
  parent: one(glAccounts, {
    fields: [glAccounts.parentId],
    references: [glAccounts.id],
  }),
  createdBy: one(users, {
    fields: [glAccounts.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [glAccounts.updatedBy],
    references: [users.id],
  }),
  children: many(glAccounts),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, lastLogin: true
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, path: true
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

export const insertUomSchema = createInsertSchema(uom).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

export const insertBomSchema = createInsertSchema(bom).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

export const insertGlAccountSchema = createInsertSchema(glAccounts).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, path: true
});

export const insertSourceListSchema = createInsertSchema(sourceLists).omit({
  id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export type InsertUom = z.infer<typeof insertUomSchema>;
export type Uom = typeof uom.$inferSelect;

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertBom = z.infer<typeof insertBomSchema>;
export type Bom = typeof bom.$inferSelect;

export type InsertGlAccount = z.infer<typeof insertGlAccountSchema>;
export type GlAccount = typeof glAccounts.$inferSelect;

export type InsertSourceList = z.infer<typeof insertSourceListSchema>;
export type SourceList = typeof sourceLists.$inferSelect;