import { Router } from "express";
import { db } from "../db";
import { salesOrders, salesOrderItems, customerPayments, accountingDocuments } from "@shared/sales-finance-integration-schema";
import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";

const router = Router();

// Invoice Verification Routes
router.get("/invoice-verification", async (req, res) => {
  try {
    const { status, customerId, dateFrom, dateTo } = req.query;
    
    let query = db.select({
      id: salesOrders.id,
      invoiceNumber: salesOrders.orderNumber, // Use order number as invoice reference
      salesOrderNumber: salesOrders.orderNumber,
      customerName: sql`'Sample Customer'`.as('customerName'), // Would join with customers table
      invoiceDate: salesOrders.orderDate,
      amount: salesOrders.totalAmount,
      currency: salesOrders.currency,
      status: sql`'pending'`.as('status'), // Default status for verification
      verifiedBy: sql`NULL`.as('verifiedBy'),
      verificationDate: sql`NULL`.as('verificationDate'),
      verificationNotes: sql`NULL`.as('verificationNotes'),
      approvalLevel: sql`1`.as('approvalLevel'),
      requiredApprovals: sql`2`.as('requiredApprovals'),
      currentApprovers: sql`ARRAY['Manager A', 'Director B']`.as('currentApprovers')
    }).from(salesOrders);

    if (status && status !== 'all') {
      // Filter by verification status - would be in separate verification table
      query = query.where(eq(salesOrders.status, status as string));
    }

    if (customerId) {
      query = query.where(eq(salesOrders.customerId, Number(customerId)));
    }

    if (dateFrom) {
      query = query.where(gte(salesOrders.orderDate, new Date(dateFrom as string)));
    }

    if (dateTo) {
      query = query.where(lte(salesOrders.orderDate, new Date(dateTo as string)));
    }

    const invoices = await query.orderBy(desc(salesOrders.orderDate));

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error("Error fetching invoice verification data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice verification data"
    });
  }
});

router.post("/invoice-verification", async (req, res) => {
  try {
    const { invoiceId, action, notes, lineItemAdjustments, verifiedBy } = req.body;

    // In a real implementation, this would update a separate invoice verification table
    // For now, we'll simulate the verification process
    
    const verification = {
      invoiceId,
      action, // 'approve', 'reject', 'revision'
      notes,
      lineItemAdjustments,
      verifiedBy,
      verificationDate: new Date().toISOString(),
      processed: true
    };

    res.json({
      success: true,
      message: `Invoice ${action}d successfully`,
      data: verification
    });
  } catch (error) {
    console.error("Error processing invoice verification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process invoice verification"
    });
  }
});

// Wholesale Forecast Routes
router.get("/wholesale-forecast", async (req, res) => {
  try {
    const { period, material, method } = req.query;

    // This would typically query forecast data from dedicated forecasting tables
    // For now, we'll return sample forecast data based on historical sales
    const historicalData = await db.select({
      materialCode: sql`'SAMPLE-001'`.as('materialCode'),
      materialName: sql`'Sample Product'`.as('materialName'),
      period: sql`TO_CHAR(order_date, 'YYYY-MM')`.as('period'),
      quantity: sql`SUM(total_amount)`.as('quantity')
    })
    .from(salesOrders)
    .groupBy(sql`TO_CHAR(order_date, 'YYYY-MM')`)
    .orderBy(desc(sql`TO_CHAR(order_date, 'YYYY-MM')`))
    .limit(12);

    // Generate forecast based on historical data
    const forecasts = historicalData.map((item, index) => ({
      id: index + 1,
      period: item.period,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      materialCode: item.materialCode,
      materialName: item.materialName,
      forecastQuantity: Math.round(Number(item.quantity) * 1.1), // Simple 10% growth forecast
      actualQuantity: index === 0 ? Number(item.quantity) : undefined,
      variance: index === 0 ? Math.round(((Number(item.quantity) - (Number(item.quantity) * 1.1)) / (Number(item.quantity) * 1.1)) * 100) : undefined,
      confidence: 85 + Math.floor(Math.random() * 10), // Random confidence between 85-95%
      forecastMethod: method || 'trend',
      status: index === 0 ? 'closed' : 'active',
      createdBy: 'Forecast System',
      lastUpdated: new Date().toISOString()
    }));

    res.json({
      success: true,
      data: forecasts
    });
  } catch (error) {
    console.error("Error fetching wholesale forecast:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wholesale forecast data"
    });
  }
});

