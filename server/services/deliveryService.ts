import { pool } from '../db';
import { salesDistributionService } from './sales-distribution-service';
import { pricingCalculationService } from './pricing-calculation';
import { mmfiIntegrationService } from './mm-fi-integration-service';

interface DeliveryItemData {
    salesOrderItemId: number;
    scheduleLineId?: number;
    materialId: number;
    materialName: string;
    deliveryQuantity: number;
    unit: string;
    storageLocation?: string;
    batch?: string;
    itemCategory?: string;
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
    totalAmount?: number;
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

            // 1.5 Calculate total amount if not provided
            let totalAmount = data.totalAmount;
            if (totalAmount === undefined && data.items.length > 0) {
              const soiIds = data.items.map(item => item.salesOrderItemId);
              const amountsResult = await client.query(
                `SELECT SUM(net_amount) as total FROM sales_order_items WHERE id = ANY($1)`,
                [soiIds]
              );
              totalAmount = parseFloat(amountsResult.rows[0]?.total || '0');
            }

            // 1.6 Determine shipping point and plant if not provided
            let finalShippingPoint = data.shippingPoint;
            let finalPlant = data.plant;
            let finalShippingCondition = data.shippingCondition;

            if (data.items.length > 0) {
                try {
                    const firstItem = data.items[0];
                    
                    // Get material details for loading group and plant
                    const materialResult = await client.query(
                        `SELECT loading_group, plant_code FROM materials WHERE id = $1`,
                        [firstItem.materialId]
                    );
                    
                    if (materialResult.rows.length > 0) {
                        const loadingGroup = materialResult.rows[0].loading_group || '01';
                        if (!finalPlant) finalPlant = materialResult.rows[0].plant_code || '1010';
                        
                        // Get shipping condition from customer if not provided
                        if (!finalShippingCondition) {
                            const customerResult = await client.query(
                                `SELECT shipping_condition_key FROM erp_customers WHERE id = $1`,
                                [data.customerId]
                            );
                            finalShippingCondition = customerResult.rows[0]?.shipping_condition_key || '01';
                        }

                        // Determine shipping point if missing
                        if (!finalShippingPoint) {
                            const spCode = await salesDistributionService.determineShippingPoint(
                                finalShippingCondition,
                                loadingGroup,
                                finalPlant
                            );
                            if (spCode) {
                                finalShippingPoint = spCode;
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error in delivery shipping point determination:', err);
                }
            }

            if (!finalShippingPoint) finalShippingPoint = 'SHIP';
            if (!finalPlant) finalPlant = 'PLAN';
            if (!finalShippingCondition) finalShippingCondition = '01';

            // 2. Create delivery document header
            const headerResult = await client.query(`
        INSERT INTO delivery_documents (
          delivery_number, sales_order_id, customer_id, delivery_date,
          shipping_point, plant, status, created_by,
          delivery_type_code, delivery_priority, shipping_condition,
          route_code, movement_type, inventory_posting_status, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
                deliveryNumber,
                data.salesOrderId,
                data.customerId,
                data.deliveryDate,
                finalShippingPoint,
                finalPlant,
                'PENDING',
                data.createdBy,
                data.deliveryType || 'LF',
                data.deliveryPriority || '02',
                finalShippingCondition,
                data.routeCode,
                data.movementType || '601',
                'NOT_POSTED',
                totalAmount || 0
            ]);

            const delivery = headerResult.rows[0];

            // 3. Create delivery items
            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                await client.query(`
          INSERT INTO delivery_items (
            delivery_id, sales_order_item_id, line_item, material_id,
            delivery_quantity, pgi_quantity, unit, storage_location, batch,
            schedule_line_id, movement_type, inventory_posting_status, stock_type,
            item_category
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
                    'UNRESTRICTED',
                    item.itemCategory || null
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
                   m.loading_group,
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

            if (delivery.picking_status !== 'COMPLETED') {
                throw new Error('Cannot post goods issue: Picking is not completed. Please complete picking first.');
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

                // 3.5 Calculate COGS using VPRS (Material Price)
                const unitCost = await pricingCalculationService.getMaterialCost(
                    item.material_id, 
                    item.product_code || null, 
                    delivery.plant, 
                    item.storage_location
                );
                const cogsAmount = unitCost * item.delivery_quantity;

                await client.query(`
          INSERT INTO stock_movements (
            movement_number, movement_type, material_id, material_code, material_name,
            quantity, unit_of_measure, from_location, delivery_order_id,
            sales_order_id, reference_document, reference_type,
            batch_number, status, posted_by,
            unit_price, total_value, cogs_amount, plant_code, storage_location
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
                    userId,
                    unitCost,      // unit_price
                    cogsAmount,    // total_value
                    cogsAmount,    // cogs_amount
                    delivery.plant,
                    item.storage_location
                ]);

                // 3.6 Post to GL if integration service persists
                try {
                    await mmfiIntegrationService.postStockMovementToGL(
                        item.material_id,
                        '601', // Movement Type for Sales Delivery
                        item.delivery_quantity,
                        unitCost,
                        delivery.plant
                    );
                } catch (glError) {
                    console.error(`Financial posting failed for item ${item.product_code}:`, glError);
                    // In a real SAP system, this might block PGI, but here we'll log it
                }

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

    }

    // --- PICKING ---

    async getPickingOrder(deliveryId: number) {
        const orderResult = await pool.query(`
            SELECT * FROM picking_orders WHERE delivery_id = $1
        `, [deliveryId]);

        if (orderResult.rows.length === 0) return null;

        const itemsResult = await pool.query(`
            SELECT pi.*, di.line_item, di.delivery_quantity, m.code as material_code, m.description as material_name
            FROM picking_order_items pi
            JOIN delivery_items di ON pi.delivery_item_id = di.id
            LEFT JOIN materials m ON di.material_id = m.id
            WHERE pi.picking_order_id = $1
            ORDER BY di.line_item
        `, [orderResult.rows[0].id]);

        return {
            ...orderResult.rows[0],
            items: itemsResult.rows
        };
    }

    async startPicking(deliveryId: number, userId: number) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Generate picking number
            const year = new Date().getFullYear();
            const countResult = await client.query(`SELECT COUNT(*) FROM picking_orders WHERE picking_number LIKE $1`, [`TO${year}%`]);
            const nextNum = parseInt(countResult.rows[0].count) + 1;
            const pickingNumber = `TO${year}${nextNum.toString().padStart(6, '0')}`;

            const orderResult = await client.query(`
                INSERT INTO picking_orders (picking_number, delivery_id, status, started_at, created_by)
                VALUES ($1, $2, 'IN_PROGRESS', NOW(), $3)
                RETURNING *
            `, [pickingNumber, deliveryId, userId]);

            const pickingOrderId = orderResult.rows[0].id;

            const deliveryItems = await client.query(`
                SELECT id, line_item, material_id, delivery_quantity, unit, storage_location, batch
                FROM delivery_items
                WHERE delivery_id = $1
                ORDER BY line_item
            `, [deliveryId]);

            for (const item of deliveryItems.rows) {
                await client.query(`
                    INSERT INTO picking_order_items (
                        picking_order_id, delivery_item_id, material_id, required_qty, unit, from_storage_bin, batch
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    pickingOrderId, item.id, item.material_id, item.delivery_quantity, item.unit,
                    `BIN-${item.storage_location?.trim() || 'RECEIVING'}`, item.batch
                ]);
            }

            await client.query(`
                UPDATE delivery_documents
                SET picking_status = 'IN_PROGRESS', picking_start_date = NOW(), updated_at = NOW()
                WHERE id = $1
            `, [deliveryId]);

            await client.query('COMMIT');
            return await this.getPickingOrder(deliveryId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async confirmPicking(deliveryId: number, items: any[]) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const po = await client.query(`SELECT id FROM picking_orders WHERE delivery_id = $1`, [deliveryId]);
            if (po.rows.length === 0) throw new Error('Picking order not found');
            const pickingOrderId = po.rows[0].id;

            let allComplete = true;

            for (const item of items) {
                const updateRes = await client.query(`
                    UPDATE picking_order_items
                    SET picked_qty = $1, status = CASE WHEN $1 >= required_qty THEN 'PICKED' ELSE 'PARTIAL' END, updated_at = NOW()
                    WHERE id = $2 AND picking_order_id = $3
                    RETURNING status
                `, [item.picked_qty, item.id, pickingOrderId]);

                if (updateRes.rows.length === 0 || updateRes.rows[0].status !== 'PICKED') {
                    allComplete = false;
                }
            }

            if (allComplete) {
                await client.query(`UPDATE picking_orders SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1`, [pickingOrderId]);
                await client.query(`UPDATE delivery_documents SET picking_status = 'COMPLETED', picking_completion_date = NOW(), updated_at = NOW() WHERE id = $1`, [deliveryId]);
            } else {
                // If not all complete, ensure it's marked as IN_PROGRESS
                await client.query(`UPDATE picking_orders SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`, [pickingOrderId]);
                await client.query(`UPDATE delivery_documents SET picking_status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`, [deliveryId]);
            }

            await client.query('COMMIT');
            return { success: true, allComplete };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // --- PACKING ---

    async getHandlingUnits(deliveryId: number) {
        const result = await pool.query(`
            SELECT hu.*, pt.name as packaging_material_name, pt.code as packaging_material_code, pt.weight_unit 
            FROM handling_units hu
            LEFT JOIN packaging_material_types pt ON hu.packaging_material_id = pt.id
            WHERE hu.delivery_id = $1
            ORDER BY hu.created_at
        `, [deliveryId]);

        for (const hu of result.rows) {
            const items = await pool.query(`
                SELECT hi.*, di.line_item, m.code as material_code, m.description as material_name
                FROM handling_unit_items hi
                JOIN delivery_items di ON hi.delivery_item_id = di.id
                LEFT JOIN materials m ON hi.material_id = m.id
                WHERE hi.hu_id = $1
                ORDER BY di.line_item
            `, [hu.id]);
            hu.items = items.rows;
        }
        return result.rows;
    }

    async createHandlingUnit(deliveryId: number, packagingTypeId: number, items: any[], userId: number) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const year = new Date().getFullYear();
            const countResult = await client.query(`SELECT COUNT(*) FROM handling_units WHERE hu_number LIKE $1`, [`HU${year}%`]);
            const nextNum = parseInt(countResult.rows[0].count) + 1;
            const huNumber = `HU${year}${nextNum.toString().padStart(6, '0')}`;

            // Calculate weight
            let netWeight = 0;
            for (const item of items) {
                const di = await client.query(`SELECT weight FROM delivery_items WHERE id = $1`, [item.delivery_item_id]);
                netWeight += (parseFloat(di.rows[0]?.weight || 0) * (item.packed_qty || 1));
            }

            const huResult = await client.query(`
                INSERT INTO handling_units (hu_number, delivery_id, packaging_material_id, net_weight, gross_weight, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [huNumber, deliveryId, packagingTypeId, netWeight, netWeight * 1.1, userId]);

            const huId = huResult.rows[0].id;

            for (const item of items) {
                await client.query(`
                    INSERT INTO handling_unit_items (hu_id, delivery_item_id, material_id, packed_qty)
                    VALUES ($1, $2, $3, $4)
                `, [huId, item.delivery_item_id, item.material_id, item.packed_qty]);
            }

            await client.query(`UPDATE delivery_documents SET hu_count = hu_count + 1, packing_status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`, [deliveryId]);

            await client.query('COMMIT');
            return huResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async confirmPacking(deliveryId: number) {
        const result = await pool.query(`
            UPDATE delivery_documents
            SET packing_status = 'COMPLETED', packing_date = NOW(), updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [deliveryId]);
        return result.rows[0];
    }

    // --- LOADING ---

    async saveLoadingDetails(deliveryId: number, data: any) {
        const result = await pool.query(`
            UPDATE delivery_documents
            SET loading_point = COALESCE($1, loading_point),
                carrier_id = COALESCE($2, carrier_id),
                tracking_reference = COALESCE($3, tracking_reference),
                loading_start_date = COALESCE($4, loading_start_date),
                loading_completion_date = COALESCE($5, loading_completion_date),
                loading_status = $6,
                updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `, [
            data.loading_point, data.carrier_id, data.tracking_reference,
            data.loading_start_date, data.loading_completion_date,
            data.is_completed ? 'COMPLETED' : 'IN_PROGRESS',
            deliveryId
        ]);
        return result.rows[0];
    }
}

export const deliveryService = new DeliveryService();
