/**
 * GIGANTIC TABLES INTEGRATION SERVICE
 * Dynamic Table Structure and Business Process Integration
 * 
 * This service handles automatic population of enterprise_transaction_registry 
 * and material_movement_registry during all business transactions
 */

import { db } from "../db";
import { pool } from "../db";
import { 
  enterpriseTransactionRegistry, 
  materialMovementRegistry,
  type InsertEnterpriseTransactionRegistry,
  type InsertMaterialMovementRegistry 
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class GiganticTablesIntegrationService {
  
  // ===================================================================
  // ENTERPRISE TRANSACTION REGISTRY OPERATIONS
  // ===================================================================

  /**
   * Create Financial Transaction Entry
   * Automatically called during sales, purchase, and production transactions
   */
  async createFinancialTransaction(transactionData: {
    transactionCategory: "SALES" | "PURCHASE" | "PRODUCTION" | "INVENTORY" | "FINANCE";
    sourceApplication: string;
    referenceDocument: string;
    primaryAccount: string;
    netAmount: number;
    currencyCode?: string;
    customerVendorCode?: string;
    materialServiceCode?: string;
    costCenterCode: string;
    profitCenterCode: string;
    businessDate: Date;
    createdBy: number;
    // Dynamic fields for business context
    businessContext?: Record<string, any>;
  }) {
    const transactionUuid = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const currentDate = new Date();
    const fiscalPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Dynamic table structure - add fields based on transaction type
    const baseTransaction: InsertEnterpriseTransactionRegistry = {
      transactionUuid,
      businessEntityCode: "MALLY-CORP",
      fiscalPeriod,
      transactionCategory: transactionData.transactionCategory,
      sourceApplication: transactionData.sourceApplication,
      referenceDocument: transactionData.referenceDocument,
      primaryAccount: transactionData.primaryAccount,
      offsetAccount: this.determineOffsetAccount(transactionData.transactionCategory, transactionData.primaryAccount),
      debitAmount: transactionData.netAmount > 0 ? transactionData.netAmount.toString() : "0.00",
      creditAmount: transactionData.netAmount < 0 ? Math.abs(transactionData.netAmount).toString() : "0.00",
      netAmount: transactionData.netAmount.toString(),
      currencyCode: transactionData.currencyCode || "USD",
      baseCurrencyAmount: transactionData.netAmount.toString(),
      customerVendorCode: transactionData.customerVendorCode,
      materialServiceCode: transactionData.materialServiceCode,
      costCenterCode: transactionData.costCenterCode,
      profitCenterCode: transactionData.profitCenterCode,
      businessDate: transactionData.businessDate,
      postingDate: currentDate,
      createdBy: transactionData.createdBy,
      processingStatus: "ACTIVE",
      approvalStatus: "APPROVED",
      // Dynamic business context
      glAccountMaster: transactionData.businessContext?.glAccount || {},
      organizationalHierarchy: transactionData.businessContext?.organization || {},
      transactionMagnitude: this.calculateTransactionMagnitude(transactionData.netAmount),
      riskLevel: this.assessRiskLevel(transactionData.netAmount, transactionData.transactionCategory),
      businessImpactRating: this.calculateBusinessImpact(transactionData.netAmount),
    };

    // Add dynamic fields based on transaction category
    if (transactionData.transactionCategory === "SALES") {
      baseTransaction.customerMasterRef = transactionData.customerVendorCode;
    } else if (transactionData.transactionCategory === "PURCHASE") {
      baseTransaction.vendorMasterRef = transactionData.customerVendorCode;
    }

    const [result] = await db.insert(enterpriseTransactionRegistry)
      .values(baseTransaction)
      .returning();

    console.log(`Financial transaction created: ${transactionUuid} for ${transactionData.transactionCategory}`);
    return result;
  }

  /**
   * Update Financial Transaction
   * Dynamic structure allows adding new fields without schema changes
   */
  async updateFinancialTransaction(transactionUuid: string, updates: Partial<InsertEnterpriseTransactionRegistry>) {
    const [result] = await db.update(enterpriseTransactionRegistry)
      .set({
        ...updates,
        versionNumber: 2, // Increment version for audit trail
        lastSyncTimestamp: new Date(),
      })
      .where(eq(enterpriseTransactionRegistry.transactionUuid, transactionUuid))
      .returning();

    return result;
  }

  // ===================================================================
  // MATERIAL MOVEMENT REGISTRY OPERATIONS
  // ===================================================================

  /**
   * Create Material Movement Entry
   * Automatically called during inventory transactions, goods receipts, material issues
   */
  async createMaterialMovement(movementData: {
    movementCategory: "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT";
    businessTransactionType: string;
    materialIdentifier: string;
    materialDescription: string;
    movementQuantity: number;
    unitValuation: number;
    destinationLocationCode: string;
    sourceLocationCode?: string;
    originatingDocument: string;
    businessPartnerCode?: string;
    createdBy: number;
    // Dynamic fields for business context
    businessContext?: Record<string, any>;
  }) {
    const movementUuid = `MMV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const movementSequence = `SEQ-${Date.now()}`;
    const currentDate = new Date();

    // Dynamic table structure - add fields based on movement type
    const baseMovement: InsertMaterialMovementRegistry = {
      movementUuid,
      movementSequence,
      movementCategory: movementData.movementCategory,
      movementSubcategory: this.determineMovementSubcategory(movementData.movementCategory, movementData.businessTransactionType),
      businessTransactionType: movementData.businessTransactionType,
      materialIdentifier: movementData.materialIdentifier,
      materialDescription: movementData.materialDescription,
      destinationLocationCode: movementData.destinationLocationCode,
      sourceLocationCode: movementData.sourceLocationCode,
      movementQuantity: movementData.movementQuantity.toString(),
      baseUnitMeasure: "EA", // Default, can be dynamic
      unitValuation: movementData.unitValuation.toString(),
      totalValuation: (movementData.movementQuantity * movementData.unitValuation).toString(),
      originatingDocument: movementData.originatingDocument,
      businessPartnerCode: movementData.businessPartnerCode,
      executionDate: currentDate,
      postingDate: currentDate,
      effectiveDate: currentDate,
      createdBy: movementData.createdBy,
      processingStatus: "COMPLETED",
      qualityStatus: "RELEASED",
      // Dynamic business context
      masterDataEnrichment: movementData.businessContext?.masterData || {},
      organizationalContext: movementData.businessContext?.organization || {},
      businessImpactRating: this.calculateMaterialImpact(movementData.movementQuantity * movementData.unitValuation),
    };

    // Add dynamic fields based on movement category
    if (movementData.movementCategory === "RECEIPT") {
      baseMovement.purchaseOrderReference = movementData.originatingDocument;
    } else if (movementData.movementCategory === "ISSUE") {
      baseMovement.salesOrderReference = movementData.originatingDocument;
    }

    const [result] = await db.insert(materialMovementRegistry)
      .values(baseMovement)
      .returning();

    console.log(`Material movement created: ${movementUuid} for ${movementData.movementCategory}`);
    return result;
  }

  /**
   * Update Material Movement
   * Dynamic structure allows adding new fields without schema changes
   */
  async updateMaterialMovement(movementUuid: string, updates: Partial<InsertMaterialMovementRegistry>) {
    const [result] = await db.update(materialMovementRegistry)
      .set({
        ...updates,
        versionNumber: 2, // Increment version for audit trail
        lastSyncTimestamp: new Date(),
      })
      .where(eq(materialMovementRegistry.movementUuid, movementUuid))
      .returning();

    return result;
  }

  // ===================================================================
  // BUSINESS PROCESS INTEGRATION TRIGGERS
  // ===================================================================

  /**
   * Sales Order Processing Integration
   * Called when sales orders are created/confirmed
   */
  async integrateSalesOrder(salesOrderData: {
    salesOrderNumber: string;
    customerCode: string;
    totalAmount: number;
    items: Array<{
      materialCode: string;
      materialDescription: string;
      quantity: number;
      unitPrice: number;
    }>;
    createdBy: number;
  }) {
    const transactions = [];

    // 1. Create financial transaction for sales order
    const financialTransaction = await this.createFinancialTransaction({
      transactionCategory: "SALES",
      sourceApplication: "SALES_ORDER_PROCESSING",
      referenceDocument: salesOrderData.salesOrderNumber,
      primaryAccount: "1300", // Accounts Receivable
      netAmount: salesOrderData.totalAmount,
      customerVendorCode: salesOrderData.customerCode,
      costCenterCode: "CC001",
      profitCenterCode: "PC001",
      businessDate: new Date(),
      createdBy: salesOrderData.createdBy,
      businessContext: {
        glAccount: { accountType: "RECEIVABLE", accountGroup: "CUSTOMER" },
        organization: { businessArea: "SALES", valueStream: "ORDER_TO_CASH" }
      }
    });

    transactions.push(financialTransaction);

    // 2. Create material movements for each item (future delivery)
    for (const item of salesOrderData.items) {
      const materialMovement = await this.createMaterialMovement({
        movementCategory: "ISSUE",
        businessTransactionType: "SALES_ORDER_COMMITMENT",
        materialIdentifier: item.materialCode,
        materialDescription: item.materialDescription,
        movementQuantity: -item.quantity, // Negative for planned issue
        unitValuation: item.unitPrice,
        destinationLocationCode: "CUSTOMER",
        sourceLocationCode: "FG-MAIN",
        originatingDocument: salesOrderData.salesOrderNumber,
        businessPartnerCode: salesOrderData.customerCode,
        createdBy: salesOrderData.createdBy,
        businessContext: {
          masterData: { materialClassification: "FINISHED_GOODS", businessImpact: "HIGH" },
          organization: { valueStream: "ORDER_TO_CASH", businessArea: "SALES" }
        }
      });

      transactions.push(materialMovement);
    }

    return transactions;
  }

  /**
   * Inventory Receipt Integration
   * Called when goods are received from vendors
   */
  async integrateInventoryReceipt(receiptData: {
    receiptNumber: string;
    vendorCode: string;
    items: Array<{
      materialCode: string;
      materialDescription: string;
      quantity: number;
      unitCost: number;
    }>;
    createdBy: number;
  }) {
    const transactions = [];

    // Calculate total receipt value
    const totalValue = receiptData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    // 1. Create financial transaction for inventory receipt
    const financialTransaction = await this.createFinancialTransaction({
      transactionCategory: "PURCHASE",
      sourceApplication: "INVENTORY_MANAGEMENT",
      referenceDocument: receiptData.receiptNumber,
      primaryAccount: "1400", // Inventory Asset
      netAmount: totalValue,
      customerVendorCode: receiptData.vendorCode,
      costCenterCode: "CC002",
      profitCenterCode: "PC002",
      businessDate: new Date(),
      createdBy: receiptData.createdBy,
      businessContext: {
        glAccount: { accountType: "ASSET", accountGroup: "INVENTORY" },
        organization: { businessArea: "PROCUREMENT", valueStream: "PROCURE_TO_PAY" }
      }
    });

    transactions.push(financialTransaction);

    // 2. Create material movements for each received item
    for (const item of receiptData.items) {
      const materialMovement = await this.createMaterialMovement({
        movementCategory: "RECEIPT",
        businessTransactionType: "GOODS_RECEIPT_PURCHASE",
        materialIdentifier: item.materialCode,
        materialDescription: item.materialDescription,
        movementQuantity: item.quantity,
        unitValuation: item.unitCost,
        destinationLocationCode: "RM-MAIN",
        originatingDocument: receiptData.receiptNumber,
        businessPartnerCode: receiptData.vendorCode,
        createdBy: receiptData.createdBy,
        businessContext: {
          masterData: { materialClassification: "RAW_MATERIAL", businessImpact: "MEDIUM" },
          organization: { valueStream: "PROCURE_TO_PAY", businessArea: "PROCUREMENT" }
        }
      });

      transactions.push(materialMovement);
    }

    return transactions;
  }

  // ===================================================================
  // QUERY OPERATIONS FOR GIGANTIC TABLES
  // ===================================================================

  /**
   * Get Financial Transactions with dynamic filtering
   */
  async getFinancialTransactions(filters: {
    transactionCategory?: string;
    dateFrom?: Date;
    dateTo?: Date;
    customerVendorCode?: string;
    materialCode?: string;
    limit?: number;
  } = {}) {
    let query = db.select().from(enterpriseTransactionRegistry);

    // Apply dynamic filters
    if (filters.transactionCategory) {
      query = query.where(eq(enterpriseTransactionRegistry.transactionCategory, filters.transactionCategory));
    }

    const results = await query
      .orderBy(desc(enterpriseTransactionRegistry.createdTimestamp))
      .limit(filters.limit || 100);

    return results;
  }

  /**
   * Get Material Movements with dynamic filtering
   */
  async getMaterialMovements(filters: {
    movementCategory?: string;
    materialIdentifier?: string;
    dateFrom?: Date;
    dateTo?: Date;
    locationCode?: string;
    limit?: number;
  } = {}) {
    let query = db.select().from(materialMovementRegistry);

    // Apply dynamic filters
    if (filters.movementCategory) {
      query = query.where(eq(materialMovementRegistry.movementCategory, filters.movementCategory));
    }

    const results = await query
      .orderBy(desc(materialMovementRegistry.createdTimestamp))
      .limit(filters.limit || 100);

    return results;
  }

  // ===================================================================
  // HELPER METHODS FOR DYNAMIC BUSINESS LOGIC
  // ===================================================================

  private determineOffsetAccount(transactionCategory: string, primaryAccount: string): string {
    const offsetMapping: Record<string, string> = {
      "SALES": "4000", // Revenue
      "PURCHASE": "2100", // Accounts Payable
      "PRODUCTION": "5000", // Cost of Goods Sold
      "INVENTORY": "1400", // Inventory Asset
      "FINANCE": "1000", // Cash
    };
    return offsetMapping[transactionCategory] || "9999";
  }

  private determineMovementSubcategory(category: string, businessType: string): string {
    const subcategoryMapping: Record<string, string> = {
      "RECEIPT": "GOODS_RECEIPT",
      "ISSUE": "GOODS_ISSUE",
      "TRANSFER": "STOCK_TRANSFER",
      "ADJUSTMENT": "INVENTORY_ADJUSTMENT",
    };
    return subcategoryMapping[category] || "OTHER";
  }

  private calculateTransactionMagnitude(amount: number): string {
    if (Math.abs(amount) > 100000) return "LARGE";
    if (Math.abs(amount) > 10000) return "MEDIUM";
    return "SMALL";
  }

  private assessRiskLevel(amount: number, category: string): string {
    if (Math.abs(amount) > 50000) return "HIGH";
    if (Math.abs(amount) > 10000) return "MEDIUM";
    return "LOW";
  }

  private calculateBusinessImpact(amount: number): string {
    if (Math.abs(amount) > 75000) return "CRITICAL";
    if (Math.abs(amount) > 25000) return "HIGH";
    if (Math.abs(amount) > 5000) return "MEDIUM";
    return "LOW";
  }

  private calculateMaterialImpact(value: number): string {
    if (value > 50000) return "CRITICAL";
    if (value > 15000) return "HIGH";
    if (value > 3000) return "MEDIUM";
    return "LOW";
  }

  // ===================================================================
  // NEW INVENTORY TABLES INTEGRATION
  // ===================================================================

  /**
   * Integrate Stock Movement with Gigantic Tables
   * Called when stock_movements table receives new entries
   */
  async integrateStockMovement(stockMovementData: {
    documentNumber: string;
    materialCode: string;
    plantCode: string;
    storageLocation: string;
    movementType: string;
    quantity: number;
    unitPrice?: number;
    totalValue?: number;
    costCenter?: string;
    vendorCode?: string;
    customerCode?: string;
    createdBy: number;
  }) {
    const transactions = [];

    // 1. Create material movement entry in gigantic table
    const materialMovement = await this.createMaterialMovement({
      movementCategory: this.mapMovementTypeToCategory(stockMovementData.movementType),
      businessTransactionType: `STOCK_MOVEMENT_${stockMovementData.movementType}`,
      materialIdentifier: stockMovementData.materialCode,
      materialDescription: await this.getMaterialDescription(stockMovementData.materialCode),
      movementQuantity: stockMovementData.quantity,
      unitValuation: stockMovementData.unitPrice || 0,
      destinationLocationCode: stockMovementData.storageLocation,
      sourceLocationCode: stockMovementData.plantCode,
      originatingDocument: stockMovementData.documentNumber,
      businessPartnerCode: stockMovementData.vendorCode || stockMovementData.customerCode,
      createdBy: stockMovementData.createdBy,
      businessContext: {
        masterData: { 
          plantCode: stockMovementData.plantCode,
          storageLocation: stockMovementData.storageLocation,
          movementType: stockMovementData.movementType
        },
        organization: { 
          valueStream: "INVENTORY_MANAGEMENT", 
          businessArea: "MATERIALS_MANAGEMENT",
          costCenter: stockMovementData.costCenter
        }
      }
    });

    transactions.push(materialMovement);

    // 2. Create financial transaction if there's a value impact
    if (stockMovementData.totalValue && stockMovementData.totalValue !== 0) {
      const financialTransaction = await this.createFinancialTransaction({
        transactionCategory: "INVENTORY",
        sourceApplication: "INVENTORY_MANAGEMENT",
        referenceDocument: stockMovementData.documentNumber,
        primaryAccount: "1400", // Inventory Asset
        netAmount: stockMovementData.totalValue,
        materialServiceCode: stockMovementData.materialCode,
        costCenterCode: stockMovementData.costCenter || "CC001",
        profitCenterCode: "PC001",
        businessDate: new Date(),
        createdBy: stockMovementData.createdBy,
        businessContext: {
          glAccount: { accountType: "ASSET", accountGroup: "INVENTORY" },
          organization: { businessArea: "MATERIALS_MANAGEMENT", valueStream: "INVENTORY_CONTROL" }
        }
      });

      transactions.push(financialTransaction);
    }

    return transactions;
  }

  /**
   * Integrate Inventory Balance Changes with Gigantic Tables
   * Called when inventory_balance table is updated
   */
  async integrateInventoryBalance(balanceData: {
    materialCode: string;
    plantCode: string;
    storageLocation: string;
    quantityChange: number;
    valueChange: number;
    movingAveragePriceChange: number;
    reasonCode: string;
    createdBy: number;
  }) {
    const transactions = [];

    // Create financial transaction for inventory revaluation
    if (balanceData.valueChange !== 0) {
      const financialTransaction = await this.createFinancialTransaction({
        transactionCategory: "INVENTORY",
        sourceApplication: "INVENTORY_VALUATION",
        referenceDocument: `REVAL-${Date.now()}`,
        primaryAccount: "1400", // Inventory Asset
        netAmount: balanceData.valueChange,
        materialServiceCode: balanceData.materialCode,
        costCenterCode: "CC001",
        profitCenterCode: "PC001", 
        businessDate: new Date(),
        createdBy: balanceData.createdBy,
        businessContext: {
          glAccount: { accountType: "ASSET", accountGroup: "INVENTORY_REVALUATION" },
          organization: { businessArea: "MATERIALS_MANAGEMENT", valueStream: "INVENTORY_VALUATION" },
          revaluation: {
            oldPrice: balanceData.movingAveragePriceChange,
            quantityAffected: balanceData.quantityChange,
            reasonCode: balanceData.reasonCode
          }
        }
      });

      transactions.push(financialTransaction);
    }

    return transactions;
  }

  /**
   * Integrate Physical Inventory with Gigantic Tables
   * Called when physical_inventory table receives count results
   */
  async integratePhysicalInventory(physicalCountData: {
    materialCode: string;
    plantCode: string;
    storageLocation: string;
    systemQuantity: number;
    countedQuantity: number;
    variance: number;
    varianceValue: number;
    countDocument: string;
    createdBy: number;
  }) {
    const transactions = [];

    // 1. Create material movement for variance adjustment
    if (physicalCountData.variance !== 0) {
      const materialMovement = await this.createMaterialMovement({
        movementCategory: "ADJUSTMENT",
        businessTransactionType: "PHYSICAL_INVENTORY_ADJUSTMENT",
        materialIdentifier: physicalCountData.materialCode,
        materialDescription: await this.getMaterialDescription(physicalCountData.materialCode),
        movementQuantity: physicalCountData.variance,
        unitValuation: physicalCountData.varianceValue / physicalCountData.variance,
        destinationLocationCode: physicalCountData.storageLocation,
        sourceLocationCode: "PHYSICAL_COUNT_ADJUSTMENT",
        originatingDocument: physicalCountData.countDocument,
        createdBy: physicalCountData.createdBy,
        businessContext: {
          masterData: { 
            plantCode: physicalCountData.plantCode,
            countType: "PHYSICAL_INVENTORY",
            systemQuantity: physicalCountData.systemQuantity,
            countedQuantity: physicalCountData.countedQuantity
          },
          organization: { 
            valueStream: "INVENTORY_ACCURACY", 
            businessArea: "WAREHOUSE_MANAGEMENT"
          }
        }
      });

      transactions.push(materialMovement);

      // 2. Create financial transaction for inventory adjustment
      const financialTransaction = await this.createFinancialTransaction({
        transactionCategory: "INVENTORY",
        sourceApplication: "PHYSICAL_INVENTORY",
        referenceDocument: physicalCountData.countDocument,
        primaryAccount: "1400", // Inventory Asset
        netAmount: physicalCountData.varianceValue,
        materialServiceCode: physicalCountData.materialCode,
        costCenterCode: "CC001",
        profitCenterCode: "PC001",
        businessDate: new Date(),
        createdBy: physicalCountData.createdBy,
        businessContext: {
          glAccount: { accountType: "ASSET", accountGroup: "INVENTORY_ADJUSTMENT" },
          organization: { businessArea: "WAREHOUSE_MANAGEMENT", valueStream: "INVENTORY_ACCURACY" },
          adjustment: {
            adjustmentType: "PHYSICAL_INVENTORY",
            varianceQuantity: physicalCountData.variance,
            varianceValue: physicalCountData.varianceValue
          }
        }
      });

      transactions.push(financialTransaction);
    }

    return transactions;
  }

  // ===================================================================
  // SALES AND FINANCE INTEGRATION ENHANCEMENT
  // ===================================================================

  /**
   * Integrate Sales Orders from erp_sales_orders table
   */
  async integrateSalesOrderFromERP(salesOrderData: {
    salesOrderId: number;
    customerCode: string;
    orderNumber: string;
    totalAmount: number;
    currency: string;
    orderDate: Date;
    createdBy: number;
  }) {
    // Create financial transaction for sales order
    const financialTransaction = await this.createFinancialTransaction({
      transactionCategory: "SALES",
      sourceApplication: "SALES_ORDER_MANAGEMENT",
      referenceDocument: salesOrderData.orderNumber,
      primaryAccount: "1300", // Accounts Receivable
      netAmount: salesOrderData.totalAmount,
      currencyCode: salesOrderData.currency,
      customerVendorCode: salesOrderData.customerCode,
      costCenterCode: "CC001",
      profitCenterCode: "PC001",
      businessDate: salesOrderData.orderDate,
      createdBy: salesOrderData.createdBy,
      businessContext: {
        glAccount: { accountType: "RECEIVABLE", accountGroup: "CUSTOMER" },
        organization: { businessArea: "SALES", valueStream: "ORDER_TO_CASH" },
        salesOrder: {
          salesOrderId: salesOrderData.salesOrderId,
          orderType: "STANDARD",
          customerReference: salesOrderData.customerCode
        }
      }
    });

    return [financialTransaction];
  }

  /**
   * Integrate Customer Payments from erp_payments table  
   */
  async integrateCustomerPayment(paymentData: {
    paymentId: number;
    customerCode: string;
    amount: number;
    currency: string;
    paymentDate: Date;
    referenceNumber: string;
    createdBy: number;
  }) {
    // Create financial transaction for customer payment
    const financialTransaction = await this.createFinancialTransaction({
      transactionCategory: "FINANCE",
      sourceApplication: "ACCOUNTS_RECEIVABLE",
      referenceDocument: paymentData.referenceNumber,
      primaryAccount: "1000", // Cash
      netAmount: paymentData.amount,
      currencyCode: paymentData.currency,
      customerVendorCode: paymentData.customerCode,
      costCenterCode: "CC001",
      profitCenterCode: "PC001",
      businessDate: paymentData.paymentDate,
      createdBy: paymentData.createdBy,
      businessContext: {
        glAccount: { accountType: "ASSET", accountGroup: "CASH" },
        organization: { businessArea: "FINANCE", valueStream: "ORDER_TO_CASH" },
        payment: {
          paymentId: paymentData.paymentId,
          paymentType: "CUSTOMER_PAYMENT",
          clearingDocument: paymentData.referenceNumber
        }
      }
    });

    return [financialTransaction];
  }

  /**
   * Integrate Vendor Invoices from erp_vendor_invoices table
   */
  async integrateVendorInvoice(invoiceData: {
    invoiceId: number;
    vendorCode: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    invoiceDate: Date;
    createdBy: number;
  }) {
    // Create financial transaction for vendor invoice
    const financialTransaction = await this.createFinancialTransaction({
      transactionCategory: "PURCHASE",
      sourceApplication: "ACCOUNTS_PAYABLE",
      referenceDocument: invoiceData.invoiceNumber,
      primaryAccount: "2100", // Accounts Payable
      netAmount: invoiceData.amount,
      currencyCode: invoiceData.currency,
      customerVendorCode: invoiceData.vendorCode,
      costCenterCode: "CC002",
      profitCenterCode: "PC002",
      businessDate: invoiceData.invoiceDate,
      createdBy: invoiceData.createdBy,
      businessContext: {
        glAccount: { accountType: "LIABILITY", accountGroup: "VENDOR" },
        organization: { businessArea: "PROCUREMENT", valueStream: "PROCURE_TO_PAY" },
        invoice: {
          invoiceId: invoiceData.invoiceId,
          invoiceType: "VENDOR_INVOICE",
          vendorReference: invoiceData.vendorCode
        }
      }
    });

    return [financialTransaction];
  }

  // ===================================================================
  // HELPER METHODS FOR NEW INTEGRATIONS
  // ===================================================================

  private mapMovementTypeToCategory(movementType: string): "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT" {
    const movementMapping: Record<string, "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT"> = {
      "101": "RECEIPT",     // Purchase Receipt
      "102": "RECEIPT",     // Stock Receipt
      "131": "RECEIPT",     // Production Receipt
      "601": "ISSUE",       // Sales Issue
      "602": "ISSUE",       // Production Issue
      "261": "ISSUE",       // Production Issue
      "301": "TRANSFER",    // Stock Transfer
      "302": "TRANSFER",    // Transfer
      "701": "ADJUSTMENT",  // Inventory Adjustment
      "702": "ADJUSTMENT"   // Physical Inventory
    };
    return movementMapping[movementType] || "ADJUSTMENT";
  }

  private async getMaterialDescription(materialCode: string): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT description FROM materials WHERE code = $1
        UNION ALL
        SELECT material_description FROM inventory_balance WHERE material_code = $1
        LIMIT 1
      `, [materialCode]);
      
      return result.rows[0]?.description || result.rows[0]?.material_description || materialCode;
    } catch (error) {
      console.error('Error fetching material description:', error);
      return materialCode;
    }
  }

  /**
   * Sync All New Inventory Data to Gigantic Tables
   * Processes all existing inventory records to populate gigantic tables
   */
  async syncAllInventoryToGigantic() {
    const results = {
      stockMovements: 0,
      inventoryBalances: 0,
      physicalInventory: 0,
      errors: []
    };

    try {
      // 1. Sync all stock movements
      const stockMovements = await pool.query(`
        SELECT document_number, material_code, plant_code, storage_location, 
               movement_type, quantity, unit_price, total_value, cost_center,
               vendor_code, customer_code, 1 as created_by
        FROM stock_movements 
        WHERE document_number NOT IN (
          SELECT reference_document FROM enterprise_transaction_registry 
          WHERE source_application = 'INVENTORY_MANAGEMENT'
        )
      `);

      for (const movement of stockMovements.rows) {
        try {
          await this.integrateStockMovement(movement);
          results.stockMovements++;
        } catch (error) {
          results.errors.push(`Stock movement ${movement.document_number}: ${error.message}`);
        }
      }

      // 2. Sync sales orders from erp_sales_orders
      const salesOrders = await pool.query(`
        SELECT id as sales_order_id, customer_id as customer_code, 
               order_number, total_amount, 'USD' as currency, 
               order_date, 1 as created_by
        FROM erp_sales_orders 
        WHERE order_number NOT IN (
          SELECT reference_document FROM enterprise_transaction_registry 
          WHERE source_application = 'SALES_ORDER_MANAGEMENT'
        )
      `);

      for (const order of salesOrders.rows) {
        try {
          await this.integrateSalesOrderFromERP(order);
          results.stockMovements++; // Using same counter for simplicity
        } catch (error) {
          results.errors.push(`Sales order ${order.order_number}: ${error.message}`);
        }
      }

      console.log(`Gigantic tables sync completed: ${JSON.stringify(results)}`);
      return results;

    } catch (error) {
      console.error('Error syncing to gigantic tables:', error);
      results.errors.push(`Sync error: ${error.message}`);
      return results;
    }
  }
}

// Export singleton instance
export const giganticTablesService = new GiganticTablesIntegrationService();