import { Router, Request, Response } from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { validatePeriodLock } from '../middleware/period-lock-check';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ====================================================================================
// PRODUCTION ORDERS APIS
// ====================================================================================

// GET /api/production/orders - List all production orders
// GET /api/production/activity - Production activity feed
router.get('/activity', async (req: Request, res: Response) => {
    try {
        const tableCheckResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'production_activities'
            );
        `);

        if (tableCheckResult.rows[0].exists) {
            const result = await pool.query(`
                SELECT id, type, message, created_at
                FROM production_activities
                ORDER BY created_at DESC
                LIMIT 20
            `);
            res.json(result.rows);
        } else {
            res.json([]);
        }
    } catch (error: any) {
        console.error('Error fetching production activities:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch production activities', error: error.message });
    }
});

// GET /api/production/orders/statuses - Get unique order statuses for filter
router.get('/orders/statuses', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT status
            FROM production_orders
            WHERE status IS NOT NULL AND active = true
            ORDER BY status
        `);
        res.json({ success: true, data: result.rows.map(row => row.status) });
    } catch (error: any) {
        console.error('Error fetching production order statuses:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch production order statuses', error: error.message });
    }
});

// GET /api/production/orders/list - Get production orders for dropdown
router.get('/orders/list', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                po.id,
                po.order_number,
                m.name as product_name
            FROM production_orders po
            LEFT JOIN materials m ON po.material_id = m.id
            WHERE po.active = true
                AND po.status IN ('Planned', 'Released', 'In Progress')
            ORDER BY po.order_number DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching production orders list:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch production orders list', error: error.message });
    }
});

// POST /api/production/orders - Create new production order
router.post('/orders', async (req: Request, res: Response) => {
    try {
        const { ProductionOrderService } = await import('../services/productionOrderService');
        // pool is already available in this file scope from line 6
        const service = new ProductionOrderService(pool);

        const result = await service.createProductionOrder(req.body);

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating production order:', error);
        res.status(500).json({ success: false, message: 'Failed to create production order', error: error.message });
    }
});

// GET /api/production/orders - List all production orders
router.get('/orders', async (req: Request, res: Response) => {
    try {
        const { status, material_id, limit = 100 } = req.query;

        let query = `
      SELECT 
        po.*,
        m.name as material_name,
        m.code as material_code,
        bom.code as bom_code,
        bom.name as bom_name,
        wc.name as work_center_name,
        pv.version_number as production_version
      FROM production_orders po
      LEFT JOIN materials m ON po.material_id = m.id
      LEFT JOIN bill_of_materials bom ON po.bom_id = bom.id
      LEFT JOIN work_centers wc ON po.work_center_id = wc.id
      LEFT JOIN production_versions pv ON po.production_version_id = pv.id
      WHERE po.active = true
    `;

        const params: any[] = [];
        if (status) {
            query += ` AND po.status = $${params.length + 1}`;
            params.push(status);
        }
        if (material_id) {
            query += ` AND po.material_id = $${params.length + 1}`;
            params.push(material_id);
        }

        query += ` ORDER BY po.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching production orders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch production orders', error: error.message });
    }
});

// POST /api/production/orders/:id/release - Release production order
router.post('/orders/:id/release', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const orderResult = await pool.query(
            'SELECT * FROM production_orders WHERE id = $1',
            [id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Production order not found' });
        }

        const order = orderResult.rows[0];

        if (order.status !== 'Planned') {
            return res.status(400).json({
                success: false,
                message: `Cannot release order with status '${order.status}'. Must be 'Planned'.`
            });
        }

        const result = await pool.query(`
      UPDATE production_orders 
      SET status = 'Released', 
          release_date = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

        res.json({ success: true, data: result.rows[0], message: 'Production order released successfully' });
    } catch (error: any) {
        console.error('Error releasing production order:', error);
        res.status(500).json({ success: false, message: 'Failed to release production order', error: error.message });
    }
});

// POST /api/production/orders/:id/confirm - Confirm production
router.post('/orders/:id/confirm', validatePeriodLock({ module: 'INVENTORY' }), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { confirmed_quantity, scrap_quantity = 0 } = req.body;

        if (!confirmed_quantity) {
            return res.status(400).json({ success: false, message: 'confirmed_quantity is required' });
        }

        const orderResult = await pool.query(
            'SELECT * FROM production_orders WHERE id = $1',
            [id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Production order not found' });
        }

        const order = orderResult.rows[0];

        if (order.status !== 'Released' && order.status !== 'In Progress') {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm order with status '${order.status}'.`
            });
        }

        const newActualQty = parseFloat(order.actual_quantity || 0) + parseFloat(confirmed_quantity);
        const newScrapQty = parseFloat(order.scrap_quantity || 0) + parseFloat(scrap_quantity);

        const newStatus = newActualQty >= parseFloat(order.planned_quantity) ? 'Confirmed' : 'In Progress';

        const result = await pool.query(`
      UPDATE production_orders 
      SET actual_quantity = $1,
          scrap_quantity = $2,
          status = $3,
          actual_end_date = CASE WHEN $3 = 'Confirmed' THEN NOW() ELSE actual_end_date END,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [newActualQty, newScrapQty, newStatus, id]);

        res.json({
            success: true,
            data: result.rows[0],
            message: `Confirmed ${confirmed_quantity} units. Order status: ${newStatus}`
        });
    } catch (error: any) {
        console.error('Error confirming production:', error);
        res.status(500).json({ success: false, message: 'Failed to confirm production', error: error.message });
    }
});

