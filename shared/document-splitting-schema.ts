import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { glAccounts } from './schema';
import { chartOfAccounts } from './schema';
import { companyCodes } from './schema';
import { ledgers } from './ledgers-schema';
import { accountingDocuments } from './sales-finance-integration-schema';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Item Categories Table
export const documentSplittingItemCategories = pgTable("document_splitting_item_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  categoryType: varchar("category_type", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// GL Account Item Category Assignments
export const documentSplittingGlAccountCategories = pgTable("document_splitting_gl_account_categories", {
  id: serial("id").primaryKey(),
  glAccountId: integer("gl_account_id").references(() => glAccounts.id, { onDelete: "cascade" }),
  glAccountNumber: varchar("gl_account_number", { length: 20 }),
  itemCategoryId: integer("item_category_id").notNull().references(() => documentSplittingItemCategories.id, { onDelete: "cascade" }),
  chartOfAccountsId: integer("chart_of_accounts_id").references(() => chartOfAccounts.id),
  validFrom: date("valid_from").notNull().defaultNow(),
  validTo: date("valid_to"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Business Transactions Table
export const documentSplittingBusinessTransactions = pgTable("document_splitting_business_transactions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

// Business Transaction Variants Table
export const documentSplittingBusinessTransactionVariants = pgTable("document_splitting_business_transaction_variants", {
  id: serial("id").primaryKey(),
  businessTransactionId: integer("business_transaction_id").notNull().references(() => documentSplittingBusinessTransactions.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Type to Business Transaction Mapping
export const documentSplittingDocumentTypeMapping = pgTable("document_splitting_document_type_mapping", {
  id: serial("id").primaryKey(),
  documentType: varchar("document_type", { length: 10 }).notNull(),
  businessTransactionId: integer("business_transaction_id").notNull().references(() => documentSplittingBusinessTransactions.id, { onDelete: "cascade" }),
  businessTransactionVariantId: integer("business_transaction_variant_id").references(() => documentSplittingBusinessTransactionVariants.id, { onDelete: "set null" }),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Splitting Methods Table
export const documentSplittingMethods = pgTable("document_splitting_methods", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  methodType: varchar("method_type", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Splitting Rules Table
export const documentSplittingRules = pgTable("document_splitting_rules", {
  id: serial("id").primaryKey(),
  businessTransactionId: integer("business_transaction_id").notNull().references(() => documentSplittingBusinessTransactions.id, { onDelete: "cascade" }),
  businessTransactionVariantId: integer("business_transaction_variant_id").references(() => documentSplittingBusinessTransactionVariants.id, { onDelete: "set null" }),
  splittingMethodId: integer("splitting_method_id").notNull().references(() => documentSplittingMethods.id, { onDelete: "cascade" }),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  description: text("description"),
  sourceItemCategoryId: integer("source_item_category_id").notNull().references(() => documentSplittingItemCategories.id, { onDelete: "cascade" }),
  targetItemCategoryId: integer("target_item_category_id").references(() => documentSplittingItemCategories.id, { onDelete: "set null" }),
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zero Balance Clearing Accounts Table
export const documentSplittingZeroBalanceAccounts = pgTable("document_splitting_zero_balance_accounts", {
  id: serial("id").primaryKey(),
  ledgerId: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  glAccountId: integer("gl_account_id").notNull().references(() => glAccounts.id, { onDelete: "cascade" }),
  glAccountNumber: varchar("gl_account_number", { length: 20 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Splitting Characteristics Table
export const documentSplittingCharacteristics = pgTable("document_splitting_characteristics", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  characteristicType: varchar("characteristic_type", { length: 50 }).notNull(),
  fieldName: varchar("field_name", { length: 50 }).notNull(),
  requiresZeroBalance: boolean("requires_zero_balance").default(false).notNull(),
  isMandatory: boolean("is_mandatory").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Splitting Constants Table
export const documentSplittingConstants = pgTable("document_splitting_constants", {
  id: serial("id").primaryKey(),
  ledgerId: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  characteristicId: integer("characteristic_id").notNull().references(() => documentSplittingCharacteristics.id, { onDelete: "cascade" }),
  constantValue: varchar("constant_value", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Splitting Activation Table
export const documentSplittingActivation = pgTable("document_splitting_activation", {
  id: serial("id").primaryKey(),
  ledgerId: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
  companyCodeId: integer("company_code_id").references(() => companyCodes.id),
  isActive: boolean("is_active").default(false).notNull(),
  enableInheritance: boolean("enable_inheritance").default(true).notNull(),
  enableStandardAssignment: boolean("enable_standard_assignment").default(true).notNull(),
  splittingMethodId: integer("splitting_method_id").references(() => documentSplittingMethods.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Split Documents Tracking Table
export const documentSplittingSplitDocuments = pgTable("document_splitting_split_documents", {
  id: serial("id").primaryKey(),
  originalDocumentId: integer("original_document_id").notNull().references(() => accountingDocuments.id, { onDelete: "cascade" }),
  splitDocumentId: integer("split_document_id").notNull().references(() => accountingDocuments.id, { onDelete: "cascade" }),
  characteristicId: integer("characteristic_id").references(() => documentSplittingCharacteristics.id),
  characteristicValue: varchar("characteristic_value", { length: 100 }),
  splitRatio: decimal("split_ratio", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const documentSplittingItemCategoriesRelations = relations(documentSplittingItemCategories, ({ many }) => ({
  glAccountCategories: many(documentSplittingGlAccountCategories),
  sourceRules: many(documentSplittingRules, { relationName: "sourceItemCategory" }),
  targetRules: many(documentSplittingRules, { relationName: "targetItemCategory" }),
}));

export const documentSplittingBusinessTransactionsRelations = relations(documentSplittingBusinessTransactions, ({ many }) => ({
  variants: many(documentSplittingBusinessTransactionVariants),
  documentTypeMappings: many(documentSplittingDocumentTypeMapping),
  rules: many(documentSplittingRules),
}));

// Validation Schemas
export const insertItemCategorySchema = createInsertSchema(documentSplittingItemCategories, {
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  categoryType: z.enum(["BALANCE_SHEET", "CUSTOMER", "VENDOR", "EXPENSE", "REVENUE", "TAX", "ASSET", "LIABILITY", "EQUITY"]),
});

export const insertBusinessTransactionSchema = createInsertSchema(documentSplittingBusinessTransactions, {
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  transactionType: z.enum(["VENDOR_INVOICE", "CUSTOMER_INVOICE", "PAYMENT", "GL_POSTING", "GOODS_RECEIPT", "GOODS_ISSUE"]),
});

export const insertSplittingRuleSchema = createInsertSchema(documentSplittingRules, {
  ruleName: z.string().min(1).max(100),
  priority: z.number().int().min(0),
});

export const insertZeroBalanceAccountSchema = createInsertSchema(documentSplittingZeroBalanceAccounts, {
  glAccountNumber: z.string().min(1).max(20),
});

export const insertCharacteristicSchema = createInsertSchema(documentSplittingCharacteristics, {
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  characteristicType: z.enum(["PROFIT_CENTER", "BUSINESS_AREA", "SEGMENT", "COST_CENTER"]),
  fieldName: z.string().min(1).max(50),
});

export const insertActivationSchema = createInsertSchema(documentSplittingActivation);

export const selectItemCategorySchema = createSelectSchema(documentSplittingItemCategories);
export const selectBusinessTransactionSchema = createSelectSchema(documentSplittingBusinessTransactions);
export const selectSplittingRuleSchema = createSelectSchema(documentSplittingRules);
export const selectCharacteristicSchema = createSelectSchema(documentSplittingCharacteristics);
export const selectActivationSchema = createSelectSchema(documentSplittingActivation);

