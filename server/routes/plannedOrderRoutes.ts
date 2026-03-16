import express from 'express';
import { pool } from '../db.js';
import { PlannedOrderService } from '../services/plannedOrderService.js';

const router = express.Router();

const plannedOrderService = new PlannedOrderService(pool);

/**
 * Create planned order from sales order
 * POST /api/planned-orders/from-sales-order
 */
router.post('/from-sales-order', async (req, res) => {
    try {
        const { salesOrderId, createdBy } = req.body;

        if (!salesOrderId) {
            return res.status(400).json({
                success: false,
                message: 'salesOrderId is required'
            });
        }

        const result = await plannedOrderService.createPlannedOrderFromSalesOrder(
            salesOrderId,
            createdBy || 'MRP System'
        );

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error: any) {
        console.error('Error creating planned order:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create planned order'
        });
    }
});

/**
 * Convert planned order to production order
 * POST /api/planned-orders/:id/convert-to-production
 */
router.post('/:id/convert-to-production', async (req, res) => {
    try {
        const plannedOrderId = parseInt(req.params.id);
        const { userId, userName } = req.body;

        if (isNaN(plannedOrderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid planned order ID'
            });
        }

        const result = await plannedOrderService.convertPlannedOrderToProduction(
            plannedOrderId,
            userId || 1,
            userName || 'Production Planner'
        );

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error: any) {
        console.error('Error converting planned order:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to convert planned order'
        });
    }
});

/**
 * Get unconverted planned orders
 * GET /api/planned-orders/unconverted
 */
router.get('/unconverted', async (req, res) => {
    try {
        const plantId = req.query.plantId ? parseInt(req.query.plantId as string) : undefined;

        const orders = await plannedOrderService.getUnconvertedPlannedOrders(plantId);

        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error: any) {
        console.error('Error fetching unconverted planned orders:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch unconverted planned orders'
        });
    }
});

/**
 * Get all planned orders with filters
 * GET /api/planned-orders
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            plantId: req.query.plantId ? parseInt(req.query.plantId as string) : undefined,
            status: req.query.status as string | undefined,
            salesOrderId: req.query.salesOrderId ? parseInt(req.query.salesOrderId as string) : undefined
        };

        const orders = await plannedOrderService.getPlannedOrders(filters);

        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error: any) {
        console.error('Error fetching planned orders:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch planned orders'
        });
    }
});

export default router;
