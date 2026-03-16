import { Request, Response, Router } from "express";
import { completeGapImplementationService } from "../services/complete-gap-implementation-service";
import { masterDataConfigurationService } from "../services/master-data-configuration-service";
import { transactionalApplicationsService } from "../services/transactional-applications-service";

const router = Router();

// Initialize All Missing Database Tables
router.post("/initialize-database", async (req: Request, res: Response) => {
  try {
    const result = await completeGapImplementationService.initializeAllMissingTables();
    
    res.json({
      success: result.success,
      message: result.success ? "All missing database tables initialized successfully" : "Database initialization had errors",
      tablesCreated: result.tablesCreated,
      totalTables: result.tablesCreated.length,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database initialization error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Database initialization failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Test All Implemented Functionality
router.post("/test-functionality", async (req: Request, res: Response) => {
  try {
    const result = await completeGapImplementationService.testAllImplementedFunctionality();
    
    res.json({
      success: result.success,
      message: result.success ? "All functionality tests passed" : "Some functionality tests failed",
      testResults: result.testResults,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Functionality test error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Functionality testing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get Gap Closure Status
router.get("/gap-closure-status", async (req: Request, res: Response) => {
  try {
    const status = await completeGapImplementationService.getGapClosureStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Gap closure status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get gap closure status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Complete System Integration Test
router.post("/complete-integration-test", async (req: Request, res: Response) => {
  try {
    const integrationResults = {
      databaseInitialization: null as any,
      masterDataConfiguration: null as any,
      functionalityTest: null as any,
      transactionalSystemStatus: null as any,
      overallSuccess: false
    };

    // 1. Initialize database tables
    try {
      integrationResults.databaseInitialization = await completeGapImplementationService.initializeAllMissingTables();
    } catch (error) {
      integrationResults.databaseInitialization = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // 2. Initialize master data configuration
    try {
      integrationResults.masterDataConfiguration = await masterDataConfigurationService.initializeCompleteConfiguration();
    } catch (error) {
      integrationResults.masterDataConfiguration = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // 3. Test all functionality
    try {
      integrationResults.functionalityTest = await completeGapImplementationService.testAllImplementedFunctionality();
    } catch (error) {
      integrationResults.functionalityTest = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // 4. Get transactional system status
    try {
      integrationResults.transactionalSystemStatus = await transactionalApplicationsService.getTransactionalSystemStatus();
    } catch (error) {
      integrationResults.transactionalSystemStatus = { 
        systemHealth: "error",
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // Determine overall success
    integrationResults.overallSuccess = 
      integrationResults.databaseInitialization?.success &&
      integrationResults.masterDataConfiguration?.success &&
      integrationResults.functionalityTest?.success &&
      integrationResults.transactionalSystemStatus?.systemHealth === "operational";

    res.json({
      success: integrationResults.overallSuccess,
      message: integrationResults.overallSuccess ? 
        "Complete ERP system integration successful - All gaps implemented" : 
        "ERP system integration completed with some issues",
      integrationResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Complete integration test error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Complete integration test failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// End-to-End Business Process Test
router.post("/business-process-test", async (req: Request, res: Response) => {
  try {
    const businessProcessResults = {
      glDocumentPosting: null as any,
      goodsReceiptProcessing: null as any,
      paymentProcessing: null as any,
      periodEndClosing: null as any,
      creditManagement: null as any,
      physicalInventory: null as any,
      overallSuccess: false
    };

    // Test GL Document Posting
    try {
      businessProcessResults.glDocumentPosting = await transactionalApplicationsService.createGLDocument({
        documentType: "SA",
        companyCode: "1000",
        documentDate: new Date(),
        postingDate: new Date(),
        reference: "TEST-GL-001",
        currency: "USD",
        items: [
          {
            glAccount: "140000",
            debitAmount: 1000.00,
            creditAmount: 0,
            description: "Test inventory posting"
          },
          {
            glAccount: "210000",
            debitAmount: 0,
            creditAmount: 1000.00,
            description: "Test accounts payable"
          }
        ]
      });
    } catch (error) {
      businessProcessResults.glDocumentPosting = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // Test Goods Receipt Processing
    try {
      businessProcessResults.goodsReceiptProcessing = await transactionalApplicationsService.processGoodsReceipt({
        purchaseOrderId: 1,
        materialId: 1,
        quantity: 10,
        unitPrice: 25.50,
        plant: "1000",
        storageLocation: "0001",
        deliveryNote: "TEST-DN-001"
      });
    } catch (error) {
      businessProcessResults.goodsReceiptProcessing = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // Test Payment Processing
    try {
      businessProcessResults.paymentProcessing = await transactionalApplicationsService.processPayment({
        paymentMethod: "Bank Transfer",
        paymentAmount: 1500.00,
        currency: "USD",
        vendorId: 1,
        bankAccount: "113000",
        valueDate: new Date(),
        reference: "TEST-PAY-001"
      });
    } catch (error) {
      businessProcessResults.paymentProcessing = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // Test Period-End Closing
    try {
      businessProcessResults.periodEndClosing = await transactionalApplicationsService.performPeriodEndClosing(
        "1000",
        "2024",
        "12"
      );
    } catch (error) {
      businessProcessResults.periodEndClosing = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // Test Credit Management
    try {
      businessProcessResults.creditManagement = await transactionalApplicationsService.checkCreditLimit(
        1,
        25000.00,
        "USD"
      );
    } catch (error) {
      businessProcessResults.creditManagement = { 
        approved: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // Test Physical Inventory
    try {
      businessProcessResults.physicalInventory = await transactionalApplicationsService.processPhysicalInventory({
        materialId: 1,
        plant: "1000",
        storageLocation: "0001",
        bookQuantity: 100,
        countedQuantity: 98,
        unitPrice: 25.50
      });
    } catch (error) {
      businessProcessResults.physicalInventory = { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }

    // Determine overall success
    businessProcessResults.overallSuccess = 
      businessProcessResults.glDocumentPosting?.success &&
      businessProcessResults.goodsReceiptProcessing?.success &&
      businessProcessResults.paymentProcessing?.success &&
      businessProcessResults.periodEndClosing?.success &&
      businessProcessResults.creditManagement?.approved &&
      businessProcessResults.physicalInventory?.success;

    res.json({
      success: businessProcessResults.overallSuccess,
      message: businessProcessResults.overallSuccess ? 
        "All business processes working correctly" : 
        "Some business processes need attention",
      businessProcessResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Business process test error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Business process testing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;