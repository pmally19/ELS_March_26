import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enterprise Structure Tables

// Sales Organization
export const salesOrganizations = pgTable("sd_sales_organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id"),
  currency: text("currency"),
  region: text("region"),
  distributionChannel: text("distribution_channel"),
  industry: text("industry"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  manager: text("manager"),
  status: text("status"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by"),
  version: integer("version").default(1),
  active: boolean("active").default(true),
});

// Distribution Channel
export const distributionChannels = pgTable("sd_distribution_channels", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 5 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Division
export const divisions = pgTable("sd_divisions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 5 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Office
export const salesOffices = pgTable("sd_sales_offices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("sales_office_id", { length: 4 }).unique().notNull(), // Map code to sales_office_id
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  region: varchar("region", { length: 50 }),
  country: varchar("country", { length: 50 }),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Shipping Point
export const shippingPoints = pgTable("sd_shipping_points", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 4 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  plantCode: varchar("plant_code", { length: 4 }).notNull(),
  factoryCalendar: varchar("factory_calendar", { length: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shipping Conditions (Logistics)
export const shippingConditions = pgTable("sd_shipping_conditions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conditionCode: varchar("condition_code", { length: 4 }).unique().notNull(), // Shipping Condition Code
  description: varchar("description", { length: 100 }).notNull(), // Description (of Condition)
  loadingGroup: varchar("loading_group", { length: 4 }),
  plantCode: varchar("plant_code", { length: 4 }), // Plant (Delivering)
  proposedShippingPoint: varchar("proposed_shipping_point", { length: 4 }),
  manualShippingPointAllowed: boolean("manual_shipping_point_allowed").default(true), // Manual Shipping Point (Optional)
  countryOfDeparture: varchar("country_of_departure", { length: 3 }),
  departureZone: varchar("departure_zone", { length: 10 }),
  transportationGroup: varchar("transportation_group", { length: 4 }),
  countryOfDestination: varchar("country_of_destination", { length: 3 }),
  receivingZone: varchar("receiving_zone", { length: 10 }),
  weightGroup: varchar("weight_group", { length: 4 }),
  proposedRoute: varchar("proposed_route", { length: 6 }), // Proposed Route
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Incoterms Definition Table (Core System Configuration)
export const incoterms = pgTable("sd_incoterms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  incotermsKey: varchar("incoterms_key", { length: 3 }).unique().notNull(), // e.g., FOB, CIF, EXW
  description: varchar("description", { length: 100 }).notNull(), // e.g., "Free On Board"
  category: varchar("category", { length: 50 }).notNull(), // e.g., "All Modes", "Sea/Inland Waterway"
  applicableVersion: varchar("applicable_version", { length: 10 }).notNull(), // e.g., "2020"
  riskTransferPoint: varchar("risk_transfer_point", { length: 100 }), // Where risk transfers from seller to buyer
  costResponsibility: varchar("cost_responsibility", { length: 200 }), // Who is responsible for costs
  applicableTransport: varchar("applicable_transport", { length: 20 }), // SEA, LAND, AIR, MULTIMODAL
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Incoterms Defaults (from Customer Master Record)
export const customerIncotermsDefaults = pgTable("sd_customer_incoterms_defaults", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull(),
  incotermsKey: varchar("incoterms_key", { length: 3 }).notNull(), // Part 1: The Rule
  incotermsLocation: varchar("incoterms_location", { length: 100 }).notNull(), // Part 2: The Location
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Order Incoterms (actual values used in orders)
export const salesOrderIncoterms = pgTable("sd_sales_order_incoterms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  salesOrderId: integer("sales_order_id").notNull(),
  incotermsKey: varchar("incoterms_key", { length: 3 }).notNull(), // Part 1: The Rule
  incotermsLocation: varchar("incoterms_location", { length: 100 }).notNull(), // Part 2: The Location
  isDefaulted: boolean("is_defaulted").default(false), // Whether values were defaulted from customer
  isUserOverride: boolean("is_user_override").default(false), // Whether user overrode defaults
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Area (combination of Sales Org + Distribution Channel + Division)
export const salesAreas = pgTable("sd_sales_areas", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  salesOrgCode: varchar("sales_org_code", { length: 10 }).notNull(),
  distributionChannelCode: varchar("distribution_channel_code", { length: 5 }).notNull(),
  divisionCode: varchar("division_code", { length: 5 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sales_area_combo").on(table.salesOrgCode, table.distributionChannelCode, table.divisionCode),
]);

// Assignment Tables

// Sales Office to Sales Area Assignment
export const salesOfficeAssignments = pgTable("sd_sales_office_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  salesOfficeCode: varchar("sales_office_code", { length: 4 }).notNull(),
  salesAreaId: integer("sales_area_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales Document Configuration

// Document Types (Order Types, Delivery Types, Billing Types)
export const documentTypes = pgTable("sd_document_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 4 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  category: varchar("category", { length: 10 }).notNull(), // ORDER, DELIVERY, BILLING
  numberRange: varchar("number_range", { length: 2 }),
  defaultShippingCondition: varchar("default_shipping_condition", { length: 4 }), // Default Shipping Condition for this doc type
  documentFlow: jsonb("document_flow"), // Controls subsequent document creation
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Item Categories
export const itemCategories = pgTable("sd_item_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 4 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  documentCategory: varchar("document_category", { length: 10 }).notNull(),
  itemType: varchar("item_type", { length: 10 }).notNull(), // STANDARD, TEXT, SERVICE
  deliveryRelevant: boolean("delivery_relevant").default(true),
  billingRelevant: boolean("billing_relevant").default(true),
  pricingRelevant: boolean("pricing_relevant").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing Configuration

// Condition Tables
export const conditionTables = pgTable("sd_condition_tables", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tableNumber: varchar("table_number", { length: 3 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  fields: jsonb("fields").notNull(), // Array of field definitions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Access Sequences
export const accessSequences = pgTable("sd_access_sequences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 4 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  conditionType: varchar("condition_type", { length: 4 }).notNull(),
  accessOrder: jsonb("access_order").notNull(), // Array of table numbers in order
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Condition Types (Price Components)
export const conditionTypes = pgTable("sd_condition_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 4 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  conditionClass: varchar("condition_class", { length: 1 }).notNull(), // A=Price, B=Discount, C=Surcharge
  calculationType: varchar("calculation_type", { length: 1 }).notNull(), // A=Percentage, B=Amount, C=Quantity
  accessSequence: varchar("access_sequence", { length: 4 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing Procedures
export const pricingProcedures = pgTable("sd_pricing_procedures", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 6 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  steps: jsonb("steps").notNull(), // Array of pricing steps with condition types
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Output Configuration

// Output Types
export const outputTypes = pgTable("sd_output_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 4 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  application: varchar("application", { length: 2 }).notNull(), // V1=Sales, V2=Shipping, V3=Billing
  medium: varchar("medium", { length: 1 }).notNull(), // 1=Print, 2=Fax, 3=Email, 5=EDI
  programName: varchar("program_name", { length: 30 }),
  formName: varchar("form_name", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partner Configuration

// Partner Functions
export const partnerFunctions = pgTable("sd_partner_functions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 2 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  mandatory: boolean("mandatory").default(false),
  uniquePerDocument: boolean("unique_per_document").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Revenue Account Determination

// Account Assignment Groups
export const accountAssignmentGroups = pgTable("sd_account_assignment_groups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 2 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Revenue Account Determination Rules
export const revenueAccountRules = pgTable("sd_revenue_account_rules", {
  id: integer("id").primaryKey().notNull(),
  salesOrgCode: varchar("sales_org_code", { length: 4 }).notNull(),
  accountAssignmentGroup: varchar("account_assignment_group", { length: 2 }).notNull(),
  materialGroup: varchar("material_group", { length: 9 }),
  glAccount: varchar("gl_account", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Configuration

// Tax Codes
export const taxCodes = pgTable("sd_tax_codes", {
  id: integer("id").primaryKey().notNull(),
  code: varchar("code", { length: 2 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  country: varchar("country", { length: 3 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Tax Classification
export const customerTaxClassification = pgTable("sd_customer_tax_classification", {
  id: integer("id").primaryKey().notNull(),
  customerId: integer("customer_id").notNull(),
  taxCategory: varchar("tax_category", { length: 4 }).notNull(),
  taxCode: varchar("tax_code", { length: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Material Tax Classification
export const materialTaxClassification = pgTable("sd_material_tax_classification", {
  id: integer("id").primaryKey().notNull(),
  materialId: integer("material_id").notNull(),
  taxCategory: varchar("tax_category", { length: 4 }).notNull(),
  taxCode: varchar("tax_code", { length: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Number Range Configuration

// Number Range Objects
export const numberRangeObjects = pgTable("sd_number_range_objects", {
  id: integer("id").primaryKey().notNull(),
  objectCode: varchar("object_code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Number Ranges
export const numberRanges = pgTable("sd_number_ranges", {
  id: integer("id").primaryKey().notNull(),
  rangeNumber: varchar("range_number", { length: 2 }).notNull(),
  objectCode: varchar("object_code", { length: 10 }).notNull(),
  fromNumber: varchar("from_number", { length: 10 }).notNull(),
  toNumber: varchar("to_number", { length: 10 }).notNull(),
  currentNumber: varchar("current_number", { length: 10 }).notNull(),
  external: boolean("external").default(false), // True for external number assignment
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_number_range_object").on(table.objectCode, table.rangeNumber),
]);

// Copy Control Configuration

// Copy Control Headers
export const copyControlHeaders = pgTable("sd_copy_control_headers", {
  id: integer("id").primaryKey().notNull(),
  sourceDocType: varchar("source_doc_type", { length: 4 }).notNull(),
  targetDocType: varchar("target_doc_type", { length: 4 }).notNull(),
  copyRequirements: varchar("copy_requirements", { length: 3 }),
  dataTransfer: varchar("data_transfer", { length: 3 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Copy Control Items
export const copyControlItems = pgTable("sd_copy_control_items", {
  id: integer("id").primaryKey().notNull(),
  sourceDocType: varchar("source_doc_type", { length: 4 }).notNull(),
  sourceItemCategory: varchar("source_item_category", { length: 4 }).notNull(),
  targetDocType: varchar("target_doc_type", { length: 4 }).notNull(),
  targetItemCategory: varchar("target_item_category", { length: 4 }).notNull(),
  copyRequirements: varchar("copy_requirements", { length: 3 }),
  dataTransfer: varchar("data_transfer", { length: 3 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert and Select Schemas for type safety (omitting auto-generated ID fields)
export const insertSalesOrganizationSchema = createInsertSchema(salesOrganizations).omit({ id: true });
export const selectSalesOrganizationSchema = createSelectSchema(salesOrganizations);
export const insertDistributionChannelSchema = createInsertSchema(distributionChannels).omit({ id: true });
export const selectDistributionChannelSchema = createSelectSchema(distributionChannels);
export const insertDivisionSchema = createInsertSchema(divisions).omit({ id: true });
export const selectDivisionSchema = createSelectSchema(divisions);
export const insertSalesAreaSchema = createInsertSchema(salesAreas).omit({ id: true });
export const selectSalesAreaSchema = createSelectSchema(salesAreas);
export const insertDocumentTypeSchema = createInsertSchema(documentTypes).omit({ id: true });
export const selectDocumentTypeSchema = createSelectSchema(documentTypes);
export const insertConditionTypeSchema = createInsertSchema(conditionTypes).omit({ id: true });
export const selectConditionTypeSchema = createSelectSchema(conditionTypes);
export const insertPricingProcedureSchema = createInsertSchema(pricingProcedures).omit({ id: true });
export const selectPricingProcedureSchema = createSelectSchema(pricingProcedures);
export const insertShippingConditionSchema = createInsertSchema(shippingConditions).omit({ id: true });
export const selectShippingConditionSchema = createSelectSchema(shippingConditions);
export const insertIncotermsSchema = createInsertSchema(incoterms).omit({ id: true });
export const selectIncotermsSchema = createSelectSchema(incoterms);
export const insertCustomerIncotermsDefaultsSchema = createInsertSchema(customerIncotermsDefaults).omit({ id: true });
export const selectCustomerIncotermsDefaultsSchema = createSelectSchema(customerIncotermsDefaults);
export const insertSalesOrderIncotermsSchema = createInsertSchema(salesOrderIncoterms).omit({ id: true });
export const selectSalesOrderIncotermsSchema = createSelectSchema(salesOrderIncoterms);

// Type exports
export type SalesOrganization = typeof salesOrganizations.$inferSelect;
export type InsertSalesOrganization = typeof salesOrganizations.$inferInsert;
export type DistributionChannel = typeof distributionChannels.$inferSelect;
export type InsertDistributionChannel = typeof distributionChannels.$inferInsert;
export type Division = typeof divisions.$inferSelect;
export type InsertDivision = typeof divisions.$inferInsert;
export type SalesArea = typeof salesAreas.$inferSelect;
export type InsertSalesArea = typeof salesAreas.$inferInsert;
export type DocumentType = typeof documentTypes.$inferSelect;
export type InsertDocumentType = typeof documentTypes.$inferInsert;
export type ConditionType = typeof conditionTypes.$inferSelect;
export type InsertConditionType = typeof conditionTypes.$inferInsert;
export type PricingProcedure = typeof pricingProcedures.$inferSelect;
export type InsertPricingProcedure = typeof pricingProcedures.$inferInsert;
export type ShippingCondition = typeof shippingConditions.$inferSelect;
export type InsertShippingCondition = typeof shippingConditions.$inferInsert;
export type Incoterms = typeof incoterms.$inferSelect;
export type InsertIncoterms = typeof incoterms.$inferInsert;
export type CustomerIncotermsDefaults = typeof customerIncotermsDefaults.$inferSelect;
export type InsertCustomerIncotermsDefaults = typeof customerIncotermsDefaults.$inferInsert;
export type SalesOrderIncoterms = typeof salesOrderIncoterms.$inferSelect;
export type InsertSalesOrderIncoterms = typeof salesOrderIncoterms.$inferInsert;