// ====================================================================================
// BOM APIS
// ====================================================================================

// GET /api/production/boms - List BOMs
router.get('/boms', async (req: Request, res: Response) => {
    try {
        const { material_id, is_active } = req.query;

        let query = `
      SELECT 
        bom.*,
        m.name as material_name,
        m.code as material_code,
        (SELECT COUNT(*) FROM bom_items WHERE bom_id = bom.id) as component_count
      FROM bill_of_materials bom
      LEFT JOIN materials m ON bom.material_id = m.id
      WHERE 1=1
    `;

        const params: any[] = [];
        if (material_id) {
            query += ` AND bom.material_id = $${params.length + 1}`;
            params.push(material_id);
        }
        if (is_active !== undefined) {
            query += ` AND bom.is_active = $${params.length + 1}`;
            params.push(is_active === 'true');
        }

        query += ` ORDER BY bom.created_at DESC`;

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching BOMs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch BOMs', error: error.message });
    }
});

// GET /api/production/boms/:id - Get BOM with items
router.get('/boms/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const bomResult = await pool.query('SELECT * FROM bill_of_materials WHERE id = $1', [id]);
        if (bomResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'BOM not found' });
        }

        const itemsResult = await pool.query(`
      SELECT 
        bi.*,
        m.name as component_name,
        m.code as component_code
      FROM bom_items bi
      LEFT JOIN materials m ON bi.material_id = m.id
      WHERE bi.bom_id = $1
      ORDER BY bi.id
    `, [id]);

        res.json({
            success: true,
            data: {
                ...bomResult.rows[0],
                items: itemsResult.rows
            }
        });
    } catch (error: any) {
        console.error('Error fetching BOM:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch BOM', error: error.message });
    }
});

// ====================================================================================
// WORK CENTERS APIS
// ====================================================================================

// GET /api/production/work-centers/list - Get work centers for dropdown (simplified)
router.get('/work-centers/list', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                code,
                name
            FROM work_centers
            WHERE active = true
            ORDER BY code
        `);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching work centers list:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch work centers list', error: error.message });
    }
});

// GET /api/production/work-centers/statuses - Get unique work center statuses for filter
router.get('/work-centers/statuses', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT status
            FROM work_centers
            WHERE status IS NOT NULL
            ORDER BY status
        `);
        res.json({ success: true, data: result.rows.map(row => row.status) });
    } catch (error: any) {
        console.error('Error fetching work center statuses:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch work center statuses', error: error.message });
    }
});

// GET /api/production/work-centers - Get full list with all details
router.get('/work-centers', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT * FROM work_centers 
      WHERE active = true 
      ORDER BY code
    `);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching work centers:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch work centers', error: error.message });
    }
});

// ====================================================================================
// JOBS APIS (Production Work Orders)
// ====================================================================================

// GET /api/production/jobs/statuses - Get unique job statuses for filter
router.get('/jobs/statuses', async (req: Request, res: Response) => {
    try {
        const tableCheckResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'production_work_orders'
            );
        `);

        if (!tableCheckResult.rows[0].exists) {
            return res.json({ success: true, data: [] });
        }

        const result = await pool.query(`
            SELECT DISTINCT status
            FROM production_work_orders
            WHERE status IS NOT NULL
            ORDER BY status
        `);
        res.json({ success: true, data: result.rows.map(row => row.status) });
    } catch (error: any) {
        console.error('Error fetching job statuses:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch job statuses', error: error.message });
    }
});

// GET /api/production/jobs - Get production jobs (work orders)
router.get('/jobs', async (req: Request, res: Response) => {
    try {
        const tableCheckResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'production_work_orders'
            );
        `);

        if (!tableCheckResult.rows[0].exists) {
            return res.json({ success: true, data: [] });
        }

        const result = await pool.query(`
            SELECT 
                pwo.id,
                'JOB-' || LPAD(pwo.id::text, 6, '0') as job_number,
                po.order_number as production_order,
                m.name as product_name,
                wc.name as work_center,
                pwo.start_date,
                pwo.end_date,
                pwo.status,
                pwo.quantity
            FROM production_work_orders pwo
            LEFT JOIN production_orders po ON pwo.production_order_id = po.id
            LEFT JOIN materials m ON pwo.material_id = m.id
            LEFT JOIN work_centers wc ON pwo.work_center_id = wc.id
            ORDER BY pwo.start_date DESC, pwo.created_at DESC
        `);

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Error fetching production jobs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch production jobs', error: error.message });
    }
});

export default router;
