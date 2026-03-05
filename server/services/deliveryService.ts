import { pool } from '../db';

interface DeliveryItemData {
    salesOrderItemId: number;
    scheduleLineId?: number;
    materialId: number;
    materialName: string;
    deliveryQuantity: number;
    unit: string;
    storageLocation?: string;
    batch?: string;
}

interface CreateDeliveryData {
    salesOrderId: number;
    customerId: number;
    deliveryDate: string;
    shippingPoint?: string;
    plant?: string;
    deliveryType?: string;
    deliveryPriority?: string;
    shippingCondition?: string;
    routeCode?: string;
    movementType?: string;
    items: DeliveryItemData[];
    createdBy: number;
}

/**
 * Delivery Service - Uses delivery_documents table (consolidated)
 * Handles creation, retrieval, and goods issue posting for deliveries
 */
export class DeliveryService {
    /**
     * Create a new delivery document from a sales order
     */
    async createDelivery(data: CreateDeliveryData) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Generate delivery number
            const currentYear = new Date().getFullYear();
            const countResult = await client.query(`
        SELECT COALESCE(MAX(
          CASE 
            WHEN delivery_number ~ $1
            THEN CAST((regexp_match(delivery_number, $2))[1] AS INTEGER)
            ELSE 0
          END
        ), 0) as max_number
        FROM delivery_documents
        WHERE delivery_number LIKE $3
      `, [
                `^DL${currentYear}([0-9]{6})(-.*)?$`,
                `^DL${currentYear}([0-9]{6})`,
                `DL${currentYear}%`
            ]);

            const maxNumber = parseInt(countResult.rows[0]?.max_number || '0');
            const deliveryNumber = `DL${currentYear}${(maxNumber + 1).toString().padStart(6, '0')}`;

