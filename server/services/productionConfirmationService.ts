import pkg from 'pg';
const { Pool } = pkg;

/**
 * Production Confirmation Service
 * Handles production order confirmations and completion tracking
 */
export class ProductionConfirmationService {
    private pool: typeof Pool.prototype;

    constructor(pool: typeof Pool.prototype) {
        this.pool = pool;
    }

    /**
     * Create a production confirmation
     * @param data - Confirmation data
     * @returns Confirmation result
     */
    async confirmProduction(data: {
        production_order_id: number;
        operation_id?: number;
        confirmed_quantity: number;
        scrap_quantity?: number;
        unit_of_measure?: string;
        work_center_id?: number;
        confirmed_by?: number;
        notes?: string;
    }): Promise<{
        success: boolean;
        confirmationId?: number;
        goodsReceiptCreated?: boolean;
        message?: string;
    }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get production order details
            const prodOrderQuery = `
        SELECT 
          id,
          order_number,
          material_id,
          quantity_to_produce,
          quantity_confirmed,
          uom,
          status
        FROM production_orders
        WHERE id = $1
      `;

            const prodOrderResult = await client.query(prodOrderQuery, [data.production_order_id]);

            if (prodOrderResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Production order not found'
                };
            }

            const prodOrder = prodOrderResult.rows[0];

            // Generate confirmation number
            const confirmationNumber = `CNF-${Date.now()}-${data.production_order_id}`;

            // Create confirmation record
            const insertConfirmation = `
        INSERT INTO production_confirmations (
          production_order_id,
          operation_id,
          confirmation_number,
          confirmation_date,
          confirmed_quantity,
          scrap_quantity,
          unit_of_measure,
          work_center_id,
          confirmed_by,
          status,
          notes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `;

            const confirmationResult = await client.query(insertConfirmation, [
                data.production_order_id,
                data.operation_id || null,
                confirmationNumber,
                data.confirmed_quantity,
                data.scrap_quantity || 0,
                data.unit_of_measure || prodOrder.uom || 'EA',
                data.work_center_id || null,
                data.confirmed_by || null,
                'CONFIRMED',
                data.notes || null
            ]);

            const confirmationId = confirmationResult.rows[0].id;

            // Update production order confirmed quantity
            const newConfirmedQty = (parseFloat(prodOrder.quantity_confirmed) || 0) + data.confirmed_quantity;
            const totalRequired = parseFloat(prodOrder.quantity_to_produce);

            // Determine if production order is complete
            const isComplete = newConfirmedQty >= totalRequired;
            const newStatus = isComplete ? 'COMPLETED' :
                newConfirmedQty > 0 ? 'IN_PROGRESS' : prodOrder.status;

            await client.query(`
        UPDATE production_orders
        SET 
          quantity_confirmed = $1,
          status = $2,
          actual_end_date = CASE WHEN $3 THEN NOW() ELSE actual_end_date END,
          updated_at = NOW()
        WHERE id = $4
      `, [newConfirmedQty, newStatus, isComplete, data.production_order_id]);

            // If production is complete, create goods receipt
            let goodsReceiptCreated = false;

            if (isComplete) {
                try {
                    await this.createGoodsReceipt(
                        client,
                        data.production_order_id,
                        prodOrder.material_id,
                        newConfirmedQty,
                        data.unit_of_measure || prodOrder.uom
                    );
                    goodsReceiptCreated = true;
                } catch (grError) {
                    console.error('Error creating goods receipt:', grError);
                    // Don't fail the whole transaction if GR fails
                }
            }

            await client.query('COMMIT');

            return {
                success: true,
                confirmationId,
                goodsReceiptCreated,
                message: `Production confirmed: ${data.confirmed_quantity} ${data.unit_of_measure || prodOrder.uom}${isComplete ? ' (Order complete)' : ''}`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create goods receipt for completed production
     * @private
     */
    private async createGoodsReceipt(
        client: any,
        productionOrderId: number,
        materialId: number,
        quantity: number,
        uom?: string
    ): Promise<void> {
        // Get production order details for plant info
        const prodOrderQuery = `
      SELECT plant_id FROM production_orders WHERE id = $1
    `;
        const prodOrderResult = await client.query(prodOrderQuery, [productionOrderId]);
        const plantId = prodOrderResult.rows[0]?.plant_id;

        // Generate goods receipt number
        const receiptNumber = `GR-PRD-${Date.now()}`;

        // Check if goods_receipts table structure supports production
        const grInsert = `
      INSERT INTO goods_receipts (
        receipt_number,
        production_order_id,
        material_id,
        plant_id,
        quantity,
        uom,
        receipt_date,
        movement_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), '101', NOW())
    `;

        try {
            await client.query(grInsert, [
                receiptNumber,
                productionOrderId,
                materialId,
                plantId,
                quantity,
                uom || 'EA'
            ]);

            // Update inventory if inventory table exists
            const inventoryUpdate = `
        INSERT INTO inventory (material_id, plant_id, quantity, unit_of_measure, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (material_id, plant_id) 
        DO UPDATE SET 
          quantity = inventory.quantity + $3,
          updated_at = NOW()
      `;

            await client.query(inventoryUpdate, [materialId, plantId, quantity, uom || 'EA']);

        } catch (error) {
            console.error('Goods receipt creation error:', error);
            // Try alternative schema if main insert fails
            throw error;
        }
    }

    /**
     * Reverse a production confirmation
     * @param confirmationId - Confirmation ID to reverse
     * @returns Reversal result
     */
    async reverseConfirmation(confirmationId: number): Promise<{
        success: boolean;
        message?: string;
    }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get confirmation details
            const confQuery = `
        SELECT * FROM production_confirmations WHERE id = $1
      `;
            const confResult = await client.query(confQuery, [confirmationId]);

            if (confResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Confirmation not found'
                };
            }

            const confirmation = confResult.rows[0];

            if (confirmation.status === 'REVERSED') {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Confirmation already reversed'
                };
            }

            // Update confirmation status
            await client.query(`
        UPDATE production_confirmations
        SET status = 'REVERSED', updated_at = NOW()
        WHERE id = $1
      `, [confirmationId]);

            // Reduce production order confirmed quantity
            await client.query(`
        UPDATE production_orders
        SET 
          quantity_confirmed = GREATEST(0, quantity_confirmed - $1),
          updated_at = NOW()
        WHERE id = $2
      `, [confirmation.confirmed_quantity, confirmation.production_order_id]);

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Confirmation reversed successfully'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
