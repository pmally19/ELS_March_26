import { pgTable, text, serial, integer, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Material Master - Products, raw materials, and finished goods
export const materials = pgTable("materials", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  longDescription: text("long_description"),
  type: text("type").notNull(), // raw material, semi-finished, finished good, etc.
  uomId: integer("uom_id").notNull(), // reference to UoM table
  categoryId: integer("category_id"), // reference to categories table
  weight: numeric("weight"),
  weightUomId: integer("weight_uom_id"), // reference to UoM table
  dimensions: jsonb("dimensions").$type<{
    length: number,
    width: number,
    height: number,
    uomId: number
  }>(),
  baseUnitPrice: numeric("base_unit_price"),
  cost: numeric("cost"),
  minOrderQty: numeric("min_order_qty"),
  orderMultiple: numeric("order_multiple"),
  procurementType: text("procurement_type"), // make, buy, both
  minStock: numeric("min_stock").default("0"),
  maxStock: numeric("max_stock"),
  reorderPoint: numeric("reorder_point"),
  leadTime: integer("lead_time"), // in days
  shelfLife: integer("shelf_life"), // in days
  lotSize: text("lot_size"), // fixed, variable, economic order quantity
  mrpType: text("mrp_type"), // reorder point, forecast-based, etc.
  planningPolicy: text("planning_policy"), // lot-for-lot, fixed period, etc.
  isActive: boolean("is_active").default(true),
  isSellable: boolean("is_sellable").default(false),
  isPurchasable: boolean("is_purchasable").default(false),
  isManufactured: boolean("is_manufactured").default(false),
  isStorable: boolean("is_storable").default(true),
  taxCode: text("tax_code"),
  countryOfOrigin: text("country_of_origin"),
  hsCode: text("hs_code"), // Harmonized System code for customs
  status: text("status").default("active"),
  imageUrl: text("image_url"),
  attributes: jsonb("attributes").$type<Record<string, string>>(), // flexible attributes
  tags: text("tags").array(),
  companyCodeId: integer("company_code_id"), // reference to company_codes table
  plantId: integer("plant_id"), // reference to plants table
  _tenantId: text("_tenantId").default("001"),
  _deletedAt: timestamp("_deletedAt", { withTimezone: true }),
});

// Material Master alias table (same structure, distinct table name)
// NOTE: No separate Drizzle table for material_master; routes use raw SQL.

// Customer Master - Customer information and preferences
export const customers = pgTable("customers", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  type: text("type").notNull(), // individual, company, etc.
  categoryId: integer("category_id"), // reference to customer_categories
  industry: text("industry"),
  taxId: text("tax_id"),
  taxClassification: text("tax_classification"),
  vatNumber: text("vat_number"),
  registrationNumber: text("registration_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  region: text("region"), // geographical region
  phone: text("phone"),
  altPhone: text("alt_phone"),
  email: text("email"),
  website: text("website"),
  currency: text("currency"),
  paymentTerms: text("payment_terms"),
  paymentMethod: text("payment_method"),
  creditLimit: numeric("credit_limit"),
  creditRating: text("credit_rating"),
  discountGroup: text("discount_group"),
  priceGroup: text("price_group"),
  incoterms: text("incoterms"), // international commercial terms
  shippingMethod: text("shipping_method"),
  deliveryTerms: text("delivery_terms"),
  deliveryRoute: text("delivery_route"),
  salesRepId: integer("sales_rep_id"), // reference to users/employees
  parentCustomerId: integer("parent_customer_id"), // for hierarchical relationships
  status: text("status").default("active"),
  isB2B: boolean("is_b2b").default(false),
  isB2C: boolean("is_b2c").default(false),
  isVIP: boolean("is_vip").default(false),
  notes: text("notes"),
  tags: text("tags").array(),
  companyCodeId: integer("company_code_id"), // reference to company_codes table

  // === CRITICAL FINANCIAL FIELDS (SAP-Equivalent) ===
  // Reconciliation Account
  reconciliationAccountCode: text("reconciliation_account_code"), // GL reconciliation account

  // Dunning and Payment Controls
  dunningProcedure: text("dunning_procedure"), // Procedure for overdue payment reminders
  dunningBlock: boolean("dunning_block").default(false), // Block dunning for this customer
  paymentBlock: boolean("payment_block").default(false), // Block payments for this customer
  cashDiscountTerms: text("cash_discount_terms"), // Cash discount conditions
  paymentGuaranteeProcedure: text("payment_guarantee_procedure"), // Payment guarantee setup

  // Credit Management
  creditControlArea: text("credit_control_area"), // Credit management area
  riskCategory: text("risk_category"), // Customer risk classification
  creditLimitCurrency: text("credit_limit_currency").default("USD"), // Currency for credit limit
  creditExposure: numeric("credit_exposure").default(0), // Current credit exposure amount
  creditCheckProcedure: text("credit_check_procedure"), // Credit check process

  // Tax and Compliance
  taxClassificationCode: text("tax_classification_code"), // Detailed tax classification
  taxExemptionCertificate: text("tax_exemption_certificate"), // Tax exemption details
  withholdingTaxCode: text("withholding_tax_code"), // Tax withholding requirements
  taxJurisdiction: text("tax_jurisdiction"), // Tax jurisdiction information

  // Banking Information
  bankAccountNumber: text("bank_account_number"), // Customer bank account number
  bankRoutingNumber: text("bank_routing_number"), // Bank routing information
  bankName: text("bank_name"), // Customer bank name
  electronicPaymentMethod: text("electronic_payment_method"), // Preferred electronic payment method

  // Financial Posting Controls
  postingBlock: boolean("posting_block").default(false), // Block financial postings
  deletionFlag: boolean("deletion_flag").default(false), // Mark for deletion
  authorizationGroup: text("authorization_group"), // Authorization group for access control
  alternativePayee: text("alternative_payee"), // Alternative payee information
});

