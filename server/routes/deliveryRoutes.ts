import { Router } from 'express';
import { deliveryService } from '../services/deliveryService';

const router = Router();

/**
 * GET /api/delivery
 * List all deliveries with pagination and optional status filter
 */
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const status = req.query.status as string;

        const deliveries = await deliveryService.getAllDeliveries(limit, offset, status);

        res.json({
            success: true,
            data: deliveries,
            count: deliveries.length,
            limit,
            offset
        });
    } catch (error: any) {
        console.error('Error fetching deliveries:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch deliveries'
        });
    }
});

/**
 * GET /api/delivery/:id
 * Get delivery by ID with all items
 */
router.get('/:id', async (req, res) => {
    try {
        const delivery = await deliveryService.getDeliveryById(parseInt(req.params.id));

        if (!delivery) {
            return res.status(404).json({
                success: false,
                error: 'Delivery not found'
            });
        }

        res.json({ success: true, data: delivery });
    } catch (error: any) {
        console.error('Error fetching delivery:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch delivery'
        });
    }
});

/**
 * GET /api/delivery/sales-order/:salesOrderId
 * Get all deliveries for a specific sales order
 */
router.get('/sales-order/:salesOrderId', async (req, res) => {
    try {
        const salesOrderId = parseInt(req.params.salesOrderId);
        const deliveries = await deliveryService.getDeliveriesBySalesOrder(salesOrderId);

        res.json({
            success: true,
            data: deliveries,
            count: deliveries.length
        });
    } catch (error: any) {
        console.error('Error fetching deliveries for sales order:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch deliveries'
        });
    }
});

/**
 * POST /api/delivery
 * Create new delivery from sales order
 */
router.post('/', async (req, res) => {
    try {
        const delivery = await deliveryService.createDelivery({
            ...req.body,
            createdBy: req.body.createdBy || 1 // TODO: Get from auth
        });

        res.status(201).json({
            success: true,
            data: delivery,
            message: `Delivery ${delivery.delivery_number} created successfully`
        });
    } catch (error: any) {
        console.error('Error creating delivery:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create delivery'
        });
    }
});

/**
 * POST /api/delivery/:id/confirm
 * Confirm delivery (change status from PENDING to CONFIRMED)
 */
router.post('/:id/confirm', async (req, res) => {
    try {
        const userId = req.body.userId || 1; // TODO: Get from auth
        const delivery = await deliveryService.confirmDelivery(
            parseInt(req.params.id),
            userId
        );

        res.json({
            success: true,
            data: delivery,
            message: `Delivery ${delivery.delivery_number} confirmed`
        });
    } catch (error: any) {
        console.error('Error confirming delivery:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to confirm delivery'
        });
    }
});

/**
 * POST /api/delivery/:id/post-goods-issue
 * Post goods issue - reduces inventory and completes delivery
 */
router.post('/:id/post-goods-issue', async (req, res) => {
    try {
        const userId = req.body.userId || 1; // TODO: Get from auth
        const result = await deliveryService.postGoodsIssue(
            parseInt(req.params.id),
            userId
        );

        res.json({
            success: true,
            data: result,
            message: `Goods issue posted successfully. Material document: ${result.materialDocumentNumber}`
        });
    } catch (error: any) {
        console.error('Error posting goods issue:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to post goods issue'
        });
    }
});

/**
 * PUT /api/delivery/:id/status
 * Update delivery status
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const delivery = await deliveryService.updateDeliveryStatus(
            parseInt(req.params.id),
            status
        );

        res.json({
            success: true,
            data: delivery,
            message: `Delivery status updated to ${status}`
        });
    } catch (error: any) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update delivery status'
        });
    }
});

export default router;
