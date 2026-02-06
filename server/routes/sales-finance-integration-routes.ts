import { Router } from "express";
import { salesOrderService } from "../services/sales-order-service";
import { db } from "../db";
import { orders } from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { GiganticTablesIntegrationService } from "../services/gigantic-tables-integration";

const router = Router();
const giganticTablesService = new GiganticTablesIntegrationService();

// S001 - Sales Order Management Tile
router.post("/sales-orders", async (req, res) => {
  try {
    const {
      customerId,
      salesOrganization = "1000",
      distributionChannel = "10",
      division = "10",
      requestedDeliveryDate,
      items,
    } = req.body;

    const result = await salesOrderService.createSalesOrder({
      customerId,
      items
    });

    // AUTOMATIC GIGANTIC TABLES INTEGRATION
    // Populate enterprise_transaction_registry and material_movement_registry
    try {
      const totalAmount = result.salesOrder.totalAmount;
      const integrationResult = await giganticTablesService.integrateSalesOrder({
        salesOrderNumber: result.salesOrder.orderNumber,
        customerCode: customerId,
        totalAmount: parseFloat(totalAmount || "0"),
        items: items.map((item: any) => ({
          materialCode: item.materialNumber || `MAT-${Date.now()}`,
          materialDescription: item.description || "Sales Item",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0
        })),
        createdBy: 1
      });

      console.log(`✅ Gigantic Tables Integration: Created ${integrationResult.length} records for Sales Order ${result.salesOrder.orderNumber}`);
    } catch (integrationError) {
      console.error("❌ Gigantic Tables Integration Error:", integrationError);
      // Don't fail the sales order creation, just log the error
    }

    res.status(201).json({
      success: true,
      message: `Sales Order ${result.salesOrder.orderNumber} created successfully with automatic integration`,
      data: result,
    });
  } catch (error) {
    console.error("Error creating sales order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create sales order",
      error: error.message,
    });
  }
});

router.get("/sales-orders", async (req, res) => {
  console.log("🔍 GET /sales-orders route hit");
  try {
    console.log("📞 Calling salesOrderService.getAllOrders()...");
    const result = await salesOrderService.getAllOrders();
    console.log("✅ Service call successful, result:", result);
    
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching sales orders:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales orders",
    });
  }
});

router.get("/sales-orders/:id", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, orderId));
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    const items = await db.select().from(salesOrderItems).where(eq(salesOrderItems.salesOrderId, orderId));
    
    res.json({
      success: true,
      data: {
        ...order,
        items,
      },
    });
  } catch (error) {
    console.error("Error fetching sales order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales order",
    });
  }
});

// S002 - Delivery Management Tile
router.post("/deliveries", async (req, res) => {
  try {
    const {
      salesOrderId,
      deliveryDate,
      shippingPoint = "1000",
      plant = "1000",
      items,
    } = req.body;

    // First create delivery document
    const delivery = await db.transaction(async (tx) => {
      const deliveryNumber = `DN${new Date().getFullYear().toString().slice(-2)}${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
      
      const [salesOrder] = await tx.select().from(salesOrders).where(eq(salesOrders.id, salesOrderId));
      
      const [newDelivery] = await tx.insert(deliveryDocuments).values({
        deliveryNumber,
        salesOrderId,
        customerId: salesOrder.customerId,
        deliveryDate: new Date(deliveryDate),
        shippingPoint,
        plant,
        createdBy: 1,
      }).returning();

      return newDelivery;
    });

    res.status(201).json({
      success: true,
      message: `Delivery ${delivery.deliveryNumber} created successfully`,
      data: delivery,
    });
  } catch (error) {
    console.error("Error creating delivery:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create delivery",
      error: error.message,
    });
  }
});

router.post("/deliveries/:id/post-goods-issue", async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.id);
    const { pgiDate } = req.body;

    const result = await salesFinanceIntegration.postGoodsIssue(
      deliveryId,
      new Date(pgiDate),
      1 // Get from session
    );

    res.json({
      success: true,
      message: `Goods Issue posted for delivery ${result.delivery.deliveryNumber}`,
      data: result,
    });
  } catch (error) {
    console.error("Error posting goods issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to post goods issue",
      error: error.message,
    });
  }
});

router.get("/deliveries", async (req, res) => {
  try {
    const { customerId, pgiStatus, dateFrom, dateTo } = req.query;
    
    let query = db.select().from(deliveryDocuments);
    
    if (customerId) {
      query = query.where(eq(deliveryDocuments.customerId, parseInt(customerId as string)));
    }
    
    if (pgiStatus) {
      query = query.where(eq(deliveryDocuments.pgiStatus, pgiStatus as string));
    }

    const deliveries = await query.orderBy(desc(deliveryDocuments.createdAt));
    
    res.json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deliveries",
    });
  }
});

// S003 - Billing/Invoice Management Tile
router.post("/billing-documents", async (req, res) => {
  try {
    const {
      billingType = "F2", // Standard invoice
      salesOrderId,
      deliveryId,
      billingDate,
      items,
    } = req.body;

    const result = await salesFinanceIntegration.createBilling({
      billingType,
      salesOrderId,
      deliveryId,
      billingDate: new Date(billingDate),
      items,
      createdBy: 1, // Get from session
    });

    res.status(201).json({
      success: true,
      message: `Invoice ${result.billing.billingNumber} created successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error creating billing document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create billing document",
      error: error.message,
    });
  }
});

