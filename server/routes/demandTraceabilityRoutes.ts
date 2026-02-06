import express from 'express';
import { pool } from '../db.js';
import { DemandTraceabilityService } from '../services/demandTraceabilityService.js';

const router = express.Router();

const demandTraceService = new DemandTraceabilityService(pool);

/**
 * Get demand trace for production order
 * GET /api/demand-trace/production-order/:id
 */
router.get('/production-order/:id', async (req, res) => {
    try {
        const productionOrderId = parseInt(req.params.id);

        if (isNaN(productionOrderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid production order ID'
            });
        }

        const result = await demandTraceService.getDemandTraceForProductionOrder(productionOrderId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error: any) {
        console.error('Error getting demand trace:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get demand trace'
        });
    }
});

/**
 * Get production status for sales order
 * GET /api/demand-trace/sales-order/:id
 */
router.get('/sales-order/:id', async (req, res) => {
    try {
        const salesOrderId = parseInt(req.params.id);

        if (isNaN(salesOrderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sales order ID'
            });
        }

        const result = await demandTraceService.getProductionStatusForSalesOrder(salesOrderId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error: any) {
        console.error('Error getting production status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get production status'
        });
    }
});

/**
 * Link production order to sales order manually
 * POST /api/demand-trace/link
 */
router.post('/link', async (req, res) => {
    try {
        const { productionOrderId, salesOrderId } = req.body;

        if (!productionOrderId || !salesOrderId) {
            return res.status(400).json({
                success: false,
                message: 'productionOrderId and salesOrderId are required'
            });
        }

        const result = await demandTraceService.linkProductionOrderToSalesOrder(
            productionOrderId,
            salesOrderId
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error: any) {
        console.error('Error linking orders:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to link orders'
        });
    }
});

/**
 * Get production orders by demand source (analytics)
 * GET /api/demand-trace/analytics/by-demand-source
 */
router.get('/analytics/by-demand-source', async (req, res) => {
    try {
        const filters = {
            plantId: req.query.plantId ? parseInt(req.query.plantId as string) : undefined,
            dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
            dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
        };

        const analytics = await demandTraceService.getProductionOrdersByDemandSource(filters);

        res.json({
            success: true,
            data: analytics
        });
    } catch (error: any) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get analytics'
        });
    }
});

export default router;
