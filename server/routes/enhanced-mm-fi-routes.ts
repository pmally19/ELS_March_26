import { Request, Response, Router } from "express";
import { enhancedMMFIService } from "../services/enhanced-mm-fi-service";
import { z } from "zod";

const router = Router();

// Initialize MM-FI Configuration
router.post("/initialize", async (req: Request, res: Response) => {
  try {
    await enhancedMMFIService.initializeMMFIConfiguration();
    
    res.json({
      success: true,
      message: "MM-FI integration configuration initialized successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("MM-FI initialization error:", error);
    res.status(500).json({ 
      success: false, 
      message: "MM-FI initialization failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Enhanced Account Determination
const enhancedAccountDeterminationSchema = z.object({
  materialId: z.number(),
  movementType: z.string(),
  plant: z.string().optional(),
  costCenter: z.string().optional()
});

router.post("/account-determination-enhanced", async (req: Request, res: Response) => {
  try {
    const { materialId, movementType, plant, costCenter } = 
      enhancedAccountDeterminationSchema.parse(req.body);
    
    const result = await enhancedMMFIService.determineAccountsEnhanced(
      materialId, 
      movementType, 
      plant, 
      costCenter
    );
    
    res.json({
      success: result.success,
      accounts: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Enhanced account determination error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Enhanced account determination failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Real-time GL Posting
const glPostingSchema = z.object({
  materialId: z.number(),
  movementType: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  plant: z.string().optional(),
  costCenter: z.string().optional(),
  reference: z.string().optional()
});

router.post("/post-gl-realtime", async (req: Request, res: Response) => {
  try {
    const { materialId, movementType, quantity, unitPrice, plant, costCenter, reference } = 
      glPostingSchema.parse(req.body);
    
    const result = await enhancedMMFIService.postStockMovementToGL(
      materialId,
      movementType,
      quantity,
      unitPrice,
      plant,
      costCenter,
      reference
    );
    
    res.json({
      success: result.success,
      glDocumentNumber: result.glDocumentNumber,
      totalValue: result.totalValue,
      accounts: result.accounts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Real-time GL posting error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Real-time GL posting failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Enhanced Purchase Commitment
const enhancedCommitmentSchema = z.object({
  purchaseOrderId: z.number()
});

router.post("/create-commitment-enhanced", async (req: Request, res: Response) => {
  try {
    const { purchaseOrderId } = enhancedCommitmentSchema.parse(req.body);
    
    const result = await enhancedMMFIService.createPurchaseCommitmentEnhanced(purchaseOrderId);
    
    res.json({
      success: result.success,
      commitments: result.commitments,
      totalCommitmentValue: result.totalCommitmentValue,
      glDocumentNumber: result.glDocumentNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Enhanced purchase commitment error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Enhanced purchase commitment creation failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Enhanced Three-Way Matching
const enhancedThreeWayMatchSchema = z.object({
  purchaseOrderId: z.number(),
  goodsReceiptId: z.number(),
  invoiceId: z.number(),
  tolerancePercent: z.number().optional().default(5)
});

router.post("/three-way-match-enhanced", async (req: Request, res: Response) => {
  try {
    const { purchaseOrderId, goodsReceiptId, invoiceId, tolerancePercent } = 
      enhancedThreeWayMatchSchema.parse(req.body);
    
    const result = await enhancedMMFIService.performThreeWayMatchEnhanced(
      purchaseOrderId,
      goodsReceiptId,
      invoiceId,
      tolerancePercent
    );
    
    res.json({
      success: result.success,
      matchResult: result.matchResult,
      variancePosted: result.variancePosted,
      glDocumentNumber: result.glDocumentNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Enhanced three-way matching error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Enhanced three-way matching failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Enhanced Integration Status
router.get("/status-enhanced", async (req: Request, res: Response) => {
  try {
    const status = await enhancedMMFIService.getEnhancedIntegrationStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Enhanced integration status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get enhanced integration status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Test MM-FI Integration End-to-End
router.post("/test-integration", async (req: Request, res: Response) => {
  try {
    const testResults = {
      accountDetermination: null,
      glPosting: null,
      commitment: null,
      threeWayMatch: null
    };

    // Test account determination
    try {
      testResults.accountDetermination = await enhancedMMFIService.determineAccountsEnhanced(
        1, "101", "1000", "PROD001"
      );
    } catch (error) {
      testResults.accountDetermination = { success: false, error: error.message };
    }

    // Test GL posting
    try {
      testResults.glPosting = await enhancedMMFIService.postStockMovementToGL(
        1, "101", 10, 25.50, "1000", "PROD001", "TEST-INTEGRATION"
      );
    } catch (error) {
      testResults.glPosting = { success: false, error: error.message };
    }

    // Test purchase commitment
    try {
      testResults.commitment = await enhancedMMFIService.createPurchaseCommitmentEnhanced(1);
    } catch (error) {
      testResults.commitment = { success: false, error: error.message };
    }

    // Test three-way matching
    try {
      testResults.threeWayMatch = await enhancedMMFIService.performThreeWayMatchEnhanced(
        1, 1, 1, 5
      );
    } catch (error) {
      testResults.threeWayMatch = { success: false, error: error.message };
    }

    const overallSuccess = Object.values(testResults).every(result => 
      result && typeof result === 'object' && 'success' in result && result.success
    );

    res.json({
      success: overallSuccess,
      message: overallSuccess ? "All MM-FI integration tests passed" : "Some MM-FI integration tests failed",
      testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("MM-FI integration test error:", error);
    res.status(500).json({ 
      success: false, 
      message: "MM-FI integration test failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;