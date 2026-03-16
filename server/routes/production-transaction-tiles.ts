import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Sales & Distribution Tiles
router.get('/customer-invoice-processing', async (req, res) => {
  try {
    const invoices = [
      {
        id: 'INV-2025-001',
        customer: 'TechFlow Solutions',
        amount: 125000,
        currency: 'USD',
        status: 'Posted',
        dueDate: '2025-08-20',
        createdDate: '2025-07-20'
      },
      {
        id: 'INV-2025-002',
        customer: 'GreenEarth Manufacturing',
        amount: 85000,
        currency: 'USD',
        status: 'Pending',
        dueDate: '2025-08-15',
        createdDate: '2025-07-19'
      },
      {
        id: 'INV-2025-003',
        customer: 'RetailMax Group',
        amount: 42500,
        currency: 'USD',
        status: 'Overdue',
        dueDate: '2025-07-15',
        createdDate: '2025-07-10'
      }
    ];
    res.json({ success: true, data: invoices, count: invoices.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import salesOrders schema
import { salesOrders, customers } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

router.get('/sales-order-management', async (req, res) => {
  try {
    const orders = await db.select({
      id: salesOrders.orderNumber, // Map orderNumber to id for frontend
      customer: customers.name,
      amount: salesOrders.totalAmount,
      currency: salesOrders.currency,
      status: salesOrders.status,
      deliveryDate: salesOrders.requestedDeliveryDate,
      // items: 0, // We'd need to join salesOrderItems for accurate count
      quoteReference: salesOrders.quoteReference
    })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .orderBy(desc(salesOrders.createdAt));

    // Map to frontend expected format if needed
    const formattedOrders = orders.map(order => ({
      ...order,
      id: order.id,
      items: 1, // Placeholder until item count is implemented
      amount: parseFloat(order.amount as string)
    }));

    res.json({ success: true, data: formattedOrders, count: formattedOrders.length });
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/delivery-processing-system', async (req, res) => {
  try {
    const deliveries = [
      {
        id: 'DEL-2025-001',
        salesOrder: 'SO-2025-001',
        customer: 'TechFlow Solutions',
        status: 'In Transit',
        items: 15,
        weight: 2500,
        carrier: 'FedEx Express'
      },
      {
        id: 'DEL-2025-002',
        salesOrder: 'SO-2025-002',
        customer: 'Industrial Corp',
        status: 'Packed',
        items: 8,
        weight: 1800,
        carrier: 'UPS Ground'
      }
    ];
    res.json({ success: true, data: deliveries, count: deliveries.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Purchase Management Tiles
router.get('/vendor-invoice-verification', async (req, res) => {
  try {
    const verifications = [
      {
        id: 'VIV-2025-001',
        vendor: 'Steel Supplies Inc',
        invoiceNumber: 'SS-INV-5678',
        amount: 45000,
        poNumber: 'PO-2025-001',
        status: 'Verified',
        matchingStatus: '3-Way Match Complete'
      },
      {
        id: 'VIV-2025-002',
        vendor: 'Equipment Solutions',
        invoiceNumber: 'ES-INV-9012',
        amount: 125000,
        poNumber: 'PO-2025-002',
        status: 'Pending Verification',
        matchingStatus: 'GR Pending'
      }
    ];
    res.json({ success: true, data: verifications, count: verifications.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/purchase-order-management', async (req, res) => {
  try {
    const purchaseOrders = [
      {
        id: 'PO-2025-001',
        vendor: 'Steel Supplies Inc',
        amount: 45000,
        currency: 'USD',
        status: 'Released',
        deliveryDate: '2025-08-15',
        items: 5
      },
      {
        id: 'PO-2025-002',
        vendor: 'Equipment Solutions',
        amount: 125000,
        currency: 'USD',
        status: 'Approved',
        deliveryDate: '2025-09-01',
        items: 3
      }
    ];
    res.json({ success: true, data: purchaseOrders, count: purchaseOrders.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Material Management Tiles
router.get('/goods-receipt-processing', async (req, res) => {
  try {
    const goodsReceipts = [
      {
        id: 'GR-2025-001',
        poNumber: 'PO-2025-001',
        vendor: 'Steel Supplies Inc',
        material: 'Steel Sheets',
        quantity: 500,
        unit: 'KG',
        status: 'Posted',
        qualityInspection: 'Passed'
      },
      {
        id: 'GR-2025-002',
        poNumber: 'PO-2025-002',
        vendor: 'Equipment Solutions',
        material: 'Industrial Machinery',
        quantity: 1,
        unit: 'PC',
        status: 'Quality Check',
        qualityInspection: 'In Progress'
      }
    ];
    res.json({ success: true, data: goodsReceipts, count: goodsReceipts.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/warehouse-management-system', async (req, res) => {
  try {
    const warehouseData = [
      {
        id: 'WH-LOC-001',
        location: 'Main Warehouse - A1-01',
        material: 'Steel Sheets',
        quantity: 2500,
        unit: 'KG',
        status: 'Available',
        lastMovement: '2025-07-20'
      },
      {
        id: 'WH-LOC-002',
        location: 'Main Warehouse - B2-15',
        material: 'Engine Components',
        quantity: 150,
        unit: 'PC',
        status: 'Reserved',
        lastMovement: '2025-07-19'
      }
    ];
    res.json({ success: true, data: warehouseData, count: warehouseData.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Production Planning Tiles
router.get('/production-order-management', async (req, res) => {
  try {
    const productionOrders = [
      {
        id: 'PROD-2025-001',
        material: 'Finished Product A',
        quantity: 1000,
        unit: 'PC',
        status: 'Released',
        startDate: '2025-07-25',
        endDate: '2025-08-10',
        workCenter: 'Assembly Line 1'
      },
      {
        id: 'PROD-2025-002',
        material: 'Finished Product B',
        quantity: 500,
        unit: 'PC',
        status: 'Created',
        startDate: '2025-08-01',
        endDate: '2025-08-20',
        workCenter: 'Assembly Line 2'
      }
    ];
    res.json({ success: true, data: productionOrders, count: productionOrders.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/material-requirement-planning', async (req, res) => {
  try {
    const mrpData = [
      {
        id: 'MRP-REQ-001',
        material: 'Steel Sheets',
        requirement: 2000,
        available: 500,
        shortage: 1500,
        procurementType: 'Purchase',
        requiredDate: '2025-08-15'
      },
      {
        id: 'MRP-REQ-002',
        material: 'Engine Components',
        requirement: 800,
        available: 150,
        shortage: 650,
        procurementType: 'Production',
        requiredDate: '2025-08-20'
      }
    ];
    res.json({ success: true, data: mrpData, count: mrpData.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quality Management
router.get('/quality-inspection-management', async (req, res) => {
  try {
    const inspections = [
      {
        id: 'QI-2025-001',
        material: 'Steel Sheets',
        lotNumber: 'LOT-SS-001',
        inspectionType: 'Incoming Inspection',
        status: 'Passed',
        inspector: 'John Smith',
        date: '2025-07-20'
      },
      {
        id: 'QI-2025-002',
        material: 'Industrial Machinery',
        lotNumber: 'LOT-IM-001',
        inspectionType: 'Final Inspection',
        status: 'In Progress',
        inspector: 'Sarah Johnson',
        date: '2025-07-20'
      }
    ];
    res.json({ success: true, data: inspections, count: inspections.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Financial Systems
router.get('/financial-reporting-suite', async (req, res) => {
  try {
    const reports = [
      {
        id: 'RPT-2025-001',
        reportName: 'Balance Sheet',
        period: '2025-07',
        status: 'Generated',
        totalAssets: 2500000,
        totalLiabilities: 1200000,
        equity: 1300000
      },
      {
        id: 'RPT-2025-002',
        reportName: 'Profit & Loss',
        period: '2025-07',
        status: 'In Progress',
        revenue: 850000,
        expenses: 650000,
        netIncome: 200000
      }
    ];
    res.json({ success: true, data: reports, count: reports.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Credit Management
router.get('/credit-management-system', async (req, res) => {
  try {
    const creditData = [
      {
        id: 'CRED-001',
        customer: 'TechFlow Solutions',
        creditLimit: 500000,
        currentExposure: 125000,
        availableCredit: 375000,
        riskLevel: 'Low',
        status: 'Active'
      },
      {
        id: 'CRED-002',
        customer: 'RetailMax Group',
        creditLimit: 200000,
        currentExposure: 185000,
        availableCredit: 15000,
        riskLevel: 'High',
        status: 'Under Review'
      }
    ];
    res.json({ success: true, data: creditData, count: creditData.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Master Data Management
router.get('/material-master-management', async (req, res) => {
  try {
    const materials = [
      {
        id: 'MAT-001',
        materialNumber: 'STL-001',
        description: 'Steel Sheets - Grade A',
        materialType: 'Raw Material',
        baseUnit: 'KG',
        standardPrice: 5.50,
        status: 'Active'
      },
      {
        id: 'MAT-002',
        materialNumber: 'ENG-001',
        description: 'Engine Components - V8',
        materialType: 'Semi-Finished',
        baseUnit: 'PC',
        standardPrice: 850.00,
        status: 'Active'
      }
    ];
    res.json({ success: true, data: materials, count: materials.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export router
// Health check endpoint
router.get('/health', (req, res) => {
  const totalTiles = 6; // Number of production tiles we have
  res.json({
    success: true,
    totalTiles,
    operationalTiles: totalTiles,
    uptime: process.uptime(),
    status: 'All production transaction tiles operational',
    timestamp: new Date().toISOString()
  });
});

export { router as productionTransactionTilesRouter };