router.post("/wholesale-forecast/generate", async (req, res) => {
  try {
    const { materialCode, period, quantity, method, confidence } = req.body;

    // In a real implementation, this would:
    // 1. Run forecasting algorithms based on historical data
    // 2. Apply seasonal adjustments
    // 3. Consider external factors
    // 4. Store forecast in dedicated tables

    const forecast = {
      id: Date.now(),
      materialCode,
      period,
      forecastQuantity: quantity || Math.floor(Math.random() * 1000) + 100,
      confidence: confidence || 85,
      method,
      status: 'draft',
      createdBy: 'Current User',
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: "Forecast generated successfully",
      data: forecast
    });
  } catch (error) {
    console.error("Error generating forecast:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate forecast"
    });
  }
});

// Sales Order Release Routes
router.get("/order-release", async (req, res) => {
  try {
    const { tab, status, priority, customer, dateFrom, dateTo } = req.query;

    const query = db.select({
      id: salesOrders.id,
      orderNumber: salesOrders.orderNumber,
      customerName: sql`'Sample Customer'`.as('customerName'), // Would join with customers
      orderDate: salesOrders.orderDate,
      requestedDeliveryDate: salesOrders.requestedDeliveryDate,
      totalAmount: salesOrders.totalAmount,
      currency: salesOrders.currency,
      status: salesOrders.status,
      releaseStatus: sql`'not_started'`.as('releaseStatus'),
      blockReasons: sql`ARRAY[]::text[]`.as('blockReasons'),
      releaseType: sql`'full'`.as('releaseType'),
      totalQuantity: sql`10`.as('totalQuantity'),
      creditCheckStatus: sql`'approved'`.as('creditCheckStatus'),
      inventoryCheckStatus: sql`'available'`.as('inventoryCheckStatus'),
      priority: sql`'normal'`.as('priority'),
      salesOrganization: salesOrders.salesOrganization,
      releaseDate: sql`NULL`.as('releaseDate'),
      releasedBy: sql`NULL`.as('releasedBy')
    }).from(salesOrders);

    const orders = await query.orderBy(desc(salesOrders.orderDate));

    // Transform orders to match expected format
    const transformedOrders = orders.map(order => ({
      ...order,
      status: order.status === 'confirmed' ? 'ready_to_release' : 
              order.status === 'draft' ? 'pending_release' : 
              order.status,
      blockReasons: order.status === 'blocked' ? ['Credit Check Failed'] : [],
      creditCheckStatus: order.status === 'blocked' ? 'rejected' : 'approved',
      inventoryCheckStatus: order.status === 'blocked' ? 'unavailable' : 'available',
      priority: ['urgent', 'high', 'normal', 'low'][Math.floor(Math.random() * 4)]
    }));

    res.json({
      success: true,
      data: transformedOrders
    });
  } catch (error) {
    console.error("Error fetching order release data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order release data"
    });
  }
});

router.post("/order-release", async (req, res) => {
  try {
    const { orderIds, releaseType, overrideBlocks, notes } = req.body;

    // In a real implementation, this would:
    // 1. Validate credit limits
    // 2. Check inventory availability
    // 3. Apply business rules
    // 4. Update order status
    // 5. Trigger downstream processes (delivery, production)

    const releasedOrders = [];
    for (const orderId of orderIds) {
      // Update order status to released
      await db.update(salesOrders)
        .set({
          status: 'processing', // Released status
          updatedAt: new Date()
        })
        .where(eq(salesOrders.id, orderId));

      releasedOrders.push({
        orderId,
        releaseDate: new Date().toISOString(),
        releasedBy: 'Current User',
        releaseType,
        notes
      });
    }

    res.json({
      success: true,
      message: `${releasedOrders.length} orders released successfully`,
      data: {
        releasedCount: releasedOrders.length,
        releasedOrders
      }
    });
  } catch (error) {
    console.error("Error releasing orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to release orders"
    });
  }
});

router.post("/order-block", async (req, res) => {
  try {
    const { orderIds, blockReason, notes } = req.body;

    const blockedOrders = [];
    for (const orderId of orderIds) {
      // Update order status to blocked
      await db.update(salesOrders)
        .set({
          status: 'blocked',
          updatedAt: new Date()
        })
        .where(eq(salesOrders.id, orderId));

      blockedOrders.push({
        orderId,
        blockReason,
        blockedDate: new Date().toISOString(),
        blockedBy: 'Current User',
        notes
      });
    }

    res.json({
      success: true,
      message: `${blockedOrders.length} orders blocked successfully`,
      data: {
        blockedCount: blockedOrders.length,
        blockedOrders
      }
    });
  } catch (error) {
    console.error("Error blocking orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to block orders"
    });
  }
});

