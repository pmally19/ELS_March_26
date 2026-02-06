import pkg from 'pg';
const { Pool } = pkg;

/**
 * ATP (Available-to-Promise) Service
 * Handles stock availability checking and production requirement flagging
 */
export class ATPService {
    private pool: typeof Pool.prototype;

    constructor(pool: typeof Pool.prototype) {
        this.pool = pool;
    }

    /**
     * Check stock availability for a material
     * @param materialId - Product/Material ID
     * @param plantId - Plant ID (optional)
     * @param requiredQuantity - Required quantity
     * @returns Availability status and available quantity
     */
    async checkAvailability(
        materialId: number,
        plantId: number | null,
        requiredQuantity: number
    ): Promise<{
        status: 'AVAILABLE' | 'PARTIAL' | 'NOT_AVAILABLE';
        availableQuantity: number;
        productionRequired: boolean;
    }> {
        const client = await this.pool.connect();

        try {
            // Query current stock levels
            const stockQuery = `
        SELECT 
          COALESCE(SUM(quantity), 0) as total_stock
        FROM inventory
        WHERE material_id = $1
          ${plantId ? 'AND plant_id = $2' : ''}
      `;

            const params = plantId ? [materialId, plantId] : [materialId];
            const stockResult = await client.query(stockQuery, params);

            const availableQuantity = parseFloat(stockResult.rows[0]?.total_stock || '0');

            // Determine status
            let status: 'AVAILABLE' | 'PARTIAL' | 'NOT_AVAILABLE';
            let productionRequired = false;

            if (availableQuantity >= requiredQuantity) {
                status = 'AVAILABLE';
            } else if (availableQuantity > 0) {
                status = 'PARTIAL';
                productionRequired = true;
            } else {
                status = 'NOT_AVAILABLE';
                productionRequired = true;
            }

            return {
                status,
                availableQuantity,
                productionRequired
            };
        } finally {
            client.release();
        }
    }

    /**
     * Run ATP check for a sales order and update status
     * @param salesOrderId - Sales Order ID
     * @returns ATP check results
     */
    async updateSalesOrderATP(salesOrderId: number): Promise<{
        success: boolean;
        overallStatus: string;
        productionRequired: boolean;
        items?: any[];
    }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get sales order items
            const itemsQuery = `
        SELECT 
          id,
          material_id,
          product_id,
          quantity,
          plant_id
        FROM sales_order_items
        WHERE sales_order_id = $1
      `;

            const itemsResult = await client.query(itemsQuery, [salesOrderId]);
            const items = itemsResult.rows;

            if (items.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    overallStatus: 'NO_ITEMS',
                    productionRequired: false
                };
            }

            let overallProductionRequired = false;
            let allAvailable = true;
            const itemResults = [];

            // Check ATP for each item
            for (const item of items) {
                const materialId = item.material_id || item.product_id;

                const atpResult = await this.checkAvailability(
                    materialId,
                    item.plant_id,
                    parseFloat(item.quantity)
                );

                if (atpResult.productionRequired) {
                    overallProductionRequired = true;
                }

                if (atpResult.status !== 'AVAILABLE') {
                    allAvailable = false;
                }

                itemResults.push({
                    itemId: item.id,
                    materialId,
                    ...atpResult
                });
            }

            // Update sales order with ATP results
            const overallStatus = allAvailable ? 'AVAILABLE' :
                overallProductionRequired ? 'NOT_AVAILABLE' : 'PARTIAL';

            const updateQuery = `
        UPDATE sales_orders
        SET 
          availability_status = $1,
          stock_check_date = NOW(),
          production_required = $2,
          updated_at = NOW()
        WHERE id = $3
      `;

            await client.query(updateQuery, [
                overallStatus,
                overallProductionRequired,
                salesOrderId
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                overallStatus,
                productionRequired: overallProductionRequired,
                items: itemResults
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Batch ATP check for multiple sales orders
     * @param salesOrderIds - Array of sales order IDs
     * @returns Results for each order
     */
    async bulkATPCheck(salesOrderIds: number[]): Promise<any[]> {
        const results = [];

        for (const orderId of salesOrderIds) {
            try {
                const result = await this.updateSalesOrderATP(orderId);
                results.push({
                    salesOrderId: orderId,
                    ...result
                });
            } catch (error: any) {
                results.push({
                    salesOrderId: orderId,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }
}
