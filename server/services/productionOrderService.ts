import pkg from 'pg';
import type { Pool } from 'pg';
const { Pool: PgPool } = pkg;

interface ProductionOrderData {
  orderNumber: string;
  materialCode: string;
  plantId: number;
  quantity: number;
  startDate: Date;
  endDate: Date;
  status: 'CREATED' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface ProductionOrderOperation {
  operationNumber: string;
  description: string;
  workCenterId: number;
  setupTime: number;
  processTime: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export class ProductionOrderService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create Production Order with Demand-Driven Linking
   * Supports: Manual, From Sales Order, From Planned Order, Stock Replenishment
   */
  async createProductionOrder(orderData: any): Promise<{ success: boolean; data?: any; message?: string }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const {
        material_id,
        plant_id,
        order_type = 'PROD01',
        planned_quantity,
        planned_start_date,
        planned_end_date,
        unit_of_measure,
        work_center_id,
        priority = 'NORMAL',
        production_version_id,
        notes,
        created_by = 'SYSTEM',
        // NEW: Demand-driven fields
        sales_order_id,
        sales_order_number,
        planned_order_id,
        demand_source, // No default - must be provided explicitly
        customer_name,
        delivery_priority = 'NORMAL', // URGENT, HIGH, NORMAL, LOW
        special_instructions,
        source_document_number,
        source_document_type
      } = orderData;

      // Validate required fields
      if (!material_id || !plant_id || !planned_quantity) {
        throw new Error('Missing required fields: material_id, plant_id, planned_quantity');
      }

      // Validate demand_source is provided
      if (!demand_source) {
        throw new Error('demand_source is required. Valid values: SALES_ORDER, PLANNED_ORDER, FORECAST, STOCK_REPLENISHMENT, MANUAL');
      }

      // Validate sales order linking
      if (demand_source === 'SALES_ORDER' && !sales_order_id) {
        throw new Error('sales_order_id is required when demand_source is SALES_ORDER');
      }

      // Validate planned order linking
      if (demand_source === 'PLANNED_ORDER' && !planned_order_id) {
        throw new Error('planned_order_id is required when demand_source is PLANNED_ORDER');
      }

      // 1. Generate Order Number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // 2. If sales_order_id provided, fetch sales order details
      let salesOrderDetails = null;
      if (sales_order_id) {
        const salesRes = await client.query(
          'SELECT order_number, customer_name FROM sales_orders WHERE id = $1',
          [sales_order_id]
        );
        if (salesRes.rows.length > 0) {
          salesOrderDetails = salesRes.rows[0];
        }
      }

      // 3. Find Active BOM (if version not provided)
      let bomId = null;
      let targetVersionId = production_version_id;

      if (targetVersionId) {
        const verRes = await client.query('SELECT bom_id FROM production_versions WHERE id = $1', [targetVersionId]);
        if (verRes.rows.length > 0) bomId = verRes.rows[0].bom_id;
      } else {
        // Find active BOM for material/plant
        const bomRes = await client.query(
          'SELECT id FROM bill_of_materials WHERE material_id = $1 AND plant_id = $2 AND is_active = true LIMIT 1',
          [material_id, plant_id]
        );
        if (bomRes.rows.length > 0) {
          bomId = bomRes.rows[0].id;

          // Try to find a version for this BOM
          const verRes = await client.query(
            'SELECT id FROM production_versions WHERE material_id = $1 AND bom_id = $2 AND is_active = true LIMIT 1',
            [material_id, bomId]
          );

          if (verRes.rows.length > 0) {
            targetVersionId = verRes.rows[0].id;
          } else {
            // Auto-create Production Version if missing
            const newVer = await client.query(`
              INSERT INTO production_versions (material_id, bom_id, plant_id, version_number, is_active, valid_from)
              VALUES ($1, $2, $3, 'AUTO-01', true, NOW())
              RETURNING id
            `, [material_id, bomId, plant_id]);
            targetVersionId = newVer.rows[0].id;
          }
        }
      }

      // 4. Insert Production Order with demand-driven fields
      const result = await client.query(`
        INSERT INTO production_orders (
          order_number,
          material_id,
          plant_id,
          bom_id,
          production_version_id,
          work_center_id,
          order_type,
          planned_quantity,
          actual_quantity,
          scrap_quantity,
          unit_of_measure,
          planned_start_date,
          planned_end_date,
          priority,
          status,
          active,
          notes,
          created_by,
          sales_order_id,
          sales_order_number,
          planned_order_id,
          demand_source,
          customer_name,
          delivery_priority,
          special_instructions,
          source_document_number,
          source_document_type,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, $9, $10, $11, $12, 'Planned', true, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW())
        RETURNING *
      `, [
        orderNumber,
        material_id,
        plant_id,
        bomId,
        targetVersionId,
        work_center_id || null,
        order_type,
        planned_quantity,
        unit_of_measure || 'PC',
        planned_start_date,
        planned_end_date,
        priority,
        notes || '',
        created_by,
        sales_order_id || null,
        sales_order_number || salesOrderDetails?.order_number || null,
        planned_order_id || null,
        demand_source,
        customer_name || salesOrderDetails?.customer_name || null,
        delivery_priority,
        special_instructions || null,
        source_document_number || null,
        source_document_type || null
      ]);

      // 5. Update sales order if linked
      if (sales_order_id) {
        await client.query(`
          UPDATE sales_orders 
          SET production_order_created = TRUE,
              production_status = 'IN_PRODUCTION',
              production_start_date = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [planned_start_date, sales_order_id]);
      }

      // 6. Update planned order if linked
      if (planned_order_id) {
        await client.query(`
          UPDATE planned_orders 
          SET converted_production_order_id = $1,
              converted_by = $2,
              converted_at = NOW(),
              status = 'CONVERTED'
          WHERE id = $3
        `, [result.rows[0].id, created_by, planned_order_id]);
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: result.rows[0],
        message: 'Production order created successfully'
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating production order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create production order from planned order
   * This implements the Production Order Creation from your diagram
   */
  async createProductionOrderFromPlannedOrder(
    plannedOrderId: number,
    executorName: string = 'MRP System'
  ): Promise<{ success: boolean; productionOrderId?: number; orderNumber?: string }> {
    try {
      // Get planned order details
      const plannedOrderQuery = `
        SELECT 
          material_code,
          plant_id,
          quantity,
          required_date,
          requirement_type,
          priority_level
        FROM planned_orders 
        WHERE id = $1 AND status = 'OPEN'
      `;

      const plannedResult = await this.pool.query(plannedOrderQuery, [plannedOrderId]);

      if (plannedResult.rows.length === 0) {
        return { success: false };
      }

      const plannedOrder = plannedResult.rows[0];

      // Generate production order number
      const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Create production order
      const createQuery = `
        INSERT INTO production_orders (
          order_number,
          material_code,
          plant_id,
          quantity,
          start_date,
          end_date,
          status,
          priority,
          created_by,
          planned_order_id
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'CREATED', $6, $7, $8)
        RETURNING id
      `;

      const priority = plannedOrder.priority_level || 'MEDIUM';
      const endDate = new Date(plannedOrder.required_date);

      const productionResult = await this.pool.query(createQuery, [
        orderNumber,
        plannedOrder.material_code,
        plannedOrder.plant_id,
        plannedOrder.quantity,
        endDate,
        priority,
        executorName,
        plannedOrderId
      ]);

      const productionOrderId = productionResult.rows[0].id;

      // Create production order operations based on routing
      await this.createProductionOrderOperations(productionOrderId, plannedOrder.material_code);

      // Update planned order status
      await this.pool.query(
        'UPDATE planned_orders SET status = $1 WHERE id = $2',
        ['CONVERTED', plannedOrderId]
      );

      return {
        success: true,
        productionOrderId,
        orderNumber
      };
    } catch (error) {
      console.error('Error creating production order:', error);
      throw error;
    }
  }

  /**
   * Create production order operations from routing
   */
  private async createProductionOrderOperations(
    productionOrderId: number,
    materialCode: string
  ): Promise<void> {
    try {
      // Get routing operations for the material
      const routingQuery = `
        SELECT 
          ro.operation_number,
          ro.description,
          ro.work_center_id,
          ro.setup_time,
          ro.process_time,
          ro.sequence_number
        FROM routing_operations ro
        JOIN routing_header rh ON ro.routing_id = rh.id
        WHERE rh.material_code = $1
        ORDER BY ro.sequence_number
      `;

      const routingResult = await this.pool.query(routingQuery, [materialCode]);

      if (routingResult.rows.length === 0) {
        // Create default operation if no routing found
        await this.pool.query(`
          INSERT INTO production_order_operations (
            production_order_id,
            operation_number,
            description,
            work_center_id,
            setup_time,
            process_time,
            status
          ) VALUES ($1, '010', 'Default Production Operation', 1, 30, 60, 'PENDING')
        `, [productionOrderId]);
        return;
      }

      // Create operations based on routing
      for (const operation of routingResult.rows) {
        await this.pool.query(`
          INSERT INTO production_order_operations (
            production_order_id,
            operation_number,
            description,
            work_center_id,
            setup_time,
            process_time,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        `, [
          productionOrderId,
          operation.operation_number,
          operation.description,
          operation.work_center_id,
          operation.setup_time,
          operation.process_time
        ]);
      }
    } catch (error) {
      console.error('Error creating production order operations:', error);
      throw error;
    }
  }

  /**
   * Release production order for execution
   */
  async releaseProductionOrder(productionOrderId: number): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if materials are available
      const materialCheckQuery = `
        SELECT 
          po.material_code,
          po.quantity,
          po.plant_id,
          sac.current_stock
        FROM production_orders po
        LEFT JOIN stock_availability_check sac ON po.material_code = sac.material_code AND po.plant_id = sac.plant_id
        WHERE po.id = $1
      `;

      const materialResult = await this.pool.query(materialCheckQuery, [productionOrderId]);

      if (materialResult.rows.length === 0) {
        return { success: false, message: 'Production order not found' };
      }

      // Update production order status to RELEASED
      await this.pool.query(
        'UPDATE production_orders SET status = $1, released_date = CURRENT_TIMESTAMP WHERE id = $2',
        ['RELEASED', productionOrderId]
      );

      // Create material reservation
      await this.createMaterialReservation(productionOrderId);

      return { success: true, message: 'Production order released successfully' };
    } catch (error) {
      console.error('Error releasing production order:', error);
      throw error;
    }
  }

  /**
   * Create material reservation for production order
   */
  private async createMaterialReservation(productionOrderId: number): Promise<void> {
    try {
      // Get BOM components for the production order
      const bomQuery = `
        SELECT 
          bi.component_material,
          bi.quantity_per,
          po.quantity as order_quantity
        FROM production_orders po
        JOIN bom_header bh ON po.material_code = bh.material_code
        JOIN bom_items bi ON bh.id = bi.bom_header_id
        WHERE po.id = $1
      `;

      const bomResult = await this.pool.query(bomQuery, [productionOrderId]);

      for (const component of bomResult.rows) {
        const reservedQuantity = component.quantity_per * component.order_quantity;

        // Create material reservation
        await this.pool.query(`
          INSERT INTO material_reservations (
            production_order_id,
            material_code,
            reserved_quantity,
            reservation_date,
            status
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'ACTIVE')
        `, [productionOrderId, component.component_material, reservedQuantity]);
      }
    } catch (error) {
      console.error('Error creating material reservation:', error);
      throw error;
    }
  }

  /**
   * Get production order dashboard
   */
  async getProductionOrderDashboard(plantId?: number): Promise<any> {
    try {
      const baseWhereClause = plantId ? 'WHERE plant_id = $1' : '';
      const params = plantId ? [plantId] : [];

      // Total production orders
      const totalQuery = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'CREATED' THEN 1 END) as created_orders,
          COUNT(CASE WHEN status = 'RELEASED' THEN 1 END) as released_orders,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_orders,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders
        FROM production_orders 
        ${baseWhereClause}
      `;

      const totalResult = await this.pool.query(totalQuery, params);

      // Overdue orders
      const overdueQuery = `
        SELECT COUNT(*) as overdue_orders
        FROM production_orders 
        WHERE end_date < CURRENT_DATE AND status NOT IN ('COMPLETED', 'CANCELLED')
        ${plantId ? 'AND plant_id = $1' : ''}
      `;

      const overdueResult = await this.pool.query(overdueQuery, params);

      // Recent orders
      const recentQuery = `
        SELECT 
          order_number,
          material_code,
          quantity,
          status,
          priority,
          created_date
        FROM production_orders 
        ${baseWhereClause}
        ORDER BY created_date DESC
        LIMIT 5
      `;

      const recentResult = await this.pool.query(recentQuery, params);

      return {
        totalOrders: parseInt(totalResult.rows[0]?.total_orders || '0'),
        createdOrders: parseInt(totalResult.rows[0]?.created_orders || '0'),
        releasedOrders: parseInt(totalResult.rows[0]?.released_orders || '0'),
        inProgressOrders: parseInt(totalResult.rows[0]?.in_progress_orders || '0'),
        completedOrders: parseInt(totalResult.rows[0]?.completed_orders || '0'),
        overdueOrders: parseInt(overdueResult.rows[0]?.overdue_orders || '0'),
        recentOrders: recentResult.rows
      };
    } catch (error) {
      console.error('Error fetching production order dashboard:', error);
      throw error;
    }
  }

  /**
   * Complete production order operation
   */
  async completeOperation(
    productionOrderId: number,
    operationNumber: string,
    actualQuantity: number,
    completedBy: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Update operation status
      await this.pool.query(`
        UPDATE production_order_operations 
        SET 
          status = 'COMPLETED',
          actual_quantity = $1,
          completed_by = $2,
          completion_date = CURRENT_TIMESTAMP
        WHERE production_order_id = $3 AND operation_number = $4
      `, [actualQuantity, completedBy, productionOrderId, operationNumber]);

      // Check if all operations are completed
      const operationsQuery = `
        SELECT COUNT(*) as total_operations,
               COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_operations
        FROM production_order_operations 
        WHERE production_order_id = $1
      `;

      const operationsResult = await this.pool.query(operationsQuery, [productionOrderId]);
      const { total_operations, completed_operations } = operationsResult.rows[0];

      // If all operations completed, complete the production order
      if (total_operations === completed_operations) {
        await this.pool.query(
          'UPDATE production_orders SET status = $1, completed_date = CURRENT_TIMESTAMP WHERE id = $2',
          ['COMPLETED', productionOrderId]
        );

        // Create goods receipt
        await this.createGoodsReceipt(productionOrderId, actualQuantity);
      }

      return { success: true, message: 'Operation completed successfully' };
    } catch (error) {
      console.error('Error completing operation:', error);
      throw error;
    }
  }

  /**
   * Create goods receipt for completed production
   */
  private async createGoodsReceipt(productionOrderId: number, quantity: number): Promise<void> {
    try {
      const orderQuery = `
        SELECT material_code, plant_id, order_number
        FROM production_orders 
        WHERE id = $1
      `;

      const orderResult = await this.pool.query(orderQuery, [productionOrderId]);

      if (orderResult.rows.length === 0) return;

      const order = orderResult.rows[0];
      const grnNumber = `GRN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Create goods receipt
      await this.pool.query(`
        INSERT INTO goods_receipts (
          grn_number,
          material_code,
          plant_id,
          quantity,
          receipt_date,
          receipt_type,
          reference_document,
          status
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'PRODUCTION', $5, 'COMPLETED')
      `, [grnNumber, order.material_code, order.plant_id, quantity, order.order_number]);

      // Update stock
      await this.pool.query(`
        UPDATE stock_availability_check 
        SET current_stock = current_stock + $1,
            last_updated = CURRENT_TIMESTAMP
        WHERE material_code = $2 AND plant_id = $3
      `, [quantity, order.material_code, order.plant_id]);

    } catch (error) {
      console.error('Error creating goods receipt:', error);
      throw error;
    }
  }
}