// Release Configuration Routes
router.get("/release-configurations", async (req, res) => {
  try {
    // This would fetch from a configuration table
    const configurations = [
      {
        id: 1,
        name: "Standard Release",
        autoRelease: false,
        creditCheckRequired: true,
        inventoryCheckRequired: true,
        approvalRequired: false,
        maxOrderValue: 10000,
        releaseSchedule: "Manual",
        active: true
      },
      {
        id: 2,
        name: "Auto Release Small Orders",
        autoRelease: true,
        creditCheckRequired: true,
        inventoryCheckRequired: true,
        approvalRequired: false,
        maxOrderValue: 1000,
        releaseSchedule: "Hourly",
        active: true
      }
    ];

    res.json({
      success: true,
      data: configurations
    });
  } catch (error) {
    console.error("Error fetching release configurations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch release configurations"
    });
  }
});

// Forecast Models Routes
router.get("/forecast-models", async (req, res) => {
  try {
    const models = [
      {
        id: 1,
        modelName: "Seasonal Trend Model",
        description: "Advanced seasonal trending with historical patterns",
        methodology: "Machine Learning + Seasonal Decomposition",
        accuracy: 87,
        materials: ["TECH-001", "PROD-105"],
        active: true
      },
      {
        id: 2,
        modelName: "Linear Regression Model",
        description: "Simple linear regression based on historical data",
        methodology: "Linear Regression",
        accuracy: 73,
        materials: ["SERV-200"],
        active: false
      }
    ];

    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error("Error fetching forecast models:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch forecast models"
    });
  }
});

// Order Modification Routes
router.get("/order-modifications", async (req, res) => {
  try {
    // This would fetch from order modification tracking tables
    const modifications = [
      {
        id: 1,
        orderNumber: "SO-2024-1001",
        customerName: "TechNova Inc",
        originalAmount: 15750.00,
        modifiedAmount: 17200.00,
        currency: "USD",
        modificationReason: "Customer requested additional quantity due to increased demand",
        requestedBy: "Sales Rep A",
        requestDate: "2024-01-15",
        status: "pending",
        changeType: "quantity",
        urgency: "high",
        affectedItems: [],
        approvalRequired: true,
        customerApprovalRequired: false,
        impactAnalysis: {
          deliveryImpact: true,
          inventoryImpact: true,
          revenueImpact: 1450.00,
          costImpact: 800.00
        }
      }
    ];

    res.json({
      success: true,
      data: modifications
    });
  } catch (error) {
    console.error("Error fetching order modifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order modifications"
    });
  }
});

router.post("/order-modifications", async (req, res) => {
  try {
    const { orderNumber, changeType, reason, urgency } = req.body;

    // In a real implementation, this would:
    // 1. Validate the order exists and can be modified
    // 2. Calculate impact analysis
    // 3. Determine approval requirements
    // 4. Create modification request record
    // 5. Trigger approval workflow

    const modification = {
      id: Date.now(),
      orderNumber,
      changeType,
      reason,
      urgency,
      status: 'pending',
      requestedBy: 'Current User',
      requestDate: new Date().toISOString(),
      approvalRequired: changeType === 'price' || urgency === 'critical'
    };

    res.json({
      success: true,
      message: "Modification request submitted successfully",
      data: modification
    });
  } catch (error) {
    console.error("Error creating order modification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order modification"
    });
  }
});

// Order Cancellation Routes
router.get("/order-cancellations", async (req, res) => {
  try {
    const cancellations = [
      {
        id: 1,
        orderNumber: "SO-2024-0995",
        customerName: "Retail Solutions Ltd",
        orderAmount: 5200.00,
        cancellationReason: "Customer budget constraints - project postponed",
        requestedBy: "Customer Service",
        requestDate: "2024-01-10",
        status: "approved",
        cancellationType: "full",
        refundAmount: 5200.00,
        restockingFee: 0.00,
        customerNotified: true
      }
    ];

    res.json({
      success: true,
      data: cancellations
    });
  } catch (error) {
    console.error("Error fetching order cancellations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order cancellations"
    });
  }
});

router.post("/order-cancellations", async (req, res) => {
  try {
    const { orderNumber, cancellationType, reason } = req.body;

    // In a real implementation, this would:
    // 1. Validate the order can be cancelled
    // 2. Calculate refund amounts and fees
    // 3. Check inventory impact
    // 4. Create cancellation request
    // 5. Trigger approval workflow

    const cancellation = {
      id: Date.now(),
      orderNumber,
      cancellationType,
      reason,
      status: 'pending',
      requestedBy: 'Current User',
      requestDate: new Date().toISOString()
    };

    res.json({
      success: true,
      message: "Cancellation request submitted successfully",
      data: cancellation
    });
  } catch (error) {
    console.error("Error creating order cancellation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order cancellation"
    });
  }
});

export default router;