/**
 * GIGANTIC TABLES API ROUTES
 * Complete CRUD operations for Enterprise Transaction Registry and Material Movement Registry
 * Dynamic Table Structure with Business Process Integration
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  enterpriseTransactionRegistry, 
  materialMovementRegistry,
  insertEnterpriseTransactionRegistrySchema,
  insertMaterialMovementRegistrySchema
} from "@shared/schema";
import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";
import { giganticTablesService } from "../services/gigantic-tables-integration";

const router = Router();

// ===================================================================
// ENTERPRISE TRANSACTION REGISTRY ROUTES
// ===================================================================

/**
 * GET /api/gigantic-tables/financial-transactions
 * Retrieve financial transactions with dynamic filtering
 */
router.get("/financial-transactions", async (req, res) => {
  try {
    const {
      category = "",
      dateFrom = "",
      dateTo = "",
      customerVendor = "",
      material = "",
      limit = "100"
    } = req.query;

    const filters: any = {};
    if (category) filters.transactionCategory = category;
    if (customerVendor) filters.customerVendorCode = customerVendor;
    if (material) filters.materialCode = material;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    if (limit) filters.limit = parseInt(limit as string);

    const transactions = await giganticTablesService.getFinancialTransactions(filters);

    // Calculate statistics
    const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.netAmount || "0"), 0);
    const transactionsByCategory = transactions.reduce((acc: any, t) => {
      acc[t.transactionCategory] = (acc[t.transactionCategory] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        transactions,
        statistics: {
          totalTransactions: transactions.length,
          totalAmount,
          averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0,
          transactionsByCategory,
          dateRange: {
            from: dateFrom || "N/A",
            to: dateTo || "N/A"
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Financial transactions retrieval error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve financial transactions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/gigantic-tables/financial-transactions
 * Create new financial transaction with dynamic structure
 */
const createFinancialTransactionSchema = z.object({
  transactionCategory: z.enum(["SALES", "PURCHASE", "PRODUCTION", "INVENTORY", "FINANCE"]),
  sourceApplication: z.string().min(1),
  referenceDocument: z.string().min(1),
  primaryAccount: z.string().min(1),
  netAmount: z.number(),
  currencyCode: z.string().optional().default("USD"),
  customerVendorCode: z.string().optional(),
  materialServiceCode: z.string().optional(),
  costCenterCode: z.string().min(1),
  profitCenterCode: z.string().min(1),
  businessDate: z.string().transform(str => new Date(str)),
  createdBy: z.number(),
  businessContext: z.record(z.any()).optional()
});

router.post("/financial-transactions", async (req, res) => {
  try {
    const validatedData = createFinancialTransactionSchema.parse(req.body);
    
    const transaction = await giganticTablesService.createFinancialTransaction(validatedData);

    res.json({
      success: true,
      data: transaction,
      message: "Financial transaction created successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Financial transaction creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create financial transaction",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PUT /api/gigantic-tables/financial-transactions/:uuid
 * Update financial transaction with dynamic fields
 */
router.put("/financial-transactions/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const updates = req.body;

    const transaction = await giganticTablesService.updateFinancialTransaction(uuid, updates);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Financial transaction not found"
      });
    }

    res.json({
      success: true,
      data: transaction,
      message: "Financial transaction updated successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Financial transaction update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update financial transaction",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ===================================================================
// MATERIAL MOVEMENT REGISTRY ROUTES
// ===================================================================

/**
 * GET /api/gigantic-tables/material-movements
 * Retrieve material movements with dynamic filtering
 */
router.get("/material-movements", async (req, res) => {
  try {
    const {
      category = "",
      material = "",
      dateFrom = "",
      dateTo = "",
      location = "",
      limit = "100"
    } = req.query;

    const filters: any = {};
    if (category) filters.movementCategory = category;
    if (material) filters.materialIdentifier = material;
    if (location) filters.locationCode = location;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    if (limit) filters.limit = parseInt(limit as string);

    const movements = await giganticTablesService.getMaterialMovements(filters);

    // Calculate statistics
    const totalQuantity = movements.reduce((sum, m) => sum + parseFloat(m.movementQuantity || "0"), 0);
    const totalValue = movements.reduce((sum, m) => sum + parseFloat(m.totalValuation || "0"), 0);
    const movementsByCategory = movements.reduce((acc: any, m) => {
      acc[m.movementCategory] = (acc[m.movementCategory] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        movements,
        statistics: {
          totalMovements: movements.length,
          totalQuantity,
          totalValue,
          averageValue: movements.length > 0 ? totalValue / movements.length : 0,
          movementsByCategory,
          dateRange: {
            from: dateFrom || "N/A",
            to: dateTo || "N/A"
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Material movements retrieval error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve material movements",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/gigantic-tables/material-movements
 * Create new material movement with dynamic structure
 */
const createMaterialMovementSchema = z.object({
  movementCategory: z.enum(["RECEIPT", "ISSUE", "TRANSFER", "ADJUSTMENT"]),
  businessTransactionType: z.string().min(1),
  materialIdentifier: z.string().min(1),
  materialDescription: z.string().min(1),
  movementQuantity: z.number(),
  unitValuation: z.number(),
  destinationLocationCode: z.string().min(1),
  sourceLocationCode: z.string().optional(),
  originatingDocument: z.string().min(1),
  businessPartnerCode: z.string().optional(),
  createdBy: z.number(),
  businessContext: z.record(z.any()).optional()
});

router.post("/material-movements", async (req, res) => {
  try {
    const validatedData = createMaterialMovementSchema.parse(req.body);
    
    const movement = await giganticTablesService.createMaterialMovement(validatedData);

    res.json({
      success: true,
      data: movement,
      message: "Material movement created successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Material movement creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create material movement",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * PUT /api/gigantic-tables/material-movements/:uuid
 * Update material movement with dynamic fields
 */
router.put("/material-movements/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const updates = req.body;

    const movement = await giganticTablesService.updateMaterialMovement(uuid, updates);

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: "Material movement not found"
      });
    }

    res.json({
      success: true,
      data: movement,
      message: "Material movement updated successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Material movement update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update material movement",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ===================================================================
// BUSINESS PROCESS INTEGRATION ROUTES
// ===================================================================

/**
 * POST /api/gigantic-tables/integrate-sales-order
 * Integrate sales order with both gigantic tables
 */
const integrateSalesOrderSchema = z.object({
  salesOrderNumber: z.string().min(1),
  customerCode: z.string().min(1),
  totalAmount: z.number(),
  items: z.array(z.object({
    materialCode: z.string().min(1),
    materialDescription: z.string().min(1),
    quantity: z.number(),
    unitPrice: z.number()
  })),
  createdBy: z.number()
});

router.post("/integrate-sales-order", async (req, res) => {
  try {
    const validatedData = integrateSalesOrderSchema.parse(req.body);
    
    const transactions = await giganticTablesService.integrateSalesOrder(validatedData);

    res.json({
      success: true,
      data: {
        integratedTransactions: transactions.length,
        financialTransactions: transactions.filter(t => t.hasOwnProperty('transactionUuid')).length,
        materialMovements: transactions.filter(t => t.hasOwnProperty('movementUuid')).length,
        transactions
      },
      message: "Sales order integrated successfully into gigantic tables",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Sales order integration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to integrate sales order",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/gigantic-tables/integrate-inventory-receipt
 * Integrate inventory receipt with both gigantic tables
 */
const integrateInventoryReceiptSchema = z.object({
  receiptNumber: z.string().min(1),
  vendorCode: z.string().min(1),
  items: z.array(z.object({
    materialCode: z.string().min(1),
    materialDescription: z.string().min(1),
    quantity: z.number(),
    unitCost: z.number()
  })),
  createdBy: z.number()
});

router.post("/integrate-inventory-receipt", async (req, res) => {
  try {
    const validatedData = integrateInventoryReceiptSchema.parse(req.body);
    
    const transactions = await giganticTablesService.integrateInventoryReceipt(validatedData);

    res.json({
      success: true,
      data: {
        integratedTransactions: transactions.length,
        financialTransactions: transactions.filter(t => t.hasOwnProperty('transactionUuid')).length,
        materialMovements: transactions.filter(t => t.hasOwnProperty('movementUuid')).length,
        transactions
      },
      message: "Inventory receipt integrated successfully into gigantic tables",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Inventory receipt integration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to integrate inventory receipt",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ===================================================================
// ANALYTICS AND REPORTING ROUTES
// ===================================================================

/**
 * GET /api/gigantic-tables/business-process-analytics
 * Get integrated analytics across both gigantic tables
 */
router.get("/business-process-analytics", async (req, res) => {
  try {
    const [financialTransactions, materialMovements] = await Promise.all([
      giganticTablesService.getFinancialTransactions({ limit: 1000 }),
      giganticTablesService.getMaterialMovements({ limit: 1000 })
    ]);

    // Cross-table analytics
    const totalFinancialValue = financialTransactions.reduce((sum, t) => sum + parseFloat(t.netAmount || "0"), 0);
    const totalMaterialValue = materialMovements.reduce((sum, m) => sum + parseFloat(m.totalValuation || "0"), 0);

    const processTypes = {
      sales: financialTransactions.filter(t => t.transactionCategory === "SALES").length,
      purchase: financialTransactions.filter(t => t.transactionCategory === "PURCHASE").length,
      production: financialTransactions.filter(t => t.transactionCategory === "PRODUCTION").length
    };

    const movementTypes = {
      receipts: materialMovements.filter(m => m.movementCategory === "RECEIPT").length,
      issues: materialMovements.filter(m => m.movementCategory === "ISSUE").length,
      transfers: materialMovements.filter(m => m.movementCategory === "TRANSFER").length
    };

    res.json({
      success: true,
      data: {
        overview: {
          totalFinancialTransactions: financialTransactions.length,
          totalMaterialMovements: materialMovements.length,
          totalFinancialValue,
          totalMaterialValue,
          integrationRate: Math.round((Math.min(financialTransactions.length, materialMovements.length) / Math.max(financialTransactions.length, materialMovements.length)) * 100)
        },
        processBreakdown: {
          financial: processTypes,
          material: movementTypes
        },
        recentActivity: {
          lastFinancialTransaction: financialTransactions[0]?.createdTimestamp || null,
          lastMaterialMovement: materialMovements[0]?.createdTimestamp || null
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Business process analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate business process analytics",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;