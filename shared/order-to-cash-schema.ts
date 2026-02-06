import { pgTable, serial, varchar, text, decimal, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced Sales Orders with Complete Order-to-Cash Integration
export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  customerId: integer("customer_id").notNull(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  orderType: varchar("order_type", { length: 10 }),

  // Order Status Management
  status: varchar("status", { length: 20 }),
  approvalStatus: varchar("approval_status", { length: 20 }),
  creditCheckStatus: varchar("credit_check_status", { length: 20 }),
  inventoryStatus: varchar("inventory_status", { length: 20 }),

  // Financial Information
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }),

  // Business Information
  salesPersonId: integer("sales_person_id"),
  paymentTerms: varchar("payment_terms", { length: 20 }),
  shippingMethod: varchar("shipping_method", { length: 50 }),
  specialInstructions: text("special_instructions"),

  // Organizational Structure Fields
  salesOrgId: integer("sales_org_id").notNull(),
  distributionChannelId: integer("distribution_channel_id"),
  divisionId: integer("division_id"),
  salesOfficeId: integer("sales_office_id"),
  salesGroupId: integer("sales_group_id"),
  companyCodeId: integer("company_code_id"),

  // Document and Pricing Fields
  documentType: varchar("document_type", { length: 10 }).notNull(),
  pricingProcedure: varchar("pricing_procedure", { length: 10 }),
  taxCode: varchar("tax_code", { length: 5 }),
  taxProfileId: integer("tax_profile_id"),
  taxBreakdown: jsonb("tax_breakdown"),

  // Partner Function Fields
  soldToAddressId: integer("sold_to_address_id"),
  billToAddressId: integer("bill_to_address_id"),
  shipToAddressId: integer("ship_to_address_id"),
  payerToAddressId: integer("payer_to_address_id"),

  // Logistics Fields
  plantId: integer("plant_id"),
  shippingPointId: integer("shipping_point_id"),
  shippingPointCode: varchar("shipping_point_code", { length: 4 }),
  routeId: integer("route_id"),
  routeCode: varchar("route_code", { length: 6 }),
  shippingCondition: varchar("shipping_condition", { length: 4 }),
  loadingPoint: varchar("loading_point", { length: 4 }),

  // Additional Fields
  customerPoNumber: varchar("customer_po_number", { length: 50 }),
  customerPoDate: timestamp("customer_po_date"),
  orderReason: varchar("order_reason", { length: 3 }),
  salesDistrict: varchar("sales_district", { length: 6 }),
  salesRep: varchar("sales_rep", { length: 100 }),
  priority: varchar("priority", { length: 20 }),
  currencyId: integer("currency_id"),

  // Workflow Tracking
  workflowStage: varchar("workflow_stage", { length: 30 }),
  lastStatusChange: timestamp("last_status_change").defaultNow().notNull(),
  processedBy: integer("processed_by"),

  // Audit Trail
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),

  // Integration Fields
  quoteReference: varchar("quote_reference", { length: 20 }),
  deliveryInstructions: text("delivery_instructions"),
  active: boolean("active"),
});

// Sales Order Line Items with Inventory Integration
export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull(),
  lineNumber: integer("line_number").notNull(),
  materialId: integer("material_id").notNull(),

  // Quantity Management
  orderedQuantity: decimal("ordered_quantity", { precision: 15, scale: 3 }).notNull(),
  confirmedQuantity: decimal("confirmed_quantity", { precision: 15, scale: 3 }).default("0.000"),
  deliveredQuantity: decimal("delivered_quantity", { precision: 15, scale: 3 }).default("0.000"),
  invoicedQuantity: decimal("invoiced_quantity", { precision: 15, scale: 3 }).default("0.000"),
  unit: varchar("unit", { length: 10 }).notNull(),

  // Pricing
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0.00"),
  netPrice: decimal("net_price", { precision: 15, scale: 4 }).notNull(),
  lineTotal: decimal("line_total", { precision: 15, scale: 2 }).notNull(),

  // Inventory & Delivery
  inventoryStatus: varchar("inventory_status", { length: 20 }).default("UNCHECKED").notNull(),
  reservedQuantity: decimal("reserved_quantity", { precision: 15, scale: 3 }).default("0.000"),
  availableToPromise: decimal("available_to_promise", { precision: 15, scale: 3 }).default("0.000"),
  plannedDeliveryDate: timestamp("planned_delivery_date"),

  // Business Logic
  itemCategory: varchar("item_category", { length: 10 }).default("NORM").notNull(), // NORM, SERV, TEXT
  plantId: integer("plant_id").notNull(),
  storageLocationId: integer("storage_location_id"),

  // Status Tracking
  lineStatus: varchar("line_status", { length: 20 }).default("OPEN").notNull(),
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("NOT_DELIVERED").notNull(),
  billingStatus: varchar("billing_status", { length: 20 }).default("NOT_BILLED").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory Reservations for Order Processing
