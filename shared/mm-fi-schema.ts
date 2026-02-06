import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Account Determination Rules
export const accountDeterminationRules = pgTable("account_determination_rules", {
  id: serial("id").primaryKey(),
  materialCategory: varchar("material_category", { length: 10 }).notNull(),
  movementType: varchar("movement_type", { length: 10 }).notNull(),
  valuationClass: varchar("valuation_class", { length: 10 }).notNull(),
  plant: varchar("plant", { length: 10 }),
  debitAccount: varchar("debit_account", { length: 10 }).notNull(),
  creditAccount: varchar("credit_account", { length: 10 }).notNull(),
  costCenter: varchar("cost_center", { length: 10 }),
  profitCenter: varchar("profit_center", { length: 10 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Commitments
export const purchaseCommitments = pgTable("purchase_commitments", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull(),
  materialId: integer("material_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
  glAccount: varchar("gl_account", { length: 10 }).notNull(),
  costCenter: varchar("cost_center", { length: 10 }),
  commitmentDate: timestamp("commitment_date").notNull(),
  expectedDelivery: timestamp("expected_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  status: varchar("status", { length: 20 }).default("open").notNull(), // open, partial, closed, cancelled
  glDocumentNumber: varchar("gl_document_number", { length: 20 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Three-Way Matching
export const threeWayMatches = pgTable("three_way_matches", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull(),
  goodsReceiptId: integer("goods_receipt_id"),
  invoiceId: integer("invoice_id"),
  materialId: integer("material_id").notNull(),
  poQuantity: decimal("po_quantity", { precision: 15, scale: 3 }).notNull(),
  grQuantity: decimal("gr_quantity", { precision: 15, scale: 3 }),
  invoiceQuantity: decimal("invoice_quantity", { precision: 15, scale: 3 }),
  poPrice: decimal("po_price", { precision: 15, scale: 2 }).notNull(),
  grPrice: decimal("gr_price", { precision: 15, scale: 2 }),
  invoicePrice: decimal("invoice_price", { precision: 15, scale: 2 }),
  priceVariance: decimal("price_variance", { precision: 15, scale: 2 }).default("0"),
  quantityVariance: decimal("quantity_variance", { precision: 15, scale: 3 }).default("0"),
  toleranceExceeded: boolean("tolerance_exceeded").default(false),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, matched, variance, blocked, approved
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  varianceGlDocument: varchar("variance_gl_document", { length: 20 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Material Ledger Documents
export const materialLedgerDocuments = pgTable("material_ledger_documents", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull(),
  documentType: varchar("document_type", { length: 10 }).notNull(), // GR, GI, IV, etc.
  documentNumber: varchar("document_number", { length: 20 }).notNull(),
  movementType: varchar("movement_type", { length: 10 }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
  standardCost: decimal("standard_cost", { precision: 15, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 15, scale: 2 }),
  priceVariance: decimal("price_variance", { precision: 15, scale: 2 }).default("0"),
  plant: varchar("plant", { length: 10 }),
  storageLocation: varchar("storage_location", { length: 10 }),
  batch: varchar("batch", { length: 20 }),
  glAccount: varchar("gl_account", { length: 10 }),
  costCenter: varchar("cost_center", { length: 10 }),
  profitCenter: varchar("profit_center", { length: 10 }),
  postingDate: timestamp("posting_date").notNull(),
  documentDate: timestamp("document_date").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Price Variance Analysis
export const priceVarianceAnalysis = pgTable("price_variance_analysis", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM format
  standardPrice: decimal("standard_price", { precision: 15, scale: 2 }).notNull(),
  averageActualPrice: decimal("average_actual_price", { precision: 15, scale: 2 }).notNull(),
  priceVariancePerUnit: decimal("price_variance_per_unit", { precision: 15, scale: 2 }).notNull(),
  quantityConsumed: decimal("quantity_consumed", { precision: 15, scale: 3 }).notNull(),
  totalPriceVariance: decimal("total_price_variance", { precision: 15, scale: 2 }).notNull(),
  varianceCategory: varchar("variance_category", { length: 20 }).notNull(), // favorable, unfavorable
  rootCause: text("root_cause"),
  correctionAction: text("correction_action"),
  glVarianceAccount: varchar("gl_variance_account", { length: 10 }),
  glDocumentNumber: varchar("gl_document_number", { length: 20 }),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Period-End Valuations
export const periodEndValuations = pgTable("period_end_valuations", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM format
  openingStock: decimal("opening_stock", { precision: 15, scale: 3 }).notNull(),
  openingValue: decimal("opening_value", { precision: 15, scale: 2 }).notNull(),
  receiptsQuantity: decimal("receipts_quantity", { precision: 15, scale: 3 }).default("0"),
  receiptsValue: decimal("receipts_value", { precision: 15, scale: 2 }).default("0"),
  issuesQuantity: decimal("issues_quantity", { precision: 15, scale: 3 }).default("0"),
  issuesValue: decimal("issues_value", { precision: 15, scale: 2 }).default("0"),
  closingStock: decimal("closing_stock", { precision: 15, scale: 3 }).notNull(),
  closingValue: decimal("closing_value", { precision: 15, scale: 2 }).notNull(),
  standardPrice: decimal("standard_price", { precision: 15, scale: 2 }).notNull(),
  actualPrice: decimal("actual_price", { precision: 15, scale: 2 }).notNull(),
  revaluationVariance: decimal("revaluation_variance", { precision: 15, scale: 2 }).default("0"),
  revaluationGlDocument: varchar("revaluation_gl_document", { length: 20 }),
  plant: varchar("plant", { length: 10 }),
  valuationArea: varchar("valuation_area", { length: 10 }),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // draft, final, posted
  processedBy: integer("processed_by"),
  processedAt: timestamp("processed_at"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Movement Types
export const enhancedMovementTypes = pgTable("enhanced_movement_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 20 }).notNull(), // GR, GI, Transfer, Adjustment
  debitCreditIndicator: varchar("debit_credit_indicator", { length: 1 }).notNull(), // D, C
  stockType: varchar("stock_type", { length: 10 }).default("unrestricted"), // unrestricted, blocked, quality
  requiresCostCenter: boolean("requires_cost_center").default(false),
  requiresOrder: boolean("requires_order").default(false),
  requiresReservation: boolean("requires_reservation").default(false),
  autoGlPosting: boolean("auto_gl_posting").default(true),
  reversalMovementType: varchar("reversal_movement_type", { length: 10 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Valuation Classes
export const enhancedValuationClasses = pgTable("enhanced_valuation_classes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  inventoryAccount: varchar("inventory_account", { length: 10 }).notNull(),
  consumptionAccount: varchar("consumption_account", { length: 10 }),
  offsetAccount: varchar("offset_account", { length: 10 }),
  varianceAccount: varchar("variance_account", { length: 10 }),
  priceControlMethod: varchar("price_control_method", { length: 1 }).notNull(), // S=Standard, V=Moving Average
  allowNegativeStock: boolean("allow_negative_stock").default(false),
  requiresBatch: boolean("requires_batch").default(false),
  requiresSerial: boolean("requires_serial").default(false),
  valuationCategory: varchar("valuation_category", { length: 20 }).notNull(), // Material, Trading Goods, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for API validation
export const insertAccountDeterminationRuleSchema = createInsertSchema(accountDeterminationRules).omit({ id: true });
export const selectAccountDeterminationRuleSchema = createSelectSchema(accountDeterminationRules);

export const insertPurchaseCommitmentSchema = createInsertSchema(purchaseCommitments).omit({ id: true });
export const selectPurchaseCommitmentSchema = createSelectSchema(purchaseCommitments);

export const insertThreeWayMatchSchema = createInsertSchema(threeWayMatches).omit({ id: true });
export const selectThreeWayMatchSchema = createSelectSchema(threeWayMatches);

export const insertMaterialLedgerDocumentSchema = createInsertSchema(materialLedgerDocuments).omit({ id: true });
export const selectMaterialLedgerDocumentSchema = createSelectSchema(materialLedgerDocuments);

export const insertPriceVarianceAnalysisSchema = createInsertSchema(priceVarianceAnalysis).omit({ id: true });
export const selectPriceVarianceAnalysisSchema = createSelectSchema(priceVarianceAnalysis);

export const insertPeriodEndValuationSchema = createInsertSchema(periodEndValuations).omit({ id: true });
export const selectPeriodEndValuationSchema = createSelectSchema(periodEndValuations);

export const insertEnhancedMovementTypeSchema = createInsertSchema(enhancedMovementTypes).omit({ id: true });
export const selectEnhancedMovementTypeSchema = createSelectSchema(enhancedMovementTypes);

export const insertEnhancedValuationClassSchema = createInsertSchema(enhancedValuationClasses).omit({ id: true });
export const selectEnhancedValuationClassSchema = createSelectSchema(enhancedValuationClasses);

// Type exports
export type AccountDeterminationRule = typeof accountDeterminationRules.$inferSelect;
export type InsertAccountDeterminationRule = typeof accountDeterminationRules.$inferInsert;

export type PurchaseCommitment = typeof purchaseCommitments.$inferSelect;
export type InsertPurchaseCommitment = typeof purchaseCommitments.$inferInsert;

export type ThreeWayMatch = typeof threeWayMatches.$inferSelect;
export type InsertThreeWayMatch = typeof threeWayMatches.$inferInsert;

export type MaterialLedgerDocument = typeof materialLedgerDocuments.$inferSelect;
export type InsertMaterialLedgerDocument = typeof materialLedgerDocuments.$inferInsert;

export type PriceVarianceAnalysis = typeof priceVarianceAnalysis.$inferSelect;
export type InsertPriceVarianceAnalysis = typeof priceVarianceAnalysis.$inferInsert;

export type PeriodEndValuation = typeof periodEndValuations.$inferSelect;
export type InsertPeriodEndValuation = typeof periodEndValuations.$inferInsert;

export type EnhancedMovementType = typeof enhancedMovementTypes.$inferSelect;
export type InsertEnhancedMovementType = typeof enhancedMovementTypes.$inferInsert;

export type EnhancedValuationClass = typeof enhancedValuationClasses.$inferSelect;
export type InsertEnhancedValuationClass = typeof enhancedValuationClasses.$inferInsert;