import { pgTable, serial, integer, text, decimal, boolean, timestamp, date, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// GL Document Headers - Main document structure
export const glDocumentHeaders = pgTable('gl_document_headers', {
  id: serial('id').primaryKey(),
  documentNumber: varchar('document_number', { length: 50 }).notNull().unique(),
  documentType: varchar('document_type', { length: 10 }).notNull(), // Invoice, Payment, Adjustment
  postingDate: date('posting_date').notNull(),
  documentDate: date('document_date').notNull(),
  companyCodeId: integer('company_code_id').notNull(),
  currencyId: integer('currency_id').notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  reference: text('reference'),
  status: varchar('status', { length: 20 }).default('Draft'), // Draft, Posted, Cancelled
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  postedAt: timestamp('posted_at'),
  active: boolean('active').default(true).notNull()
});

// GL Document Items - Line items for each document
export const glDocumentItems = pgTable('gl_document_items', {
  id: serial('id').primaryKey(),
  documentHeaderId: integer('document_header_id').notNull(),
  lineNumber: integer('line_number').notNull(),
  glAccountId: integer('gl_account_id').notNull(),
  debitAmount: decimal('debit_amount', { precision: 15, scale: 2 }).default('0'),
  creditAmount: decimal('credit_amount', { precision: 15, scale: 2 }).default('0'),
  description: text('description'),
  costCenterId: integer('cost_center_id'),
  profitCenterId: integer('profit_center_id'),
  active: boolean('active').default(true).notNull()
});

// AR Open Items - Customer receivables tracking
export const arOpenItems = pgTable('ar_open_items', {
  id: serial('id').primaryKey(),
  billingDocumentId: integer('billing_document_id'),
  customerId: integer('customer_id').notNull(),
  documentNumber: varchar('document_number', { length: 50 }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  documentType: varchar('document_type', { length: 20 }).notNull(),
  postingDate: date('posting_date').notNull(),
  dueDate: date('due_date').notNull(),
  originalAmount: decimal('original_amount', { precision: 15, scale: 2 }).notNull(),
  outstandingAmount: decimal('outstanding_amount', { precision: 15, scale: 2 }).notNull(),
  currencyId: integer('currency_id').notNull(),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  status: varchar('status', { length: 20 }).notNull(),
  agingBucket: varchar('aging_bucket', { length: 20 }),
  lastPaymentDate: date('last_payment_date'),
  glAccountId: integer('gl_account_id').notNull(),
  salesOrderId: integer('sales_order_id'),
  createdAt: timestamp('created_at').notNull(),
  active: boolean('active').notNull()
});

// AP Open Items - Vendor payables tracking
export const apOpenItems = pgTable('ap_open_items', {
  id: serial('id').primaryKey(),
  vendorId: integer('vendor_id').notNull(),
  documentNumber: varchar('document_number', { length: 50 }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  documentType: varchar('document_type', { length: 20 }).notNull(), // Invoice, Credit, Payment
  postingDate: date('posting_date').notNull(),
  dueDate: date('due_date').notNull(),
  originalAmount: decimal('original_amount', { precision: 15, scale: 2 }).notNull(),
  outstandingAmount: decimal('outstanding_amount', { precision: 15, scale: 2 }).notNull(),
  currencyId: integer('currency_id').notNull(),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  status: varchar('status', { length: 20 }).default('Open'), // Open, Partial, Cleared
  agingBucket: varchar('aging_bucket', { length: 20 }), // Current, 30Days, 60Days, 90Days, Over90
  lastPaymentDate: date('last_payment_date'),
  glAccountId: integer('gl_account_id').notNull(),
  purchaseOrderId: integer('purchase_order_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  active: boolean('active').default(true).notNull()
});

// Posting Keys - Define debit/credit posting logic
export const postingKeys = pgTable('posting_keys', {
  id: serial('id').primaryKey(),
  postingKey: varchar('posting_key', { length: 10 }).notNull().unique(),
  description: text('description').notNull(),
  debitCredit: varchar('debit_credit', { length: 1 }).notNull(), // D or C
  accountType: varchar('account_type', { length: 20 }).notNull(), // Customer, Vendor, GL
  specialGLIndicator: varchar('special_gl_indicator', { length: 10 }),
  active: boolean('active').default(true).notNull()
});

// Customer Payment Allocations - Track payment applications
export const customerPaymentAllocations = pgTable('customer_payment_allocations', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull(), // Reference to AR payment
  openItemId: integer('open_item_id').notNull(),
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull(),
  allocationDate: date('allocation_date').notNull(),
  allocationMethod: varchar('allocation_method', { length: 20 }).default('Manual'), // Manual, Auto, Partial
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  active: boolean('active').default(true).notNull()
});

// Vendor Payment Allocations - Track payment applications
export const vendorPaymentAllocations = pgTable('vendor_payment_allocations', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull(), // Reference to AP payment
  openItemId: integer('open_item_id').notNull(),
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull(),
  allocationDate: date('allocation_date').notNull(),
  allocationMethod: varchar('allocation_method', { length: 20 }).default('Manual'), // Manual, Auto, Partial
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  active: boolean('active').default(true).notNull()
});

// Zod schemas for validation
export const insertGLDocumentHeaderSchema = createInsertSchema(glDocumentHeaders);
export const insertGLDocumentItemSchema = createInsertSchema(glDocumentItems);
export const insertAROpenItemSchema = createInsertSchema(arOpenItems);
export const insertAPOpenItemSchema = createInsertSchema(apOpenItems);
export const insertPostingKeySchema = createInsertSchema(postingKeys);
export const insertCustomerPaymentAllocationSchema = createInsertSchema(customerPaymentAllocations);
export const insertVendorPaymentAllocationSchema = createInsertSchema(vendorPaymentAllocations);

// TypeScript types
export type GLDocumentHeader = typeof glDocumentHeaders.$inferSelect;
export type InsertGLDocumentHeader = z.infer<typeof insertGLDocumentHeaderSchema>;
export type GLDocumentItem = typeof glDocumentItems.$inferSelect;
export type InsertGLDocumentItem = z.infer<typeof insertGLDocumentItemSchema>;
export type AROpenItem = typeof arOpenItems.$inferSelect;
export type InsertAROpenItem = z.infer<typeof insertAROpenItemSchema>;
export type APOpenItem = typeof apOpenItems.$inferSelect;
export type InsertAPOpenItem = z.infer<typeof insertAPOpenItemSchema>;
export type PostingKey = typeof postingKeys.$inferSelect;
export type InsertPostingKey = z.infer<typeof insertPostingKeySchema>;
export type CustomerPaymentAllocation = typeof customerPaymentAllocations.$inferSelect;
export type InsertCustomerPaymentAllocation = z.infer<typeof insertCustomerPaymentAllocationSchema>;
export type VendorPaymentAllocation = typeof vendorPaymentAllocations.$inferSelect;
export type InsertVendorPaymentAllocation = z.infer<typeof insertVendorPaymentAllocationSchema>;