router.get("/billing-documents", async (req, res) => {
  try {
    const { customerId, billingType, postingStatus, dateFrom, dateTo } = req.query;
    
    let query = db.select().from(billingDocuments);
    
    if (customerId) {
      query = query.where(eq(billingDocuments.customerId, parseInt(customerId as string)));
    }
    
    if (billingType) {
      query = query.where(eq(billingDocuments.billingType, billingType as string));
    }
    
    if (postingStatus) {
      query = query.where(eq(billingDocuments.postingStatus, postingStatus as string));
    }

    const billings = await query.orderBy(desc(billingDocuments.createdAt));
    
    res.json({
      success: true,
      data: billings,
    });
  } catch (error) {
    console.error("Error fetching billing documents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch billing documents",
    });
  }
});

router.get("/billing-documents/:id", async (req, res) => {
  try {
    const billingId = parseInt(req.params.id);
    
    const [billing] = await db.select().from(billingDocuments).where(eq(billingDocuments.id, billingId));
    
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: "Billing document not found",
      });
    }
    
    res.json({
      success: true,
      data: billing,
    });
  } catch (error) {
    console.error("Error fetching billing document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch billing document",
    });
  }
});

// F001 - Accounts Receivable Management Tile
router.post("/customer-payments", async (req, res) => {
  try {
    const {
      customerId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      bankAccount,
      reference,
      invoiceIds,
    } = req.body;

    const result = await db.transaction(async (tx) => {
      const paymentNumber = `PAY${new Date().getFullYear().toString().slice(-2)}${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
      
      const [payment] = await tx.insert(customerPayments).values({
        paymentNumber,
        customerId,
        paymentDate: new Date(paymentDate),
        paymentAmount: paymentAmount.toString(),
        paymentMethod,
        bankAccount,
        reference,
        createdBy: 1,
      }).returning();

      return payment;
    });

    res.status(201).json({
      success: true,
      message: `Payment ${result.paymentNumber} processed successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error processing customer payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process customer payment",
      error: error.message,
    });
  }
});

router.get("/customer-payments", async (req, res) => {
  try {
    const { customerId, paymentMethod, postingStatus, dateFrom, dateTo } = req.query;
    
    let query = db.select().from(customerPayments);
    
    if (customerId) {
      query = query.where(eq(customerPayments.customerId, parseInt(customerId as string)));
    }
    
    if (paymentMethod) {
      query = query.where(eq(customerPayments.paymentMethod, paymentMethod as string));
    }
    
    if (postingStatus) {
      query = query.where(eq(customerPayments.postingStatus, postingStatus as string));
    }

    const payments = await query.orderBy(desc(customerPayments.createdAt));
    
    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching customer payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer payments",
    });
  }
});

// F002/F003 - Financial Accounting Integration
router.get("/accounting-documents", async (req, res) => {
  try {
    const { sourceModule, documentType, postingDateFrom, postingDateTo } = req.query;
    
    let query = db.select().from(accountingDocuments);
    
    if (sourceModule) {
      query = query.where(eq(accountingDocuments.sourceModule, sourceModule as string));
    }
    
    if (documentType) {
      query = query.where(eq(accountingDocuments.documentType, documentType as string));
    }
    
    if (postingDateFrom) {
      query = query.where(gte(accountingDocuments.postingDate, new Date(postingDateFrom as string)));
    }
    
    if (postingDateTo) {
      query = query.where(lte(accountingDocuments.postingDate, new Date(postingDateTo as string)));
    }

    const documents = await query.orderBy(desc(accountingDocuments.createdAt));
    
    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Error fetching accounting documents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch accounting documents",
    });
  }
});

router.get("/accounting-documents/:id", async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const [document] = await db.select().from(accountingDocuments).where(eq(accountingDocuments.id, documentId));
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Accounting document not found",
      });
    }
    
    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Error fetching accounting document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch accounting document",
    });
  }
});

// Integration Dashboard - Overview of SD-FI Process
router.get("/integration-dashboard", async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get current month statistics
    const [orderCount] = await db.select({ count: salesOrders.id }).from(salesOrders)
      .where(gte(salesOrders.createdAt, startOfMonth));
    
    const [deliveryCount] = await db.select({ count: deliveryDocuments.id }).from(deliveryDocuments)
      .where(gte(deliveryDocuments.createdAt, startOfMonth));
    
    const [billingCount] = await db.select({ count: billingDocuments.id }).from(billingDocuments)
      .where(gte(billingDocuments.createdAt, startOfMonth));
    
    const [paymentCount] = await db.select({ count: customerPayments.id }).from(customerPayments)
      .where(gte(customerPayments.createdAt, startOfMonth));

    // Get pending items
    const pendingDeliveries = await db.select().from(deliveryDocuments)
      .where(eq(deliveryDocuments.pgiStatus, "OPEN"))
      .limit(10);
    
    const pendingBillings = await db.select().from(billingDocuments)
      .where(eq(billingDocuments.postingStatus, "OPEN"))
      .limit(10);

    res.json({
      success: true,
      data: {
        monthlyStats: {
          salesOrders: orderCount?.count || 0,
          deliveries: deliveryCount?.count || 0,
          billings: billingCount?.count || 0,
          payments: paymentCount?.count || 0,
        },
        pendingItems: {
          deliveries: pendingDeliveries,
          billings: pendingBillings,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching integration dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch integration dashboard",
    });
  }
});

export default router;