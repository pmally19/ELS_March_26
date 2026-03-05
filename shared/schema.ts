import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, foreignKey, jsonb, varchar, uuid, decimal, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export document number sequences from separate schema file
export * from "./document-number-schema";

// Currency Master Data Tables
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().unique(),
  currencyName: varchar("currency_name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  decimalPlaces: integer("decimal_places").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
  isBaseCurrency: boolean("is_base_currency").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  fromCurrencyId: integer("from_currency_id").notNull().references(() => currencies.id),
  toCurrencyId: integer("to_currency_id").notNull().references(() => currencies.id),
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 6 }).notNull(),
  rateDate: date("rate_date").notNull(),
  rateType: varchar("rate_type", { length: 20 }).notNull().default("daily"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const currencyRevaluations = pgTable("currency_revaluations", {
  id: serial("id").primaryKey(),
  revaluationDate: date("revaluation_date").notNull(),
  currencyId: integer("currency_id").notNull().references(() => currencies.id),
  oldRate: decimal("old_rate", { precision: 15, scale: 6 }).notNull(),
  newRate: decimal("new_rate", { precision: 15, scale: 6 }).notNull(),
  variance: decimal("variance", { precision: 15, scale: 6 }).notNull(),
  revaluationAmount: decimal("revaluation_amount", { precision: 15, scale: 2 }).notNull(),
  companyCodeId: integer("company_code_id").notNull(),
  glAccountId: integer("gl_account_id"),
  processedBy: varchar("processed_by", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Currency Relations
export const currenciesRelations = relations(currencies, ({ many }) => ({
  exchangeRatesFrom: many(exchangeRates, { relationName: "fromCurrency" }),
  exchangeRatesTo: many(exchangeRates, { relationName: "toCurrency" }),
  revaluations: many(currencyRevaluations),
}));

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  fromCurrency: one(currencies, {
    fields: [exchangeRates.fromCurrencyId],
    references: [currencies.id],
    relationName: "fromCurrency",
  }),
  toCurrency: one(currencies, {
    fields: [exchangeRates.toCurrencyId],
    references: [currencies.id],
    relationName: "toCurrency",
  }),
}));

export const currencyRevaluationsRelations = relations(currencyRevaluations, ({ one }) => ({
  currency: one(currencies, {
    fields: [currencyRevaluations.currencyId],
    references: [currencies.id],
  }),
}));

// Zod schemas for currency tables
export const insertCurrencySchema = createInsertSchema(currencies);
export const insertExchangeRateSchema = createInsertSchema(exchangeRates);
export const insertCurrencyRevaluationSchema = createInsertSchema(currencyRevaluations);

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type CurrencyRevaluation = typeof currencyRevaluations.$inferSelect;
export type InsertCurrencyRevaluation = z.infer<typeof insertCurrencyRevaluationSchema>;

// SAP Transaction Tiles Tables with Complete Data Integrity

// Document Number Ranges - SAP SNRO
export const documentNumberRanges = pgTable("document_number_ranges", {
  id: serial("id").primaryKey(),
  objectType: varchar("object_type", { length: 50 }).notNull(),
  numberRangeCode: varchar("number_range_code", { length: 10 }).notNull(),
  description: varchar("description", { length: 100 }).notNull(),
  fromNumber: varchar("from_number", { length: 20 }).notNull(),
  toNumber: varchar("to_number", { length: 20 }).notNull(),
  currentNumber: varchar("current_number", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("Active"),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  fiscalYear: varchar("fiscal_year", { length: 4 }).notNull(),
  externalNumbering: boolean("external_numbering").notNull().default(false),
  warningPercentage: integer("warning_percentage").notNull().default(90),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 50 }),
  updatedBy: varchar("updated_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Posting System - SAP FB01/FB50
export const documentPostingSystem = pgTable("document_posting_system", {
  id: serial("id").primaryKey(),
  documentNumber: varchar("document_number", { length: 20 }).notNull().unique(),
  documentType: varchar("document_type", { length: 10 }).notNull(),
  documentTypeText: varchar("document_type_text", { length: 50 }).notNull(),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  postingDate: date("posting_date").notNull(),
  documentDate: date("document_date").notNull(),
  reference: varchar("reference", { length: 50 }),
  headerText: varchar("header_text", { length: 100 }),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 6 }).notNull().default("1.000000"),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  postingKey: varchar("posting_key", { length: 5 }),
  fiscalYear: varchar("fiscal_year", { length: 4 }).notNull(),
  period: varchar("period", { length: 3 }).notNull(),
  reversalReason: varchar("reversal_reason", { length: 10 }),
  reversalDate: date("reversal_date"),
  status: varchar("status", { length: 20 }).notNull().default("Created"),
  workflowStatus: varchar("workflow_status", { length: 20 }).notNull().default("Pending"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 50 }),
  approvedBy: varchar("approved_by", { length: 50 }),
  updatedBy: varchar("updated_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Automatic Clearing - SAP F.13
export const automaticClearing = pgTable("automatic_clearing", {
  id: serial("id").primaryKey(),
  clearingRun: varchar("clearing_run", { length: 20 }).notNull().unique(),
  runDate: date("run_date").notNull(),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  clearingAccount: varchar("clearing_account", { length: 20 }).notNull(),
  accountText: varchar("account_text", { length: 100 }),
  documentsProcessed: integer("documents_processed").notNull().default(0),
  documentsCleared: integer("documents_cleared").notNull().default(0),
  documentsFailed: integer("documents_failed").notNull().default(0),
  totalClearedAmount: decimal("total_cleared_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  clearingMethod: varchar("clearing_method", { length: 20 }).notNull().default("Automatic"),
  toleranceGroup: varchar("tolerance_group", { length: 10 }),
  status: varchar("status", { length: 20 }).notNull().default("Running"),
  runBy: varchar("run_by", { length: 50 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Asset Accounting - SAP AS01/AS02
export const assetAccounting = pgTable("asset_accounting", {
  id: serial("id").primaryKey(),
  assetNumber: varchar("asset_number", { length: 20 }).notNull().unique(),
  assetClass: varchar("asset_class", { length: 10 }).notNull(),
  assetClassText: varchar("asset_class_text", { length: 50 }),
  description: varchar("description", { length: 100 }).notNull(),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  costCenter: varchar("cost_center", { length: 20 }),
  plantNumber: varchar("plant_number", { length: 10 }),
  location: varchar("location", { length: 50 }),
  acquisitionDate: date("acquisition_date").notNull(),
  acquisitionValue: decimal("acquisition_value", { precision: 15, scale: 2 }).notNull(),
  accumulatedDepreciation: decimal("accumulated_depreciation", { precision: 15, scale: 2 }).notNull().default("0.00"),
  netBookValue: decimal("net_book_value", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  depreciationKey: varchar("depreciation_key", { length: 10 }),
  depreciationMethod: varchar("depreciation_method", { length: 50 }),
  usefulLife: integer("useful_life").notNull(),
  remainingLife: decimal("remaining_life", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("In Use"),
  responsibleEmployee: varchar("responsible_employee", { length: 50 }),
  serialNumber: varchar("serial_number", { length: 50 }),
  manufacturer: varchar("manufacturer", { length: 100 }),
  model: varchar("model", { length: 50 }),
  warrantyDate: date("warranty_date"),
  lastInventoryDate: date("last_inventory_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 50 }),
  updatedBy: varchar("updated_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bank Statement Processing - SAP FF67
export const bankStatementProcessing = pgTable("bank_statement_processing", {
  id: serial("id").primaryKey(),
  statementNumber: varchar("statement_number", { length: 20 }).notNull().unique(),
  bankAccount: varchar("bank_account", { length: 20 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  statementDate: date("statement_date").notNull(),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).notNull(),
  closingBalance: decimal("closing_balance", { precision: 15, scale: 2 }).notNull(),
  totalDebits: decimal("total_debits", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalCredits: decimal("total_credits", { precision: 15, scale: 2 }).notNull().default("0.00"),
  numberOfTransactions: integer("number_of_transactions").notNull().default(0),
  processedTransactions: integer("processed_transactions").notNull().default(0),
  unmatchedTransactions: integer("unmatched_transactions").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  processingStatus: varchar("processing_status", { length: 20 }).notNull().default("Pending"),
  importDate: timestamp("import_date"),
  processedBy: varchar("processed_by", { length: 50 }),
  glAccount: varchar("gl_account", { length: 20 }),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  houseBank: varchar("house_bank", { length: 10 }),
  accountId: varchar("account_id", { length: 10 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Processing - SAP F110
export const paymentProcessing = pgTable("payment_processing", {
  id: serial("id").primaryKey(),
  paymentRun: varchar("payment_run", { length: 20 }).notNull().unique(),
  runDate: date("run_date").notNull(),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 5 }).notNull(),
  paymentMethodText: varchar("payment_method_text", { length: 50 }),
  houseBank: varchar("house_bank", { length: 10 }),
  accountId: varchar("account_id", { length: 10 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  numberOfPayments: integer("number_of_payments").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("Created"),
  proposalDate: date("proposal_date"),
  executionDate: date("execution_date"),
  valueDate: date("value_date"),
  runBy: varchar("run_by", { length: 50 }),
  approvedBy: varchar("approved_by", { length: 50 }),
  bankFileSent: boolean("bank_file_sent").notNull().default(false),
  bankFileDate: timestamp("bank_file_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for transaction tiles
export const insertDocumentNumberRangeSchema = createInsertSchema(documentNumberRanges);
export const insertDocumentPostingSystemSchema = createInsertSchema(documentPostingSystem);
export const insertAutomaticClearingSchema = createInsertSchema(automaticClearing);
export const insertAssetAccountingSchema = createInsertSchema(assetAccounting);
export const insertBankStatementProcessingSchema = createInsertSchema(bankStatementProcessing);
export const insertPaymentProcessingSchema = createInsertSchema(paymentProcessing);

// TypeScript types for transaction tiles
export type DocumentNumberRange = typeof documentNumberRanges.$inferSelect;
export type InsertDocumentNumberRange = z.infer<typeof insertDocumentNumberRangeSchema>;
export type DocumentPostingSystem = typeof documentPostingSystem.$inferSelect;
export type InsertDocumentPostingSystem = z.infer<typeof insertDocumentPostingSystemSchema>;
export type AutomaticClearing = typeof automaticClearing.$inferSelect;
export type InsertAutomaticClearing = z.infer<typeof insertAutomaticClearingSchema>;
export type AssetAccounting = typeof assetAccounting.$inferSelect;
export type InsertAssetAccounting = z.infer<typeof insertAssetAccountingSchema>;
export type BankStatementProcessing = typeof bankStatementProcessing.$inferSelect;
export type InsertBankStatementProcessing = z.infer<typeof insertBankStatementProcessingSchema>;
export type PaymentProcessing = typeof paymentProcessing.$inferSelect;
export type InsertPaymentProcessing = z.infer<typeof insertPaymentProcessingSchema>;

// Bank Accounts for Cash Management
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 50 }).notNull().unique(),
  accountName: varchar("account_name", { length: 100 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  availableBalance: decimal("available_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  accountType: varchar("account_type", { length: 20 }).notNull().default("checking"),
  isActive: boolean("is_active").notNull().default(true),
  companyCodeId: integer("company_code_id").notNull(),
  glAccountId: integer("gl_account_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bank Transactions for Cash Management
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id),
  transactionDate: date("transaction_date").notNull(),
  valueDate: date("value_date").notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 50 }),
  statementReference: varchar("statement_reference", { length: 50 }),
  reconciliationStatus: varchar("reconciliation_status", { length: 20 }).notNull().default("unreconciled"),
  reconciledDate: timestamp("reconciled_date"),
  reconciledBy: integer("reconciled_by"),
  glEntryId: integer("gl_entry_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cash Positions for liquidity management
export const cashPositions = pgTable("cash_positions", {
  id: serial("id").primaryKey(),
  companyCodeId: integer("company_code_id").notNull(),
  positionDate: date("position_date").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).notNull(),
  receipts: decimal("receipts", { precision: 15, scale: 2 }).notNull().default("0.00"),
  payments: decimal("payments", { precision: 15, scale: 2 }).notNull().default("0.00"),
  closingBalance: decimal("closing_balance", { precision: 15, scale: 2 }).notNull(),
  forecastedReceipts: decimal("forecasted_receipts", { precision: 15, scale: 2 }).default("0.00"),
  forecastedPayments: decimal("forecasted_payments", { precision: 15, scale: 2 }).default("0.00"),
  projectedBalance: decimal("projected_balance", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tax Jurisdictions for Tax Reporting
export const taxJurisdictions = pgTable("tax_jurisdictions", {
  id: serial("id").primaryKey(),
  jurisdictionCode: varchar("jurisdiction_code", { length: 20 }).notNull(),
  jurisdictionName: varchar("jurisdiction_name", { length: 100 }).notNull(),
  jurisdictionType: varchar("jurisdiction_type", { length: 50 }).notNull(),
  parentJurisdictionId: integer("parent_jurisdiction_id"),
  country: varchar("country", { length: 3 }).default("US"),
  stateProvince: varchar("state_province", { length: 10 }),
  county: varchar("county", { length: 50 }),
  city: varchar("city", { length: 50 }),
  postalCodePattern: varchar("postal_code_pattern", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax Codes for Tax Reporting
export const taxCodes = pgTable("tax_codes", {
  id: serial("id").primaryKey(),
  companyCodeId: integer("company_code_id"),
  taxCode: varchar("tax_code", { length: 10 }).notNull().unique(),
  description: text("description"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  tenantId: varchar("_tenantId", { length: 3 }).default("001"),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  deletedAt: timestamp("_deletedAt", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  taxType: varchar("tax_type", { length: 20 }),
  country: varchar("country", { length: 3 }),
  jurisdiction: varchar("jurisdiction", { length: 50 }),
  taxJurisdictionId: integer("tax_jurisdiction_id").references(() => taxJurisdictions.id),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  taxAccount: varchar("tax_account", { length: 10 }),
  taxBaseAccount: varchar("tax_base_account", { length: 10 }),
});

// Tax Transactions for Tax Reporting
export const taxTransactions = pgTable("tax_transactions", {
  id: serial("id").primaryKey(),
  documentNumber: varchar("document_number", { length: 20 }).notNull(),
  postingDate: date("posting_date").notNull(),
  taxCodeId: integer("tax_code_id").notNull().references(() => taxCodes.id),
  baseAmount: decimal("base_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  vendorId: integer("vendor_id"),
  customerId: integer("customer_id"),
  documentType: varchar("document_type", { length: 20 }).notNull(),
  taxPeriod: varchar("tax_period", { length: 7 }).notNull(),
  reportingStatus: varchar("reporting_status", { length: 20 }).notNull().default("pending"),
  glEntryId: integer("gl_entry_id"),
  companyCodeId: integer("company_code_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vendor Invoices for Accounts Payable
export const vendorInvoices = pgTable("vendor_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  vendorId: integer("vendor_id").notNull(),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date").notNull(),
  grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  paymentTerms: varchar("payment_terms", { length: 20 }).notNull(),
  purchaseOrderId: integer("purchase_order_id"),
  goodsReceiptId: integer("goods_receipt_id"),
  invoiceStatus: varchar("invoice_status", { length: 20 }).notNull().default("pending"),
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"),
  matchingStatus: varchar("matching_status", { length: 20 }).notNull().default("unmatched"),
  companyCodeId: integer("company_code_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customer Invoices for Accounts Receivable
export const customerInvoices = pgTable("customer_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  customerId: integer("customer_id").notNull(),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date").notNull(),
  grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  outstandingAmount: decimal("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  paymentTerms: varchar("payment_terms", { length: 20 }).notNull(),
  salesOrderId: integer("sales_order_id"),
  invoiceStatus: varchar("invoice_status", { length: 20 }).notNull().default("open"),
  creditStatus: varchar("credit_status", { length: 20 }).notNull().default("approved"),
  dunningLevel: integer("dunning_level").notNull().default(0),
  lastDunningDate: date("last_dunning_date"),
  companyCodeId: integer("company_code_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  orders: many(orders),
}));

// Customer schema - Enhanced to match erp_customers structure
export const customers = pgTable("erp_customers", {
  id: serial("id").primaryKey(),
  customer_code: varchar("customer_code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  language_code: varchar("language_code", { length: 2 }),
  tax_id: varchar("tax_id", { length: 50 }),
  industry: varchar("industry", { length: 50 }),
  segment: varchar("segment", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  country: varchar("country", { length: 50 }),
  postal_code: varchar("postal_code", { length: 20 }),
  region: varchar("region", { length: 50 }),
  phone: varchar("phone", { length: 30 }),
  alt_phone: varchar("alt_phone", { length: 30 }),
  email: varchar("email", { length: 100 }),
  website: varchar("website", { length: 255 }),
  currency: varchar("currency", { length: 10 }),
  payment_terms: varchar("payment_terms", { length: 50 }),
  payment_method: varchar("payment_method", { length: 50 }),
  credit_limit: decimal("credit_limit", { precision: 15, scale: 2 }),
  credit_limit_group_id: integer("credit_limit_group_id"),
  credit_rating: varchar("credit_rating", { length: 20 }),
  discount_group: varchar("discount_group", { length: 50 }),
  price_group: varchar("price_group", { length: 50 }),
  incoterms: varchar("incoterms", { length: 20 }),
  shipping_method: varchar("shipping_method", { length: 50 }),
  shippingConditionKey: varchar("shipping_condition_key", { length: 4 }),
  delivery_terms: varchar("delivery_terms", { length: 100 }),
  delivery_route: varchar("delivery_route", { length: 100 }),
  delivery_priority: varchar("delivery_priority", { length: 2 }),
  sales_org_code: varchar("sales_org_code", { length: 10 }),
  distribution_channel_code: varchar("distribution_channel_code", { length: 5 }),
  division_code: varchar("division_code", { length: 5 }),
  sales_district: varchar("sales_district", { length: 6 }),
  sales_office_code: varchar("sales_office_code", { length: 4 }),
  sales_group_code: varchar("sales_group_code", { length: 3 }),
  sales_rep_id: integer("sales_rep_id"),
  price_list: varchar("price_list", { length: 10 }),
  parent_customer_id: integer("parent_customer_id"),
  status: varchar("status", { length: 20 }),
  is_b2b: boolean("is_b2b"),
  is_b2c: boolean("is_b2c"),
  is_vip: boolean("is_vip"),
  notes: text("notes"),
  tags: text("tags").array(),
  company_code_id: integer("company_code_id"),
  is_active: boolean("is_active"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
  created_by: integer("created_by"),
  updated_by: integer("updated_by"),
  version: integer("version"),
  active: boolean("active"),

  // Financial Enhancement Fields
  reconciliation_account_code: varchar("reconciliation_account_code", { length: 10 }),
  dunning_procedure: varchar("dunning_procedure", { length: 20 }),
  dunning_block: boolean("dunning_block"),
  payment_block: boolean("payment_block"),
  credit_control_area: varchar("credit_control_area", { length: 10 }),
  risk_category: varchar("risk_category", { length: 20 }),
  credit_limit_currency: varchar("credit_limit_currency", { length: 3 }),
  credit_exposure: decimal("credit_exposure", { precision: 15, scale: 2 }),
  credit_check_procedure: varchar("credit_check_procedure", { length: 20 }),
  tax_classification_code: varchar("tax_classification_code", { length: 10 }),
  tax_exemption_certificate: varchar("tax_exemption_certificate", { length: 50 }),
  withholding_tax_code: varchar("withholding_tax_code", { length: 10 }),
  tax_jurisdiction: varchar("tax_jurisdiction", { length: 50 }),
  bank_account_number: varchar("bank_account_number", { length: 50 }),
  bank_routing_number: varchar("bank_routing_number", { length: 20 }),
  bank_name: varchar("bank_name", { length: 100 }),
  electronic_payment_method: varchar("electronic_payment_method", { length: 20 }),
  deletion_flag: boolean("deletion_flag"),
  authorization_group: varchar("authorization_group", { length: 20 }),

  // Legacy fields for backward compatibility
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),

  // Master Data Audit Trail
  _tenantId: varchar("_tenantId", { length: 3 }).default('001'),
  _deletedAt: timestamp("_deletedAt", { withTimezone: true }),
});

export const customerRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

// Category schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categoryRelations = relations(categories, ({ one }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));

// User Workspaces
export const userWorkspaces = pgTable("user_workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id).notNull(),
  tiles: jsonb("tiles").notNull(), // Array of tile numbers
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userWorkspaceRelations = relations(userWorkspaces, ({ one }) => ({
  user: one(users, {
    fields: [userWorkspaces.userId],
    references: [users.id],
  }),
}));

// User Roles and Permissions
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // admin, finance_manager, sales_manager, etc.
  moduleAccess: jsonb("module_access").notNull(), // Array of accessible modules
  tileAccess: jsonb("tile_access").notNull(), // Array of accessible tile numbers
  isActive: boolean("is_active").default(true),
  assignedBy: integer("assigned_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoleRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
  }),
}));

// Tile Registry - Master table for all tiles
export const tileRegistry = pgTable("tile_registry", {
  id: serial("id").primaryKey(),
  tileNumber: text("tile_number").unique().notNull(), // A001, B001, SC001, etc.
  tileId: text("tile_id").unique().notNull(), // company-code, sales-order, etc.
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // Master Data, Transactions, etc.
  route: text("route").notNull(),
  icon: text("icon").notNull(),
  moduleGroup: text("module_group").notNull(), // organizational, finance, sales, etc.
  requiredRoles: jsonb("required_roles").notNull(), // Array of required roles
  processSequence: integer("process_sequence"), // Order within the alphabetic group
  alphabeticPrefix: text("alphabetic_prefix").notNull(), // A, B, S, P, F, I, etc.
  isCustomized: boolean("is_customized").default(false), // true for AC, SC, PC variants
  baseStandardTile: text("base_standard_tile"), // References standard tile for customized versions
  businessProcess: text("business_process"), // Sales, Procurement, Finance, etc.
  functionalArea: text("functional_area"), // Master Data, Transactions, Reports
  implementationNotes: text("implementation_notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tile Naming Documentation - Stores naming conventions and rules
export const tileNamingDocumentation = pgTable("tile_naming_documentation", {
  id: serial("id").primaryKey(),
  alphabeticPrefix: text("alphabetic_prefix").unique().notNull(),
  prefixName: text("prefix_name").notNull(), // Master Data, Sales Process, etc.
  description: text("description").notNull(),
  numberRange: text("number_range").notNull(), // 001-099
  processLogic: text("process_logic"), // Sequential order explanation
  customizedPrefix: text("customized_prefix"), // AC, SC, PC for customized versions
  examples: jsonb("examples"), // Array of example tiles with explanations
  businessJustification: text("business_justification"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workspace Tile Assignments - Junction table for workspace-tile relationships
export const workspaceTileAssignments = pgTable("workspace_tile_assignments", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => userWorkspaces.id).notNull(),
  tileNumber: text("tile_number").references(() => tileRegistry.tileNumber).notNull(),
  isVisible: boolean("is_visible").default(true),
  isFavorite: boolean("is_favorite").default(false),
  customPosition: integer("custom_position"), // User-defined ordering
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const tileRegistryRelations = relations(tileRegistry, ({ many }) => ({
  workspaceAssignments: many(workspaceTileAssignments),
}));

export const workspaceTileAssignmentRelations = relations(workspaceTileAssignments, ({ one }) => ({
  workspace: one(userWorkspaces, {
    fields: [workspaceTileAssignments.workspaceId],
    references: [userWorkspaces.id],
  }),
  tile: one(tileRegistry, {
    fields: [workspaceTileAssignments.tileNumber],
    references: [tileRegistry.tileNumber],
  }),
}));

// Materials table - Master data for materials
// Schema simplified to match actual database columns
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  materialCode: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  description: varchar("description", { length: 500 }),
  materialType: varchar("type", { length: 20 }),
  baseUom: varchar("base_uom", { length: 3 }),
  basePrice: decimal("base_unit_price", { precision: 15, scale: 2 }),
  materialGroup: varchar("material_group", { length: 10 }),
  loadingGroup: varchar("loading_group", { length: 4 }), // SAP OVL1
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Plants table - Manufacturing and distribution locations
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  plantCode: varchar("plant_code", { length: 4 }).notNull().unique(),
  plantName: varchar("plant_name", { length: 60 }).notNull(),
  companyCode: varchar("company_code", { length: 4 }).default("MALY"),
  country: varchar("country", { length: 3 }).default("US"),
  region: varchar("region", { length: 3 }),
  address: text("address"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  language: varchar("language", { length: 2 }).default("EN"),
  timeZone: varchar("time_zone", { length: 10 }),
  factoryCalendar: varchar("factory_calendar", { length: 2 }).default("US"),
  planningPlant: boolean("planning_plant").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



// Product schema


// Order schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  date: timestamp("date").defaultNow().notNull(),
  status: text("status").default("Processing").notNull(),
  total: doublePrecision("total").notNull(),
  notes: text("notes"),
  shippingAddress: text("shipping_address"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  invoices: many(invoices),
}));

// Order Items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  materialId: integer("material_id").references(() => materials.id), // New
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  total: doublePrecision("total").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  material: one(materials, {
    fields: [orderItems.materialId],
    references: [materials.id],
  }),
}));

// Invoice schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orderId: integer("order_id").references(() => orders.id),
  issueDate: timestamp("issue_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").default("Due").notNull(),
  paidDate: timestamp("paid_date"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceRelations = relations(invoices, ({ one }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
}));

// Quotation schema
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(),
  documentType: varchar("document_type", { length: 4 }).default("QT").notNull(), // References sd_document_types.code
  customerId: integer("customer_id").notNull(), // References customers.id
  quotationDate: timestamp("quotation_date").defaultNow().notNull(),
  validUntilDate: timestamp("valid_until_date").notNull(),
  status: text("status").default("DRAFT").notNull(), // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  currency: text("currency").default("USD").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotationRelations = relations(quotations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [quotations.createdBy],
    references: [users.id],
  }),
  items: many(quotationItems),
}));

// Quotation Items schema
export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").references(() => quotations.id).notNull(),
  materialId: integer("material_id").notNull(), // References materials.id or products.id
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  total: doublePrecision("total").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotationItemRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
}));

// Export insert schemas for quotations
export const insertQuotationSchema = createInsertSchema(quotations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;

// Expense schema
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  paymentMethod: text("payment_method").notNull(),
  reference: text("reference"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expenseRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

// Stock movements schema
// Stock movements schema
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id),
  type: text("type").notNull(), // 'add' or 'remove'
  quantity: integer("quantity").notNull(),
  reason: text("reason").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockMovementRelations = relations(stockMovements, ({ one }) => ({
  material: one(materials, {
    fields: [stockMovements.materialId],
    references: [materials.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  created_at: true,
  updated_at: true,
  version: true
});
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true, createdAt: true });

// Create types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;



export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;

// Chart of Accounts schema
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  language: text("language").default("EN").notNull(),
  countryCode: text("country_code").default("US").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Fiscal Year Variants schema
export const fiscalYearVariants = pgTable("fiscal_year_variants", {
  id: serial("id").primaryKey(),
  variant_id: varchar("variant_id", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 255 }).notNull(),
  posting_periods: integer("posting_periods").default(12),
  special_periods: integer("special_periods").default(0),
  year_shift: integer("year_shift").default(0),
  fiscal_calendar_id: integer("fiscal_calendar_id"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  created_by: integer("created_by"),
  updated_by: integer("updated_by"),
  tenant_id: varchar("_tenantId", { length: 3 }).default("001"),
});

// GL Accounts schema - Section-wise fields
export const glAccounts = pgTable("gl_accounts", {
  id: serial("id").primaryKey(),
  // Section 1: Basic Data
  accountNumber: text("account_number").notNull().unique(),
  accountName: text("account_name").notNull(),
  longText: text("long_text"), // Detailed description
  chartOfAccountsId: integer("chart_of_accounts_id").references(() => chartOfAccounts.id),
  accountType: text("account_type").notNull(), // ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSES
  accountGroup: text("account_group"), // Legacy field - use glAccountGroupId instead
  glAccountGroupId: integer("gl_account_group_id"), // Reference to gl_account_groups table
  // Section 2: Account Characteristics
  balanceSheetAccount: boolean("balance_sheet_account").default(false).notNull(),
  plAccount: boolean("pl_account").default(false).notNull(),
  reconciliationAccount: boolean("reconciliation_account").default(false).notNull(),
  cashAccountIndicator: boolean("cash_account_indicator").default(false),
  blockPosting: boolean("block_posting").default(false).notNull(),
  markForDeletion: boolean("mark_for_deletion").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  // Section 3: Company Code Assignment
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  accountCurrency: text("account_currency"), // VARCHAR(3)
  fieldStatusGroup: text("field_status_group"), // VARCHAR(4)
  openItemManagement: boolean("open_item_management").default(false),
  lineItemDisplay: boolean("line_item_display").default(true),
  sortKey: text("sort_key"), // VARCHAR(2)
  // Section 4: Tax Settings
  taxCategory: text("tax_category"), // VARCHAR(2)
  postingWithoutTaxAllowed: boolean("posting_without_tax_allowed").default(false),
  // Section 5: Interest Calculation
  interestCalculationIndicator: boolean("interest_calculation_indicator").default(false),
  interestCalculationFrequency: text("interest_calculation_frequency"), // VARCHAR(2)
  interestCalculationDate: timestamp("interest_calculation_date"),
  // Section 6: Account Relationships
  alternativeAccountNumber: text("alternative_account_number"), // VARCHAR(10)
  groupAccountNumber: text("group_account_number"), // VARCHAR(10)
  tradingPartner: text("trading_partner"), // VARCHAR(10)
  // Section 7: Additional Settings
  postingAllowed: boolean("posting_allowed").default(true),
  balanceType: text("balance_type"), // debit/credit
  // Section 8: Financial Statement Categorization
  cashFlowCategory: text("cash_flow_category"), // OPERATING, INVESTING, FINANCING
  balanceSheetCategory: text("balance_sheet_category"), // CURRENT_ASSET, NON_CURRENT_ASSET, CURRENT_LIABILITY, NON_CURRENT_LIABILITY, EQUITY
  incomeStatementCategory: text("income_statement_category"), // SALES_REVENUE, OTHER_REVENUE, COGS, SELLING_EXPENSE, GNA_EXPENSE, RND_EXPENSE, INTEREST_INCOME, INTEREST_EXPENSE, OTHER_INCOME, OTHER_EXPENSE
  // Section 9: System Fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Cost Centers schema
export const costCenters = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  costCenterCategory: text("cost_center_category"), // PRODUCTION, ADMIN, SALES, etc.
  responsiblePerson: text("responsible_person"),
  validFromDate: timestamp("valid_from_date").defaultNow().notNull(),
  validToDate: timestamp("valid_to_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Profit Centers schema
export const profitCenters = pgTable("profit_centers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  profitCenterCategory: text("profit_center_category"), // PRODUCT_LINE, DIVISION, REGION, etc.
  responsiblePerson: text("responsible_person"),
  department: text("department"),
  validFromDate: timestamp("valid_from_date").defaultNow().notNull(),
  validToDate: timestamp("valid_to_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GL Entries schema - General Ledger transaction entries
export const glEntries = pgTable("gl_entries", {
  id: serial("id").primaryKey(),
  documentNumber: varchar("document_number", { length: 50 }).notNull(),
  glAccountId: integer("gl_account_id").references(() => glAccounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  debitCreditIndicator: varchar("debit_credit_indicator", { length: 1 }).notNull(), // 'D' for Debit, 'C' for Credit
  postingStatus: varchar("posting_status", { length: 20 }).default("posted"),
  postingDate: date("posting_date").defaultNow(),
  bankTransactionId: integer("bank_transaction_id"), // Link to bank_transactions table
  fiscalPeriod: integer("fiscal_period"), // Fiscal period number (1-12 or more)
  fiscalYear: integer("fiscal_year"), // Fiscal year
  description: text("description"), // Entry description
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  profitCenterId: integer("profit_center_id").references(() => profitCenters.id),
  reference: varchar("reference", { length: 255 }), // Reference number/document
  sourceModule: varchar("source_module", { length: 50 }), // SALES, PROCUREMENT, FINANCE, etc.
  sourceDocumentId: integer("source_document_id"), // ID of source document (invoice, payment, etc.)
  sourceDocumentType: varchar("source_document_type", { length: 50 }), // INVOICE, PAYMENT, JOURNAL, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Company Code Chart of Accounts Assignment schema
export const companyCodeChartAssignments = pgTable("company_code_chart_assignments", {
  id: serial("id").primaryKey(),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  chartOfAccountsId: integer("chart_of_accounts_id").references(() => chartOfAccounts.id),
  fiscalYearVariantId: integer("fiscal_year_variant_id").references(() => fiscalYearVariants.id),
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Period End Closing schema - tracks period closing processes
export const periodEndClosing = pgTable("period_end_closing", {
  id: serial("id").primaryKey(),
  fiscalPeriodId: integer("fiscal_period_id"), // References fiscal_periods table (no FK constraint to allow flexibility)
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  year: integer("year").notNull(),
  period: integer("period").notNull(),
  closingDate: timestamp("closing_date"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, cancelled, failed
  closingType: varchar("closing_type", { length: 20 }), // month_end, quarter_end, year_end
  description: text("description"),
  notes: text("notes"),
  validatedEntries: integer("validated_entries").default(0),
  unbalancedEntries: integer("unbalanced_entries").default(0),
  totalDebits: decimal("total_debits", { precision: 15, scale: 2 }).default("0.00"),
  totalCredits: decimal("total_credits", { precision: 15, scale: 2 }).default("0.00"),
  closingDocumentNumber: varchar("closing_document_number", { length: 50 }),
  startedBy: integer("started_by"),
  completedBy: integer("completed_by"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Company Codes schema (ensure we have the reference)
// Company Codes schema (ensure we have the reference)
export const companyCodes = pgTable("company_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").default("USD").notNull(),
  country: text("country").default("US").notNull(),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("active").default(true).notNull(),
  fiscalYearVariantId: integer("fiscal_year_variant_id").references(() => fiscalYearVariants.id),
  chartOfAccountsId: integer("chart_of_accounts_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Regions - Geographic regions master data
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tenantId: varchar("_tenantId", { length: 3 }).default("001"),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  deletedAt: timestamp("_deletedAt", { withTimezone: true })
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

// Countries - Geographic master data
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 2 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  regionId: integer("region_id").references(() => regions.id),
  region: varchar("region", { length: 50 }), // Keep for backward compatibility
  currencyCode: varchar("currency_code", { length: 3 }),
  languageCode: varchar("language_code", { length: 5 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;

// States - Geographic subdivisions of countries
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  countryId: integer("country_id"),
  region: varchar("region", { length: 50 }),
  taxJurisdictionId: integer("tax_jurisdiction_id").references(() => taxJurisdictions.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStateSchema = createInsertSchema(states).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertState = z.infer<typeof insertStateSchema>;
export type State = typeof states.$inferSelect;

// Relations
export const chartOfAccountsRelations = relations(chartOfAccounts, ({ many }) => ({
  glAccounts: many(glAccounts),
  companyAssignments: many(companyCodeChartAssignments),
}));

export const fiscalYearVariantRelations = relations(fiscalYearVariants, ({ many }) => ({
  companyAssignments: many(companyCodeChartAssignments),
}));

export const glAccountRelations = relations(glAccounts, ({ one }) => ({
  chartOfAccounts: one(chartOfAccounts, {
    fields: [glAccounts.chartOfAccountsId],
    references: [chartOfAccounts.id],
  }),
}));

export const costCenterRelations = relations(costCenters, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [costCenters.companyCodeId],
    references: [companyCodes.id],
  }),
}));

export const profitCenterRelations = relations(profitCenters, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [profitCenters.companyCodeId],
    references: [companyCodes.id],
  }),
}));

export const companyCodeRelations = relations(companyCodes, ({ many }) => ({
  costCenters: many(costCenters),
  profitCenters: many(profitCenters),
  chartAssignments: many(companyCodeChartAssignments),
}));

export const companyCodeChartAssignmentRelations = relations(companyCodeChartAssignments, ({ one }) => ({
  companyCode: one(companyCodes, {
    fields: [companyCodeChartAssignments.companyCodeId],
    references: [companyCodes.id],
  }),
  chartOfAccounts: one(chartOfAccounts, {
    fields: [companyCodeChartAssignments.chartOfAccountsId],
    references: [chartOfAccounts.id],
  }),
  fiscalYearVariant: one(fiscalYearVariants, {
    fields: [companyCodeChartAssignments.fiscalYearVariantId],
    references: [fiscalYearVariants.id],
  }),
}));

// Insert schemas for new tables
export const insertChartOfAccountsSchema = createInsertSchema(chartOfAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFiscalYearVariantSchema = createInsertSchema(fiscalYearVariants).omit({ id: true, created_at: true, updated_at: true });
export const updateFiscalYearVariantSchema = insertFiscalYearVariantSchema.partial();
export const insertGlAccountSchema = createInsertSchema(glAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGlEntrySchema = createInsertSchema(glEntries).omit({ id: true, createdAt: true });
export const insertCostCenterSchema = createInsertSchema(costCenters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProfitCenterSchema = createInsertSchema(profitCenters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanyCodeChartAssignmentSchema = createInsertSchema(companyCodeChartAssignments).omit({ id: true, createdAt: true });

// Types for new tables
export type InsertChartOfAccounts = z.infer<typeof insertChartOfAccountsSchema>;
export type ChartOfAccounts = typeof chartOfAccounts.$inferSelect;

export type InsertFiscalYearVariant = z.infer<typeof insertFiscalYearVariantSchema>;
export type FiscalYearVariant = typeof fiscalYearVariants.$inferSelect;

export type InsertGlAccount = z.infer<typeof insertGlAccountSchema>;
export type GlAccount = typeof glAccounts.$inferSelect;

export type InsertGlEntry = z.infer<typeof insertGlEntrySchema>;
export type GlEntry = typeof glEntries.$inferSelect;

export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;
export type CostCenter = typeof costCenters.$inferSelect;

export type InsertProfitCenter = z.infer<typeof insertProfitCenterSchema>;
export type ProfitCenter = typeof profitCenters.$inferSelect;

export type InsertCompanyCodeChartAssignment = z.infer<typeof insertCompanyCodeChartAssignmentSchema>;
export type CompanyCodeChartAssignment = typeof companyCodeChartAssignments.$inferSelect;

// Chief Agent System Tables
export const chiefAgentChangeRequests = pgTable("chief_agent_change_requests", {
  id: text("id").primaryKey(),
  requestType: text("request_type").notNull(),
  originAgent: text("origin_agent").notNull(),
  originAgentId: text("origin_agent_id").notNull(),
  businessDomain: text("business_domain").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  businessJustification: text("business_justification").notNull(),
  changeScope: text("change_scope").notNull(),
  targetTable: text("target_table"),
  targetField: text("target_field"),
  currentValue: text("current_value"),
  proposedValue: text("proposed_value"),
  impactAssessment: text("impact_assessment"),
  urgency: text("urgency").default("medium"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chiefAgentSystemMonitoring = pgTable("chief_agent_system_monitoring", {
  id: text("id").primaryKey(),
  monitoringType: text("monitoring_type").notNull(),
  businessDomain: text("business_domain").notNull(),
  component: text("component").notNull(),
  status: text("status").notNull(),
  healthScore: integer("health_score"),
  metrics: jsonb("metrics"),
  alerts: jsonb("alerts"),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chiefAgentHumanInteractions = pgTable("chief_agent_human_interactions", {
  id: text("id").primaryKey(),
  changeRequestId: text("change_request_id").notNull(),
  interactionType: text("interaction_type").notNull(),
  humanManagerId: text("human_manager_id"),
  requestedAction: text("requested_action").notNull(),
  justification: text("justification").notNull(),
  urgencyLevel: text("urgency_level").default("medium"),
  businessImpact: text("business_impact"),
  deadline: timestamp("deadline"),
  status: text("status").default("pending").notNull(),
  response: text("response"),
  responseTimestamp: timestamp("response_timestamp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chiefAgentDecisionAudit = pgTable("chief_agent_decision_audit", {
  id: text("id").primaryKey(),
  changeRequestId: text("change_request_id").notNull(),
  decisionType: text("decision_type").notNull(),
  decisionMaker: text("decision_maker").notNull(),
  decision: text("decision").notNull(),
  reasoning: text("reasoning").notNull(),
  businessDocumentationReviewed: jsonb("business_documentation_reviewed"),
  complianceChecks: jsonb("compliance_checks"),
  riskAssessment: jsonb("risk_assessment"),
  recommendations: text("recommendations"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Chief Agent schema exports
export const insertChiefAgentChangeRequestSchema = createInsertSchema(chiefAgentChangeRequests);
export const insertChiefAgentSystemMonitoringSchema = createInsertSchema(chiefAgentSystemMonitoring);
export const insertChiefAgentHumanInteractionSchema = createInsertSchema(chiefAgentHumanInteractions);
export const insertChiefAgentDecisionAuditSchema = createInsertSchema(chiefAgentDecisionAudit);

export type InsertChiefAgentChangeRequest = z.infer<typeof insertChiefAgentChangeRequestSchema>;
export type ChiefAgentChangeRequest = typeof chiefAgentChangeRequests.$inferSelect;

export type InsertChiefAgentSystemMonitoring = z.infer<typeof insertChiefAgentSystemMonitoringSchema>;
export type ChiefAgentSystemMonitoring = typeof chiefAgentSystemMonitoring.$inferSelect;

// Import Chief Agent Permissions schema
export * from "./chief-agent-permissions-schema";

export type InsertChiefAgentHumanInteraction = z.infer<typeof insertChiefAgentHumanInteractionSchema>;
export type ChiefAgentHumanInteraction = typeof chiefAgentHumanInteractions.$inferSelect;

export type InsertChiefAgentDecisionAudit = z.infer<typeof insertChiefAgentDecisionAuditSchema>;
export type ChiefAgentDecisionAudit = typeof chiefAgentDecisionAudit.$inferSelect;

// =============================================================================
// ROOKIE AGENT TABLES - Business Domain Support & Learning Level
// =============================================================================

// Rookie Agent Sessions - Learning and support sessions
export const rookieAgentSessions = pgTable("rookie_agent_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionType: varchar("session_type").notNull(), // 'data_entry', 'training', 'support', 'quality_check'
  businessDomain: varchar("business_domain").notNull(), // 'finance', 'sales', 'inventory', 'hr', etc.
  screenName: varchar("screen_name"), // Which UI screen was accessed
  userLevel: varchar("user_level").notNull().default('beginner'), // 'beginner', 'intermediate'
  status: varchar("status").notNull().default('active'), // 'active', 'completed', 'escalated'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  summary: text("summary"),
  learningOutcomes: jsonb("learning_outcomes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Rookie Agent Data Entries - Support for data entry validation
export const rookieAgentDataEntries = pgTable("rookie_agent_data_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => rookieAgentSessions.id),
  businessDomain: varchar("business_domain").notNull(),
  screenName: varchar("screen_name").notNull(), // UI screen where data is entered
  fieldName: varchar("field_name").notNull(), // Field being validated
  fieldValue: text("field_value"), // Value entered by user
  description: text("description"), // Description of the entry
  validationType: varchar("validation_type").notNull(), // 'format_check', 'business_rule', 'quality_check'
  status: varchar("status").notNull().default('pending'), // 'pending', 'approved', 'rejected'
  validationResult: jsonb("validation_result"), // Detailed validation results
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Rookie Agent Training - Learning materials and progress
export const rookieAgentTraining = pgTable("rookie_agent_training", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessDomain: varchar("business_domain").notNull(),
  trainingType: varchar("training_type").notNull(), // 'quick_start', 'detailed_guide', 'video', 'interactive'
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  difficulty: varchar("difficulty").notNull().default('beginner'), // 'beginner', 'intermediate', 'advanced'
  estimatedDuration: integer("estimated_duration"), // Duration in minutes
  completionRate: doublePrecision("completion_rate").default(0.00),
  lastAccessed: timestamp("last_accessed"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Rookie Agent Quality Checks - Quality assurance guidelines
export const rookieAgentQualityChecks = pgTable("rookie_agent_quality_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessDomain: varchar("business_domain").notNull(),
  checkType: varchar("check_type").notNull(), // 'mandatory_fields', 'format_validation', 'business_rules'
  checkName: varchar("check_name").notNull(),
  checkDescription: text("check_description").notNull(),
  severity: varchar("severity").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  autoCheck: boolean("auto_check").notNull().default(false), // Can be automatically validated
  checkCriteria: jsonb("check_criteria"), // Detailed criteria for the check
  passingScore: integer("passing_score").default(80), // Minimum score to pass
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Rookie Agent schema exports
export const insertRookieAgentSessionSchema = createInsertSchema(rookieAgentSessions);
export const insertRookieAgentDataEntrySchema = createInsertSchema(rookieAgentDataEntries);
export const insertRookieAgentTrainingSchema = createInsertSchema(rookieAgentTraining);
export const insertRookieAgentQualityCheckSchema = createInsertSchema(rookieAgentQualityChecks);

export type InsertRookieAgentSession = z.infer<typeof insertRookieAgentSessionSchema>;
export type RookieAgentSession = typeof rookieAgentSessions.$inferSelect;

export type InsertRookieAgentDataEntry = z.infer<typeof insertRookieAgentDataEntrySchema>;
export type RookieAgentDataEntry = typeof rookieAgentDataEntries.$inferSelect;

export type InsertRookieAgentTraining = z.infer<typeof insertRookieAgentTrainingSchema>;
export type RookieAgentTraining = typeof rookieAgentTraining.$inferSelect;

export type InsertRookieAgentQualityCheck = z.infer<typeof insertRookieAgentQualityCheckSchema>;
export type RookieAgentQualityCheck = typeof rookieAgentQualityChecks.$inferSelect;

// Cash Management insert schemas and types
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCashPositionSchema = createInsertSchema(cashPositions).omit({ id: true, createdAt: true });
export const insertTaxJurisdictionSchema = createInsertSchema(taxJurisdictions).omit({ id: true, createdAt: true });
export const insertTaxCodeSchema = createInsertSchema(taxCodes).omit({ id: true, createdAt: true });
export const insertTaxTransactionSchema = createInsertSchema(taxTransactions).omit({ id: true, createdAt: true });
export const insertVendorInvoiceSchema = createInsertSchema(vendorInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerInvoiceSchema = createInsertSchema(customerInvoices).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccountType = typeof bankAccounts.$inferSelect;

export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransactionType = typeof bankTransactions.$inferSelect;

export type InsertCashPosition = z.infer<typeof insertCashPositionSchema>;
export type CashPositionType = typeof cashPositions.$inferSelect;

export type InsertTaxJurisdiction = z.infer<typeof insertTaxJurisdictionSchema>;
export type TaxJurisdictionType = typeof taxJurisdictions.$inferSelect;
export type InsertTaxCode = z.infer<typeof insertTaxCodeSchema>;
export type TaxCodeType = typeof taxCodes.$inferSelect;

export type InsertTaxTransaction = z.infer<typeof insertTaxTransactionSchema>;
export type TaxTransactionType = typeof taxTransactions.$inferSelect;

export type InsertVendorInvoice = z.infer<typeof insertVendorInvoiceSchema>;
export type VendorInvoiceType = typeof vendorInvoices.$inferSelect;

export type InsertCustomerInvoice = z.infer<typeof insertCustomerInvoiceSchema>;
export type CustomerInvoiceType = typeof customerInvoices.$inferSelect;

// Customer-Bank Relationship schema
export const customerBankRelationships = pgTable("customer_bank_relationships", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id),
  relationshipType: varchar("relationship_type", { length: 20 }).notNull().default("payment_account"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payment Transactions schema
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  customerPaymentId: integer("customer_payment_id").notNull().references(() => customerPayments.id),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccounts.id),
  bankTransactionId: integer("bank_transaction_id").references(() => bankTransactions.id),
  arInvoiceId: integer("ar_invoice_id").references(() => accountsReceivable.id),
  glDocumentNumber: varchar("gl_document_number", { length: 50 }),
  transactionAmount: decimal("transaction_amount", { precision: 15, scale: 2 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  postingStatus: varchar("posting_status", { length: 20 }).notNull().default("pending"),
  reconciliationStatus: varchar("reconciliation_status", { length: 20 }).notNull().default("unmatched"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customer Payments schema (if not exists)
export const customerPayments = pgTable("customer_payments", {
  id: serial("id").primaryKey(),
  paymentNumber: varchar("payment_number", { length: 50 }).notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  paymentDate: date("payment_date").notNull(),
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  bankAccount: varchar("bank_account", { length: 100 }),
  reference: varchar("reference", { length: 100 }),
  postingStatus: varchar("posting_status", { length: 20 }).notNull().default("pending"),
  accountingDocumentNumber: varchar("accounting_document_number", { length: 50 }),
  glPostingStatus: varchar("gl_posting_status", { length: 20 }).default("pending"), // POSTED, PENDING, FAILED
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Accounts Receivable schema (if not exists)
export const accountsReceivable = pgTable("accounts_receivable", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currencyId: integer("currency_id"),
  companyCodeId: integer("company_code_id"),
  plantId: integer("plant_id"),
  salesOrderId: integer("sales_order_id"),
  paymentTerms: varchar("payment_terms", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  paymentDate: date("payment_date"),
  paymentReference: varchar("payment_reference", { length: 100 }),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: integer("created_by"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Vendor Payments schema
export const vendorPayments = pgTable("vendor_payments", {
  id: serial("id").primaryKey(),
  paymentNumber: varchar("payment_number", { length: 50 }).notNull().unique(),
  vendorId: integer("vendor_id").notNull(), // References vendors(id)
  purchaseOrderId: integer("purchase_order_id"), // References purchase_orders(id)
  invoiceId: integer("invoice_id"), // References accounts_payable(id)
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // CHECK, BANK_TRANSFER, ONLINE_TRANSFER, WIRE_TRANSFER
  paymentDate: date("payment_date").notNull(),
  valueDate: date("value_date"),
  bankAccountId: integer("bank_account_id"), // References bank_accounts(id)
  reference: varchar("reference", { length: 255 }), // Check number, transfer reference, transaction ID
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING, PROCESSED, POSTED, CANCELLED
  accountingDocumentNumber: varchar("accounting_document_number", { length: 50 }),
  companyCodeId: integer("company_code_id").notNull(), // References company_codes(id)
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  notes: text("notes"),
});

// Insert schemas for new tables
export const insertCustomerBankRelationshipSchema = createInsertSchema(customerBankRelationships).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerPaymentSchema = createInsertSchema(customerPayments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccountsReceivableSchema = createInsertSchema(accountsReceivable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVendorPaymentSchema = createInsertSchema(vendorPayments).omit({ id: true, createdAt: true, updatedAt: true });

// Types for new tables
export type InsertCustomerBankRelationship = z.infer<typeof insertCustomerBankRelationshipSchema>;
export type CustomerBankRelationship = typeof customerBankRelationships.$inferSelect;

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

export type InsertCustomerPayment = z.infer<typeof insertCustomerPaymentSchema>;
export type CustomerPayment = typeof customerPayments.$inferSelect;

export type InsertAccountsReceivable = z.infer<typeof insertAccountsReceivableSchema>;
export type AccountsReceivable = typeof accountsReceivable.$inferSelect;
export type InsertVendorPayment = z.infer<typeof insertVendorPaymentSchema>;
export type VendorPayment = typeof vendorPayments.$inferSelect;

// Additional Master Data Tables for Company Code Configuration
// NOTE: creditControlAreas moved to organizational-schema.ts to match database structure
// This schema definition is deprecated - use organizational-schema.ts instead

export const globalCompanyCodes = pgTable("global_company_codes", {
  id: serial("id").primaryKey(),
  globalCode: varchar("global_code", { length: 4 }).notNull().unique(),
  description: varchar("description", { length: 50 }).notNull(),
  consolidationCompany: varchar("consolidation_company", { length: 4 }),
  reportingCurrency: varchar("reporting_currency", { length: 3 }).notNull(),
  consolidationChart: varchar("consolidation_chart", { length: 4 }),
  eliminationLedger: varchar("elimination_ledger", { length: 2 }),
  managementType: varchar("management_type", { length: 10 }).default("CENTRAL"),
  activeStatus: boolean("active_status").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vatRegistrationNumbers = pgTable("vat_registration_numbers", {
  id: serial("id").primaryKey(),
  registrationKey: varchar("registration_key", { length: 20 }).notNull().unique(),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  country: varchar("country", { length: 3 }).notNull(),
  vatNumber: varchar("vat_number", { length: 20 }).notNull(),
  taxType: varchar("tax_type", { length: 10 }).default("VAT"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  taxOffice: varchar("tax_office", { length: 50 }),
  taxOfficerName: varchar("tax_officer_name", { length: 50 }),
  exemptionCertificate: varchar("exemption_certificate", { length: 20 }),
  activeStatus: boolean("active_status").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========================================
// MISSING MASTER DATA TILES - STANDARDIZED STRUCTURE
// All tables follow standard pattern: id, code, description, flags, timestamps
// ========================================

// Supply Types - Referenced in Purchase References (CRITICAL - fixing current error)
export const supplyTypes = pgTable("supply_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 100 }),
  updatedBy: varchar("updated_by", { length: 100 }),
  version: integer("version").notNull().default(1),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validTo: timestamp("valid_to"),
  active: boolean("active").default(true),
  supplyCategory: varchar("supply_category", { length: 50 }),
  procurementType: varchar("procurement_type", { length: 20 }).default("standard"),
});

// Purchasing Groups - Referenced in Purchase Organization
export const purchasingGroups = pgTable("purchasing_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  purchaseOrganizationCode: varchar("purchase_organization_code", { length: 10 }),
  responsibleBuyer: varchar("responsible_buyer", { length: 50 }),
  telephoneNumber: varchar("telephone_number", { length: 20 }),
  emailAddress: varchar("email_address", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vendor Groups - Referenced in Vendor Master
export const vendorGroups = pgTable("vendor_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  accountGroup: varchar("account_group", { length: 20 }),
  reconciliationAccount: varchar("reconciliation_account", { length: 20 }),
  paymentTerms: varchar("payment_terms", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customer Groups - Customer classification and grouping for business operations
export const customerGroups = pgTable("customer_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  accountGroupId: integer("account_group_id"), // Reference to account_groups table
  reconciliationAccountId: integer("reconciliation_account_id"), // Reference to reconciliation_accounts table
  creditLimitGroupId: integer("credit_limit_group_id"), // Reference to credit_limit_groups table
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Customer Types - Classification of customers (e.g., Individual, Business, Government)
export const customerTypes = pgTable("customer_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // Classification category
  requiresTaxId: boolean("requires_tax_id").default(false),
  requiresRegistration: boolean("requires_registration").default(false),
  defaultPaymentTerms: varchar("default_payment_terms", { length: 10 }),
  defaultCreditLimit: decimal("default_credit_limit", { precision: 15, scale: 2 }),
  defaultCurrency: varchar("default_currency", { length: 3 }),
  businessRules: jsonb("business_rules"), // Flexible business rules configuration
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Material Groups - Referenced in Material Master
export const materialGroups = pgTable("material_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  materialGroupHierarchy: varchar("material_group_hierarchy", { length: 50 }),
  generalItemCategory: varchar("general_item_category", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Material Types - Referenced in Material Master
export const materialTypes = pgTable("material_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  typeCategory: varchar("type_category", { length: 20 }),
  inventoryManaged: boolean("inventory_managed").default(true),
  procurementType: varchar("procurement_type", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Industry Sectors - Referenced in Material Master
export const industrySectors = pgTable("industry_sectors", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  sectorCategory: varchar("sector_category", { length: 50 }),
  standardApplications: text("standard_applications"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  _tenantId: varchar("_tenantId", { length: 3 }).default("001"),
  _deletedAt: timestamp("_deletedAt", { withTimezone: true }),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Distribution Channels - Referenced in Customer Master
export const distributionChannels = pgTable("distribution_channels", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  salesOrganizationId: integer("sales_organization_id"), // References sales_organizations table
  channelType: varchar("channel_type", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Divisions - Referenced in Customer Master  
export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  salesOrganizationCode: varchar("sales_organization_code", { length: 10 }),
  currency: varchar("currency", { length: 3 }),
  creditControlArea: varchar("credit_control_area", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Plant Categories - Referenced in Plant dropdown
export const plantCategories = pgTable("plant_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  categoryType: varchar("category_type", { length: 20 }),
  maintenanceControlKey: varchar("maintenance_control_key", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Work Center Categories - Referenced in Production
export const workCenterCategories = pgTable("work_center_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  controllingArea: varchar("controlling_area", { length: 20 }),
  standardValueKey: varchar("standard_value_key", { length: 20 }),
  capacityCategory: varchar("capacity_category", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Methods - Referenced in Payment Terms
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  paymentMethodType: varchar("payment_method_type", { length: 20 }),
  bankDetailsRequired: boolean("bank_details_required").default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Business Areas - For financial reporting and consolidation
export const businessAreas = pgTable("business_areas", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id, { onDelete: "set null" }),
  parentBusinessAreaCode: varchar("parent_business_area_code", { length: 10 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Authorization Groups - Referenced in Security
export const authorizationGroups = pgTable("authorization_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  authorizationObject: varchar("authorization_object", { length: 20 }),
  activityType: varchar("activity_type", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// INSERT SCHEMAS FOR MISSING MASTER DATA TILES
// ========================================

// Supply Types Insert Schema
export const insertSupplyTypeSchema = createInsertSchema(supplyTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupplyType = z.infer<typeof insertSupplyTypeSchema>;
export type SupplyType = typeof supplyTypes.$inferSelect;

// Purchasing Groups Insert Schema
export const insertPurchasingGroupSchema = createInsertSchema(purchasingGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchasingGroup = z.infer<typeof insertPurchasingGroupSchema>;
export type PurchasingGroup = typeof purchasingGroups.$inferSelect;

// Vendor Groups Insert Schema
export const insertVendorGroupSchema = createInsertSchema(vendorGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVendorGroup = z.infer<typeof insertVendorGroupSchema>;
export type VendorGroup = typeof vendorGroups.$inferSelect;

// Customer Groups Insert Schema
export const insertCustomerGroupSchema = createInsertSchema(customerGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerGroup = z.infer<typeof insertCustomerGroupSchema>;
export type CustomerGroup = typeof customerGroups.$inferSelect;

// Customer Types Insert Schema
export const insertCustomerTypeSchema = createInsertSchema(customerTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerType = z.infer<typeof insertCustomerTypeSchema>;
export type CustomerType = typeof customerTypes.$inferSelect;

// Material Groups Insert Schema
export const insertMaterialGroupSchema = createInsertSchema(materialGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMaterialGroup = z.infer<typeof insertMaterialGroupSchema>;
export type MaterialGroup = typeof materialGroups.$inferSelect;

// Material Types Insert Schema
export const insertMaterialTypeSchema = createInsertSchema(materialTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMaterialType = z.infer<typeof insertMaterialTypeSchema>;
export type MaterialType = typeof materialTypes.$inferSelect;

// Industry Sectors Insert Schema
export const insertIndustrySectorSchema = createInsertSchema(industrySectors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIndustrySector = z.infer<typeof insertIndustrySectorSchema>;
export type IndustrySector = typeof industrySectors.$inferSelect;

// Distribution Channels Insert Schema
export const insertDistributionChannelSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  salesOrganizationId: z.number().int().positive().optional().nullable(),
  channelType: z.string().max(20).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type InsertDistributionChannel = z.infer<typeof insertDistributionChannelSchema>;
export type DistributionChannel = typeof distributionChannels.$inferSelect;

// Divisions Insert Schema
export const insertDivisionSchema = createInsertSchema(divisions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDivision = z.infer<typeof insertDivisionSchema>;
export type Division = typeof divisions.$inferSelect;

// Plant Categories Insert Schema
export const insertPlantCategorySchema = createInsertSchema(plantCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlantCategory = z.infer<typeof insertPlantCategorySchema>;
export type PlantCategory = typeof plantCategories.$inferSelect;

// Work Center Categories Insert Schema
export const insertWorkCenterCategorySchema = createInsertSchema(workCenterCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkCenterCategory = z.infer<typeof insertWorkCenterCategorySchema>;
export type WorkCenterCategory = typeof workCenterCategories.$inferSelect;

// Payment Methods Insert Schema
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// Business Areas Insert Schema
export const insertBusinessAreaSchema = createInsertSchema(businessAreas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusinessArea = z.infer<typeof insertBusinessAreaSchema>;
export type BusinessArea = typeof businessAreas.$inferSelect;

// Authorization Groups Insert Schema
export const insertAuthorizationGroupSchema = createInsertSchema(authorizationGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAuthorizationGroup = z.infer<typeof insertAuthorizationGroupSchema>;
export type AuthorizationGroup = typeof authorizationGroups.$inferSelect;

// ===============================================
// FINANCIAL INTEGRATION SCHEMA - Material Costing & GL Integration
// ===============================================

// Material Master with Costing Information
export const materialCosting = pgTable("material_costing", {
  id: serial("id").primaryKey(),
  materialCode: varchar("material_code", { length: 18 }).notNull(),
  plantCode: varchar("plant_code", { length: 4 }).notNull(),
  costingMethod: varchar("costing_method", { length: 10 }).notNull().default("MAP"), // MAP = Moving Average Price, STD = Standard Cost
  standardCost: decimal("standard_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  movingAveragePrice: decimal("moving_average_price", { precision: 15, scale: 2 }).notNull().default("0.00"),
  lastCost: decimal("last_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  materialOverhead: decimal("material_overhead", { precision: 5, scale: 2 }).notNull().default("0.00"), // percentage
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  baseUnitOfMeasure: varchar("base_unit_of_measure", { length: 3 }).notNull(),
  priceUnit: integer("price_unit").notNull().default(1),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 50 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Chart of Accounts for Manufacturing ERP (Renamed to avoid conflicts)
export const manufacturingChartOfAccounts = pgTable("manufacturing_chart_of_accounts", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 10 }).notNull().unique(),
  accountName: varchar("account_name", { length: 50 }).notNull(),
  accountType: varchar("account_type", { length: 20 }).notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  accountClass: varchar("account_class", { length: 20 }).notNull(), // BALANCE_SHEET, PROFIT_LOSS
  parentAccount: varchar("parent_account", { length: 10 }),
  companyCode: varchar("company_code", { length: 4 }).notNull().default("MALY"),
  normalBalance: varchar("normal_balance", { length: 6 }).notNull(), // DEBIT, CREDIT
  isControlAccount: boolean("is_control_account").notNull().default(false),
  reconciliationAccount: boolean("reconciliation_account").notNull().default(false),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 50 }).notNull(),
});

// GL Account Balances
export const glAccountBalances = pgTable("gl_account_balances", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 10 }).notNull(),
  companyCode: varchar("company_code", { length: 4 }).notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalPeriod: integer("fiscal_period").notNull(),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Work Center Cost Rates
export const workCenterCostRates = pgTable("work_center_cost_rates", {
  id: serial("id").primaryKey(),
  workCenterCode: varchar("work_center_code", { length: 8 }).notNull(),
  plantCode: varchar("plant_code", { length: 4 }).notNull(),
  costCenterCode: varchar("cost_center_code", { length: 10 }).notNull(),
  activityType: varchar("activity_type", { length: 10 }).notNull(), // LABOR, MACHINE, SETUP
  costRate: decimal("cost_rate", { precision: 15, scale: 2 }).notNull(),
  costUnit: varchar("cost_unit", { length: 3 }).notNull().default("HR"), // HR = Hour, MIN = Minute
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cost Center Master Data
export const costCenterMaster = pgTable("cost_center_master", {
  id: serial("id").primaryKey(),
  costCenterCode: varchar("cost_center_code", { length: 10 }).notNull().unique(),
  costCenterName: varchar("cost_center_name", { length: 50 }).notNull(),
  companyCode: varchar("company_code", { length: 4 }).notNull(),
  controllingArea: varchar("controlling_area", { length: 4 }).notNull(),
  plantCode: varchar("plant_code", { length: 4 }),
  department: varchar("department", { length: 20 }),
  costCenterCategory: varchar("cost_center_category", { length: 10 }).notNull(), // PROD = Production, ADMIN = Administration
  responsiblePerson: varchar("responsible_person", { length: 50 }),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Production Order Costing
export const productionOrderCosting = pgTable("production_order_costing", {
  id: serial("id").primaryKey(),
  productionOrderNumber: varchar("production_order_number", { length: 20 }).notNull(),
  materialCode: varchar("material_code", { length: 18 }).notNull(),
  plannedQuantity: decimal("planned_quantity", { precision: 15, scale: 3 }).notNull(),
  actualQuantity: decimal("actual_quantity", { precision: 15, scale: 3 }).notNull().default("0.000"),
  // Material Costs
  plannedMaterialCost: decimal("planned_material_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  actualMaterialCost: decimal("actual_material_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  // Labor Costs  
  plannedLaborCost: decimal("planned_labor_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  actualLaborCost: decimal("actual_labor_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  // Machine/Overhead Costs
  plannedMachineCost: decimal("planned_machine_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  actualMachineCost: decimal("actual_machine_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  plannedOverheadCost: decimal("planned_overhead_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  actualOverheadCost: decimal("actual_overhead_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  // Total Costs
  totalPlannedCost: decimal("total_planned_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalActualCost: decimal("total_actual_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  costVariance: decimal("cost_variance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  costingDate: timestamp("costing_date").defaultNow().notNull(),
  costingStatus: varchar("costing_status", { length: 10 }).notNull().default("PLANNED"), // PLANNED, ACTUAL, SETTLED
});

// Manufacturing Inventory Valuation for Stock (Renamed to avoid conflicts)
export const manufacturingInventoryValuation = pgTable("manufacturing_inventory_valuation", {
  id: serial("id").primaryKey(),
  materialCode: varchar("material_code", { length: 18 }).notNull(),
  plantCode: varchar("plant_code", { length: 4 }).notNull(),
  storageLocation: varchar("storage_location", { length: 4 }).notNull(),
  batch: varchar("batch", { length: 10 }),
  stockQuantity: decimal("stock_quantity", { precision: 15, scale: 3 }).notNull().default("0.000"),
  unitCost: decimal("unit_cost", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull().default("0.00"),
  stockType: varchar("stock_type", { length: 10 }).notNull().default("UNRESTRICTED"), // UNRESTRICTED, QUALITY, BLOCKED
  valuationType: varchar("valuation_type", { length: 10 }).notNull().default("STANDARD"), // STANDARD, MOVING_AVG
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  lastMovementDate: timestamp("last_movement_date").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// GL Posting Integration for Financial Transactions
export const glPostingDocuments = pgTable("gl_posting_documents", {
  id: serial("id").primaryKey(),
  documentNumber: varchar("document_number", { length: 20 }).notNull().unique(),
  documentType: varchar("document_type", { length: 10 }).notNull(), // SA = Sales, PR = Production, MM = Material Movement
  companyCode: varchar("company_code", { length: 4 }).notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  postingDate: date("posting_date").notNull(),
  documentDate: date("document_date").notNull(),
  reference: varchar("reference", { length: 20 }), // Sales Order, Production Order, etc.
  documentHeaderText: varchar("document_header_text", { length: 50 }),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  postingStatus: varchar("posting_status", { length: 10 }).notNull().default("POSTED"), // POSTED, PARKED, CLEARED
  createdBy: varchar("created_by", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GL Posting Line Items
export const glPostingLineItems = pgTable("gl_posting_line_items", {
  id: serial("id").primaryKey(),
  documentNumber: varchar("document_number", { length: 20 }).notNull(),
  lineItemNumber: varchar("line_item_number", { length: 3 }).notNull(),
  accountNumber: varchar("account_number", { length: 10 }).notNull(),
  costCenterCode: varchar("cost_center_code", { length: 10 }),
  profitCenterCode: varchar("profit_center_code", { length: 10 }),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  lineItemText: varchar("line_item_text", { length: 50 }),
  materialCode: varchar("material_code", { length: 18 }),
  plantCode: varchar("plant_code", { length: 4 }),
  businessArea: varchar("business_area", { length: 4 }),
  assignmentField: varchar("assignment_field", { length: 20 }),
  referenceKey1: varchar("reference_key_1", { length: 20 }),
  referenceKey2: varchar("reference_key_2", { length: 20 }),
  referenceKey3: varchar("reference_key_3", { length: 20 }),
});

// Financial Integration Zod Schemas
export const insertMaterialCostingSchema = createInsertSchema(materialCosting);
export const insertManufacturingChartOfAccountsSchema = createInsertSchema(manufacturingChartOfAccounts);
export const insertGlAccountBalancesSchema = createInsertSchema(glAccountBalances);
export const insertWorkCenterCostRatesSchema = createInsertSchema(workCenterCostRates);
export const insertCostCenterMasterSchema = createInsertSchema(costCenterMaster);
export const insertProductionOrderCostingSchema = createInsertSchema(productionOrderCosting);
export const insertManufacturingInventoryValuationSchema = createInsertSchema(manufacturingInventoryValuation);
export const insertGlPostingDocumentsSchema = createInsertSchema(glPostingDocuments);
export const insertGlPostingLineItemsSchema = createInsertSchema(glPostingLineItems);

// Financial Integration Types
export type MaterialCosting = typeof materialCosting.$inferSelect;
export type InsertMaterialCosting = z.infer<typeof insertMaterialCostingSchema>;
export type ManufacturingChartOfAccounts = typeof manufacturingChartOfAccounts.$inferSelect;
export type InsertManufacturingChartOfAccounts = z.infer<typeof insertManufacturingChartOfAccountsSchema>;
export type GlAccountBalances = typeof glAccountBalances.$inferSelect;
export type InsertGlAccountBalances = z.infer<typeof insertGlAccountBalancesSchema>;
export type WorkCenterCostRates = typeof workCenterCostRates.$inferSelect;
export type InsertWorkCenterCostRates = z.infer<typeof insertWorkCenterCostRatesSchema>;
export type CostCenterMaster = typeof costCenterMaster.$inferSelect;
export type InsertCostCenterMaster = z.infer<typeof insertCostCenterMasterSchema>;
export type ProductionOrderCosting = typeof productionOrderCosting.$inferSelect;
export type InsertProductionOrderCosting = z.infer<typeof insertProductionOrderCostingSchema>;
export type ManufacturingInventoryValuation = typeof manufacturingInventoryValuation.$inferSelect;
export type InsertManufacturingInventoryValuation = z.infer<typeof insertManufacturingInventoryValuationSchema>;
export type GlPostingDocuments = typeof glPostingDocuments.$inferSelect;
export type InsertGlPostingDocuments = z.infer<typeof insertGlPostingDocumentsSchema>;
export type GlPostingLineItems = typeof glPostingLineItems.$inferSelect;
export type InsertGlPostingLineItems = z.infer<typeof insertGlPostingLineItemsSchema>;

// Tax Configuration table - Tax setup and rules
export const taxConfiguration = pgTable("tax_configuration", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  taxType: varchar("tax_type", { length: 20 }).notNull(), // Input, Output, Withholding
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 50 }).notNull(),
  glAccount: varchar("gl_account", { length: 10 }).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tolerance Groups table - Posting tolerance limits
export const toleranceGroups = pgTable("tolerance_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 100 }).notNull(),
  toleranceType: varchar("tolerance_type", { length: 20 }).notNull(), // Employee, Customer, Vendor
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  smallAmountLimit: decimal("small_amount_limit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  percentageLimit: decimal("percentage_limit", { precision: 5, scale: 2 }).notNull().default("0.00"),
  absoluteLimit: decimal("absolute_limit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  companyCode: varchar("company_code", { length: 4 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tax Configuration Insert Schema
export const insertTaxConfigurationSchema = createInsertSchema(taxConfiguration).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTaxConfiguration = z.infer<typeof insertTaxConfigurationSchema>;
export type TaxConfiguration = typeof taxConfiguration.$inferSelect;

// Tolerance Groups Insert Schema
export const insertToleranceGroupSchema = createInsertSchema(toleranceGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertToleranceGroup = z.infer<typeof insertToleranceGroupSchema>;
export type ToleranceGroup = typeof toleranceGroups.$inferSelect;

// ==========================================================
// Tax Master (neutral terminology) - Profiles and Rules
// ==========================================================

export const taxProfiles = pgTable("tax_profiles", {
  id: serial("id").primaryKey(),
  profileCode: varchar("profile_code", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }),
  country: varchar("country", { length: 3 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taxRules = pgTable("tax_rules", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => taxProfiles.id),
  ruleCode: varchar("rule_code", { length: 12 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  ratePercent: decimal("rate_percent", { precision: 5, scale: 2 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 50 }),
  taxJurisdictionId: integer("tax_jurisdiction_id").references(() => taxJurisdictions.id),
  appliesTo: varchar("applies_to", { length: 20 }),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").notNull().default(true),
  taxCategoryId: integer("tax_category_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaxProfileSchema = createInsertSchema(taxProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTaxProfile = z.infer<typeof insertTaxProfileSchema>;
export type TaxProfile = typeof taxProfiles.$inferSelect;

export const insertTaxRuleSchema = createInsertSchema(taxRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTaxRule = z.infer<typeof insertTaxRuleSchema>;
export type TaxRule = typeof taxRules.$inferSelect;

// ===================================
// MRP SYSTEM TABLES WITH ACCOUNTING INTEGRATION
// ===================================

// MRP Controllers - Master Data for MRP Controllers
export const mrpControllers = pgTable("mrp_controllers", {
  id: serial("id").primaryKey(),
  controllerCode: varchar("controller_code", { length: 3 }).notNull().unique(),
  controllerName: varchar("controller_name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// MRP Elements - Material Requirements Planning Elements
export const mrpElements = pgTable("mrp_elements", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  elementType: varchar("element_type", { length: 10 }).notNull(), // PORD, PREQ, SHMT, SSTY
  elementNumber: varchar("element_number", { length: 20 }).notNull(),
  requirementDate: date("requirement_date").notNull(),
  availableDate: date("available_date"),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 3 }).notNull(),
  mrpController: varchar("mrp_controller", { length: 3 }).references(() => mrpControllers.controllerCode),
  source: varchar("source", { length: 20 }), // Sales Order, Production Order, etc.
  sourceNumber: varchar("source_number", { length: 20 }),
  isFixed: boolean("is_fixed").default(false),
  status: varchar("status", { length: 10 }).default("NEW"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Material Master Data for MRP
export const materialMrpData = pgTable("material_mrp_data", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  mrpType: varchar("mrp_type", { length: 2 }).notNull(), // Must be explicitly provided, references mrp_types.code
  mrpController: varchar("mrp_controller", { length: 3 }).references(() => mrpControllers.controllerCode),
  planningStrategy: varchar("planning_strategy", { length: 2 }).default("10"),
  lotSizeKey: varchar("lot_size_key", { length: 2 }).default("EX"), // Lot sizing procedure
  minimumLotSize: decimal("minimum_lot_size", { precision: 15, scale: 3 }).default("1.000"),
  maximumLotSize: decimal("maximum_lot_size", { precision: 15, scale: 3 }),
  reorderPoint: decimal("reorder_point", { precision: 15, scale: 3 }).default("0.000"),
  safetyStock: decimal("safety_stock", { precision: 15, scale: 3 }).default("0.000"),
  procurementType: varchar("procurement_type", { length: 1 }).default("E"), // E=In-house, F=External
  leadTimeKey: varchar("lead_time_key", { length: 3 }),
  plannedDeliveryTime: integer("planned_delivery_time").default(0), // Days
  goodsReceiptProcessingTime: integer("gr_processing_time").default(0), // Days
  storageLocation: varchar("storage_location", { length: 4 }),
  availabilityCheck: varchar("availability_check", { length: 2 }).default("01"),
  consumptionMode: varchar("consumption_mode", { length: 1 }).default("1"), // 1=Backward, 2=Forward
  forecastModel: varchar("forecast_model", { length: 2 }),
  standardCost: decimal("standard_cost", { precision: 15, scale: 2 }),
  movingAverageCost: decimal("moving_average_cost", { precision: 15, scale: 2 }),
  valuationClass: varchar("valuation_class", { length: 4 }),
  priceControlIndicator: varchar("price_control", { length: 1 }).default("S"), // S=Standard, V=Moving average
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// MRP Run History
export const mrpRunHistory = pgTable("mrp_run_history", {
  id: serial("id").primaryKey(),
  runNumber: varchar("run_number", { length: 20 }).notNull().unique(),
  runDate: date("run_date").notNull(),
  runStartTime: timestamp("run_start_time").notNull(),
  runEndTime: timestamp("run_end_time"),
  plantId: integer("plant_id").references(() => plants.id),
  mrpArea: varchar("mrp_area", { length: 10 }),
  planningHorizon: integer("planning_horizon").default(365),
  runType: varchar("run_type", { length: 10 }).default("TOTAL"), // TOTAL, NET, REGEN
  materialsProcessed: integer("materials_processed").default(0),
  exceptionsGenerated: integer("exceptions_generated").default(0),
  planningRunResults: jsonb("planning_run_results"), // Detailed results
  executedBy: varchar("executed_by", { length: 50 }),
  status: varchar("status", { length: 10 }).default("COMPLETED"), // RUNNING, COMPLETED, ERROR
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cost Component Structure - For accounting integration
export const costComponentStructure = pgTable("cost_component_structure", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  costingVariant: varchar("costing_variant", { length: 4 }).default("PPC1"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  materialCost: decimal("material_cost", { precision: 15, scale: 2 }).default("0.00"),
  laborCost: decimal("labor_cost", { precision: 15, scale: 2 }).default("0.00"),
  machineCost: decimal("machine_cost", { precision: 15, scale: 2 }).default("0.00"),
  variableOverhead: decimal("variable_overhead", { precision: 15, scale: 2 }).default("0.00"),
  fixedOverhead: decimal("fixed_overhead", { precision: 15, scale: 2 }).default("0.00"),
  totalStandardCost: decimal("total_standard_cost", { precision: 15, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  costingLotSize: decimal("costing_lot_size", { precision: 15, scale: 3 }).default("1.000"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Manufacturing Variances - For variance analysis
export const manufacturingVariances = pgTable("manufacturing_variances", {
  id: serial("id").primaryKey(),
  varianceNumber: varchar("variance_number", { length: 20 }).notNull().unique(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  productionOrderId: integer("production_order_id"), // References production orders
  varianceType: varchar("variance_type", { length: 20 }).notNull(), // Material, Labor, Overhead
  varianceCategory: varchar("variance_category", { length: 20 }).notNull(), // Price, Usage, Efficiency, Volume
  standardCost: decimal("standard_cost", { precision: 15, scale: 2 }).notNull(),
  actualCost: decimal("actual_cost", { precision: 15, scale: 2 }).notNull(),
  varianceAmount: decimal("variance_amount", { precision: 15, scale: 2 }).notNull(),
  standardQuantity: decimal("standard_quantity", { precision: 15, scale: 3 }),
  actualQuantity: decimal("actual_quantity", { precision: 15, scale: 3 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  postingDate: date("posting_date").notNull(),
  fiscalYear: varchar("fiscal_year", { length: 4 }),
  fiscalPeriod: varchar("fiscal_period", { length: 3 }),
  reasonCode: varchar("reason_code", { length: 10 }),
  reasonText: text("reason_text"),
  glAccount: varchar("gl_account", { length: 10 }),
  responsiblePerson: varchar("responsible_person", { length: 50 }),
  isPosted: boolean("is_posted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory Valuation for MRP Integration
export const inventoryValuation = pgTable("inventory_valuation", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  storageLocation: varchar("storage_location", { length: 4 }),
  valuationType: varchar("valuation_type", { length: 10 }), // Unrestricted, Quality Inspection, Blocked
  stockQuantity: decimal("stock_quantity", { precision: 15, scale: 3 }).notNull(),
  stockValue: decimal("stock_value", { precision: 15, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  valuationClass: varchar("valuation_class", { length: 4 }),
  movementType: varchar("movement_type", { length: 3 }),
  lastMovementDate: date("last_movement_date"),
  fiscalYear: varchar("fiscal_year", { length: 4 }),
  fiscalPeriod: varchar("fiscal_period", { length: 3 }),
  glAccount: varchar("gl_account", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Account Determination for MRP/Manufacturing Postings
export const mrpAccountDetermination = pgTable("mrp_account_determination", {
  id: serial("id").primaryKey(),
  valuationClass: varchar("valuation_class", { length: 4 }).notNull(),
  accountCategory: varchar("account_category", { length: 3 }).notNull(), // BSX, PRD, GBB, etc.
  debitCreditIndicator: varchar("debit_credit", { length: 1 }).notNull(), // D or C
  glAccount: varchar("gl_account", { length: 10 }).notNull(),
  description: varchar("description", { length: 100 }),
  companyCode: varchar("company_code", { length: 4 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for MRP tables
export const mrpControllerRelations = relations(mrpControllers, ({ many }) => ({
  mrpElements: many(mrpElements),
  materialMrpData: many(materialMrpData),
}));

export const mrpElementRelations = relations(mrpElements, ({ one }) => ({
  material: one(materials, {
    fields: [mrpElements.materialId],
    references: [materials.id],
  }),
  plant: one(plants, {
    fields: [mrpElements.plantId],
    references: [plants.id],
  }),
  mrpController: one(mrpControllers, {
    fields: [mrpElements.mrpController],
    references: [mrpControllers.controllerCode],
  }),
}));

export const materialMrpDataRelations = relations(materialMrpData, ({ one }) => ({
  material: one(materials, {
    fields: [materialMrpData.materialId],
    references: [materials.id],
  }),
  plant: one(plants, {
    fields: [materialMrpData.plantId],
    references: [plants.id],
  }),
  mrpController: one(mrpControllers, {
    fields: [materialMrpData.mrpController],
    references: [mrpControllers.controllerCode],
  }),
}));

export const manufacturingVarianceRelations = relations(manufacturingVariances, ({ one }) => ({
  material: one(materials, {
    fields: [manufacturingVariances.materialId],
    references: [materials.id],
  }),
  plant: one(plants, {
    fields: [manufacturingVariances.plantId],
    references: [plants.id],
  }),
  costCenter: one(costCenters, {
    fields: [manufacturingVariances.costCenterId],
    references: [costCenters.id],
  }),
}));

export const inventoryValuationRelations = relations(inventoryValuation, ({ one }) => ({
  material: one(materials, {
    fields: [inventoryValuation.materialId],
    references: [materials.id],
  }),
  plant: one(plants, {
    fields: [inventoryValuation.plantId],
    references: [plants.id],
  }),
}));

// Insert schemas for MRP tables
export const insertMrpControllerSchema = createInsertSchema(mrpControllers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMrpController = z.infer<typeof insertMrpControllerSchema>;
export type MrpController = typeof mrpControllers.$inferSelect;

export const insertMrpElementSchema = createInsertSchema(mrpElements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMrpElement = z.infer<typeof insertMrpElementSchema>;
export type MrpElement = typeof mrpElements.$inferSelect;

export const insertMaterialMrpDataSchema = createInsertSchema(materialMrpData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMaterialMrpData = z.infer<typeof insertMaterialMrpDataSchema>;
export type MaterialMrpData = typeof materialMrpData.$inferSelect;

export const insertCostComponentStructureSchema = createInsertSchema(costComponentStructure).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCostComponentStructure = z.infer<typeof insertCostComponentStructureSchema>;
export type CostComponentStructure = typeof costComponentStructure.$inferSelect;

export const insertManufacturingVarianceSchema = createInsertSchema(manufacturingVariances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertManufacturingVariance = z.infer<typeof insertManufacturingVarianceSchema>;
export type ManufacturingVariance = typeof manufacturingVariances.$inferSelect;

export const insertInventoryValuationSchema = createInsertSchema(inventoryValuation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInventoryValuation = z.infer<typeof insertInventoryValuationSchema>;
export type InventoryValuation = typeof inventoryValuation.$inferSelect;

export const insertMrpAccountDeterminationSchema = createInsertSchema(mrpAccountDetermination).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMrpAccountDetermination = z.infer<typeof insertMrpAccountDeterminationSchema>;
export type MrpAccountDetermination = typeof mrpAccountDetermination.$inferSelect;

// Currency Denomination Master Data
export const currencyDenomination = pgTable("currency_denomination", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: text("description").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  denomination: varchar("denomination").notNull(), // Changed to varchar for decimal values
  denominationType: varchar("denomination_type", { length: 20 }).notNull(), // Coin, Note
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Exchange Rate Type Master Data
export const exchangeRateType = pgTable("exchange_rate_type", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: text("description").notNull(),
  rateType: varchar("rate_type", { length: 20 }).notNull(), // Average, Buying, Selling
  baseMultiplier: decimal("base_multiplier", { precision: 15, scale: 6 }).notNull().default("1.000000"),
  isDefaultType: boolean("is_default_type").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Currency Denomination Insert Schema
export const insertCurrencyDenominationSchema = createInsertSchema(currencyDenomination).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCurrencyDenomination = z.infer<typeof insertCurrencyDenominationSchema>;
export type CurrencyDenomination = typeof currencyDenomination.$inferSelect;

// Exchange Rate Type Insert Schema
export const insertExchangeRateTypeSchema = createInsertSchema(exchangeRateType).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExchangeRateType = z.infer<typeof insertExchangeRateTypeSchema>;
export type ExchangeRateType = typeof exchangeRateType.$inferSelect;

// ===== 21 NEW MASTER DATA TABLES =====

// Account Groups - Customer/Vendor account classification
export const accountGroups = pgTable("account_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  accountType: varchar("account_type", { length: 20 }).notNull(), // CUSTOMER, VENDOR, GL
  numberRangeFrom: varchar("number_range_from", { length: 20 }),
  numberRangeTo: varchar("number_range_to", { length: 20 }),
  numberRangeId: integer("number_range_id"),
  // Standard fields
  fieldStatusGroup: varchar("field_status_group", { length: 4 }),
  oneTimeAccountIndicator: boolean("one_time_account_indicator").default(false),
  authorizationGroup: varchar("authorization_group", { length: 4 }),
  sortKey: varchar("sort_key", { length: 2 }),
  blockIndicator: boolean("block_indicator").default(false),
  reconciliationAccountIndicator: boolean("reconciliation_account_indicator").default(false),
  accountNumberFormat: varchar("account_number_format", { length: 20 }),
  accountNumberLength: integer("account_number_length"),
  screenLayout: varchar("screen_layout", { length: 4 }),
  paymentTerms: varchar("payment_terms", { length: 4 }),
  dunningArea: varchar("dunning_area", { length: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Reconciliation Accounts - moved to shared/reconciliation-accounts-schema.ts

// Valuation Classes - Material valuation categories (SAP Standard)
export const valuationClasses = pgTable("valuation_classes", {
  id: serial("id").primaryKey(),
  classCode: varchar("class_code", { length: 4 }).notNull().unique(), // SAP: 4-character code (e.g., "3000", "7900")
  description: text("description"), // Description
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Junction table for Valuation Class - Material Type relationship (Many-to-Many)
export const valuationClassMaterialTypes = pgTable("valuation_class_material_types", {
  id: serial("id").primaryKey(),
  valuationClassId: integer("valuation_class_id").notNull().references(() => valuationClasses.id, { onDelete: "cascade" }),
  materialTypeId: integer("material_type_id").notNull().references(() => materialTypes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Material Types already exists - using existing table

// Payment Terms - Invoice payment conditions
export const paymentTerms = pgTable("payment_terms", {
  id: serial("id").primaryKey(),
  code: varchar("payment_term_key", { length: 10 }).notNull().unique(),
  name: varchar("description", { length: 100 }).notNull(),
  description: text("description"),
  paymentDays: integer("payment_due_days").notNull(),
  discountDays1: integer("cash_discount_days").default(0),
  discountPercent1: decimal("cash_discount_percent", { precision: 5, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  tenantId: varchar("_tenantId", { length: 3 }).default("001"),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  deletedAt: timestamp("_deletedAt", { withTimezone: true }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Incoterms - International trade terms
export const incoterms = pgTable("incoterms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  riskTransferPoint: varchar("risk_transfer_point", { length: 50 }),
  costResponsibility: varchar("cost_responsibility", { length: 50 }),
  insuranceRequired: boolean("insurance_required").notNull().default(false),
  transportMode: varchar("transport_mode", { length: 20 }), // SEA, AIR, LAND, MULTI
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Price Lists - Customer-specific pricing
export const priceLists = pgTable("price_lists", {
  id: serial("id").primaryKey(),
  priceListCode: varchar("price_list_code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  priceListType: varchar("price_list_type", { length: 20 }).notNull().default("standard"),
  isActive: boolean("is_active").notNull().default(true),
  tenantId: varchar("_tenantId", { length: 3 }).default("001"),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  deletedAt: timestamp("_deletedAt", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discount Groups - Customer discount categories
export const discountGroups = pgTable("discount_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull(),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // PERCENTAGE, FIXED_AMOUNT
  minimumOrderValue: decimal("minimum_order_value", { precision: 15, scale: 2 }).default("0.00"),
  maximumDiscount: decimal("maximum_discount", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Credit Limit Groups - Customer credit classifications
export const creditLimitGroups = pgTable("credit_limit_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  riskCategory: varchar("risk_category", { length: 20 }).notNull(), // LOW, MEDIUM, HIGH
  paymentTermsCode: varchar("payment_terms_code", { length: 10 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Shipping Conditions - Delivery method definitions
export const shippingConditions = pgTable("shipping_conditions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  transportType: varchar("transport_type", { length: 20 }).notNull(), // STANDARD, EXPRESS, OVERNIGHT
  deliveryTime: integer("delivery_time").notNull(), // in days
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  insuranceIncluded: boolean("insurance_included").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transportation Zones - Geographic shipping areas
export const transportationZones = pgTable("transportation_zones", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  region: varchar("region", { length: 50 }),
  country: varchar("country", { length: 3 }),
  zoneType: varchar("zone_type", { length: 20 }),
  transitTime: integer("transit_time"),
  shippingMultiplier: decimal("shipping_multiplier", { precision: 5, scale: 2 }).default("1.00"),
  // Standard fields
  postalCodeFrom: varchar("postal_code_from", { length: 20 }),
  postalCodeTo: varchar("postal_code_to", { length: 20 }),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  baseFreightRate: decimal("base_freight_rate", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  transportationType: varchar("transportation_type", { length: 20 }),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
  shippingPointId: integer("shipping_point_id"),
  blockIndicator: boolean("block_indicator").default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Route Schedules - Delivery timing configurations
export const routeSchedules = pgTable("route_schedules", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  routeType: varchar("route_type", { length: 20 }).notNull(), // DAILY, WEEKLY, MONTHLY
  departureTime: varchar("departure_time", { length: 10 }), // HH:MM format
  arrivalTime: varchar("arrival_time", { length: 10 }), // HH:MM format
  frequency: varchar("frequency", { length: 20 }), // DAILY, MON-FRI, WEEKLY
  transportationZoneId: integer("transportation_zone_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Warehouse Types - Storage classification
export const warehouseTypes = pgTable("warehouse_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  plantId: integer("plant_id").notNull().references(() => plants.id),
  description: text("description"),
  storageType: varchar("storage_type", { length: 20 }).notNull(), // AMBIENT, REFRIGERATED, FROZEN, HAZMAT
  temperatureRange: varchar("temperature_range", { length: 50 }),
  specialRequirements: text("special_requirements"),
  handlingEquipment: varchar("handling_equipment", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Movement Types - Inventory transaction codes
export const movementTypes = pgTable("movement_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  movementCategory: varchar("movement_category", { length: 20 }).notNull(), // RECEIPT, ISSUE, TRANSFER
  inventoryEffect: varchar("inventory_effect", { length: 10 }).notNull(), // INCREASE, DECREASE, NEUTRAL
  glAccountDebit: varchar("gl_account_debit", { length: 20 }),
  glAccountCredit: varchar("gl_account_credit", { length: 20 }),
  transactionKey: varchar("transaction_key", { length: 3 }), // Transaction Key (e.g. BSX, GBB)
  isActive: boolean("is_active").notNull().default(true),
  tenantId: varchar("_tenantId", { length: 3 }).default("001"),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  deletedAt: timestamp("_deletedAt", { withTimezone: true }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Movement Classes - Technical inventory logic (defined by User)
export const movementClasses = pgTable("movement_classes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // e.g. 101, 201
  name: varchar("name", { length: 100 }).notNull(), // e.g. GR for PO
  description: text("description"),
  affectsGl: boolean("affects_gl").notNull().default(true),
  allowsNegative: boolean("allows_negative").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Reason Codes - Transaction justification codes
export const reasonCodes = pgTable("reason_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 4 }).notNull().unique(), // 2-4 character code as per requirements
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  reasonCategoryKey: varchar("reason_category_key", { length: 1 }).notNull(), // A=Order Block, B=Item Rejection, C=Discount, D=General
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Quality Grades - Material quality classifications
export const qualityGrades = pgTable("quality_grades", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  gradeLevel: integer("grade_level").notNull(), // 1=highest, 5=lowest
  qualityStandard: varchar("quality_standard", { length: 50 }), // ISO, ASTM, etc.
  inspectionRequired: boolean("inspection_required").notNull().default(true),
  certificationRequired: boolean("certification_required").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Batch Classes - Batch management categories
export const batchClasses = pgTable("batch_classes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  batchNumberFormat: varchar("batch_number_format", { length: 50 }), // Auto-generation pattern
  shelfLifeDays: integer("shelf_life_days"),
  expirationRequired: boolean("expiration_required").notNull().default(false),
  lotTrackingRequired: boolean("lot_tracking_required").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Serial Number Profiles - Asset tracking configurations
export const serialNumberProfiles = pgTable("serial_number_profiles", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  serialNumberFormat: varchar("serial_number_format", { length: 50 }), // Auto-generation pattern
  serialNumberLength: integer("serial_number_length").default(10),
  trackingLevel: varchar("tracking_level", { length: 20 }).notNull(), // UNIT, BATCH, LOT
  warrantyTracking: boolean("warranty_tracking").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Document Types - Business document classifications
// Document Categories - Master data for document category classification
export const documentCategories = pgTable("document_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documentTypes = pgTable("document_types", {
  id: serial("id").primaryKey(),
  documentTypeCode: varchar("document_type_code", { length: 2 }).notNull(),
  description: varchar("description", { length: 100 }).notNull(),
  documentCategory: varchar("document_category", { length: 20 }).notNull(),
  numberRange: varchar("number_range", { length: 2 }),
  reversalAllowed: boolean("reversal_allowed").default(true),
  accountTypesAllowed: varchar("account_types_allowed", { length: 20 }).default("all"),
  entryView: varchar("entry_view", { length: 20 }).default("standard"),
  referenceRequired: boolean("reference_required").default(false),
  authorizationGroup: varchar("authorization_group", { length: 10 }),
  companyCodeId: integer("company_code_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Number Ranges - System numbering configurations
export const numberRanges = pgTable("number_ranges", {
  id: serial("id").primaryKey(),
  numberRangeCode: varchar("number_range_code", { length: 20 }).notNull().unique(),
  description: text("description"),
  numberRangeObject: varchar("number_range_object", { length: 50 }),
  fiscalYear: integer("fiscal_year"),
  rangeFrom: varchar("range_from", { length: 20 }).notNull(),
  rangeTo: varchar("range_to", { length: 20 }).notNull(),
  currentNumber: varchar("current_number", { length: 20 }).notNull(),
  bufferSize: integer("buffer_size"),
  warningPercentage: integer("warning_percentage"),
  companyCodeId: integer("company_code_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 50 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by", { length: 50 }),
});

// Insert Schemas for all 21 new tables
export const insertAccountGroupsSchema = createInsertSchema(accountGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAccountGroups = z.infer<typeof insertAccountGroupsSchema>;
export type AccountGroups = typeof accountGroups.$inferSelect;

// Reconciliation Accounts schema and types moved to shared/reconciliation-accounts-schema.ts

export const insertValuationClassesSchema = createInsertSchema(valuationClasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertValuationClasses = z.infer<typeof insertValuationClassesSchema>;
export type ValuationClasses = typeof valuationClasses.$inferSelect;

// MaterialTypes insert schema already exists above

export const insertPaymentTermsSchema = createInsertSchema(paymentTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentTerms = z.infer<typeof insertPaymentTermsSchema>;
export type PaymentTerms = typeof paymentTerms.$inferSelect;

export const insertIncotermsSchema = createInsertSchema(incoterms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIncoterms = z.infer<typeof insertIncotermsSchema>;
export type Incoterms = typeof incoterms.$inferSelect;

export const insertPriceListsSchema = createInsertSchema(priceLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPriceLists = z.infer<typeof insertPriceListsSchema>;
export type PriceLists = typeof priceLists.$inferSelect;

export const insertDiscountGroupsSchema = createInsertSchema(discountGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDiscountGroups = z.infer<typeof insertDiscountGroupsSchema>;
export type DiscountGroups = typeof discountGroups.$inferSelect;

export const insertCreditLimitGroupsSchema = createInsertSchema(creditLimitGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCreditLimitGroups = z.infer<typeof insertCreditLimitGroupsSchema>;
export type CreditLimitGroups = typeof creditLimitGroups.$inferSelect;

export const insertShippingConditionsSchema = createInsertSchema(shippingConditions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertShippingConditions = z.infer<typeof insertShippingConditionsSchema>;
export type ShippingConditions = typeof shippingConditions.$inferSelect;

export const insertTransportationZonesSchema = createInsertSchema(transportationZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTransportationZones = z.infer<typeof insertTransportationZonesSchema>;
export type TransportationZones = typeof transportationZones.$inferSelect;

export const insertRouteSchedulesSchema = createInsertSchema(routeSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRouteSchedules = z.infer<typeof insertRouteSchedulesSchema>;
export type RouteSchedules = typeof routeSchedules.$inferSelect;

export const insertWarehouseTypesSchema = createInsertSchema(warehouseTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  plantId: z.number().int().positive("Plant is required"),
});
export type InsertWarehouseTypes = z.infer<typeof insertWarehouseTypesSchema>;
export type WarehouseTypes = typeof warehouseTypes.$inferSelect;

export const insertMovementTypesSchema = createInsertSchema(movementTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMovementTypes = z.infer<typeof insertMovementTypesSchema>;
export type MovementTypes = typeof movementTypes.$inferSelect;

export const insertReasonCodesSchema = createInsertSchema(reasonCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReasonCodes = z.infer<typeof insertReasonCodesSchema>;
export type ReasonCodes = typeof reasonCodes.$inferSelect;

export const insertQualityGradesSchema = createInsertSchema(qualityGrades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertQualityGrades = z.infer<typeof insertQualityGradesSchema>;
export type QualityGrades = typeof qualityGrades.$inferSelect;

export const insertBatchClassesSchema = createInsertSchema(batchClasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBatchClasses = z.infer<typeof insertBatchClassesSchema>;
export type BatchClasses = typeof batchClasses.$inferSelect;

export const insertSerialNumberProfilesSchema = createInsertSchema(serialNumberProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSerialNumberProfiles = z.infer<typeof insertSerialNumberProfilesSchema>;
export type SerialNumberProfiles = typeof serialNumberProfiles.$inferSelect;

export const insertDocumentCategoriesSchema = createInsertSchema(documentCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentCategories = z.infer<typeof insertDocumentCategoriesSchema>;
export type DocumentCategories = typeof documentCategories.$inferSelect;

export const insertDocumentTypesSchema = createInsertSchema(documentTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentTypes = z.infer<typeof insertDocumentTypesSchema>;
export type DocumentTypes = typeof documentTypes.$inferSelect;

export const insertNumberRangesSchema = createInsertSchema(numberRanges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNumberRanges = z.infer<typeof insertNumberRangesSchema>;
export type NumberRanges = typeof numberRanges.$inferSelect;

// ===================================================================
// ORDER-TO-CASH ENHANCED INTEGRATION SCHEMAS
// ===================================================================

// Sales Order Items with Pricing Integration
export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull(),
  lineItemNumber: integer("line_item_number").notNull(),
  materialId: integer("material_id").notNull(),
  materialCode: varchar("material_code", { length: 50 }).notNull(),
  materialDescription: text("material_description"),
  orderedQuantity: decimal("ordered_quantity", { precision: 15, scale: 3 }).notNull(),
  deliveredQuantity: decimal("delivered_quantity", { precision: 15, scale: 3 }).default("0.000"),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0.00"),
  grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).notNull(),
  requestedDeliveryDate: date("requested_delivery_date"),
  confirmedDeliveryDate: date("confirmed_delivery_date"),
  plant: varchar("plant", { length: 10 }).notNull(),
  storageLocation: varchar("storage_location", { length: 10 }),
  itemStatus: varchar("item_status", { length: 20 }).notNull().default("open"),
  pricingProcedure: varchar("pricing_procedure", { length: 10 }).default("MALLSTD01"),
  conditionRecords: jsonb("condition_records"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Order Conditions (Pricing)
export const orderConditions = pgTable("order_conditions", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id"),
  conditionType: varchar("condition_type", { length: 10 }).notNull(),
  conditionValue: decimal("condition_value", { precision: 15, scale: 4 }).notNull(),
  conditionUnit: varchar("condition_unit", { length: 10 }),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  calculationType: varchar("calculation_type", { length: 1 }).notNull(),
  conditionAmount: decimal("condition_amount", { precision: 15, scale: 2 }).notNull(),
  accessSequence: varchar("access_sequence", { length: 10 }),
  conditionRecord: varchar("condition_record", { length: 20 }),
  isStatistical: boolean("is_statistical").default(false),
  isManual: boolean("is_manual").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transfer Orders (Delivery Processing)
export const transferOrders = pgTable("transfer_orders", {
  id: serial("id").primaryKey(),
  transferNumber: varchar("transfer_number", { length: 20 }).notNull().unique(),
  salesOrderId: integer("sales_order_id"),
  deliveryId: integer("delivery_id"),
  fromPlant: varchar("from_plant", { length: 4 }).notNull(),
  toPlant: varchar("to_plant", { length: 4 }).notNull(),
  fromStorageLocation: varchar("from_storage_location", { length: 4 }).notNull(),
  toStorageLocation: varchar("to_storage_location", { length: 4 }).notNull(),
  transferDate: date("transfer_date").notNull(),
  status: varchar("status", { length: 20 }).default("OPEN"),
  movementType: varchar("movement_type", { length: 4 }).default("101"),
  referenceDocument: varchar("reference_document", { length: 20 }),
  referenceDocumentType: varchar("reference_document_type", { length: 10 }),
  createdBy: integer("created_by").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transfer Order Items
export const transferOrderItems = pgTable("transfer_order_items", {
  id: serial("id").primaryKey(),
  transferOrderId: integer("transfer_order_id").notNull(),
  lineItem: integer("line_item").notNull(),
  materialId: integer("material_id").notNull(),
  materialCode: varchar("material_code", { length: 20 }),
  materialDescription: text("material_description"),
  requestedQuantity: decimal("requested_quantity", { precision: 13, scale: 3 }).notNull(),
  confirmedQuantity: decimal("confirmed_quantity", { precision: 13, scale: 3 }).default("0"),
  unit: varchar("unit", { length: 3 }).default("EA"),
  fromStorageLocation: varchar("from_storage_location", { length: 4 }).notNull(),
  toStorageLocation: varchar("to_storage_location", { length: 4 }).notNull(),
  batch: varchar("batch", { length: 20 }),
  serialNumber: varchar("serial_number", { length: 20 }),
  status: varchar("status", { length: 20 }).default("OPEN"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delivery Documents
export const deliveryDocuments = pgTable("delivery_documents", {
  id: serial("id").primaryKey(),
  deliveryNumber: varchar("delivery_number", { length: 20 }).notNull().unique(),
  salesOrderId: integer("sales_order_id").notNull(),
  transferOrderId: integer("transfer_order_id"),
  customerId: integer("customer_id").notNull(),
  deliveryDate: date("delivery_date").notNull(),
  actualDeliveryDate: date("actual_delivery_date"),
  shipToAddress: text("ship_to_address").notNull(),
  plant: varchar("plant", { length: 10 }).notNull(),
  shippingPoint: varchar("shipping_point", { length: 10 }),
  route: varchar("route", { length: 10 }),
  carrierCode: varchar("carrier_code", { length: 10 }),
  trackingNumber: varchar("tracking_number", { length: 50 }),
  deliveryStatus: varchar("delivery_status", { length: 20 }).notNull().default("planned"),
  goodsIssueStatus: varchar("goods_issue_status", { length: 20 }).default("not_posted"),
  goodsIssueDate: date("goods_issue_date"),
  totalWeight: decimal("total_weight", { precision: 15, scale: 3 }),
  weightUnit: varchar("weight_unit", { length: 10 }),
  totalVolume: decimal("total_volume", { precision: 15, scale: 3 }),
  volumeUnit: varchar("volume_unit", { length: 10 }),
  deliveryNote: text("delivery_note"),
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Items
export const deliveryItems = pgTable("delivery_items", {
  id: serial("id").primaryKey(),
  deliveryDocumentId: integer("delivery_document_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id").notNull(),
  transferOrderItemId: integer("transfer_order_item_id"),
  itemNumber: integer("item_number").notNull(),
  materialId: integer("material_id").notNull(),
  materialCode: varchar("material_code", { length: 50 }).notNull(),
  deliveryQuantity: decimal("delivery_quantity", { precision: 15, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }).notNull(),
  batchNumber: varchar("batch_number", { length: 20 }),
  serialNumber: varchar("serial_number", { length: 30 }),
  storageLocation: varchar("storage_location", { length: 10 }),
  goodsIssueQuantity: decimal("goods_issue_quantity", { precision: 15, scale: 3 }).default("0.000"),
  itemStatus: varchar("item_status", { length: 20 }).notNull().default("planned"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Billing Documents (Invoices)
export const billingDocuments = pgTable("billing_documents", {
  id: serial("id").primaryKey(),
  billingNumber: varchar("billing_number", { length: 20 }).notNull().unique(),
  billingType: varchar("billing_type", { length: 10 }).notNull().default("F2"),
  salesOrderId: integer("sales_order_id").notNull(),
  deliveryDocumentId: integer("delivery_document_id"),
  customerId: integer("customer_id").notNull(),
  billingDate: date("billing_date").notNull(),
  dueDate: date("due_date").notNull(),
  paymentTerms: varchar("payment_terms", { length: 10 }),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull(),
  grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0.00"),
  outstandingAmount: decimal("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  billingStatus: varchar("billing_status", { length: 20 }).notNull().default("open"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("unpaid"),
  glPostingStatus: varchar("gl_posting_status", { length: 20 }).default("not_posted"),
  glDocumentNumber: varchar("gl_document_number", { length: 20 }),
  billToAddress: text("bill_to_address").notNull(),
  reference: varchar("reference", { length: 50 }),
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Billing Items
export const billingItems = pgTable("billing_items", {
  id: serial("id").primaryKey(),
  billingDocumentId: integer("billing_document_id").notNull(),
  salesOrderItemId: integer("sales_order_item_id").notNull(),
  deliveryItemId: integer("delivery_item_id"),
  itemNumber: integer("item_number").notNull(),
  materialId: integer("material_id").notNull(),
  materialCode: varchar("material_code", { length: 50 }).notNull(),
  materialDescription: text("material_description"),
  billedQuantity: decimal("billed_quantity", { precision: 15, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull(),
  grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).notNull(),
  revenueGlAccount: varchar("revenue_gl_account", { length: 10 }),
  costCenter: varchar("cost_center", { length: 10 }),
  profitCenter: varchar("profit_center", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Document Flow Tracking
export const documentFlow = pgTable("document_flow", {
  id: serial("id").primaryKey(),
  sourceDocumentType: varchar("source_document_type", { length: 20 }).notNull(),
  sourceDocumentId: integer("source_document_id").notNull(),
  sourceDocumentNumber: varchar("source_document_number", { length: 20 }).notNull(),
  targetDocumentType: varchar("target_document_type", { length: 20 }).notNull(),
  targetDocumentId: integer("target_document_id").notNull(),
  targetDocumentNumber: varchar("target_document_number", { length: 20 }).notNull(),
  flowType: varchar("flow_type", { length: 20 }).notNull(),
  createdDate: date("created_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===================================================================
// ENHANCED OTC RELATIONS
// ===================================================================

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one, many }) => ({
  orderConditions: many(orderConditions),
  transferOrderItems: many(transferOrderItems),
  deliveryItems: many(deliveryItems),
  billingItems: many(billingItems),
}));

export const orderConditionsRelations = relations(orderConditions, ({ one }) => ({
  salesOrderItem: one(salesOrderItems, {
    fields: [orderConditions.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
}));

export const transferOrdersRelations = relations(transferOrders, ({ many }) => ({
  items: many(transferOrderItems),
}));

export const transferOrderItemsRelations = relations(transferOrderItems, ({ one }) => ({
  transferOrder: one(transferOrders, {
    fields: [transferOrderItems.transferOrderId],
    references: [transferOrders.id],
  }),
}));

export const deliveryDocumentsRelations = relations(deliveryDocuments, ({ one, many }) => ({
  items: many(deliveryItems),
  billingDocuments: many(billingDocuments),
}));

export const deliveryItemsRelations = relations(deliveryItems, ({ one }) => ({
  deliveryDocument: one(deliveryDocuments, {
    fields: [deliveryItems.deliveryDocumentId],
    references: [deliveryDocuments.id],
  }),
  salesOrderItem: one(salesOrderItems, {
    fields: [deliveryItems.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
}));

export const billingDocumentsRelations = relations(billingDocuments, ({ one, many }) => ({
  deliveryDocument: one(deliveryDocuments, {
    fields: [billingDocuments.deliveryDocumentId],
    references: [deliveryDocuments.id],
  }),
  items: many(billingItems),
}));

export const billingItemsRelations = relations(billingItems, ({ one }) => ({
  billingDocument: one(billingDocuments, {
    fields: [billingItems.billingDocumentId],
    references: [billingDocuments.id],
  }),
  salesOrderItem: one(salesOrderItems, {
    fields: [billingItems.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
}));

// ===================================================================
// ENHANCED OTC INSERT SCHEMAS
// ===================================================================

export const insertSalesOrderItemsSchema = createInsertSchema(salesOrderItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSalesOrderItems = z.infer<typeof insertSalesOrderItemsSchema>;
export type SalesOrderItems = typeof salesOrderItems.$inferSelect;

export const insertOrderConditionsSchema = createInsertSchema(orderConditions).omit({
  id: true,
  createdAt: true,
});
export type InsertOrderConditions = z.infer<typeof insertOrderConditionsSchema>;
export type OrderConditions = typeof orderConditions.$inferSelect;

export const insertTransferOrdersSchema = createInsertSchema(transferOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTransferOrders = z.infer<typeof insertTransferOrdersSchema>;
export type TransferOrders = typeof transferOrders.$inferSelect;

export const insertTransferOrderItemsSchema = createInsertSchema(transferOrderItems).omit({
  id: true,
  createdAt: true,
});
export type InsertTransferOrderItems = z.infer<typeof insertTransferOrderItemsSchema>;
export type TransferOrderItems = typeof transferOrderItems.$inferSelect;

export const insertDeliveryDocumentsSchema = createInsertSchema(deliveryDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeliveryDocuments = z.infer<typeof insertDeliveryDocumentsSchema>;
export type DeliveryDocuments = typeof deliveryDocuments.$inferSelect;

export const insertDeliveryItemsSchema = createInsertSchema(deliveryItems).omit({
  id: true,
  createdAt: true,
});
export type InsertDeliveryItems = z.infer<typeof insertDeliveryItemsSchema>;
export type DeliveryItems = typeof deliveryItems.$inferSelect;

export const insertBillingDocumentsSchema = createInsertSchema(billingDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBillingDocuments = z.infer<typeof insertBillingDocumentsSchema>;
export type BillingDocuments = typeof billingDocuments.$inferSelect;

export const insertBillingItemsSchema = createInsertSchema(billingItems).omit({
  id: true,
  createdAt: true,
});
export type InsertBillingItems = z.infer<typeof insertBillingItemsSchema>;
export type BillingItems = typeof billingItems.$inferSelect;

export const insertDocumentFlowSchema = createInsertSchema(documentFlow).omit({
  id: true,
  createdAt: true,
});
export type InsertDocumentFlow = z.infer<typeof insertDocumentFlowSchema>;
export type DocumentFlow = typeof documentFlow.$inferSelect;

// ===================================================================
// PHASE 3: ADVANCED CREDIT MANAGEMENT TABLES
// ===================================================================

// Credit Risk Assessments
export const creditRiskAssessments = pgTable("credit_risk_assessments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  assessmentDate: date("assessment_date").notNull(),
  creditScore: integer("credit_score").notNull(),
  riskCategory: varchar("risk_category", { length: 20 }).notNull(), // high, medium, low
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).notNull(),
  availableCredit: decimal("available_credit", { precision: 15, scale: 2 }).notNull(),
  utilizationPercentage: decimal("utilization_percentage", { precision: 5, scale: 2 }).notNull(),
  paymentHistory: varchar("payment_history", { length: 20 }).notNull(), // excellent, good, fair, poor
  daysPayoutstanding: integer("days_pay_outstanding").default(0),
  maxOverdueAmount: decimal("max_overdue_amount", { precision: 15, scale: 2 }).default("0.00"),
  assessedBy: varchar("assessed_by", { length: 50 }),
  nextReviewDate: date("next_review_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Automated Credit Decisions
export const creditDecisions = pgTable("credit_decisions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  salesOrderId: integer("sales_order_id"),
  orderAmount: decimal("order_amount", { precision: 15, scale: 2 }).notNull(),
  decisionDate: timestamp("decision_date").defaultNow().notNull(),
  decisionType: varchar("decision_type", { length: 20 }).notNull(), // approved, hold, rejected
  decisionReason: text("decision_reason"),
  riskScore: integer("risk_score"),
  creditUtilizationAfter: decimal("credit_utilization_after", { precision: 5, scale: 2 }),
  approvalLevel: varchar("approval_level", { length: 20 }).default("automatic"), // automatic, manual_l1, manual_l2
  approvedBy: varchar("approved_by", { length: 50 }),
  rejectionCode: varchar("rejection_code", { length: 10 }),
  holdReason: varchar("hold_reason", { length: 100 }),
  expiryDate: date("expiry_date"),
  isOverride: boolean("is_override").default(false),
  overrideReason: text("override_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dunning Management
export const dunningProcedures = pgTable("dunning_procedures", {
  id: serial("id").primaryKey(),
  procedureCode: varchar("procedure_code", { length: 10 }).notNull().unique(),
  procedureName: varchar("procedure_name", { length: 100 }).notNull(),
  level1Days: integer("level1_days").notNull().default(7),
  level2Days: integer("level2_days").notNull().default(14),
  level3Days: integer("level3_days").notNull().default(21),
  finalNoticedays: integer("final_notice_days").notNull().default(30),
  blockingDays: integer("blocking_days").notNull().default(45),
  legalActionDays: integer("legal_action_days").notNull().default(60),
  minimumAmount: decimal("minimum_amount", { precision: 15, scale: 2 }).default("0.00"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).default("0.00"),
  dunningFee: decimal("dunning_fee", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dunning History
export const dunningHistory = pgTable("dunning_history", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  dunningProcedureId: integer("dunning_procedure_id").notNull(),
  invoiceId: integer("invoice_id"),
  dunningLevel: integer("dunning_level").notNull(), // 1, 2, 3, final
  dunningDate: date("dunning_date").notNull(),
  outstandingAmount: decimal("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  dunningAmount: decimal("dunning_amount", { precision: 15, scale: 2 }).notNull(),
  interestAmount: decimal("interest_amount", { precision: 15, scale: 2 }).default("0.00"),
  dunningStatus: varchar("dunning_status", { length: 20 }).notNull().default("sent"), // sent, acknowledged, paid, escalated
  dunningText: text("dunning_text"),
  letterSent: boolean("letter_sent").default(false),
  emailSent: boolean("email_sent").default(false),
  responseDate: date("response_date"),
  paymentReceived: boolean("payment_received").default(false),
  escalatedToLegal: boolean("escalated_to_legal").default(false),
  createdBy: varchar("created_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cash Application
export const cashApplications = pgTable("cash_applications", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  customerId: integer("customer_id").notNull(),
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }).notNull(),
  appliedAmount: decimal("applied_amount", { precision: 15, scale: 2 }).default("0.00"),
  unappliedAmount: decimal("unapplied_amount", { precision: 15, scale: 2 }).notNull(),
  applicationDate: date("application_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  referenceNumber: varchar("reference_number", { length: 50 }),
  bankAccountId: integer("bank_account_id"),
  autoMatchStatus: varchar("auto_match_status", { length: 20 }).default("pending"), // matched, partial, manual
  matchingAccuracy: decimal("matching_accuracy", { precision: 5, scale: 2 }),
  processingStatus: varchar("processing_status", { length: 20 }).default("open"), // open, partial, closed
  processingDays: integer("processing_days").default(0),
  processedBy: varchar("processed_by", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cash Application Line Items
export const cashApplicationItems = pgTable("cash_application_items", {
  id: serial("id").primaryKey(),
  cashApplicationId: integer("cash_application_id").notNull(),
  invoiceId: integer("invoice_id").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 20 }).notNull(),
  appliedAmount: decimal("applied_amount", { precision: 15, scale: 2 }).notNull(),
  discountTaken: decimal("discount_taken", { precision: 15, scale: 2 }).default("0.00"),
  writeOffAmount: decimal("write_off_amount", { precision: 15, scale: 2 }).default("0.00"),
  applicationDate: date("application_date").notNull(),
  matchingMethod: varchar("matching_method", { length: 20 }).notNull(), // auto, manual, partial
  varianceAmount: decimal("variance_amount", { precision: 15, scale: 2 }).default("0.00"),
  varianceReason: varchar("variance_reason", { length: 100 }),
  glAccountDebit: varchar("gl_account_debit", { length: 10 }),
  glAccountCredit: varchar("gl_account_credit", { length: 10 }),
  isReversed: boolean("is_reversed").default(false),
  reversalDate: date("reversal_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Advanced GL Processing for Phase 3
export const advancedGlPostings = pgTable("advanced_gl_postings", {
  id: serial("id").primaryKey(),
  documentType: varchar("document_type", { length: 20 }).notNull(),
  documentNumber: varchar("document_number", { length: 20 }).notNull(),
  sourceDocumentId: integer("source_document_id").notNull(),
  postingDate: date("posting_date").notNull(),
  companyCode: varchar("company_code", { length: 10 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.000000"),
  totalDebitAmount: decimal("total_debit_amount", { precision: 15, scale: 2 }).notNull(),
  totalCreditAmount: decimal("total_credit_amount", { precision: 15, scale: 2 }).notNull(),
  postingStatus: varchar("posting_status", { length: 20 }).notNull().default("posted"),
  reversalIndicator: boolean("reversal_indicator").default(false),
  reversalDate: date("reversal_date"),
  reversalDocumentId: integer("reversal_document_id"),
  userPosted: varchar("user_posted", { length: 50 }),
  postingText: text("posting_text"),
  costCenter: varchar("cost_center", { length: 10 }),
  profitCenter: varchar("profit_center", { length: 10 }),
  businessArea: varchar("business_area", { length: 10 }),
  segment: varchar("segment", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Advanced GL Line Items
export const advancedGlLineItems = pgTable("advanced_gl_line_items", {
  id: serial("id").primaryKey(),
  glPostingId: integer("gl_posting_id").notNull(),
  lineItemNumber: integer("line_item_number").notNull(),
  glAccount: varchar("gl_account", { length: 10 }).notNull(),
  debitCreditIndicator: varchar("debit_credit_indicator", { length: 1 }).notNull(), // D or C
  amountInDocumentCurrency: decimal("amount_in_document_currency", { precision: 15, scale: 2 }).notNull(),
  amountInCompanyCurrency: decimal("amount_in_company_currency", { precision: 15, scale: 2 }).notNull(),
  amountInGroupCurrency: decimal("amount_in_group_currency", { precision: 15, scale: 2 }),
  taxCode: varchar("tax_code", { length: 10 }),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0.00"),
  baselineDate: date("baseline_date"),
  paymentTerms: varchar("payment_terms", { length: 10 }),
  dueDate: date("due_date"),
  discountDate1: date("discount_date1"),
  discountDate2: date("discount_date2"),
  discountPercent1: decimal("discount_percent1", { precision: 5, scale: 2 }),
  discountPercent2: decimal("discount_percent2", { precision: 5, scale: 2 }),
  itemText: text("item_text"),
  assignmentField: varchar("assignment_field", { length: 50 }),
  referenceKey1: varchar("reference_key1", { length: 50 }),
  referenceKey2: varchar("reference_key2", { length: 50 }),
  referenceKey3: varchar("reference_key3", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===================================================================
// SD CUSTOMIZATION TABLES
// ===================================================================

export const sdClientConfigurations = pgTable("sd_client_configurations", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientName: text("client_name").notNull(),
  configurationStatus: text("configuration_status").notNull().default("pending"),
  createdDate: timestamp("created_date").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
  customizationLevel: text("customization_level").default("standard"),
  businessType: text("business_type"),
  region: text("region"),
  salesOrganization: text("sales_organization"),
  distributionChannel: text("distribution_channel"),
  division: text("division"),
  isActive: boolean("is_active").default(true),
});

export const sdCustomizationLog = pgTable("sd_customization_log", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
  actionType: text("action_type").notNull(),
  actionDescription: text("action_description"),
  performedBy: text("performed_by").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  status: text("status").default("completed"),
  moduleAffected: text("module_affected"),
});

export const sdConfigurationTemplates = pgTable("sd_configuration_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  templateType: text("template_type").notNull(),
  businessScenario: text("business_scenario"),
  configurationData: jsonb("configuration_data"),
  isStandard: boolean("is_standard").default(false),
  createdBy: text("created_by"),
  createdDate: timestamp("created_date").defaultNow(),
  version: text("version").default("1.0"),
  description: text("description"),
});

// Schema exports for SD Customization
export const insertSdClientConfigurationsSchema = createInsertSchema(sdClientConfigurations).omit({
  id: true,
  createdDate: true,
  lastModified: true,
});
export type InsertSdClientConfigurations = z.infer<typeof insertSdClientConfigurationsSchema>;
export type SdClientConfigurations = typeof sdClientConfigurations.$inferSelect;

export const insertSdCustomizationLogSchema = createInsertSchema(sdCustomizationLog).omit({
  id: true,
  timestamp: true,
});
export type InsertSdCustomizationLog = z.infer<typeof insertSdCustomizationLogSchema>;
export type SdCustomizationLog = typeof sdCustomizationLog.$inferSelect;

export const insertSdConfigurationTemplatesSchema = createInsertSchema(sdConfigurationTemplates).omit({
  id: true,
  createdDate: true,
});
export type InsertSdConfigurationTemplates = z.infer<typeof insertSdConfigurationTemplatesSchema>;
export type SdConfigurationTemplates = typeof sdConfigurationTemplates.$inferSelect;

// ===================================================================
// PHASE 3: CREDIT MANAGEMENT RELATIONS
// ===================================================================

export const creditRiskAssessmentsRelations = relations(creditRiskAssessments, ({ one }) => ({
  customer: one(customers, {
    fields: [creditRiskAssessments.customerId],
    references: [customers.id],
  }),
}));

export const creditDecisionsRelations = relations(creditDecisions, ({ one }) => ({
  customer: one(customers, {
    fields: [creditDecisions.customerId],
    references: [customers.id],
  }),
  salesOrder: one(orders, {
    fields: [creditDecisions.salesOrderId],
    references: [orders.id],
  }),
}));

export const dunningHistoryRelations = relations(dunningHistory, ({ one }) => ({
  customer: one(customers, {
    fields: [dunningHistory.customerId],
    references: [customers.id],
  }),
  dunningProcedure: one(dunningProcedures, {
    fields: [dunningHistory.dunningProcedureId],
    references: [dunningProcedures.id],
  }),
}));

export const cashApplicationsRelations = relations(cashApplications, ({ one, many }) => ({
  customer: one(customers, {
    fields: [cashApplications.customerId],
    references: [customers.id],
  }),
  items: many(cashApplicationItems),
}));

export const cashApplicationItemsRelations = relations(cashApplicationItems, ({ one }) => ({
  cashApplication: one(cashApplications, {
    fields: [cashApplicationItems.cashApplicationId],
    references: [cashApplications.id],
  }),
}));

export const advancedGlPostingsRelations = relations(advancedGlPostings, ({ many }) => ({
  lineItems: many(advancedGlLineItems),
}));

// ===================================================================
// GIGANTIC ENTERPRISE INTEGRATION TABLES
// ===================================================================

// 1. ENTERPRISE TRANSACTION REGISTRY - Complete Financial Transaction Management
export const enterpriseTransactionRegistry = pgTable("enterprise_transaction_registry", {
  id: serial("id").primaryKey(),
  transactionUuid: varchar("transaction_uuid", { length: 50 }).notNull().unique(),
  businessEntityCode: varchar("business_entity_code", { length: 20 }).notNull(),
  fiscalPeriod: varchar("fiscal_period", { length: 10 }).notNull(),
  transactionCategory: varchar("transaction_category", { length: 20 }).notNull(), // SALES, PURCHASE, PRODUCTION, etc.
  sourceApplication: varchar("source_application", { length: 50 }).notNull(),
  referenceDocument: varchar("reference_document", { length: 50 }).notNull(),

  // Financial Core
  primaryAccount: varchar("primary_account", { length: 20 }).notNull(),
  offsetAccount: varchar("offset_account", { length: 20 }),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0.00"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  currencyCode: varchar("currency_code", { length: 5 }).default("USD"),
  baseCurrencyAmount: decimal("base_currency_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0.00"),

  // Business Context
  customerVendorCode: varchar("customer_vendor_code", { length: 50 }),
  materialServiceCode: varchar("material_service_code", { length: 50 }),
  projectCode: varchar("project_code", { length: 50 }),
  costCenterCode: varchar("cost_center_code", { length: 50 }).notNull(),
  profitCenterCode: varchar("profit_center_code", { length: 50 }).notNull(),
  businessUnitCode: varchar("business_unit_code", { length: 50 }),

  // Process Management
  processingStatus: varchar("processing_status", { length: 15 }).default("ACTIVE"),
  approvalStatus: varchar("approval_status", { length: 15 }).default("APPROVED"),
  workflowInstance: varchar("workflow_instance", { length: 50 }),

  // Master Data Integration
  customerMasterRef: varchar("customer_master_ref", { length: 50 }),
  vendorMasterRef: varchar("vendor_master_ref", { length: 50 }),
  materialMasterRef: varchar("material_master_ref", { length: 50 }),
  plantMasterRef: varchar("plant_master_ref", { length: 20 }),
  glAccountMaster: jsonb("gl_account_master"),
  organizationalHierarchy: jsonb("organizational_hierarchy"),

  // Audit and Compliance
  businessDate: date("business_date").notNull(),
  postingDate: date("posting_date").notNull(),
  createdBy: integer("created_by").notNull(),
  createdTimestamp: timestamp("created_timestamp").defaultNow(),
  versionNumber: integer("version_number").default(1),

  // Extended Analytics
  transactionMagnitude: varchar("transaction_magnitude", { length: 15 }),
  riskLevel: varchar("risk_level", { length: 10 }),
  businessImpactRating: varchar("business_impact_rating", { length: 10 }),
  complianceFlags: jsonb("compliance_flags"),

  // Integration Fields
  externalSystemReference: varchar("external_system_reference", { length: 100 }),
  interfaceStatus: varchar("interface_status", { length: 20 }).default("SYNCHRONIZED"),
  lastSyncTimestamp: timestamp("last_sync_timestamp"),

  // Enhanced Business Analytics Columns
  businessProcessCategory: varchar("business_process_category", { length: 30 }), // ORDER_TO_CASH, PROCURE_TO_PAY, PLAN_TO_PRODUCE
  enterpriseLevel: varchar("enterprise_level", { length: 20 }).default("OPERATIONAL"), // STRATEGIC, TACTICAL, OPERATIONAL
  financialImpactScore: decimal("financial_impact_score", { precision: 5, scale: 2 }).default("0.00"), // 0-100 scoring
  operationalMetrics: jsonb("operational_metrics"), // KPIs, performance indicators
  predictiveAnalytics: jsonb("predictive_analytics"), // Forecasting data, trends
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }).default("100.00"), // 0-100 compliance rating
  automationLevel: varchar("automation_level", { length: 20 }).default("MANUAL"), // FULLY_AUTOMATED, SEMI_AUTOMATED, MANUAL
  integrationType: varchar("integration_type", { length: 30 }).default("REAL_TIME"), // REAL_TIME, BATCH, MANUAL_ENTRY
  dataQualityScore: decimal("data_quality_score", { precision: 5, scale: 2 }).default("100.00"), // 0-100 data quality
  businessContinuityFlag: boolean("business_continuity_flag").default(true), // Critical process indicator
  regulatoryRequirements: jsonb("regulatory_requirements"), // Compliance requirements tracking
  crossFunctionalImpact: jsonb("cross_functional_impact"), // Impact on other business areas
  digitalTransformationMetrics: jsonb("digital_transformation_metrics"), // Digital maturity indicators

  // Performance and Efficiency Metrics
  processingTimeSeconds: integer("processing_time_seconds"), // Time to process transaction
  systemLatencyMs: integer("system_latency_ms"), // System response time
  userExperienceRating: decimal("user_experience_rating", { precision: 3, scale: 1 }), // 1.0-10.0 UX rating
  errorCount: integer("error_count").default(0), // Number of errors during processing
  retryAttempts: integer("retry_attempts").default(0), // Number of retry attempts
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("100.00"), // Success percentage

  // Advanced Business Intelligence
  seasonalityFactor: decimal("seasonality_factor", { precision: 5, scale: 3 }).default("1.000"), // Seasonal adjustment
  trendIndicator: varchar("trend_indicator", { length: 15 }).default("STABLE"), // INCREASING, DECREASING, STABLE
  marketConditions: jsonb("market_conditions"), // External market factors
  competitivePosition: varchar("competitive_position", { length: 20 }), // LEADER, FOLLOWER, NICHE
  customerSatisfactionImpact: decimal("customer_satisfaction_impact", { precision: 4, scale: 2 }), // -10.00 to +10.00
  supplierPerformanceImpact: decimal("supplier_performance_impact", { precision: 4, scale: 2 }), // -10.00 to +10.00

  // Environmental and Sustainability
  carbonFootprintKg: decimal("carbon_footprint_kg", { precision: 10, scale: 3 }), // Environmental impact
  sustainabilityScore: decimal("sustainability_score", { precision: 5, scale: 2 }).default("50.00"), // 0-100 sustainability rating
  wasteReductionFactor: decimal("waste_reduction_factor", { precision: 5, scale: 3 }).default("1.000"), // Waste efficiency
  energyConsumptionKwh: decimal("energy_consumption_kwh", { precision: 10, scale: 3 }), // Energy usage

  // Risk Management Enhanced
  operationalRiskLevel: varchar("operational_risk_level", { length: 15 }).default("LOW"), // HIGH, MEDIUM, LOW
  financialRiskExposure: decimal("financial_risk_exposure", { precision: 15, scale: 2 }).default("0.00"), // Financial risk amount
  geopoliticalRiskFactor: decimal("geopolitical_risk_factor", { length: 5, scale: 3 }).default("1.000"), // Geopolitical risk multiplier
  cyberSecurityRating: varchar("cyber_security_rating", { length: 15 }).default("SECURE"), // SECURE, MODERATE, HIGH_RISK

  // Future-Ready Extensions
  aiModelVersion: varchar("ai_model_version", { length: 20 }), // AI model used for processing
  blockchainHash: varchar("blockchain_hash", { length: 128 }), // Blockchain verification
  iotDeviceData: jsonb("iot_device_data"), // IoT sensor data
  quantumReadiness: boolean("quantum_readiness").default(false), // Quantum computing compatibility
});

// 2. MATERIAL MOVEMENT REGISTRY - Complete Material Lifecycle Management
export const materialMovementRegistry = pgTable("material_movement_registry", {
  id: serial("id").primaryKey(),
  movementUuid: varchar("movement_uuid", { length: 50 }).notNull().unique(),
  movementSequence: varchar("movement_sequence", { length: 50 }).notNull(),
  movementCategory: varchar("movement_category", { length: 20 }).notNull(), // RECEIPT, ISSUE, TRANSFER
  movementSubcategory: varchar("movement_subcategory", { length: 30 }).notNull(),
  businessTransactionType: varchar("business_transaction_type", { length: 50 }).notNull(),

  // Material Identification
  materialIdentifier: varchar("material_identifier", { length: 50 }).notNull(),
  materialDescription: text("material_description").notNull(),
  materialSpecification: jsonb("material_specification"),
  batchIdentifier: varchar("batch_identifier", { length: 50 }),
  serialNumbers: text("serial_numbers").array(),

  // Quantity and Location
  destinationLocationCode: varchar("destination_location_code", { length: 50 }).notNull(),
  sourceLocationCode: varchar("source_location_code", { length: 50 }),
  storageZoneCode: varchar("storage_zone_code", { length: 20 }),
  warehouseSection: varchar("warehouse_section", { length: 20 }),
  movementQuantity: decimal("movement_quantity", { precision: 15, scale: 3 }).notNull(),
  baseUnitMeasure: varchar("base_unit_measure", { length: 10 }).notNull(),
  alternativeUnitMeasure: varchar("alternative_unit_measure", { length: 10 }),

  // Valuation
  unitValuation: decimal("unit_valuation", { precision: 15, scale: 4 }).notNull(),
  totalValuation: decimal("total_valuation", { precision: 15, scale: 2 }).notNull(),
  standardCost: decimal("standard_cost", { precision: 15, scale: 4 }),
  movingAveragePrice: decimal("moving_average_price", { precision: 15, scale: 4 }),
  valuationArea: varchar("valuation_area", { length: 20 }),

  // Business Partner and Document Context
  businessPartnerCode: varchar("business_partner_code", { length: 50 }),
  originatingDocument: varchar("originating_document", { length: 50 }).notNull(),
  lineItemNumber: integer("line_item_number"),
  purchaseOrderReference: varchar("purchase_order_reference", { length: 50 }),
  salesOrderReference: varchar("sales_order_reference", { length: 50 }),
  productionOrderReference: varchar("production_order_reference", { length: 50 }),

  // Quality and Compliance
  qualityStatus: varchar("quality_status", { length: 20 }).default("RELEASED"),
  inspectionRequired: boolean("inspection_required").default(false),
  expirationDate: date("expiration_date"),
  manufacturingDate: date("manufacturing_date"),
  shelfLifeDays: integer("shelf_life_days"),

  // Process Context
  processingStatus: varchar("processing_status", { length: 15 }).default("COMPLETED"),
  movementReasonCode: varchar("movement_reason_code", { length: 20 }),
  costCenterCharging: varchar("cost_center_charging", { length: 50 }),
  assetReference: varchar("asset_reference", { length: 50 }),

  // Planning and Control
  reservationNumber: varchar("reservation_number", { length: 50 }),
  requirementTrackingNumber: varchar("requirement_tracking_number", { length: 50 }),
  projectAllocation: varchar("project_allocation", { length: 50 }),

  // Master Data Integration
  plantMasterRef: varchar("plant_master_ref", { length: 20 }),
  materialMasterRef: varchar("material_master_ref", { length: 50 }),
  vendorMasterRef: varchar("vendor_master_ref", { length: 50 }),
  customerMasterRef: varchar("customer_master_ref", { length: 50 }),
  workCenterMasterRef: varchar("work_center_master_ref", { length: 50 }),
  bomMasterRef: varchar("bom_master_ref", { length: 50 }),
  routingMasterRef: varchar("routing_master_ref", { length: 50 }),
  personnelMasterRef: varchar("personnel_master_ref", { length: 50 }),
  masterDataEnrichment: jsonb("master_data_enrichment"),
  organizationalContext: jsonb("organizational_context"),

  // Audit Trail
  executionDate: date("execution_date").notNull(),
  postingDate: date("posting_date").notNull(),
  effectiveDate: date("effective_date").notNull(),
  createdBy: integer("created_by").notNull(),
  createdTimestamp: timestamp("created_timestamp").defaultNow(),
  versionNumber: integer("version_number").default(1),

  // Logistics and Transportation
  deliveryNote: varchar("delivery_note", { length: 50 }),
  transportationReference: varchar("transportation_reference", { length: 50 }),
  carrierInformation: jsonb("carrier_information"),
  packagingDetails: jsonb("packaging_details"),

  // Integration Fields
  externalSystemReference: varchar("external_system_reference", { length: 100 }),
  interfaceStatus: varchar("interface_status", { length: 20 }).default("SYNCHRONIZED"),
  lastSyncTimestamp: timestamp("last_sync_timestamp"),

  // Extended Analytics
  movementVelocityScore: decimal("movement_velocity_score", { precision: 5, scale: 2 }),
  businessImpactRating: varchar("business_impact_rating", { length: 10 }),
  environmentalImpact: jsonb("environmental_impact"),

  // Enhanced Material Analytics Columns
  materialProcessCategory: varchar("material_process_category", { length: 30 }), // INBOUND, OUTBOUND, INTERNAL_TRANSFER, PRODUCTION
  enterpriseLevel: varchar("enterprise_level", { length: 20 }).default("OPERATIONAL"), // STRATEGIC, TACTICAL, OPERATIONAL
  inventoryImpactScore: decimal("inventory_impact_score", { precision: 5, scale: 2 }).default("0.00"), // 0-100 scoring
  supplyChainMetrics: jsonb("supply_chain_metrics"), // Lead times, supplier performance
  demandPlanningData: jsonb("demand_planning_data"), // Forecast accuracy, consumption patterns
  warehouseEfficiencyScore: decimal("warehouse_efficiency_score", { precision: 5, scale: 2 }).default("100.00"), // 0-100 efficiency rating
  automationLevel: varchar("automation_level", { length: 20 }).default("MANUAL"), // FULLY_AUTOMATED, SEMI_AUTOMATED, MANUAL
  integrationType: varchar("integration_type", { length: 30 }).default("REAL_TIME"), // REAL_TIME, BATCH, MANUAL_ENTRY
  dataQualityScore: decimal("data_quality_score", { precision: 5, scale: 2 }).default("100.00"), // 0-100 data quality
  criticality: varchar("criticality", { length: 15 }).default("NORMAL"), // CRITICAL, HIGH, NORMAL, LOW
  temperatureRequirements: jsonb("temperature_requirements"), // Cold chain, environmental control
  handlingInstructions: jsonb("handling_instructions"), // Special handling, safety requirements

  // Performance and Efficiency Metrics
  pickingTimeSeconds: integer("picking_time_seconds"), // Time to pick materials
  packingTimeSeconds: integer("packing_time_seconds"), // Time to pack materials
  movementAccuracyRate: decimal("movement_accuracy_rate", { precision: 5, scale: 2 }).default("100.00"), // Accuracy percentage
  damageIncidents: integer("damage_incidents").default(0), // Number of damage incidents
  returnRate: decimal("return_rate", { precision: 5, scale: 2 }).default("0.00"), // Return percentage
  cycleCountVariance: decimal("cycle_count_variance", { precision: 10, scale: 3 }).default("0.000"), // Cycle count differences

  // Advanced Material Intelligence
  seasonalityFactor: decimal("seasonality_factor", { precision: 5, scale: 3 }).default("1.000"), // Seasonal demand adjustment
  demandTrend: varchar("demand_trend", { length: 15 }).default("STABLE"), // INCREASING, DECREASING, STABLE
  supplierReliability: decimal("supplier_reliability", { precision: 5, scale: 2 }).default("100.00"), // 0-100 supplier score
  alternativeSourcesAvailable: boolean("alternative_sources_available").default(false), // Backup supplier availability
  leadTimeVariability: decimal("lead_time_variability", { precision: 5, scale: 2 }).default("0.00"), // Lead time variation
  demandVolatility: decimal("demand_volatility", { precision: 5, scale: 2 }).default("0.00"), // Demand fluctuation

  // Environmental and Sustainability
  carbonFootprintKg: decimal("carbon_footprint_kg", { precision: 10, scale: 3 }), // Environmental impact per movement
  sustainabilityScore: decimal("sustainability_score", { precision: 5, scale: 2 }).default("50.00"), // 0-100 sustainability rating
  wasteGeneratedKg: decimal("waste_generated_kg", { precision: 10, scale: 3 }), // Waste from movement
  recyclableContent: decimal("recyclable_content", { precision: 5, scale: 2 }).default("0.00"), // Percentage recyclable
  energyConsumptionKwh: decimal("energy_consumption_kwh", { precision: 10, scale: 3 }), // Energy usage for movement
  waterUsageLiters: decimal("water_usage_liters", { precision: 10, scale: 3 }), // Water consumption

  // Risk Management Enhanced
  materialRiskLevel: varchar("material_risk_level", { length: 15 }).default("LOW"), // HIGH, MEDIUM, LOW
  obsolescenceRisk: decimal("obsolescence_risk", { precision: 5, scale: 2 }).default("0.00"), // Risk of becoming obsolete
  priceVolatilityRisk: decimal("price_volatility_risk", { precision: 5, scale: 2 }).default("0.00"), // Price fluctuation risk
  stockoutProbability: decimal("stockout_probability", { precision: 5, scale: 2 }).default("0.00"), // Probability of stockout

  // Quality Management Advanced
  defectRate: decimal("defect_rate", { precision: 5, scale: 4 }).default("0.0000"), // Defect percentage
  qualityGrade: varchar("quality_grade", { length: 10 }).default("A"), // Quality classification
  inspectionResults: jsonb("inspection_results"), // Detailed inspection data
  certificationRequirements: jsonb("certification_requirements"), // Required certifications
  traceabilityChain: jsonb("traceability_chain"), // Complete traceability data

  // Technology Integration
  rfidTagData: jsonb("rfid_tag_data"), // RFID tracking information
  barcodeInformation: jsonb("barcode_information"), // Barcode data
  gpsCoordinates: jsonb("gps_coordinates"), // Location tracking
  sensorReadings: jsonb("sensor_readings"), // IoT sensor data

  // Future-Ready Extensions
  aiModelVersion: varchar("ai_model_version", { length: 20 }), // AI model used for analysis
  blockchainHash: varchar("blockchain_hash", { length: 128 }), // Blockchain verification
  iotDeviceId: varchar("iot_device_id", { length: 50 }), // Connected IoT device
  digitalTwinReference: varchar("digital_twin_reference", { length: 100 }), // Digital twin model
  quantumReadiness: boolean("quantum_readiness").default(false), // Quantum computing compatibility

  // Business Intelligence Advanced
  crossDockingEligible: boolean("cross_docking_eligible").default(false), // Can be cross-docked
  consolidationOpportunity: boolean("consolidation_opportunity").default(false), // Can be consolidated
  routeOptimizationFlag: boolean("route_optimization_flag").default(false), // Route optimization applicable
  inventoryOptimizationScore: decimal("inventory_optimization_score", { precision: 5, scale: 2 }).default("50.00"), // 0-100 optimization score
});

// Gigantic Tables Relations
export const enterpriseTransactionRegistryRelations = relations(enterpriseTransactionRegistry, ({ one }) => ({
  customer: one(customers, {
    fields: [enterpriseTransactionRegistry.customerMasterRef],
    references: [customers.code],
  }),
}));

export const materialMovementRegistryRelations = relations(materialMovementRegistry, ({ one }) => ({
  customer: one(customers, {
    fields: [materialMovementRegistry.customerMasterRef],
    references: [customers.code],
  }),
}));

// Gigantic Tables Zod Schemas
export const insertEnterpriseTransactionRegistrySchema = createInsertSchema(enterpriseTransactionRegistry).omit({
  id: true,
  createdTimestamp: true,
});
export type InsertEnterpriseTransactionRegistry = z.infer<typeof insertEnterpriseTransactionRegistrySchema>;
export type EnterpriseTransactionRegistry = typeof enterpriseTransactionRegistry.$inferSelect;

export const insertMaterialMovementRegistrySchema = createInsertSchema(materialMovementRegistry).omit({
  id: true,
  createdTimestamp: true,
});
export type InsertMaterialMovementRegistry = z.infer<typeof insertMaterialMovementRegistrySchema>;
export type MaterialMovementRegistry = typeof materialMovementRegistry.$inferSelect;

export const advancedGlLineItemsRelations = relations(advancedGlLineItems, ({ one }) => ({
  glPosting: one(advancedGlPostings, {
    fields: [advancedGlLineItems.glPostingId],
    references: [advancedGlPostings.id],
  }),
}));

// ===================================================================
// PHASE 3: CREDIT MANAGEMENT INSERT SCHEMAS
// ===================================================================

export const insertCreditRiskAssessmentsSchema = createInsertSchema(creditRiskAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCreditRiskAssessments = z.infer<typeof insertCreditRiskAssessmentsSchema>;
export type CreditRiskAssessments = typeof creditRiskAssessments.$inferSelect;

export const insertCreditDecisionsSchema = createInsertSchema(creditDecisions).omit({
  id: true,
  createdAt: true,
});
export type InsertCreditDecisions = z.infer<typeof insertCreditDecisionsSchema>;
export type CreditDecisions = typeof creditDecisions.$inferSelect;

export const insertDunningProceduresSchema = createInsertSchema(dunningProcedures).omit({
  id: true,
  createdAt: true,
});
export type InsertDunningProcedures = z.infer<typeof insertDunningProceduresSchema>;
export type DunningProcedures = typeof dunningProcedures.$inferSelect;

export const insertDunningHistorySchema = createInsertSchema(dunningHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertDunningHistory = z.infer<typeof insertDunningHistorySchema>;
export type DunningHistory = typeof dunningHistory.$inferSelect;

export const insertCashApplicationsSchema = createInsertSchema(cashApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCashApplications = z.infer<typeof insertCashApplicationsSchema>;
export type CashApplications = typeof cashApplications.$inferSelect;

export const insertCashApplicationItemsSchema = createInsertSchema(cashApplicationItems).omit({
  id: true,
  createdAt: true,
});
export type InsertCashApplicationItems = z.infer<typeof insertCashApplicationItemsSchema>;
export type CashApplicationItems = typeof cashApplicationItems.$inferSelect;

export const insertAdvancedGlPostingsSchema = createInsertSchema(advancedGlPostings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdvancedGlPostings = z.infer<typeof insertAdvancedGlPostingsSchema>;
export type AdvancedGlPostings = typeof advancedGlPostings.$inferSelect;

export const insertAdvancedGlLineItemsSchema = createInsertSchema(advancedGlLineItems).omit({
  id: true,
  createdAt: true,
});
export type InsertAdvancedGlLineItems = z.infer<typeof insertAdvancedGlLineItemsSchema>;
export type AdvancedGlLineItems = typeof advancedGlLineItems.$inferSelect;

// ===================================================================
// PRODUCTION PLANNING & MRP TABLES
// ===================================================================

// Planned Orders for MRP Planning
export const plannedOrders = pgTable("planned_orders", {
  id: serial("id").primaryKey(),
  plannedOrderNumber: varchar("planned_order_number", { length: 50 }).notNull().unique(),
  materialId: integer("material_id").notNull(),
  plantId: integer("plant_id").notNull(),
  plannedQuantity: decimal("planned_quantity", { precision: 15, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }).notNull(),
  plannedStartDate: date("planned_start_date").notNull(),
  plannedFinishDate: date("planned_finish_date").notNull(),
  requirementDate: date("requirement_date").notNull(),
  orderType: varchar("order_type", { length: 20 }).notNull().default("production"), // production, purchase
  conversionStatus: varchar("conversion_status", { length: 20 }).notNull().default("open"), // open, converted, cancelled
  convertedOrderId: integer("converted_order_id"),
  convertedOrderType: varchar("converted_order_type", { length: 20 }),
  mrpController: varchar("mrp_controller", { length: 50 }),
  planningStrategy: varchar("planning_strategy", { length: 20 }).notNull().default("make_to_stock"),
  businessContext: jsonb("business_context"),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Purchase Requisitions
export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: serial("id").primaryKey(),
  requisitionNumber: varchar("requisition_number", { length: 50 }).notNull().unique(),
  requestorId: integer("requestor_id").notNull(),
  requestorName: varchar("requestor_name", { length: 100 }).notNull(),
  requestDate: date("request_date").notNull(),
  requiredDate: date("required_date").notNull(),
  costCenterId: integer("cost_center_id"),
  plantId: integer("plant_id").notNull(),
  plantName: varchar("plant_name", { length: 100 }),
  // SAP ECC Organizational Fields
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  purchasingOrg: varchar("purchasing_org", { length: 4 }),
  purchasingGroup: varchar("purchasing_group", { length: 3 }),
  prType: varchar("pr_type", { length: 4 }).notNull().default("NB"), // NB=Standard, UB=Stock Transfer, KB=Consignment
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // urgent, high, normal, low
  status: varchar("status", { length: 20 }).notNull().default("created"), // created, approved, rejected, converted, closed
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by", { length: 100 }),
  approvedDate: date("approved_date"),
  totalEstimatedValue: decimal("total_estimated_value", { precision: 15, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  notes: text("notes"),
  businessJustification: text("business_justification"),
  convertedPoNumber: varchar("converted_po_number", { length: 50 }),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Purchase Requisition Document Types Master Data
export const prDocumentTypes = pgTable("pr_document_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  numberRangeId: integer("number_range_id"), // FK to document_number_ranges table (real-time data)
  itemControl: varchar("item_control", { length: 1 }).default("0"), // 0=No limit, 1=One item only, 2=Multiple items
  processingControl: varchar("processing_control", { length: 1 }).default("0"), // 0=Normal, 1=Release immediately, 2=Blocked
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Purchase Requisition Items
export const purchaseRequisitionItems = pgTable("purchase_requisition_items", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").notNull().references(() => purchaseRequisitions.id),
  lineNumber: integer("line_number").notNull(),
  materialId: integer("material_id"),
  materialDescription: varchar("material_description", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 10 }).notNull(),
  estimatedPrice: decimal("estimated_price", { precision: 15, scale: 2 }),
  totalLineValue: decimal("total_line_value", { precision: 15, scale: 2 }),
  deliveryDate: date("delivery_date").notNull(),
  accountAssignment: varchar("account_assignment", { length: 20 }).notNull().default("cost_center"), // cost_center, internal_order, project
  accountAssignmentId: integer("account_assignment_id"),
  preferredVendorId: integer("preferred_vendor_id"),
  specifications: text("specifications"),
  conversionStatus: varchar("conversion_status", { length: 20 }).notNull().default("open"), // open, converted, cancelled
  convertedPoLineId: integer("converted_po_line_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// MRP Areas for Production Planning
export const mrpAreas = pgTable("mrp_areas", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  mrpArea: varchar("mrp_area", { length: 10 }).notNull(),
  description: varchar("description", { length: 100 }).notNull(),
  mrpController: varchar("mrp_controller", { length: 50 }).notNull(),
  planningHorizon: integer("planning_horizon").notNull().default(365), // days
  planningTimeFence: integer("planning_time_fence").notNull().default(30), // days
  lotSizeKey: varchar("lot_size_key", { length: 10 }).notNull().default("LOT_FOR_LOT"),
  safetyStock: decimal("safety_stock", { precision: 15, scale: 3 }).default("0.000"),
  reorderPoint: decimal("reorder_point", { precision: 15, scale: 3 }).default("0.000"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Material Requirements Planning Run Log
export const mrpRuns = pgTable("mrp_runs", {
  id: serial("id").primaryKey(),
  runNumber: varchar("run_number", { length: 50 }).notNull().unique(),
  plantId: integer("plant_id").notNull(),
  mrpArea: varchar("mrp_area", { length: 10 }),
  runDate: date("run_date").notNull(),
  runStartTime: timestamp("run_start_time").notNull(),
  runEndTime: timestamp("run_end_time"),
  status: varchar("status", { length: 20 }).notNull().default("running"), // running, completed, error
  totalMaterialsProcessed: integer("total_materials_processed").default(0),
  plannedOrdersCreated: integer("planned_orders_created").default(0),
  purchaseRequisitionsCreated: integer("purchase_requisitions_created").default(0),
  errorMessages: text("error_messages"),
  runParameters: jsonb("run_parameters"),
  processingResults: jsonb("processing_results"),
  executedBy: varchar("executed_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Production Planning Scenarios
export const productionPlanningScenarios = pgTable("production_planning_scenarios", {
  id: serial("id").primaryKey(),
  scenarioName: varchar("scenario_name", { length: 100 }).notNull(),
  scenarioDescription: text("scenario_description"),
  planningHorizon: integer("planning_horizon").notNull().default(365), // days
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, active, archived
  baselineScenario: boolean("baseline_scenario").notNull().default(false),
  demandForecastMethod: varchar("demand_forecast_method", { length: 30 }).notNull().default("historical_average"),
  capacityConstraints: jsonb("capacity_constraints"),
  businessAssumptions: jsonb("business_assumptions"),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===================================================================
// PRODUCTION PLANNING RELATIONS
// ===================================================================

// TODO: Re-enable relations once related tables are properly imported
// export const plannedOrdersRelations = relations(plannedOrders, ({ one, many }) => ({
//   material: one(materials, {
//     fields: [plannedOrders.materialId],
//     references: [materials.id],
//   }),
//   plant: one(plants, {
//     fields: [plannedOrders.plantId],
//     references: [plants.id],
//   }),
// }));

// export const purchaseRequisitionsRelations = relations(purchaseRequisitions, ({ one, many }) => ({
//   requestor: one(employees, {
//     fields: [purchaseRequisitions.requestorId],
//     references: [employees.id],
//   }),
//   plant: one(plants, {
//     fields: [purchaseRequisitions.plantId],
//     references: [plants.id],
//   }),
//   costCenter: one(costCenters, {
//     fields: [purchaseRequisitions.costCenterId],
//     references: [costCenters.id],
//   }),
//   items: many(purchaseRequisitionItems),
// }));

// export const purchaseRequisitionItemsRelations = relations(purchaseRequisitionItems, ({ one }) => ({
//   requisition: one(purchaseRequisitions, {
//     fields: [purchaseRequisitionItems.requisitionId],
//     references: [purchaseRequisitions.id],
//   }),
//   material: one(materials, {
//     fields: [purchaseRequisitionItems.materialId],
//     references: [materials.id],
//   }),
//   preferredVendor: one(vendors, {
//     fields: [purchaseRequisitionItems.preferredVendorId],
//     references: [vendors.id],
//   }),
// }));

// TODO: Re-enable relations once plants table is properly imported
// export const mrpAreasRelations = relations(mrpAreas, ({ one }) => ({
//   plant: one(plants, {
//     fields: [mrpAreas.plantId],
//     references: [plants.id],
//   }),
// }));

// export const mrpRunsRelations = relations(mrpRuns, ({ one }) => ({
//   plant: one(plants, {
//     fields: [mrpRuns.plantId],
//     references: [plants.id],
//   }),
// }));

export const productionPlanningScenarioRelations = relations(productionPlanningScenarios, ({ many }) => ({
  // Future: scenario-specific planned orders
}));

// ===================================================================
// PRODUCTION PLANNING INSERT SCHEMAS
// ===================================================================

export const insertPlannedOrderSchema = createInsertSchema(plannedOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlannedOrder = z.infer<typeof insertPlannedOrderSchema>;
export type PlannedOrder = typeof plannedOrders.$inferSelect;

export const insertPurchaseRequisitionSchema = createInsertSchema(purchaseRequisitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseRequisition = z.infer<typeof insertPurchaseRequisitionSchema>;
export type PurchaseRequisition = typeof purchaseRequisitions.$inferSelect;

export const insertPurchaseRequisitionItemSchema = createInsertSchema(purchaseRequisitionItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseRequisitionItem = z.infer<typeof insertPurchaseRequisitionItemSchema>;
export type PurchaseRequisitionItem = typeof purchaseRequisitionItems.$inferSelect;

// Purchase Requisition Document Type schemas
export const insertPRDocumentTypeSchema = createInsertSchema(prDocumentTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPRDocumentType = z.infer<typeof insertPRDocumentTypeSchema>;
export type PRDocumentType = typeof prDocumentTypes.$inferSelect;

export const insertMrpAreaSchema = createInsertSchema(mrpAreas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMrpArea = z.infer<typeof insertMrpAreaSchema>;
export type MrpArea = typeof mrpAreas.$inferSelect;

export const insertMrpRunSchema = createInsertSchema(mrpRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertMrpRun = z.infer<typeof insertMrpRunSchema>;
export type MrpRun = typeof mrpRuns.$inferSelect;

export const insertProductionPlanningScenarioSchema = createInsertSchema(productionPlanningScenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductionPlanningScenario = z.infer<typeof insertProductionPlanningScenarioSchema>;
export type ProductionPlanningScenario = typeof productionPlanningScenarios.$inferSelect;

// ===================================================================
// API KEYS TABLE FOR SECURE STORAGE
// ===================================================================

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  keyName: varchar("key_name", { length: 100 }).notNull(),
  keyValue: text("key_value").notNull(), // Encrypted API key
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastUsed: timestamp("last_used", { withTimezone: true }),
});

export const insertApiKeySchema = createInsertSchema(apiKeys);
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// ===================================================================
// ROUTING MASTER DATA TABLES
// ===================================================================

// Routing Master (Header Information)
export const routingMaster = pgTable("routing_master", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id"),
  materialCode: varchar("material_code", { length: 100 }).notNull(),
  plantCode: varchar("plant_code", { length: 20 }).notNull(),
  plantId: integer("plant_id"),
  routingGroupCode: varchar("routing_group_code", { length: 50 }).notNull(),
  baseQuantity: decimal("base_quantity", { precision: 15, scale: 3 }).notNull().default("1.0"),
  baseUnit: varchar("base_unit", { length: 10 }).notNull().default("PC"),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  _tenantId: varchar("_tenantId", { length: 3 }).default("001"),
  _deletedAt: timestamp("_deletedAt", { withTimezone: true }),
});

// Routing Operations (Individual Steps)
export const routingOperations = pgTable("routing_operations", {
  id: serial("id").primaryKey(),
  routingMasterId: integer("routing_master_id").notNull().references(() => routingMaster.id, { onDelete: "cascade" }),
  operationNumber: varchar("operation_number", { length: 10 }).notNull(),
  operationDescription: text("operation_description").notNull(),
  workCenterId: integer("work_center_id"), // References work_centers table
  workCenterCode: varchar("work_center_code", { length: 50 }),
  setupTimeMinutes: integer("setup_time_minutes").default(0),
  machineTimeMinutes: decimal("machine_time_minutes", { precision: 10, scale: 2 }).default("0"),
  laborTimeMinutes: decimal("labor_time_minutes", { precision: 10, scale: 2 }).default("0"),
  sequenceOrder: integer("sequence_order").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Routing Operation Components (Materials consumed per operation)
export const routingOperationComponents = pgTable("routing_operation_components", {
  id: serial("id").primaryKey(),
  routingOperationId: integer("routing_operation_id").notNull().references(() => routingOperations.id, { onDelete: "cascade" }),
  materialId: integer("material_id"),
  materialCode: varchar("material_code", { length: 100 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull().default("1.0"),
  unit: varchar("unit", { length: 10 }).notNull().default("PC"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Routing Relations
export const routingMasterRelations = relations(routingMaster, ({ many }) => ({
  operations: many(routingOperations),
}));

export const routingOperationsRelations = relations(routingOperations, ({ one, many }) => ({
  routingMaster: one(routingMaster, {
    fields: [routingOperations.routingMasterId],
    references: [routingMaster.id],
  }),
  components: many(routingOperationComponents),
}));

export const routingOperationComponentsRelations = relations(routingOperationComponents, ({ one }) => ({
  routingOperation: one(routingOperations, {
    fields: [routingOperationComponents.routingOperationId],
    references: [routingOperations.id],
  }),
}));

// Zod schemas
export const insertRoutingMasterSchema = createInsertSchema(routingMaster);
export const insertRoutingOperationSchema = createInsertSchema(routingOperations);
export const insertRoutingOperationComponentSchema = createInsertSchema(routingOperationComponents);

export type RoutingMaster = typeof routingMaster.$inferSelect;
export type InsertRoutingMaster = z.infer<typeof insertRoutingMasterSchema>;
export type RoutingOperation = typeof routingOperations.$inferSelect;
export type InsertRoutingOperation = z.infer<typeof insertRoutingOperationSchema>;
export type RoutingOperationComponent = typeof routingOperationComponents.$inferSelect;
export type InsertRoutingOperationComponent = z.infer<typeof insertRoutingOperationComponentSchema>;


// Export all from order-to-cash-schema
export * from "./order-to-cash-schema";
