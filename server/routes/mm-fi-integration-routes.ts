import { Request, Response, Router } from "express";
import { mmfiIntegrationService } from "../services/mm-fi-integration-service";
import { z } from "zod";

const router = Router();

// Account Determination
const accountDeterminationSchema = z.object({
  materialId: z.number(),
  movementType: z.string(),
  plant: z.string().optional()
});

router.post("/account-determination", async (req: Request, res: Response) => {
  try {
    const { materialId, movementType, plant } = accountDeterminationSchema.parse(req.body);
    
    const accounts = await mmfiIntegrationService.determineAccounts(materialId, movementType, plant);
    
    res.json({
      success: true,
      accounts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Account determination error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Account determination failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Purchase Commitment Creation
const commitmentSchema = z.object({
  purchaseOrderId: z.number()
});

router.post("/create-commitment", async (req: Request, res: Response) => {
  try {
    const { purchaseOrderId } = commitmentSchema.parse(req.body);
    
    const commitments = await mmfiIntegrationService.createPurchaseCommitment(purchaseOrderId);
    
    res.json({
      success: true,
      commitments,
      totalValue: commitments.reduce((sum, c) => sum + c.totalValue, 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Purchase commitment creation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Purchase commitment creation failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Three-Way Matching
const threeWayMatchSchema = z.object({
  purchaseOrderId: z.number(),
  goodsReceiptId: z.number(),
  invoiceId: z.number()
});

router.post("/three-way-match", async (req: Request, res: Response) => {
  try {
    const { purchaseOrderId, goodsReceiptId, invoiceId } = threeWayMatchSchema.parse(req.body);
    
    const matchResult = await mmfiIntegrationService.performThreeWayMatch(
      purchaseOrderId, 
      goodsReceiptId, 
      invoiceId
    );
    
    res.json({
      success: true,
      matchResult,
      hasVariance: matchResult.status === 'variance',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Three-way matching error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Three-way matching failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Stock Movement GL Posting
const stockMovementSchema = z.object({
  materialId: z.number(),
  movementType: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  plant: z.string().optional(),
  costCenter: z.string().optional()
});

router.post("/post-stock-movement", async (req: Request, res: Response) => {
  try {
    const { materialId, movementType, quantity, unitPrice, plant, costCenter } = 
      stockMovementSchema.parse(req.body);
    
    await mmfiIntegrationService.postStockMovementToGL(
      materialId, 
      movementType, 
      quantity, 
      unitPrice, 
      plant, 
      costCenter
    );
    
    res.json({
      success: true,
      message: "Stock movement posted to GL successfully",
      totalValue: quantity * unitPrice,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Stock movement posting error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Stock movement posting failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Period-End Revaluation
const revaluationSchema = z.object({
  period: z.string()
});

router.post("/period-end-revaluation", async (req: Request, res: Response) => {
  try {
    const { period } = revaluationSchema.parse(req.body);
    
    await mmfiIntegrationService.performPeriodEndRevaluation(period);
    
    res.json({
      success: true,
      message: `Period-end revaluation completed for ${period}`,
      period,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Period-end revaluation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Period-end revaluation failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Integration Status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = await mmfiIntegrationService.getIntegrationStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Integration status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get integration status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;