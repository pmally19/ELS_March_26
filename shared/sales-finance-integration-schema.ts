import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

// Sales Order Management (replaces VA01/VA02/VA03)
export const salesOrders = pgTable("sales_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  customerId: integer("customer_id").notNull(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  salesOrganization: varchar("sales_organization", { length: 10 }).notNull(),
  distributionChannel: varchar("distribution_channel", { length: 10 }).notNull(),
  division: varchar("division", { length: 10 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status", { length: 20 }).default("CREATED").notNull(), // CREATED, CONFIRMED, DELIVERED, BILLED, CLOSED
  pricingProcedure: varchar("pricing_procedure", { length: 10 }).notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sales Order Line Items
export const salesOrderItems = pgTable("sales_order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  salesOrderId: integer("sales_order_id").notNull(),
  lineItem: integer("line_item").notNull(),
  materialId: integer("material_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  plant: varchar("plant", { length: 10 }).notNull(),
  storageLocation: varchar("storage_location", { length: 10 }),
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("OPEN").notNull(),
  billingStatus: varchar("billing_status", { length: 20 }).default("OPEN").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Delivery Documents (replaces VL01N/VL02N/VL03N)
export const deliveryDocuments = pgTable("delivery_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  deliveryNumber: varchar("delivery_number", { length: 20 }).notNull().unique(),
  salesOrderId: integer("sales_order_id"),
  customerId: integer("customer_id").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  shippingPoint: varchar("shipping_point", { length: 10 }).notNull(),
  plant: varchar("plant", { length: 10 }).notNull(),
  totalWeight: decimal("total_weight", { precision: 15, scale: 3 }),
  weightUnit: varchar("weight_unit", { length: 10 }),
  pgiStatus: varchar("pgi_status", { length: 20 }).default("OPEN").notNull(), // OPEN, POSTED
  pgiDate: timestamp("pgi_date"),
  pgiDocumentNumber: varchar("pgi_document_number", { length: 20 }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Items
export const deliveryItems = pgTable("delivery_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  deliveryId: integer("delivery_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id"),
  lineItem: integer("line_item").notNull(),
  materialId: integer("material_id").notNull(),
  deliveryQuantity: decimal("delivery_quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
  storageLocation: varchar("storage_location", { length: 10 }),
  batch: varchar("batch", { length: 20 }),
  pgiQuantity: decimal("pgi_quantity", { precision: 15, scale: 3 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Billing Documents (replaces VF01/VF02/VF03)
export const billingDocuments = pgTable("billing_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  billingNumber: varchar("billing_number", { length: 20 }).notNull().unique(),
  billingType: varchar("billing_type", { length: 10 }).notNull(), // F2 (Invoice), G2 (Credit Memo), etc.
  salesOrderId: integer("sales_order_id"),
  deliveryId: integer("delivery_id"),
  customerId: integer("customer_id").notNull(),
  billingDate: timestamp("billing_date").notNull(),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  paymentTerms: varchar("payment_terms", { length: 10 }),
  dueDate: timestamp("due_date"),
  accountingDocumentNumber: varchar("accounting_document_number", { length: 20 }),
  postingStatus: varchar("posting_status", { length: 20 }).default("OPEN").notNull(), // OPEN, POSTED
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Billing Items
export const billingItems = pgTable("billing_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  billingId: integer("billing_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id"),
  deliveryItemId: integer("delivery_item_id"),
  lineItem: integer("line_item").notNull(),
  materialId: integer("material_id").notNull(),
  billingQuantity: decimal("billing_quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  taxCode: varchar("tax_code", { length: 10 }),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  accountKey: varchar("account_key", { length: 10 }).notNull(), // ERL, ERF, ERS
  glAccount: varchar("gl_account", { length: 20 }),
  costCenter: varchar("cost_center", { length: 20 }),
  profitCenter: varchar("profit_center", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customer Payment Processing (replaces F-28)
export const customerPayments = pgTable("customer_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  paymentNumber: varchar("payment_number", { length: 20 }).notNull().unique(),
  customerId: integer("customer_id").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // BANK, CASH, CHECK, WIRE
  bankAccount: varchar("bank_account", { length: 20 }),
  reference: varchar("reference", { length: 50 }),
  accountingDocumentNumber: varchar("accounting_document_number", { length: 20 }),
  postingStatus: varchar("posting_status", { length: 20 }).default("OPEN").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Applications (linking payments to invoices)
export const paymentApplications = pgTable("payment_applications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  paymentId: integer("payment_id").notNull(),
  billingId: integer("billing_id").notNull(),
  appliedAmount: decimal("applied_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  applicationDate: timestamp("application_date").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// FI Integration - Accounting Documents (replaces BKPF, BSEG)
export const accountingDocuments = pgTable("accounting_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  documentNumber: varchar("document_number", { length: 20 }).notNull().unique(),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  documentType: varchar("document_type", { length: 10 }).notNull(), // DR (Customer Invoice), DZ (Customer Payment), WA (Goods Issue)
  postingDate: timestamp("posting_date").notNull(),
  documentDate: timestamp("document_date").notNull(),
  period: integer("period").notNull(),
  reference: varchar("reference", { length: 50 }),
  headerText: text("header_text"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  sourceModule: varchar("source_module", { length: 10 }).notNull(), // SALES, INVENTORY, FINANCE
  sourceDocumentId: integer("source_document_id"),
  sourceDocumentType: varchar("source_document_type", { length: 20 }),
  reversalStatus: varchar("reversal_status", { length: 20 }).default("ACTIVE").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Accounting Document Line Items
export const accountingDocumentItems = pgTable("accounting_document_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  documentId: integer("document_id").notNull(),
  lineItem: integer("line_item").notNull(),
  glAccount: varchar("gl_account", { length: 20 }).notNull(),
  accountType: varchar("account_type", { length: 10 }).notNull(), // D (Customer), K (Vendor), S (GL Account)
  partnerId: integer("partner_id"), // Customer/Vendor ID for D/K accounts
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  taxCode: varchar("tax_code", { length: 10 }),
  costCenter: varchar("cost_center", { length: 20 }),
  profitCenter: varchar("profit_center", { length: 20 }),
  businessArea: varchar("business_area", { length: 10 }),
  assignment: varchar("assignment", { length: 20 }),
  itemText: text("item_text"),
  baselineDate: timestamp("baseline_date"),
  paymentTerms: varchar("payment_terms", { length: 10 }),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Account Determination Configuration (replaces VKOA)
export const accountDetermination = pgTable("account_determination", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  chartOfAccounts: varchar("chart_of_accounts", { length: 10 }).notNull(),
  salesOrganization: varchar("sales_organization", { length: 10 }).notNull(),
  customerAccountGroup: varchar("customer_account_group", { length: 10 }).notNull(),
  materialAccountGroup: varchar("material_account_group", { length: 10 }).notNull(),
  accountKey: varchar("account_key", { length: 10 }).notNull(), // ERL, ERF, ERS, GBB
  glAccount: varchar("gl_account", { length: 20 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pricing Conditions Configuration
export const pricingConditions = pgTable("pricing_conditions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conditionType: varchar("condition_type", { length: 10 }).notNull(), // PR00, K004, MWST
  description: text("description").notNull(),
  conditionClass: varchar("condition_class", { length: 10 }).notNull(), // A (Prices), B (Discounts), C (Surcharges)
  calculationType: varchar("calculation_type", { length: 10 }).notNull(), // A (Percentage), B (Fixed Amount)
  roundingRule: varchar("rounding_rule", { length: 10 }),
  accessSequence: varchar("access_sequence", { length: 10 }),
  accountKey: varchar("account_key", { length: 10 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Condition Records (VK11 equivalent)
export const conditionRecords = pgTable("condition_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conditionType: varchar("condition_type", { length: 10 }).notNull(),
  keyFields: jsonb("key_fields").notNull(), // Dynamic key based on access sequence
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  conditionValue: decimal("condition_value", { precision: 15, scale: 4 }).notNull(),
  conditionUnit: varchar("condition_unit", { length: 10 }),
  currency: varchar("currency", { length: 3 }),
  scaleBasisValue: decimal("scale_basis_value", { precision: 15, scale: 3 }),
  scaleUnitOfMeasure: varchar("scale_unit_of_measure", { length: 10 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in other files
export type SalesOrder = typeof salesOrders.$inferSelect;
export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type DeliveryDocument = typeof deliveryDocuments.$inferSelect;
export type DeliveryItem = typeof deliveryItems.$inferSelect;
export type BillingDocument = typeof billingDocuments.$inferSelect;
export type BillingItem = typeof billingItems.$inferSelect;
export type CustomerPayment = typeof customerPayments.$inferSelect;
export type PaymentApplication = typeof paymentApplications.$inferSelect;
export type AccountingDocument = typeof accountingDocuments.$inferSelect;
export type AccountingDocumentItem = typeof accountingDocumentItems.$inferSelect;
export type AccountDetermination = typeof accountDetermination.$inferSelect;
export type PricingCondition = typeof pricingConditions.$inferSelect;
export type ConditionRecord = typeof conditionRecords.$inferSelect;