// Customer Contact Persons
export const customerContacts = pgTable("customer_contacts", {
  ...commonFields,
  customerId: integer("customer_id").notNull(), // reference to customers table
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position"),
  department: text("department"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  isPrimary: boolean("is_primary").default(false),
  isOrderContact: boolean("is_order_contact").default(false),
  isDeliveryContact: boolean("is_delivery_contact").default(false),
  isInvoiceContact: boolean("is_invoice_contact").default(false),
  preferredLanguage: text("preferred_language"),
  notes: text("notes"),
});

// Vendor Master - Supplier and vendor information
export const vendors = pgTable("vendors", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  name2: text("name_2"), // Additional name line 2
  name3: text("name_3"), // Additional name line 3
  name4: text("name_4"), // Additional name line 4
  searchTerm: text("search_term"), // Search term for vendor lookup
  sortField: text("sort_field"), // Sort field for vendor lists
  title: text("title"), // Vendor title/prefix
  type: text("type").notNull(), // manufacturer, distributor, service provider, etc.
  categoryId: integer("category_id"), // reference to vendor_categories
  accountGroupId: integer("account_group_id"), // reference to account_groups (for vendor code auto-generation)
  accountGroup: text("account_group"), // Account group classification (legacy text field)
  industry: text("industry"),
  industryKey: text("industry_key"), // Industry classification key
  industryClassification: text("industry_classification"), // Detailed industry classification

  // Tax Information
  taxId: text("tax_id"), // Tax ID number 1
  taxId2: text("tax_id_2"), // Tax ID number 2
  taxId3: text("tax_id_3"), // Tax ID number 3
  taxOffice: text("tax_office"), // Tax office jurisdiction
  vatNumber: text("vat_number"), // VAT registration number
  fiscalAddress: text("fiscal_address"), // Fiscal/tax address
  registrationNumber: text("registration_number"), // Business registration number

  // Address Information
  address: text("address"), // Street address line 1
  address2: text("address_2"), // Street address line 2
  address3: text("address_3"), // Street address line 3
  address4: text("address_4"), // Street address line 4
  address5: text("address_5"), // Street address line 5
  district: text("district"), // District/neighborhood
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  poBox: text("po_box"), // Post office box
  poBoxPostalCode: text("po_box_postal_code"), // PO Box postal code
  region: text("region"), // Geographical region
  county: text("county"), // County information
  timeZone: text("time_zone"), // Time zone
  taxJurisdiction: text("tax_jurisdiction"), // Tax jurisdiction code

  // Contact Information
  phone: text("phone"),
  altPhone: text("alt_phone"),
  email: text("email"),
  website: text("website"),

  // Financial Information
  currency: text("currency"),
  paymentTerms: text("payment_terms"),
  paymentMethod: text("payment_method"),
  reconciliationAccountId: integer("reconciliation_account_id"), // reference to reconciliation_accounts (for AP reconciliation)
  alternativePayee: text("alternative_payee"), // Alternative payee identifier
  paymentBlock: text("payment_block"), // Payment blocking indicator
  houseBank: text("house_bank"), // House bank identifier
  checkDoubleInvoice: boolean("check_double_invoice").default(false), // Flag to check for duplicate invoices

  // Banking Information
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankRoutingNumber: text("bank_routing_number"),
  swiftCode: text("swift_code"),
  iban: text("iban"), // International Bank Account Number
  bankCountry: text("bank_country"), // Bank country code
  bankKey: text("bank_key"), // Bank key/identifier
  accountType: text("account_type"), // Account type (checking, savings, etc.)
  bankTypeKey: text("bank_type_key"), // Bank type classification key

  // Purchasing Information
  incoterms: text("incoterms"),
  minimumOrderValue: numeric("minimum_order_value"),
  evaluationScore: numeric("evaluation_score"),
  leadTime: integer("lead_time"), // in days
  purchasingGroupId: integer("purchasing_group_id"), // reference to purchasing groups

  // Authorization and Organization
  authorizationGroup: text("authorization_group"), // Authorization group for access control
  corporateGroup: text("corporate_group"), // Corporate group identifier

  // Withholding Tax Information
  withholdingTaxCountry: text("withholding_tax_country"), // Country code for withholding tax
  withholdingTaxType: text("withholding_tax_type"), // Type of withholding tax
  withholdingTaxCode: text("withholding_tax_code"), // Withholding tax code
  withholdingTaxLiable: boolean("withholding_tax_liable").default(false), // Withholding tax liable flag
  exemptionNumber: text("exemption_number"), // Tax exemption certificate number
  exemptionPercentage: numeric("exemption_percentage"), // Exemption percentage
  exemptionReason: text("exemption_reason"), // Reason code for exemption
  exemptionFrom: timestamp("exemption_from"), // Exemption valid from date
  exemptionTo: timestamp("exemption_to"), // Exemption valid to date

  // Blocking and Status Management
  status: text("status").default("active"),
  centralPostingBlock: boolean("central_posting_block").default(false), // Central posting block
  centralDeletionFlag: boolean("central_deletion_flag").default(false), // Central deletion flag
  postingBlockCompanyCode: boolean("posting_block_company_code").default(false), // Posting block at company code level
  deletionFlagCompanyCode: boolean("deletion_flag_company_code").default(false), // Deletion flag at company code level
  postingBlockPurchasingOrg: boolean("posting_block_purchasing_org").default(false), // Posting block at purchasing org level
  deletionFlagPurchasingOrg: boolean("deletion_flag_purchasing_org").default(false), // Deletion flag at purchasing org level
  blacklisted: boolean("blacklisted").default(false),
  blacklistReason: text("blacklist_reason"),

  // Additional Information
  notes: text("notes"),
  tags: text("tags").array(),
  companyCodeId: integer("company_code_id"), // reference to company_codes table
});

