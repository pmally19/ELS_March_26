import { Request, Response, Router } from "express";
import { transactionalApplicationsService } from "../services/transactional-applications-service";
import { z } from "zod";
import { GiganticTablesIntegrationService } from "../services/gigantic-tables-integration";

const router = Router();
const giganticTablesService = new GiganticTablesIntegrationService();

// GL Document Posting
const glDocumentSchema = z.object({
  documentType: z.string(),
  companyCode: z.string(),
  documentDate: z.string().transform(str => new Date(str)),
  postingDate: z.string().transform(str => new Date(str)),
  reference: z.string(),
  currency: z.string().default("USD"),
  items: z.array(z.object({
    glAccount: z.string(),
    debitAmount: z.number(),
    creditAmount: z.number(),
    costCenter: z.string().optional(),
    description: z.string()
  }))
});

router.post("/gl-document", async (req: Request, res: Response) => {
  try {
    const documentData = glDocumentSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.createGLDocument(documentData);
    
    res.json({
      success: result.success,
      documentNumber: result.documentNumber,
      totalAmount: result.totalAmount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("GL document posting error:", error);
    res.status(500).json({ 
      success: false, 
      message: "GL document posting failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Automatic Clearing
const clearingSchema = z.object({
  accountNumber: z.string(),
  companyCode: z.string(),
  clearingDate: z.string().transform(str => new Date(str))
});

router.post("/automatic-clearing", async (req: Request, res: Response) => {
  try {
    const { accountNumber, companyCode, clearingDate } = clearingSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.performAutomaticClearing(
      accountNumber,
      companyCode,
      clearingDate
    );
    
    res.json({
      success: result.success,
      clearedItems: result.clearedItems,
      clearedAmount: result.clearedAmount,
      clearingDocument: result.clearingDocument,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Automatic clearing error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Automatic clearing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Period-End Closing
const periodEndSchema = z.object({
  companyCode: z.string(),
  fiscalYear: z.string(),
  period: z.string()
});

router.post("/period-end-closing", async (req: Request, res: Response) => {
  try {
    const { companyCode, fiscalYear, period } = periodEndSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.performPeriodEndClosing(
      companyCode,
      fiscalYear,
      period
    );
    
    res.json({
      success: result.success,
      tasksCompleted: result.tasksCompleted,
      warnings: result.warnings,
      closingDocument: result.closingDocument,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Period-end closing error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Period-end closing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Foreign Currency Valuation
const currencyValuationSchema = z.object({
  companyCode: z.string(),
  fiscalYear: z.string(),
  period: z.string()
});

router.post("/currency-valuation", async (req: Request, res: Response) => {
  try {
    const { companyCode, fiscalYear, period } = currencyValuationSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.performForeignCurrencyValuation(
      companyCode,
      fiscalYear,
      period
    );
    
    res.json({
      success: result.success,
      revaluationAmount: result.revaluationAmount,
      accountsProcessed: result.accountsProcessed,
      glDocument: result.glDocument,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Currency valuation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Currency valuation failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Payment Processing
const paymentSchema = z.object({
  paymentMethod: z.string(),
  paymentAmount: z.number(),
  currency: z.string().default("USD"),
  vendorId: z.number().optional(),
  customerId: z.number().optional(),
  bankAccount: z.string(),
  valueDate: z.string().transform(str => new Date(str)),
  reference: z.string()
});

router.post("/payment", async (req: Request, res: Response) => {
  try {
    const paymentData = paymentSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.processPayment(paymentData);
    
    res.json({
      success: result.success,
      paymentDocument: result.paymentDocument,
      clearingDocument: result.clearingDocument,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Payment processing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Credit Management
const creditCheckSchema = z.object({
  customerId: z.number(),
  orderAmount: z.number(),
  currency: z.string().default("USD")
});

router.post("/credit-check", async (req: Request, res: Response) => {
  try {
    const { customerId, orderAmount, currency } = creditCheckSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.checkCreditLimit(
      customerId,
      orderAmount,
      currency
    );
    
    res.json({
      approved: result.approved,
      creditLimit: result.creditLimit,
      currentExposure: result.currentExposure,
      availableCredit: result.availableCredit,
      riskClassification: result.riskClassification,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Credit check error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Credit check failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Goods Receipt
const goodsReceiptSchema = z.object({
  purchaseOrderId: z.number(),
  materialId: z.number(),
  quantity: z.number(),
  unitPrice: z.number(),
  plant: z.string(),
  storageLocation: z.string(),
  deliveryNote: z.string()
});

router.post("/goods-receipt", async (req: Request, res: Response) => {
  try {
    const receiptData = goodsReceiptSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.processGoodsReceipt(receiptData);
    
    // AUTOMATIC GIGANTIC TABLES INTEGRATION
    // Populate enterprise_transaction_registry and material_movement_registry
    try {
      const integrationResult = await giganticTablesService.integrateInventoryReceipt({
        receiptNumber: result.materialDocument,
        vendorCode: `VENDOR-${receiptData.purchaseOrderId}`,
        items: [{
          materialCode: `MAT-${receiptData.materialId}`,
          materialDescription: `Material ${receiptData.materialId}`,
          quantity: receiptData.quantity,
          unitCost: receiptData.unitPrice
        }],
        createdBy: 1
      });

      console.log(`✅ Gigantic Tables Integration: Created ${integrationResult.length} records for Goods Receipt ${result.materialDocument}`);
    } catch (integrationError) {
      console.error("❌ Gigantic Tables Integration Error:", integrationError);
      // Don't fail the goods receipt, just log the error
    }
    
    res.json({
      success: result.success,
      materialDocument: result.materialDocument,
      accountingDocument: result.accountingDocument,
      inventoryValue: result.inventoryValue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Goods receipt error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Goods receipt processing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Physical Inventory
const physicalInventorySchema = z.object({
  materialId: z.number(),
  plant: z.string(),
  storageLocation: z.string(),
  bookQuantity: z.number(),
  countedQuantity: z.number(),
  unitPrice: z.number()
});

router.post("/physical-inventory", async (req: Request, res: Response) => {
  try {
    const inventoryData = physicalInventorySchema.parse(req.body);
    
    const result = await transactionalApplicationsService.processPhysicalInventory(inventoryData);
    
    res.json({
      success: result.success,
      adjustmentDocument: result.adjustmentDocument,
      varianceQuantity: result.varianceQuantity,
      varianceValue: result.varianceValue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Physical inventory error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Physical inventory processing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Variance Analysis
const varianceAnalysisSchema = z.object({
  costCenter: z.string(),
  period: z.string(),
  fiscalYear: z.string()
});

router.post("/variance-analysis", async (req: Request, res: Response) => {
  try {
    const { costCenter, period, fiscalYear } = varianceAnalysisSchema.parse(req.body);
    
    const result = await transactionalApplicationsService.performVarianceAnalysis(
      costCenter,
      period,
      fiscalYear
    );
    
    res.json({
      success: result.success,
      plannedCosts: result.plannedCosts,
      actualCosts: result.actualCosts,
      variance: result.variance,
      variancePercent: result.variancePercent,
      analysis: result.analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Variance analysis error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Variance analysis failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// System Status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = await transactionalApplicationsService.getTransactionalSystemStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("System status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get system status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;