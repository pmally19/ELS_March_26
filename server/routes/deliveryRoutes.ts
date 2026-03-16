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

// --- PICKING ---
router.get('/:id/picking', async (req, res) => {
    try {
        const po = await deliveryService.getPickingOrder(parseInt(req.params.id));
        res.json({ success: true, data: po });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:id/start-picking', async (req, res) => {
    try {
        const userId = req.body.userId || 1;
        const result = await deliveryService.startPicking(parseInt(req.params.id), userId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:id/picking', async (req, res) => {
    try {
        const result = await deliveryService.confirmPicking(parseInt(req.params.id), req.body.items);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- PACKING ---
router.get('/:id/handling-units', async (req, res) => {
    try {
        const hus = await deliveryService.getHandlingUnits(parseInt(req.params.id));
        res.json({ success: true, data: hus });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:id/handling-units', async (req, res) => {
    try {
        const userId = req.body.userId || 1;
        const result = await deliveryService.createHandlingUnit(
            parseInt(req.params.id), req.body.packagingTypeId, req.body.items, userId
        );
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:id/confirm-packing', async (req, res) => {
    try {
        const result = await deliveryService.confirmPacking(parseInt(req.params.id));
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- LOADING ---
router.put('/:id/loading', async (req, res) => {
    try {
        const result = await deliveryService.saveLoadingDetails(parseInt(req.params.id), req.body);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- MASTER DATA (Packaging Types) ---
import { pool } from '../db';
router.get('/master-data/packaging-types', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM packaging_material_types ORDER BY name');
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/master-data/packaging-types', async (req, res) => {
    try {
        const { code, name, max_weight, weight_unit, is_active } = req.body;
        const result = await pool.query(`
            INSERT INTO packaging_material_types (code, name, max_weight, weight_unit, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [code, name, max_weight || null, weight_unit || 'KG', is_active !== false]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/master-data/packaging-types/:id', async (req, res) => {
    try {
        const { code, name, max_weight, weight_unit, is_active } = req.body;
        const result = await pool.query(`
            UPDATE packaging_material_types 
            SET code = $1, name = $2, max_weight = $3, weight_unit = $4, is_active = $5
            WHERE id = $6
            RETURNING *
        `, [code, name, max_weight || null, weight_unit || 'KG', is_active !== false, parseInt(req.params.id)]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/master-data/packaging-types/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM packaging_material_types WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
