import pkg from 'pg';
const { Pool } = pkg;

/**
 * MRP (Material Requirements Planning) Service
 * Handles automatic planned order generation from sales orders
 */
export class MRPService {
    private pool: typeof Pool.prototype;

    constructor(pool: typeof Pool.prototype) {
        this.pool = pool;
    }

    /**
     * Run MRP for specified criteria
     * @param options - MRP run options
     * @returns MRP run results
     */
    async runMRP(options: {
        plantId?: number;
        materialId?: number;
        salesOrderId?: number;
    } = {}): Promise<{
        success: boolean;
        runNumber: string;
        salesOrdersAnalyzed: number;
        plannedOrdersCreated: number;
        details: any[];
    }> {
        const client = await this.pool.connect();
        const startTime = Date.now();

        try {
            await client.query('BEGIN');

            // Generate MRP run number
            const runNumber = `MRP-${Date.now()}`;

            // Find sales orders requiring production
            let query = `
        SELECT 
          so.id,
          so.order_number,
          soi.id as item_id,
          soi.material_id,
          soi.product_id,
          soi.quantity,
          soi.plant_id
        FROM sales_orders so
        INNER JOIN sales_order_items soi ON soi.sales_order_id = so.id
        WHERE so.production_required = TRUE
          AND so.status NOT IN ('CANCELLED', 'COMPLETED')
      `;

            const params: any[] = [];
            let paramIndex = 1;

            if (options.salesOrderId) {
                query += ` AND so.id = $${paramIndex++}`;
                params.push(options.salesOrderId);
            }

            if (options.plantId) {
                query += ` AND soi.plant_id = $${paramIndex++}`;
                params.push(options.plantId);
            }

            if (options.materialId) {
                query += ` AND (soi.material_id = $${paramIndex++} OR soi.product_id = $${paramIndex - 1})`;
                params.push(options.materialId);
            }

            const salesOrdersResult = await client.query(query, params);
            const salesOrdersAnalyzed = new Set(salesOrdersResult.rows.map(r => r.id)).size;

            let plannedOrdersCreated = 0;
            const details = [];

            // Create planned orders for each item
            for (const item of salesOrdersResult.rows) {
                const materialId = item.material_id || item.product_id;

                // Check if planned order already exists for this item
                const existingCheck = await client.query(`
          SELECT id FROM planned_orders
          WHERE sales_order_id = $1
            AND material_id = $2
            AND status NOT IN ('CANCELLED', 'CONVERTED')
        `, [item.id, materialId]);

                if (existingCheck.rows.length > 0) {
                    details.push({
                        salesOrderId: item.id,
                        materialId,
                        action: 'SKIPPED',
                        reason: 'Planned order already exists'
                    });
                    continue;
                }

                // Create planned order
                const plannedOrderResult = await this.generatePlannedOrder(
                    client,
                    item.id,
                    item.item_id,
                    materialId,
                    parseFloat(item.quantity),
                    item.plant_id
                );

                if (plannedOrderResult.success) {
                    plannedOrdersCreated++;
                    details.push({
                        salesOrderId: item.id,
                        salesOrderNumber: item.order_number,
                        materialId,
                        plannedOrderId: plannedOrderResult.plannedOrderId,
                        action: 'CREATED'
                    });
                }
            }

            // Log MRP run
            const executionTime = Date.now() - startTime;
            const mrpRunInsert = `
        INSERT INTO mrp_runs (
          run_number,
          run_date,
          run_type,
          plant_id,
          material_id,
          sales_orders_analyzed,
          planned_orders_created,
          status,
          execution_time_ms
        ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)
      `;

            await client.query(mrpRunInsert, [
                runNumber,
                options.salesOrderId ? 'MANUAL' : 'AUTOMATIC',
                options.plantId || null,
                options.materialId || null,
                salesOrdersAnalyzed,
                plannedOrdersCreated,
                'COMPLETED',
                executionTime
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                runNumber,
                salesOrdersAnalyzed,
                plannedOrdersCreated,
                details
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate a single planned order
     * @private
     */
    private async generatePlannedOrder(
        client: any,
        salesOrderId: number,
        salesOrderItemId: number,
        materialId: number,
        quantity: number,
        plantId: number | null
    ): Promise<{ success: boolean; plannedOrderId?: number }> {
        try {
            // Generate planned order number
            const orderNumber = `PLN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Get planned start and end dates (simplified logic)
            const plannedStartDate = new Date();
            plannedStartDate.setDate(plannedStartDate.getDate() + 1); // Start tomorrow

            const plannedEndDate = new Date(plannedStartDate);
            plannedEndDate.setDate(plannedEndDate.getDate() + 7); // 7-day lead time

            const insertQuery = `
        INSERT INTO planned_orders (
          order_number,
          material_id,
          quantity,
          plant_id,
          sales_order_id,
          sales_order_item_id,
          demand_source,
          planned_start_date,
          planned_end_date,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `;

            const result = await client.query(insertQuery, [
                orderNumber,
                materialId,
                quantity,
                plantId,
                salesOrderId,
                salesOrderItemId,
                'SALES_ORDER',
                plannedStartDate,
                plannedEndDate,
                'PLANNED'
            ]);

            return {
                success: true,
                plannedOrderId: result.rows[0].id
            };

        } catch (error) {
            console.error('Error generating planned order:', error);
            return { success: false };
        }
    }

    /**
     * Convert planned order to production order
     * @param plannedOrderId - Planned order ID
     * @returns Conversion result
     */
    async convertPlannedOrderToProduction(plannedOrderId: number): Promise<{
        success: boolean;
        productionOrderId?: number;
        message?: string;
    }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get planned order details
            const plannedOrderQuery = `
        SELECT 
          po.*,
          so.customer_name,
          so.order_number as sales_order_number
        FROM planned_orders po
        LEFT JOIN sales_orders so ON so.id = po.sales_order_id
        WHERE po.id = $1
      `;

            const plannedResult = await client.query(plannedOrderQuery, [plannedOrderId]);

            if (plannedResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Planned order not found'
                };
            }

            const plannedOrder = plannedResult.rows[0];

            if (plannedOrder.status === 'CONVERTED') {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Planned order already converted'
                };
            }

            // Create production order
            const prodOrderNumber = `PRD-${Date.now()}`;

            const insertProdOrder = `
        INSERT INTO production_orders (
          order_number,
          material_id,
          quantity_to_produce,
          uom,
          planned_order_id,
          sales_order_id,
          sales_order_number,
          demand_source,
          customer_name,
          planned_start_date,
          planned_end_date,
          status,
          priority,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING id
      `;

            const prodOrderResult = await client.query(insertProdOrder, [
                prodOrderNumber,
                plannedOrder.material_id,
                plannedOrder.quantity,
                plannedOrder.uom || 'EA',
                plannedOrderId,
                plannedOrder.sales_order_id,
                plannedOrder.sales_order_number,
                'PLANNED_ORDER',
                plannedOrder.customer_name,
                plannedOrder.planned_start_date,
                plannedOrder.planned_end_date,
                'PLANNED',
                plannedOrder.priority || 'NORMAL'
            ]);

            const productionOrderId = prodOrderResult.rows[0].id;

            // Update planned order status
            await client.query(`
        UPDATE planned_orders
        SET 
          status = 'CONVERTED',
          converted_production_order_id = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [productionOrderId, plannedOrderId]);

            // Update sales order if linked
            if (plannedOrder.sales_order_id) {
                await client.query(`
          UPDATE sales_orders
          SET 
            production_order_created = TRUE,
            production_status = 'IN_PRODUCTION',
            updated_at = NOW()
          WHERE id = $1
        `, [plannedOrder.sales_order_id]);
            }

            await client.query('COMMIT');

            return {
                success: true,
                productionOrderId,
                message: 'Production order created successfully'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
