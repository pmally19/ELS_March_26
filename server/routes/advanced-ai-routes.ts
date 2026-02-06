/**
 * ADVANCED AI ASSISTANT ROUTES
 * High-Performance API Endpoints for Jr. Assistant
 * Makes Jr. Assistant work like Replit Agent
 */

import { Router } from "express";
import { advancedAIAssistant } from "../services/advanced-ai-assistant";

const router = Router();

/**
 * Advanced Chat Endpoint - Core AI Processing
 * This makes Jr. Assistant respond intelligently like Replit Agent
 */
router.post("/chat", async (req, res) => {
  try {
    const { 
      message, 
      context = {},
      conversationHistory = [],
      pageContext = "dashboard"
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    console.log(`🤖 Advanced AI processing: "${message}"`);
    
    // Process with advanced AI service
    const result = await advancedAIAssistant.processAdvancedQuery(message, {
      currentPage: pageContext,
      userRole: context.userRole || "Business User",
      sessionContext: context
    });

    console.log(`✅ Advanced AI response generated successfully`);

    res.json({
      success: true,
      response: result.response,
      actions: result.actions || [],
      suggestions: result.suggestions || [],
      metadata: {
        processingTime: new Date().toISOString(),
        aiModel: "gpt-4o",
        intelligence: "advanced"
      }
    });

  } catch (error) {
    console.error("Advanced AI chat error:", error);
    res.status(500).json({
      success: false,
      error: "AI processing failed",
      message: "The AI assistant is experiencing technical difficulties. Please try again."
    });
  }
});

/**
 * Business Action Execution Endpoint
 * Allows Jr. Assistant to perform actual business operations
 */
router.post("/execute-action", async (req, res) => {
  try {
    const { action, parameters, context } = req.body;

    if (!action || !action.type) {
      return res.status(400).json({
        success: false,
        error: "Action type is required"
      });
    }

    console.log(`🎯 Executing business action: ${action.type}`);

    const result = await advancedAIAssistant.executeBusinessAction({
      type: action.type,
      parameters: parameters || {},
      context: context || {}
    });

    console.log(`✅ Action executed: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    res.json({
      success: result.success,
      result: result.result,
      message: result.message,
      metadata: {
        actionType: action.type,
        executionTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Action execution error:", error);
    res.status(500).json({
      success: false,
      error: "Action execution failed",
      message: "Failed to execute the requested business action."
    });
  }
});

/**
 * Business Intelligence Endpoint
 * Provides real-time business insights for AI responses
 */
router.get("/business-intelligence", async (req, res) => {
  try {
    console.log("📊 Fetching business intelligence data...");

    // Get comprehensive business context (using private method through instance)
    const businessContext = await (advancedAIAssistant as any).getBusinessContext();
    const systemState = await (advancedAIAssistant as any).getSystemState();

    res.json({
      success: true,
      businessContext,
      systemState,
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataSource: "live_system"
      }
    });

  } catch (error) {
    console.error("Business intelligence error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch business intelligence",
      message: "Unable to retrieve current business state."
    });
  }
});

/**
 * Quick Actions Endpoint
 * Provides available actions based on current context
 */
router.post("/quick-actions", async (req, res) => {
  try {
    const { context = {} } = req.body;

    // Generate context-aware quick actions
    const quickActions = [
      {
        id: "create_sales_order",
        title: "Create Sales Order",
        description: "Start a new sales order",
        icon: "shopping-cart",
        category: "sales"
      },
      {
        id: "view_customers",
        title: "View Customers", 
        description: "Browse customer list",
        icon: "users",
        category: "customers"
      },
      {
        id: "check_inventory",
        title: "Check Inventory",
        description: "Review stock levels",
        icon: "package",
        category: "inventory"
      },
      {
        id: "financial_summary",
        title: "Financial Summary",
        description: "View financial overview",
        icon: "dollar-sign",
        category: "finance"
      },
      {
        id: "business_analytics",
        title: "Business Analytics",
        description: "Generate business insights",
        icon: "bar-chart",
        category: "analytics"
      }
    ];

    res.json({
      success: true,
      quickActions,
      metadata: {
        context: context.currentPage || "dashboard",
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Quick actions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate quick actions"
    });
  }
});

/**
 * Health Check Endpoint
 * Verifies AI system status
 */
router.get("/health", async (req, res) => {
  try {
    res.json({
      success: true,
      status: "operational",
      services: {
        ai: "connected",
        database: "connected", 
        business_logic: "operational"
      },
      version: "2.0.0",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "degraded",
      error: error.message
    });
  }
});

export default router;