export const inventoryReservations = pgTable("inventory_reservations", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id").notNull(),
  materialId: integer("material_id").notNull(),
  plantId: integer("plant_id").notNull(),
  storageLocationId: integer("storage_location_id").notNull(),

  reservedQuantity: decimal("reserved_quantity", { precision: 15, scale: 3 }).notNull(),
  reservationDate: timestamp("reservation_date").defaultNow().notNull(),
  validUntil: timestamp("valid_until").notNull(),

  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(), // ACTIVE, CONSUMED, EXPIRED, CANCELLED

  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

// Delivery Documents (Transfer Orders)
export const deliveryDocuments = pgTable("delivery_documents", {
  id: serial("id").primaryKey(),
  deliveryNumber: varchar("delivery_number", { length: 20 }).notNull().unique(),
  salesOrderId: integer("sales_order_id").notNull(),
  customerId: integer("customer_id").notNull(),

  // Delivery Information
  deliveryDate: timestamp("delivery_date").notNull(),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  shipToAddress: jsonb("ship_to_address").notNull(),

  // Delivery Status
  status: varchar("status", { length: 20 }).default("PLANNED").notNull(), // PLANNED, PICKING, PACKED, SHIPPED, DELIVERED
  pickingStatus: varchar("picking_status", { length: 20 }).default("NOT_STARTED").notNull(),
  packingStatus: varchar("packing_status", { length: 20 }).default("NOT_STARTED").notNull(),
  shippingStatus: varchar("shipping_status", { length: 20 }).default("NOT_SHIPPED").notNull(),

  // Logistics
  shippingMethod: varchar("shipping_method", { length: 50 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  carrierId: integer("carrier_id"),

  // Business Data
  totalWeight: decimal("total_weight", { precision: 10, scale: 3 }),
  weightUnit: varchar("weight_unit", { length: 10 }).default("KG"),
  totalVolume: decimal("total_volume", { precision: 10, scale: 3 }),
  volumeUnit: varchar("volume_unit", { length: 10 }).default("M3"),

  // Proof of Delivery
  proofOfDelivery: jsonb("proof_of_delivery"), // Signature, photos, etc.
  deliveredBy: varchar("delivered_by", { length: 100 }),
  receivedBy: varchar("received_by", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

// Delivery Line Items
export const deliveryItems = pgTable("delivery_items", {
  id: serial("id").primaryKey(),
  deliveryDocumentId: integer("delivery_document_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id").notNull(),
  materialId: integer("material_id").notNull(),

  plannedQuantity: decimal("planned_quantity", { precision: 15, scale: 3 }).notNull(),
  pickedQuantity: decimal("picked_quantity", { precision: 15, scale: 3 }).default("0.000"),
  deliveredQuantity: decimal("delivered_quantity", { precision: 15, scale: 3 }).default("0.000"),
  unit: varchar("unit", { length: 10 }).notNull(),

  // Storage Information
  plantId: integer("plant_id").notNull(),
  storageLocationId: integer("storage_location_id").notNull(),
  batchNumber: varchar("batch_number", { length: 20 }),
  serialNumbers: jsonb("serial_numbers"), // Array of serial numbers

  // Status
  pickingStatus: varchar("picking_status", { length: 20 }).default("OPEN").notNull(),
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("OPEN").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customer Invoices with Complete Integration
export const customerInvoices = pgTable("customer_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 20 }).notNull().unique(),
  customerId: integer("customer_id").notNull(),
  salesOrderId: integer("sales_order_id"),
  deliveryDocumentId: integer("delivery_document_id"),

  // Invoice Dates
  invoiceDate: timestamp("invoice_date").defaultNow().notNull(),
  postingDate: timestamp("posting_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),

  // Financial Information
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),

  // Payment Information
  paymentTerms: varchar("payment_terms", { length: 20 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).default("OPEN").notNull(), // OPEN, PARTIAL, PAID, OVERDUE
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0.00"),
  outstandingAmount: decimal("outstanding_amount", { precision: 15, scale: 2 }).notNull(),

  // Business Information
  invoiceType: varchar("invoice_type", { length: 10 }).default("STANDARD").notNull(),
  billingDocument: varchar("billing_document", { length: 20 }),
  customerPoNumber: varchar("customer_po_number", { length: 50 }),

  // GL Integration
  revenuePosted: boolean("revenue_posted").default(false).notNull(),
  glDocumentNumber: varchar("gl_document_number", { length: 20 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

// Invoice Line Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id"),
  deliveryItemId: integer("delivery_item_id"),
  materialId: integer("material_id").notNull(),

  // Quantities and Pricing
  billedQuantity: decimal("billed_quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  lineTotal: decimal("line_total", { precision: 15, scale: 2 }).notNull(),

  // GL Account Information
  revenueAccount: varchar("revenue_account", { length: 10 }),
  costCenter: varchar("cost_center", { length: 10 }),
  profitCenter: varchar("profit_center", { length: 10 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Process Flow Status Tracking
export const orderToCAshProcessLog = pgTable("order_to_cash_process_log", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull(),
  processStage: varchar("process_stage", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  previousStatus: varchar("previous_status", { length: 20 }),

  // Event Information
  eventType: varchar("event_type", { length: 20 }).notNull(), // STATUS_CHANGE, APPROVAL, ERROR, NOTIFICATION
  eventDescription: text("event_description"),
  actionRequired: varchar("action_required", { length: 100 }),
  assignedTo: integer("assigned_to"),

  // Timing
  eventTimestamp: timestamp("event_timestamp").defaultNow().notNull(),
  processedBy: integer("processed_by"),

  // Additional Data
  metadata: jsonb("metadata"), // Flexible field for additional process data
});

// Relations
export const salesOrdersRelations = relations(salesOrders, ({ many, one }) => ({
  items: many(salesOrderItems),
  deliveries: many(deliveryDocuments),
  invoices: many(customerInvoices),
  reservations: many(inventoryReservations),
  processLogs: many(orderToCAshProcessLog),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one, many }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  deliveryItems: many(deliveryItems),
  invoiceItems: many(invoiceItems),
  reservations: many(inventoryReservations),
}));

// Zod Schemas
export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastStatusChange: true,
});

export const insertSalesOrderItemSchema = createInsertSchema(salesOrderItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliveryDocumentSchema = createInsertSchema(deliveryDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerInvoiceSchema = createInsertSchema(customerInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = z.infer<typeof insertSalesOrderItemSchema>;
export type DeliveryDocument = typeof deliveryDocuments.$inferSelect;
export type InsertDeliveryDocument = z.infer<typeof insertDeliveryDocumentSchema>;
export type CustomerInvoice = typeof customerInvoices.$inferSelect;
export type InsertCustomerInvoice = z.infer<typeof insertCustomerInvoiceSchema>;

// Quotation Management
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: varchar("quotation_number", { length: 20 }).notNull().unique(),
  customerId: integer("customer_id").notNull(),
  quotationDate: timestamp("quotation_date").defaultNow().notNull(),
  validUntilDate: timestamp("valid_until_date").notNull(),
  status: varchar("status", { length: 20 }).default("DRAFT").notNull(), // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  notes: text("notes"),
  salesPersonId: integer("sales_person_id"),
  convertedToOrderId: integer("converted_to_order_id"), // Reference to created Sales Order
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotations.id),
  lineNumber: integer("line_number").notNull(),
  materialId: integer("material_id").notNull(), // or materialCode if ID not available
  description: text("description"),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0.00"),
  netPrice: decimal("net_price", { precision: 15, scale: 4 }).notNull(),
  lineTotal: decimal("line_total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotationsRelations = relations(quotations, ({ many, one }) => ({
  items: many(quotationItems),
  // Optionally link back to Sales Order if needed, though convertedToOrderId stores the ID
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
}));

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
