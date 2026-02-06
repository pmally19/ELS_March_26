import pkg from 'pg';
import type { Pool } from 'pg';

interface PlannedOrderData {
    materialId: number;
    plantId: number;
    quantity: number;
    requiredDate: Date;
    salesOrderId?: number;
    demandSource?: 'SALES_ORDER' | 'FORECAST' | 'STOCK_REPLENISHMENT' | 'MRP';
    customerName?: string;
}

export class PlannedOrderService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Create Planned Order from Sales Order
     * This represents the MRP planning step in SAP (MD04)
     */
    async createPlannedOrderFromSalesOrder(
        salesOrderId: number,
        createdBy: string = 'MRP System'
    ): Promise<{ success: boolean; plannedOrderId?: number; message?: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get sales order details
            const salesOrderQuery = await client.query(`
        SELECT 
          so.id,
          so.order_number,
          so.customer_name,
          soi.material_id,
          soi.quantity,
          so.delivery_date,
          so.production_priority,
          m.code as material_code,
          m.name as material_name,
          so.plant_id
        FROM sales_orders so
        LEFT JOIN sales_order_items soi ON so.id = soi.order_id
        LEFT JOIN materials m ON soi.material_id = m.id
        WHERE so.id = $1
        LIMIT 1
      `, [salesOrderId]);

            if (salesOrderQuery.rows.length === 0) {
                return {
                    success: false,
                    message: 'Sales order not found'
                };
            }

            const salesOrder = salesOrderQuery.rows[0];

            // Generate planned order number
            const plannedOrderNumber = `PLN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            // Calculate dates (basic MRP logic - can be enhanced)
            const requiredDate = salesOrder.delivery_date || new Date();
            const startDate = new Date(requiredDate);
            startDate.setDate(startDate.getDate() - 7); // 7 days before required

            // Create planned order
            const result = await client.query(`
        INSERT INTO planned_orders (
          order_number,
          material_id,
        plant_id,
          planned_quantity,
          required_date,
          order_type,
          status,
          sales_order_id,
          sales_order_number,
          demand_source,
          customer_name,
          delivery_date,
          source_document,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING id, order_number
      `, [
                plannedOrderNumber,
                salesOrder.material_id,
                salesOrder.plant_id,
                salesOrder.quantity,
                requiredDate,
                'production',
                'OPEN',
                salesOrderId,
                salesOrder.order_number,
                'SALES_ORDER',
                salesOrder.customer_name,
                requiredDate,
                `SO-${salesOrder.order_number}`
            ]);

            const plannedOrderId = result.rows[0].id;

            // Update sales order
            await client.query(`
        UPDATE sales_orders
        SET planned_order_created = TRUE,
            production_status = 'PLANNED',
            updated_at = NOW()
        WHERE id = $1
      `, [salesOrderId]);

            await client.query('COMMIT');

            return {
                success: true,
                plannedOrderId,
                message: `Planned order ${result.rows[0].order_number} created successfully`
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('Error creating planned order from sales order:', error);
            return {
                success: false,
                message: error.message || 'Failed to create planned order'
            };
        } finally {
            client.release();
        }
    }

    /**
     * Convert Planned Order to Production Order
     * This represents CO40 in SAP
     */
    async convertPlannedOrderToProduction(
        plannedOrderId: number,
        userId: number,
        userName: string = 'Production Planner'
    ): Promise<{ success: boolean; productionOrderId?: number; productionOrderNumber?: string; message?: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get planned order details
            const plannedOrderQuery = await client.query(`
        SELECT 
          po.id,
          po.order_number,
          po.material_id,
          po.plant_id,
          po.planned_quantity,
          po.required_date,
          po.sales_order_id,
          po.sales_order_number,
          po.customer_name,
          po.demand_source,
          po.delivery_date,
          po.status,
          m.code as material_code,
          m.name as material_name,
          m.base_uom
        FROM planned_orders po
        LEFT JOIN materials m ON po.material_id = m.id
        WHERE po.id = $1
      `, [plannedOrderId]);

            if (plannedOrderQuery.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Planned order not found'
                };
            }

            const plannedOrder = plannedOrderQuery.rows[0];

            if (plannedOrder.status !== 'OPEN') {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: `Planned order status is ${plannedOrder.status}. Can only convert OPEN planned orders.`
                };
            }

            // Generate production order number
            const productionOrderNumber = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            // Calculate production dates
            const plannedEndDate = new Date(plannedOrder.required_date);
            const plannedStartDate = new Date(plannedEndDate);
            plannedStartDate.setDate(plannedStartDate.getDate() - 5); // 5 days production lead time

            // Find active BOM and production version
            const bomQuery = await client.query(`
        SELECT id FROM bill_of_materials 
        WHERE material_id = $1 AND plant_id = $2 AND is_active = true 
        LIMIT 1
      `, [plannedOrder.material_id, plannedOrder.plant_id]);

            const bomId = bomQuery.rows.length > 0 ? bomQuery.rows[0].id : null;

            // Create production order
            const productionOrderResult = await client.query(`
        INSERT INTO production_orders (
          order_number,
          material_id,
          plant_id,
          bom_id,
          planned_quantity,
          unit_of_measure,
          planned_start_date,
          planned_end_date,
          priority,
          status,
          active,
          created_by,
          planned_order_id,
          sales_order_id,
          sales_order_number,
          demand_source,
          customer_name,
          delivery_priority,
          source_document_number,
          source_document_type,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        RETURNING id, order_number
      `, [
                productionOrderNumber,
                plannedOrder.material_id,
                plannedOrder.plant_id,
                bomId,
                plannedOrder.planned_quantity,
                plannedOrder.base_uom || 'PC',
                plannedStartDate,
                plannedEndDate,
                'NORMAL',
                'Planned',
                userId,
                plannedOrderId,
                plannedOrder.sales_order_id,
                plannedOrder.sales_order_number,
                plannedOrder.demand_source || 'MRP',
                plannedOrder.customer_name,
                'NORMAL',
                plannedOrder.order_number,
                'PLANNED_ORDER'
            ]);

            const productionOrderId = productionOrderResult.rows[0].id;
            const prodOrderNumber = productionOrderResult.rows[0].order_number;

            // Update planned order
            await client.query(`
        UPDATE planned_orders
        SET converted_production_order_id = $1,
            converted_by = $2,
            converted_at = NOW(),
            status = 'CONVERTED'
        WHERE id = $3
      `, [productionOrderId, userId, plannedOrderId]);

            // Update sales order if exists
            if (plannedOrder.sales_order_id) {
                await client.query(`
          UPDATE sales_orders
          SET production_order_created = TRUE,
              production_status = 'IN_PRODUCTION',
              production_start_date = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [plannedStartDate, plannedOrder.sales_order_id]);
            }

            await client.query('COMMIT');

            return {
                success: true,
                productionOrderId,
                productionOrderNumber: prodOrderNumber,
                message: `Production order ${prodOrderNumber} created successfully from planned order`
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('Error converting planned order to production:', error);
            return {
                success: false,
                message: error.message || 'Failed to convert planned order'
            };
        } finally {
            client.release();
        }
    }

    /**
     * Get Unconverted Planned Orders
     * For MRP Dashboard
     */
    async getUnconvertedPlannedOrders(plantId?: number): Promise<any[]> {
        try {
            let query = `
        SELECT 
          po.id,
          po.order_number,
          po.material_id,
          m.code as material_code,
          m.name as material_name,
          po.planned_quantity,
          po.required_date,
          po.sales_order_number,
          po.customer_name,
          po.demand_source,
          po.status,
          po.created_at,
          p.name as plant_name
        FROM planned_orders po
        LEFT JOIN materials m ON po.material_id = m.id
        LEFT JOIN plants p ON po.plant_id = p.id
        WHERE po.status = 'OPEN'
      `;

            const params: any[] = [];

            if (plantId) {
                query += ' AND po.plant_id = $1';
                params.push(plantId);
            }

            query += ' ORDER BY po.required_date ASC';

            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching unconverted planned orders:', error);
            throw error;
        }
    }

    /**
     * Get Planned Orders with full details
     */
    async getPlannedOrders(filters?: {
        plantId?: number;
        status?: string;
        salesOrderId?: number;
    }): Promise<any[]> {
        try {
            let query = `
        SELECT 
          po.id,
          po.order_number,
          po.material_id,
          m.code as material_code,
          m.name as material_name,
          po.planned_quantity,
          po.required_date,
          po.sales_order_id,
          po.sales_order_number,
          po.customer_name,
          po.demand_source,
          po.status,
          po.converted_production_order_id,
          prod.order_number as production_order_number,
          po.created_at,
          po.converted_at,
          p.name as plant_name
        FROM planned_orders po
        LEFT JOIN materials m ON po.material_id = m.id
        LEFT JOIN plants p ON po.plant_id = p.id
        LEFT JOIN production_orders prod ON po.converted_production_order_id = prod.id
        WHERE 1=1
      `;

            const params: any[] = [];
            let paramCount = 1;

            if (filters?.plantId) {
                query += ` AND po.plant_id = $${paramCount}`;
                params.push(filters.plantId);
                paramCount++;
            }

            if (filters?.status) {
                query += ` AND po.status = $${paramCount}`;
                params.push(filters.status);
                paramCount++;
            }

            if (filters?.salesOrderId) {
                query += ` AND po.sales_order_id = $${paramCount}`;
                params.push(filters.salesOrderId);
                paramCount++;
            }

            query += ' ORDER BY po.created_at DESC';

            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error fetching planned orders:', error);
            throw error;
        }
    }
}
