import { Router, Request, Response } from "express";
import { chiefAgentPermissionsService } from "../services/chief-agent-permissions-service";
import { z } from "zod";

const router = Router();

// Get Chief Agent permissions
router.get("/permissions", async (req: Request, res: Response) => {
  try {
    const permissions = await chiefAgentPermissionsService.getChiefAgentPermissions();
    res.json({
      success: true,
      permissions,
      message: "Chief Agent has full CREATE access for all business data, NO DELETE or UI modification rights"
    });
  } catch (error) {
    console.error("Error fetching Chief Agent permissions:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch permissions" 
    });
  }
});

// Get allowed operations for Chief Agent
router.get("/allowed-operations", async (req: Request, res: Response) => {
  try {
    const allowed = await chiefAgentPermissionsService.getAllowedOperations();
    const forbidden = chiefAgentPermissionsService.getForbiddenOperations();
    
    res.json({
      success: true,
      allowedOperations: allowed,
      forbiddenOperations: forbidden,
      summary: {
        canCreate: "ALL business data (vendors, customers, orders, materials, etc.)",
        canRead: "ALL data and reports",
        canUpdate: "Limited business data updates (details, status, levels, prices)",
        cannotDelete: "ANY data (completely forbidden)",
        cannotModify: "UI, system configuration, permissions, database structure"
      }
    });
  } catch (error) {
    console.error("Error fetching allowed operations:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch operations" 
    });
  }
});

// Validate if Chief Agent can perform specific action
router.post("/validate-action", async (req: Request, res: Response) => {
  try {
    const { actionType, entityType } = req.body;
    
    if (!actionType || !entityType) {
      return res.status(400).json({
        success: false,
        canPerform: false,
        message: "Missing actionType or entityType"
      });
    }

    const canPerform = await chiefAgentPermissionsService.canPerformAction(actionType, entityType);

    res.json({
      success: true,
      canPerform,
      message: canPerform 
        ? `Chief Agent CAN ${actionType} ${entityType} - Permission granted` 
        : `Chief Agent CANNOT ${actionType} ${entityType} - Permission denied`
    });
  } catch (error) {
    console.error("Error validating action:", error);
    res.status(400).json({ 
      success: false, 
      error: "Failed to validate action" 
    });
  }
});

// Create business data with Chief Agent permissions
router.post("/create/:entityType", async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;
    const requestData = req.body;

    // Validate permissions first
    await chiefAgentPermissionsService.validateRequest("create", entityType, requestData);

    // Route to appropriate creation endpoint based on entity type
    let result;
    let endpoint;

    switch (entityType.toLowerCase()) {
      case 'vendor':
        endpoint = '/api/master-data/vendors';
        break;
      case 'customer':
        endpoint = '/api/customers';
        break;
      case 'sales_order':
        endpoint = '/api/sales/sales-order';
        break;
      case 'purchase_order':
        endpoint = '/api/purchase/purchase-order';
        break;
      case 'material':
        endpoint = '/api/master-data/materials';
        break;
      case 'gl_account':
        endpoint = '/api/finance/gl-account';
        break;
      case 'cost_center':
        endpoint = '/api/master-data/cost-centers';
        break;
      case 'plant':
        endpoint = '/api/master-data/plants';
        break;
      case 'company_code':
        endpoint = '/api/master-data/company-codes';
        break;
      case 'employee':
        endpoint = '/api/hr/employees';
        break;
      case 'invoice':
        endpoint = '/api/finance/invoices';
        break;
      case 'payment':
        endpoint = '/api/finance/payments';
        break;
      default:
        throw new Error(`Entity type ${entityType} not supported`);
    }

    // Make internal API call to create the entity
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create ${entityType}: ${response.statusText}`);
    }

    result = await response.json();

    // Log successful action
    await chiefAgentPermissionsService.logAction({
      actionType: "create",
      entityType,
      entityId: result.id?.toString(),
      actionDescription: `Successfully created ${entityType} with ID ${result.id}`,
      requestData,
      responseData: result,
      success: true,
      userContext: "Chief Agent creation request",
      businessJustification: `Business data creation as authorized by Chief Agent permissions`
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `Chief Agent successfully created ${entityType}`,
      actionLogged: true
    });

  } catch (error) {
    console.error(`Error creating ${req.params.entityType}:`, error);
    
    // Log failed action
    await chiefAgentPermissionsService.logAction({
      actionType: "create",
      entityType: req.params.entityType,
      actionDescription: `Failed to create ${req.params.entityType}: ${(error as Error).message}`,
      requestData: req.body,
      success: false,
      errorMessage: (error as Error).message,
      userContext: "Chief Agent creation request"
    });

    res.status(400).json({ 
      success: false, 
      error: (error as Error).message,
      actionLogged: true
    });
  }
});

// Get Chief Agent action history
router.get("/action-history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await chiefAgentPermissionsService.getActionHistory(limit);
    
    res.json({
      success: true,
      actionHistory: history,
      totalActions: history.length,
      message: "Chief Agent action history retrieved"
    });
  } catch (error) {
    console.error("Error fetching action history:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch action history" 
    });
  }
});

// Get Chief Agent capabilities summary
router.get("/capabilities", async (req: Request, res: Response) => {
  try {
    const allowed = await chiefAgentPermissionsService.getAllowedOperations();
    const forbidden = chiefAgentPermissionsService.getForbiddenOperations();
    
    res.json({
      success: true,
      capabilities: {
        description: "Chief Agent is designed for comprehensive business data creation and management",
        primaryFunction: "CREATE all types of business data for ERP operations",
        dataCreationAccess: [
          "Vendors and Suppliers",
          "Customers and Clients", 
          "Sales Orders and Quotations",
          "Purchase Orders and Requisitions",
          "Materials and Products",
          "General Ledger Accounts",
          "Cost Centers and Profit Centers",
          "Plants and Storage Locations",
          "Company Codes and Organizations",
          "Employees and HR Data",
          "Invoices and Billing",
          "Journal Entries and Postings",
          "Payments and Receipts",
          "Inventory Transactions",
          "Production Orders",
          "Bills of Materials",
          "Work Centers"
        ],
        readAccess: "Full access to all data and financial reports",
        updateAccess: "Limited to business data updates (no system changes)",
        restrictions: [
          "NO DELETE operations on any data",
          "NO UI modifications or system configuration changes",
          "NO user management or permission changes",
          "NO direct database structure modifications"
        ],
        allowedOperations: allowed,
        forbiddenOperations: forbidden
      }
    });
  } catch (error) {
    console.error("Error fetching capabilities:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch capabilities" 
    });
  }
});

export default router;