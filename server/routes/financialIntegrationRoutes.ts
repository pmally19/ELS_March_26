/**
 * Financial Integration API Routes
 * Handles complete financial flow integration across Sales → Production → Inventory → Accounting
 */

import { Router } from 'express';
import { financialIntegrationService } from '../services/financialIntegrationService';
import { db, pool } from '../db';

const router = Router();

/**
 * POST /api/financial-integration/create-flow
 * Creates complete financial flow from sales order
 */
router.post('/create-flow', async (req, res) => {
  try {
    const { orderNumber, materialCode, quantity, unitPrice, plantCode, costCenter } = req.body;
    
    if (!orderNumber || !materialCode || !quantity || !unitPrice || !plantCode || !costCenter) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderNumber, materialCode, quantity, unitPrice, plantCode, costCenter' 
      });
    }

    const financialFlow = await financialIntegrationService.createFinancialFlow({
      orderNumber,
      materialCode,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      plantCode,
      costCenter
    });

    res.json({
      success: true,
      data: financialFlow,
      message: 'Financial flow created successfully'
    });
  } catch (error) {
    console.error('Error creating financial flow:', error);
    res.status(500).json({ 
      error: 'Failed to create financial flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial-integration/calculate-costs/:materialCode/:plantCode/:quantity
 * Calculates material costs with different costing methods
 */
router.get('/calculate-costs/:materialCode/:plantCode/:quantity', async (req, res) => {
  try {
    const { materialCode, plantCode, quantity } = req.params;
    
    const costCalculation = await financialIntegrationService.calculateMaterialCosts(
      materialCode,
      plantCode,
      Number(quantity)
    );

    res.json({
      success: true,
      data: costCalculation,
      message: 'Cost calculation completed successfully'
    });
  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({ 
      error: 'Failed to calculate costs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial-integration/inventory-valuation/:materialCode/:plantCode
 * Gets current inventory valuation for material
 */
router.get('/inventory-valuation/:materialCode/:plantCode', async (req, res) => {
  try {
    const { materialCode, plantCode } = req.params;
    
    const inventoryValuation = await financialIntegrationService.getInventoryValuation(
      materialCode,
      plantCode
    );

    res.json({
      success: true,
      data: inventoryValuation,
      message: 'Inventory valuation retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting inventory valuation:', error);
    res.status(500).json({ 
      error: 'Failed to get inventory valuation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial-integration/check-availability/:materialCode/:plantCode/:quantity
 * Checks inventory availability and determines production requirements
 */
router.get('/check-availability/:materialCode/:plantCode/:quantity', async (req, res) => {
  try {
    const { materialCode, plantCode, quantity } = req.params;
    
    const availability = await financialIntegrationService.checkInventoryAvailability(
      materialCode,
      plantCode,
      Number(quantity)
    );

    res.json({
      success: true,
      data: availability,
      message: 'Inventory availability checked successfully'
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ 
      error: 'Failed to check inventory availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial-integration/create-gl-posting
 * Creates GL posting for financial integration
 */
router.post('/create-gl-posting', async (req, res) => {
  try {
    const { documentNumber, salesOrderNumber, materialCode, amount, plantCode, costCenter } = req.body;
    
    if (!documentNumber || !salesOrderNumber || !materialCode || !amount || !plantCode || !costCenter) {
      return res.status(400).json({ 
        error: 'Missing required fields: documentNumber, salesOrderNumber, materialCode, amount, plantCode, costCenter' 
      });
    }

    const glPostingId = await financialIntegrationService.createGLPosting({
      documentNumber,
      salesOrderNumber,
      materialCode,
      amount: Number(amount),
      plantCode,
      costCenter
    });

    res.json({
      success: true,
      data: { glPostingId },
      message: 'GL posting created successfully'
    });
  } catch (error) {
    console.error('Error creating GL posting:', error);
    res.status(500).json({ 
      error: 'Failed to create GL posting',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/financial-integration/update-inventory-valuation
 * Updates inventory valuation after production
 */
router.put('/update-inventory-valuation', async (req, res) => {
  try {
    const { materialCode, plantCode, quantityProduced, productionCost } = req.body;
    
    if (!materialCode || !plantCode || !quantityProduced || !productionCost) {
      return res.status(400).json({ 
        error: 'Missing required fields: materialCode, plantCode, quantityProduced, productionCost' 
      });
    }

    await financialIntegrationService.updateInventoryValuation(
      materialCode,
      plantCode,
      Number(quantityProduced),
      Number(productionCost)
    );

    res.json({
      success: true,
      message: 'Inventory valuation updated successfully'
    });
  } catch (error) {
    console.error('Error updating inventory valuation:', error);
    res.status(500).json({ 
      error: 'Failed to update inventory valuation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial-integration/report/:plantCode
 * Generates comprehensive financial integration report
 */
router.get('/report/:plantCode', async (req, res) => {
  try {
    const { plantCode } = req.params;
    
    const report = await financialIntegrationService.generateFinancialIntegrationReport(plantCode);

    res.json({
      success: true,
      data: report,
      message: 'Financial integration report generated successfully'
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: 'Failed to generate financial integration report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial-integration/dashboard
 * Gets financial integration dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get real data from database using pool
    const client = await pool.connect();
    
    try {
      // Get sales orders data
      const salesResult = await client.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total_revenue
        FROM orders 
        WHERE status != 'CANCELLED'
      `);
      
      // Get production orders data  
      const productionResult = await client.query(`
        SELECT COUNT(*) as count
        FROM production_orders
      `);
      
      // Get inventory valuations data
      const inventoryResult = await client.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(quantity * moving_average_price), 0) as total_value
        FROM inventory_balance
        WHERE quantity > 0
      `);
      
      // Get GL postings data
      const glResult = await client.query(`
        SELECT COUNT(*) as count
        FROM gl_accounts
      `);
      
      const salesOrders = parseInt(salesResult.rows[0].count) || 0;
      const totalRevenue = parseFloat(salesResult.rows[0].total_revenue) || 0;
      const productionOrders = parseInt(productionResult.rows[0].count) || 0;
      const inventoryValuations = parseInt(inventoryResult.rows[0].count) || 0;
      const glPostings = parseInt(glResult.rows[0].count) || 0;
      
      const dashboardData = {
        summary: {
          totalSalesOrders: salesOrders,
          totalProductionOrders: productionOrders,
          totalInventoryValuations: inventoryValuations,
          totalGLPostings: glPostings,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgOrderValue: salesOrders > 0 ? Math.round((totalRevenue / salesOrders) * 100) / 100 : 0,
          integrationHealthScore: 95,
          lastUpdated: new Date().toISOString()
        },
        financialFlows: [],
        integrationStatus: 'HEALTHY'
      };

      res.json({
        success: true,
        data: dashboardData,
        message: 'Financial integration dashboard data retrieved successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to get dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial-integration/inventory-postings
 * Gets inventory posting transactions for financial integration
 */
router.get('/inventory-postings', async (req, res) => {
  try {
    const plantCode = req.query.plantCode as string || 'MAIN';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Get inventory movements with financial impact from stock_movements table
    const inventoryPostings = await db.execute(`
      SELECT 
        id,
        movement_type,
        material_code,
        plant_code,
        storage_location,
        quantity,
        unit_price,
        total_value,
        posting_date,
        reference_document,
        created_at,
        created_by
      FROM stock_movements 
      WHERE plant_code = '${plantCode}'
      ORDER BY posting_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    // Get total count
    const countResult = await db.execute(`
      SELECT COUNT(*) as total 
      FROM stock_movements 
      WHERE plant_code = '${plantCode}'
    `);
    
    const total = parseInt(countResult.rows[0]?.total || '0');
    
    // Calculate financial summary
    const summaryResult = await db.execute(`
      SELECT 
        SUM(CASE WHEN quantity > 0 THEN COALESCE(total_value, 0) ELSE 0 END) as total_receipts,
        SUM(CASE WHEN quantity < 0 THEN ABS(COALESCE(total_value, 0)) ELSE 0 END) as total_issues,
        SUM(COALESCE(total_value, 0)) as net_value
      FROM stock_movements 
      WHERE plant_code = '${plantCode}'
    `);
    
    const summary = summaryResult.rows[0] || { total_receipts: 0, total_issues: 0, net_value: 0 };
    
    res.status(200).json({
      success: true,
      data: {
        postings: inventoryPostings.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: (offset + limit) < total
        },
        summary: {
          totalReceipts: Number(summary.total_receipts || 0),
          totalIssues: Number(summary.total_issues || 0),
          netValue: Number(summary.net_value || 0),
          postingCount: total
        }
      },
      message: 'Inventory postings retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting inventory postings:', error);
    res.status(500).json({
      error: 'Failed to get inventory postings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;