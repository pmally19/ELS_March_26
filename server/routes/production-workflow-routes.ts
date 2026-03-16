import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

import { ATPService } from '../services/atpService.js';
import { MRPService } from '../services/mrpService.js';
import { ProductionConfirmationService } from '../services/productionConfirmationService.js';

const router = express.Router();

// Initialize services
let pool: typeof Pool.prototype;

export function initSAPWorkflowRoutes(dbPool: typeof Pool.prototype) {
    pool = dbPool;
    return router;
}

// ═══════════════════════════════════════════════════════════════
// ATP (Available-to-Promise) Routes
// ═══════════════════════════════════════════════════════════════

/**
 * Run ATP check for a sales order
 * POST /api/production-workflow/atp/sales-order/:id/check
 */
router.post('/atp/sales-order/:id/check', async (req, res) => {
    try {
        const salesOrderId = parseInt(req.params.id);
        const atpService = new ATPService(pool);

        const result = await atpService.updateSalesOrderATP(salesOrderId);

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('ATP check error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'ATP check failed'
        });
    }
});

/**
 * Batch ATP check for multiple sales orders
 * POST /api/production-workflow/atp/bulk-check
 */
router.post('/atp/bulk-check', async (req, res) => {
    try {
        const { salesOrderIds } = req.body;

        if (!Array.isArray(salesOrderIds) || salesOrderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'salesOrderIds array is required'
            });
        }

        const atpService = new ATPService(pool);
        const results = await atpService.bulkATPCheck(salesOrderIds);

        res.json({
            success: true,
            data: results
        });
    } catch (error: any) {
        console.error('Bulk ATP check error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Bulk ATP check failed'
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// MRP (Material Requirements Planning) Routes
// ═══════════════════════════════════════════════════════════════

/**
 * Run MRP for all unfulfilled sales orders
 * POST /api/production-workflow/mrp/run
 */
router.post('/mrp/run', async (req, res) => {
    try {
        const { plantId, materialId } = req.body;
        const mrpService = new MRPService(pool);

        const result = await mrpService.runMRP({
            plantId: plantId ? parseInt(plantId) : undefined,
            materialId: materialId ? parseInt(materialId) : undefined
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('MRP run error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'MRP run failed'
        });
    }
});

/**
 * Run MRP for a specific sales order
 * POST /api/production-workflow/mrp/sales-order/:id/run
 */
router.post('/mrp/sales-order/:id/run', async (req, res) => {
    try {
        const salesOrderId = parseInt(req.params.id);
        const mrpService = new MRPService(pool);

        const result = await mrpService.runMRP({ salesOrderId });

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('MRP run error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'MRP run failed'
        });
    }
});

/**
 * Get planned orders
 * GET /api/production-workflow/planned-orders
 */
router.get('/planned-orders', async (req, res) => {
    try {
        const { status, salesOrderId, plantId } = req.query;

        let query = `
      SELECT 
        po.*,
        so.order_number as sales_order_number,
        so.customer_name,
        m.description as product_name,
        pl.name as plant_name
      FROM planned_orders po
      LEFT JOIN sales_orders so ON so.id = po.sales_order_id
      LEFT JOIN materials m ON m.id = po.material_id
      LEFT JOIN plants pl ON pl.id = po.plant_id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND po.status = $${paramIndex++}`;
            params.push(status);
        }

        if (salesOrderId) {
            query += ` AND po.sales_order_id = $${paramIndex++}`;
            params.push(parseInt(salesOrderId as string));
        }

        if (plantId) {
            query += ` AND po.plant_id = $${paramIndex++}`;
            params.push(parseInt(plantId as string));
        }

        query += ` ORDER BY po.created_at DESC LIMIT 100`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Get planned orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get planned orders'
        });
    }
});

/**
 * Convert planned order to production order
 * POST /api/production-workflow/planned-orders/:id/convert
 */
router.post('/planned-orders/:id/convert', async (req, res) => {
    try {
        const plannedOrderId = parseInt(req.params.id);
        const mrpService = new MRPService(pool);

        const result = await mrpService.convertPlannedOrderToProduction(plannedOrderId);

        res.json({
            success: result.success,
            data: result,
            message: result.message
        });
    } catch (error: any) {
        console.error('Convert planned order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Conversion failed'
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// Production Confirmation Routes
// ═══════════════════════════════════════════════════════════════

/**
 * Create production confirmation  
 * POST /api/production-workflow/production/confirmations
 */
router.post('/production/confirmations', async (req, res) => {
    try {
        const confirmationService = new ProductionConfirmationService(pool);

        const result = await confirmationService.confirmProduction(req.body);

        res.json({
            success: result.success,
            data: result,
            message: result.message
        });
    } catch (error: any) {
        console.error('Production confirmation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Confirmation failed'
        });
    }
});

/**
 * Get production confirmations
 * GET /api/production-workflow/production/confirmations
 */
router.get('/production/confirmations', async (req, res) => {
    try {
        const { productionOrderId } = req.query;

        let query = `
      SELECT 
        pc.*,
        po.order_number as production_order_number
      FROM production_confirmations pc
      LEFT JOIN production_orders po ON po.id = pc.production_order_id
      WHERE 1=1
    `;

        const params: any[] = [];

        if (productionOrderId) {
            query += ` AND pc.production_order_id = $1`;
            params.push(parseInt(productionOrderId as string));
        }

        query += ` ORDER BY pc.confirmation_date DESC LIMIT 100`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Get confirmations error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get confirmations'
        });
    }
});

/**
 * Reverse production confirmation
 * POST /api/production-workflow/production/confirmations/:id/reverse
 */
router.post('/production/confirmations/:id/reverse', async (req, res) => {
    try {
        const confirmationId = parseInt(req.params.id);
        const confirmationService = new ProductionConfirmationService(pool);

        const result = await confirmationService.reverseConfirmation(confirmationId);

        res.json({
            success: result.success,
            message: result.message
        });
    } catch (error: any) {
        console.error('Reverse confirmation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Reversal failed'
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// MRP Runs History
// ═══════════════════════════════════════════════════════════════

/**
 * Get MRP run history
 * GET /api/production-workflow/mrp/runs
 */
router.get('/mrp/runs', async (req, res) => {
    try {
        const query = `
      SELECT * FROM mrp_runs
      ORDER BY run_date DESC
      LIMIT 50
    `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('Get MRP runs error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get MRP runs'
        });
    }
});

export default router;
