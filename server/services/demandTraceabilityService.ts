import type { Pool } from 'pg';

export class DemandTraceabilityService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Get complete demand trace for a production order
     * Shows: Sales Order → Planned Order → Production Order chain
     */
    async getDemandTraceForProductionOrder(productionOrderId: number): Promise<{
        success: boolean;
        data?: any;
        message?: string;
    }> {
        try {
            const result = await this.pool.query(`
        SELECT 
          -- Production Order Info
          po.id as production_order_id,
          po.order_number as production_order_number,
          po.status as production_status,
          po.demand_source,
          po.customer_name,
          po.delivery_priority,
          po.planned_quantity as production_quantity,
          po.planned_start_date as production_start_date,
          po.planned_end_date as production_end_date,
          po.created_at as production_created_at,
          
          -- Material Info
          m.id as material_id,
          m.code as material_code,
          m.name as material_name,
          m.base_uom,
          
          -- Planned Order Info
          plo.id as planned_order_id,
          plo.order_number as planned_order_number,
          plo.status as planned_order_status,
          plo.planned_quantity as planned_quantity,
          plo.created_at as planned_order_created_at,
          plo.converted_at as planned_order_converted_at,
          
          -- Sales Order Info
          so.id as sales_order_id,
          so.order_number as sales_order_number,
          so.customer_name as sales_customer_name,
          so.production_status as sales_production_status,
          so.order_date as sales_order_date,
          so.delivery_date as sales_delivery_date,
          so.production_priority as sales_priority,
          
          -- Plant Info
          p.id as plant_id,
          p.name as plant_name,
          p.code as plant_code,
          
          -- Demand Chain Type
          CASE 
            WHEN po.sales_order_id IS NOT NULL THEN 'SALES_ORDER'
            WHEN po.planned_order_id IS NOT NULL THEN 'PLANNED_ORDER'
            ELSE 'MANUAL'
          END AS demand_chain_type
          
        FROM production_orders po
        LEFT JOIN materials m ON po.material_id = m.id
        LEFT JOIN planned_orders plo ON po.planned_order_id = plo.id
        LEFT JOIN sales_orders so ON COALESCE(po.sales_order_id, plo.sales_order_id) = so.id
        LEFT JOIN plants p ON po.plant_id = p.id
        WHERE po.id = $1
      `, [productionOrderId]);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    message: 'Production order not found'
                };
            }

            const data = result.rows[0];

            // Build timeline
            const timeline = [
                data.sales_order_date && {
                    event: 'Sales Order Created',
                    date: data.sales_order_date,
                    document: data.sales_order_number,
                    type: 'SALES_ORDER'
                },
                data.planned_order_created_at && {
                    event: 'Planned Order Created',
                    date: data.planned_order_created_at,
                    document: data.planned_order_number,
                    type: 'PLANNED_ORDER'
                },
                data.planned_order_converted_at && {
                    event: 'Converted to Production',
                    date: data.planned_order_converted_at,
                    document: data.production_order_number,
                    type: 'CONVERSION'
                },
                data.production_created_at && {
                    event: 'Production Order Created',
                    date: data.production_created_at,
                    document: data.production_order_number,
                    type: 'PRODUCTION_ORDER'
                },
                data.production_start_date && {
                    event: 'Production Planned Start',
                    date: data.production_start_date,
                    document: data.production_order_number,
                    type: 'PRODUCTION_START'
                }
            ].filter(Boolean); // Remove null entries

            return {
                success: true,
                data: {
                    ...data,
                    timeline,
                    demandChain: {
                        source: data.demand_chain_type,
                        hasCustomerDemand: !!data.sales_order_id,
                        hasMRPPlanning: !!data.planned_order_id,
                        customerName: data.sales_customer_name || data.customer_name,
                        salesOrderNumber: data.sales_order_number,
                        plannedOrderNumber: data.planned_order_number,
                        productionOrderNumber: data.production_order_number
                    }
                }
            };
        } catch (error: any) {
            console.error('Error getting demand trace:', error);
            return {
                success: false,
                message: error.message || 'Failed to get demand trace'
            };
        }
    }

    /**
     * Get production status for a sales order
     * Shows all planned orders and production orders linked to the sales order
     */
    async getProductionStatusForSalesOrder(salesOrderId: number): Promise<{
        success: boolean;
        data?: any;
        message?: string;
    }> {
        try {
            // Get sales order info
            const salesOrderResult = await this.pool.query(`
        SELECT 
          id,
          order_number,
          customer_name,
          order_date,
          delivery_date,
          production_status,
          planned_order_created,
          production_order_created,
          production_start_date,
          production_completion_date,
          production_priority
        FROM sales_orders
        WHERE id = $1
      `, [salesOrderId]);

            if (salesOrderResult.rows.length === 0) {
                return {
                    success: false,
                    message: 'Sales order not found'
                };
            }

            const salesOrder = salesOrderResult.rows[0];

            // Get planned orders
            const plannedOrdersResult = await this.pool.query(`
        SELECT 
          id,
          order_number,
          material_id,
          planned_quantity,
          required_date,
          status,
          converted_production_order_id,
          created_at,
          converted_at,
          m.code as material_code,
          m.name as material_name
        FROM planned_orders plo
        LEFT JOIN materials m ON plo.material_id = m.id
        WHERE sales_order_id = $1
        ORDER BY created_at DESC
      `, [salesOrderId]);

            // Get production orders
            const productionOrdersResult = await this.pool.query(`
        SELECT 
          id,
          order_number,
          material_id,
          planned_quantity,
          actual_quantity,
          planned_start_date,
          planned_end_date,
          actual_start_date,
          actual_end_date,
          status,
          demand_source,
          created_at,
          m.code as material_code,
          m.name as material_name
        FROM production_orders po
        LEFT JOIN materials m ON po.material_id = m.id
        WHERE sales_order_id = $1
        ORDER BY created_at DESC
      `, [salesOrderId]);

            // Calculate production progress
            const totalPlannedOrders = plannedOrdersResult.rows.length;
            const convertedPlannedOrders = plannedOrdersResult.rows.filter(p => p.status === 'CONVERTED').length;
            const totalProductionOrders = productionOrdersResult.rows.length;
            const completedProductionOrders = productionOrdersResult.rows.filter(p => p.status === 'COMPLETED').length;

            return {
                success: true,
                data: {
                    salesOrder,
                    plannedOrders: plannedOrdersResult.rows,
                    productionOrders: productionOrdersResult.rows,
                    summary: {
                        totalPlannedOrders,
                        convertedPlannedOrders,
                        totalProductionOrders,
                        completedProductionOrders,
                        productionStatus: salesOrder.production_status,
                        plannedOrderCreated: salesOrder.planned_order_created,
                        productionOrderCreated: salesOrder.production_order_created
                    },
                    timeline: [
                        {
                            event: 'Sales Order Created',
                            date: salesOrder.order_date,
                            status: 'COMPLETED'
                        },
                        {
                            event: 'Planned Order Created',
                            date: plannedOrdersResult.rows[0]?.created_at,
                            status: salesOrder.planned_order_created ? 'COMPLETED' : 'PENDING'
                        },
                        {
                            event: 'Production Order Created',
                            date: productionOrdersResult.rows[0]?.created_at,
                            status: salesOrder.production_order_created ? 'COMPLETED' : 'PENDING'
                        },
                        {
                            event: 'Production Started',
                            date: salesOrder.production_start_date,
                            status: salesOrder.production_start_date ? 'COMPLETED' : 'PENDING'
                        },
                        {
                            event: 'Production Completed',
                            date: salesOrder.production_completion_date,
                            status: salesOrder.production_completion_date ? 'COMPLETED' : 'PENDING'
                        },
                        {
                            event: 'Delivery',
                            date: salesOrder.delivery_date,
                            status: salesOrder.production_status === 'DELIVERED' ? 'COMPLETED' : 'PENDING'
                        }
                    ]
                }
            };
        } catch (error: any) {
            console.error('Error getting production status for sales order:', error);
            return {
                success: false,
                message: error.message || 'Failed to get production status'
            };
        }
    }

    /**
     * Link production order to sales order manually
     * For cases where production was created manually but needs to be linked
     */
    async linkProductionOrderToSalesOrder(
        productionOrderId: number,
        salesOrderId: number
    ): Promise<{ success: boolean; message?: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get sales order details
            const salesOrderResult = await client.query(
                'SELECT order_number, customer_name FROM sales_orders WHERE id = $1',
                [salesOrderId]
            );

            if (salesOrderResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Sales order not found'
                };
            }

            const salesOrder = salesOrderResult.rows[0];

            // Update production order
            await client.query(`
        UPDATE production_orders
        SET sales_order_id = $1,
            sales_order_number = $2,
            customer_name = $3,
            demand_source = 'SALES_ORDER',
            updated_at = NOW()
        WHERE id = $4
      `, [salesOrderId, salesOrder.order_number, salesOrder.customer_name, productionOrderId]);

            // Update sales order
            await client.query(`
        UPDATE sales_orders
        SET production_order_created = TRUE,
            production_status = CASE 
              WHEN production_status = 'NOT_STARTED' THEN 'IN_PRODUCTION'
              ELSE production_status
            END,
            updated_at = NOW()
        WHERE id = $1
      `, [salesOrderId]);

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Production order linked to sales order successfully'
            };
        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('Error linking production order to sales order:', error);
            return {
                success: false,
                message: error.message || 'Failed to link orders'
            };
        } finally {
            client.release();
        }
    }

    /**
     * Get all production orders grouped by demand source
     * For analytics and dashboards
     */
    async getProductionOrdersByDemandSource(filters?: {
        plantId?: number;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<any> {
        try {
            let query = `
        SELECT 
          demand_source,
          COUNT(*) as total_orders,
          SUM(planned_quantity) as total_quantity,
          COUNT(CASE WHEN status = 'Planned' THEN 1 END) as planned_orders,
          COUNT(CASE WHEN status = 'Released' THEN 1 END) as released_orders,
          COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN sales_order_id IS NOT NULL THEN 1 END) as linked_to_sales
        FROM production_orders
        WHERE active = true
      `;

            const params: any[] = [];
            let paramCount = 1;

            if (filters?.plantId) {
                query += ` AND plant_id = $${paramCount}`;
                params.push(filters.plantId);
                paramCount++;
            }

            if (filters?.dateFrom) {
                query += ` AND created_at >= $${paramCount}`;
                params.push(filters.dateFrom);
                paramCount++;
            }

            if (filters?.dateTo) {
                query += ` AND created_at <= $${paramCount}`;
                params.push(filters.dateTo);
                paramCount++;
            }

            query += ' GROUP BY demand_source ORDER BY total_orders DESC';

            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting production orders by demand source:', error);
            throw error;
        }
    }
}