// Vendor Contact Persons
export const vendorContacts = pgTable("vendor_contacts", {
  ...commonFields,
  vendorId: integer("vendor_id").notNull(), // reference to vendors table
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position"),
  department: text("department"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  isPrimary: boolean("is_primary").default(false),
  isOrderContact: boolean("is_order_contact").default(false),
  isPurchaseContact: boolean("is_purchase_contact").default(false),
  isQualityContact: boolean("is_quality_contact").default(false),
  isAccountsContact: boolean("is_accounts_contact").default(false),
  preferredLanguage: text("preferred_language"),
  notes: text("notes"),
});

// Chart of Accounts - Financial account structure
export const chartOfAccounts = pgTable("chart_of_accounts", {
  ...commonFields,
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  accountType: text("account_type").notNull(), // asset, liability, equity, revenue, expense
  accountSubtype: text("account_subtype"), // current asset, fixed asset, etc.
  accountGroup: text("account_group"), // grouping for reporting
  balanceSheetCategory: text("balance_sheet_category"),
  incomeStatementCategory: text("income_statement_category"),
  debitCredit: text("debit_credit"), // normal balance: debit or credit
  isBalanceSheet: boolean("is_balance_sheet").default(false),
  isIncomeStatement: boolean("is_income_statement").default(false),
  isCashFlow: boolean("is_cash_flow").default(false),
  isTaxRelevant: boolean("is_tax_relevant").default(false),
  isControlAccount: boolean("is_control_account").default(false),
  isReconciliationRequired: boolean("is_reconciliation_required").default(false),
  isActive: boolean("is_active").default(true),
  parentAccountId: integer("parent_account_id"), // for hierarchical chart of accounts
  companyCodeId: integer("company_code_id"), // reference to company_codes table
});

// Create insert schemas
export const insertMaterialSchema = createInsertSchema(materials);

export const insertCustomerSchema = createInsertSchema(customers);

export const insertCustomerContactSchema = createInsertSchema(customerContacts);

export const insertVendorSchema = createInsertSchema(vendors);

export const insertVendorContactSchema = createInsertSchema(vendorContacts);

export const insertChartOfAccountsSchema = createInsertSchema(chartOfAccounts);

// Create types
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export type InsertVendorContact = z.infer<typeof insertVendorContactSchema>;
export type VendorContact = typeof vendorContacts.$inferSelect;

export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountsSchema>;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;