            // 2. Create delivery document header
            const headerResult = await client.query(`
        INSERT INTO delivery_documents (
          delivery_number, sales_order_id, customer_id, delivery_date,
          shipping_point, plant, status, created_by,
          delivery_type_code, delivery_priority, shipping_condition,
          route_code, movement_type, inventory_posting_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
                deliveryNumber,
                data.salesOrderId,
                data.customerId,
                data.deliveryDate,
                data.shippingPoint || 'SHIP',
                data.plant || 'PLAN',
                'PENDING',
                data.createdBy,
                data.deliveryType || 'LF',
                data.deliveryPriority || '02',
                data.shippingCondition || '01',
                data.routeCode,
                data.movementType || '601',
                'NOT_POSTED'
            ]);

            const delivery = headerResult.rows[0];

            // 3. Create delivery items
            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                await client.query(`
          INSERT INTO delivery_items (
            delivery_id, sales_order_item_id, line_item, material_id,
            delivery_quantity, pgi_quantity, unit, storage_location, batch,
            schedule_line_id, movement_type, inventory_posting_status, stock_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
                    delivery.id,
                    item.salesOrderItemId,
                    i + 1,
                    item.materialId,
                    item.deliveryQuantity,
                    0, // pgi_quantity starts at 0
                    item.unit,
                    item.storageLocation || '0001',
                    item.batch || `B${delivery.id}${(i + 1).toString().padStart(2, '0')}`,
                    item.scheduleLineId,
                    data.movementType || '601',
                    'NOT_POSTED',
                    'UNRESTRICTED'
                ]);
            }

            await client.query('COMMIT');
            return delivery;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all deliveries with pagination
     */
    async getAllDeliveries(limit = 50, offset = 0, status?: string) {
        let query = `
      SELECT 
        dd.*,
        COUNT(di.id) as item_count,
        SUM(di.delivery_quantity) as total_quantity
      FROM delivery_documents dd
      LEFT JOIN delivery_items di ON dd.id = di.delivery_id
    `;

        const params: any[] = [];
        if (status) {
            query += ` WHERE dd.status = $1`;
            params.push(status);
        }

        query += `
      GROUP BY dd.id
      ORDER BY dd.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Get delivery by ID with items
     */
    async getDeliveryById(id: number) {
        // Get header — JOIN erp_customers to populate customer_name
        const headerResult = await pool.query(`
            SELECT dd.*,
                   c.name AS customer_name,
                   c.customer_code,
                   so.order_number AS sales_order_number
            FROM delivery_documents dd
            LEFT JOIN erp_customers c ON dd.customer_id = c.id
            LEFT JOIN sales_orders so ON dd.sales_order_id = so.id
            WHERE dd.id = $1
        `, [id]);

        if (headerResult.rows.length === 0) {
            return null;
        }

        // Get items — alias material columns to match what the frontend reads:
        //   material_description  (was product_name)
        //   material_code         (was product_code)
        const itemsResult = await pool.query(`
            SELECT di.*,
                   m.description AS material_description,
                   m.code        AS material_code,
                   -- keep legacy aliases for backward compat
                   m.description AS product_name,
                   m.code        AS product_code
            FROM delivery_items di
            LEFT JOIN materials m ON di.material_id = m.id
            WHERE di.delivery_id = $1
            ORDER BY di.line_item
        `, [id]);

        return {
            ...headerResult.rows[0],
            items: itemsResult.rows
        };
    }

    /**
     * Get deliveries for a sales order
     */
    async getDeliveriesBySalesOrder(salesOrderId: number) {
        const result = await pool.query(`
      SELECT 
        dd.*,
        COUNT(di.id) as item_count,
        SUM(di.delivery_quantity) as total_quantity
      FROM delivery_documents dd
      LEFT JOIN delivery_items di ON dd.id = di.delivery_id
      WHERE dd.sales_order_id = $1
      GROUP BY dd.id
      ORDER BY dd.created_at DESC
    `, [salesOrderId]);

        return result.rows;
    }

    /**
     * Confirm delivery (change status to CONFIRMED)
     */
    async confirmDelivery(id: number, userId: number) {
        const result = await pool.query(`
      UPDATE delivery_documents
      SET status = 'CONFIRMED',
          updated_at = NOW()
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `, [id]);

        if (result.rows.length === 0) {
            throw new Error('Delivery not found or already confirmed');
        }

        return result.rows[0];
    }

    /**
     * Post Goods Issue - Reduces inventory and completes delivery
     */
    async postGoodsIssue(id: number, userId: number) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get delivery with items
            const delivery = await this.getDeliveryById(id);
            if (!delivery) {
                throw new Error('Delivery not found');
            }

            if (delivery.pgi_status === 'POSTED') {
                throw new Error('Goods issue already posted for this delivery');
            }

            // Generate material document number
            const year = new Date().getFullYear();
            const mdCountResult = await client.query(`
        SELECT COALESCE(MAX(
          CASE 
            WHEN pgi_document_number ~ $1
            THEN CAST((regexp_match(pgi_document_number, $2))[1] AS INTEGER)
            ELSE 0
          END
        ), 0) as max_number
        FROM delivery_documents
        WHERE pgi_document_number LIKE $3
      `, [
                `^MD${year}([0-9]{8})$`,
                `^MD${year}([0-9]{8})`,
                `MD${year}%`
            ]);

            const maxMDNumber = parseInt(mdCountResult.rows[0]?.max_number || '0');
            const materialDocNumber = `MD${year}${(maxMDNumber + 1).toString().padStart(8, '0')}`;

            // Post goods issue for each item
            for (const item of delivery.items) {
                // Create material movement
                const movementNumber = `MM-${materialDocNumber}-${item.line_item}`;

                await client.query(`
          INSERT INTO stock_movements (
            movement_number, movement_type, material_id, material_code, material_name,
            quantity, unit_of_measure, from_location, delivery_order_id,
            sales_order_id, reference_document, reference_type,
            batch_number, status, posted_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
                    movementNumber,
                    'Goods Issue',
                    item.material_id,
                    item.product_code,
                    item.product_name || item.material_name,
                    item.delivery_quantity,
                    item.unit,
                    item.storage_location,
                    delivery.id,
                    delivery.sales_order_id,
                    delivery.delivery_number,
                    'Delivery',
                    item.batch,
                    'Posted',
                    userId
                ]);

                // Reduce inventory in stock_balances if exists
                await client.query(`
          UPDATE stock_balances
          SET quantity = quantity - $1,
              available_quantity = GREATEST(0, available_quantity - $1),
              updated_at = NOW()
          WHERE material_code = $2 
            AND plant_code = $3
            AND storage_location = $4
        `, [item.delivery_quantity, item.product_code, delivery.plant, item.storage_location]);

                // Update delivery item
                await client.query(`
          UPDATE delivery_items
          SET pgi_quantity = $1,
              inventory_posting_status = 'POSTED',
              updated_at = NOW()
          WHERE id = $2
        `, [item.delivery_quantity, item.id]);
            }

            // Update delivery document
            await client.query(`
        UPDATE delivery_documents
        SET pgi_status = 'POSTED',
            pgi_date = CURRENT_DATE,
            pgi_document_number = $1,
            inventory_posting_status = 'POSTED',
            inventory_document_number = $1,
            status = 'COMPLETED',
            updated_at = NOW()
        WHERE id = $2
      `, [materialDocNumber, id]);

            // Update schedule lines if applicable
            const scheduleLineIds = delivery.items
                .map(item => item.schedule_line_id)
                .filter(id => id != null);

            if (scheduleLineIds.length > 0) {
                for (const slId of scheduleLineIds) {
                    await client.query(`
            UPDATE sales_order_schedule_lines
            SET confirmation_status = CASE
                  WHEN (confirmed_quantity - COALESCE(delivered_quantity, 0)) <= 0 
                  THEN 'DELIVERED'
                  ELSE 'PARTIALLY_DELIVERED'
                END,
                updated_at = NOW()
            WHERE id = $1
          `, [slId]);
                }
            }

            await client.query('COMMIT');

            return {
                success: true,
                materialDocumentNumber: materialDocNumber,
                itemsPosted: delivery.items.length,
                delivery: await this.getDeliveryById(id)
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update delivery status
     */
    async updateDeliveryStatus(id: number, status: string) {
        const validStatuses = ['PENDING', 'CONFIRMED', 'PGI_POSTED', 'COMPLETED', 'CANCELLED'];

        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }

        const result = await pool.query(`
      UPDATE delivery_documents
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

        if (result.rows.length === 0) {
            throw new Error('Delivery not found');
        }

        return result.rows[0];
    }
}

export const deliveryService = new DeliveryService();
