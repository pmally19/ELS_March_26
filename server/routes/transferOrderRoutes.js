import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Get available sales orders for transfer
router.get('/available-sales-orders', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('🔍 Fetching available sales orders for transfer...');
    
    // Get sales orders that are confirmed and ready for transfer
    const result = await client.query(`
      SELECT 
        so.id,
        so.order_number as "orderNumber",
        so.customer_id as "customerId",
        c.name as "customerName",
        so.order_date as "orderDate",
        so.status,
        so.total_amount as "totalAmount",
        so.currency,
        so.plant_id as "plantId",
        p.code as "plantCode",
        so.storage_location_id as "storageLocationId",
        sl.code as "storageLocationCode",
        so.created_at as "createdAt"
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN plants p ON so.plant_id = p.id
      LEFT JOIN storage_locations sl ON so.storage_location_id = sl.id
      WHERE so.status IN ('CONFIRMED', 'READY_FOR_TRANSFER')
      AND so.id NOT IN (
        SELECT DISTINCT sales_order_id 
        FROM transfer_orders 
        WHERE status NOT IN ('CANCELLED', 'COMPLETED')
      )
      ORDER BY so.order_date DESC
    `);

    // Get items for each sales order
    const salesOrdersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsResult = await client.query(`
          SELECT 
            soi.id,
            soi.material_id as "materialId",
            soi.material_code as "materialCode",
            soi.material_description as "materialDescription",
            soi.ordered_quantity as "orderedQuantity",
            soi.unit,
            soi.unit_price as "unitPrice",
            soi.plant_id as "plantId",
            soi.plant_code as "plantCode",
            soi.storage_location_id as "storageLocationId",
            soi.storage_location_code as "storageLocationCode"
          FROM sales_order_items soi
          WHERE soi.order_id = $1
        `, [order.id]);

        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    console.log(`✅ Found ${salesOrdersWithItems.length} available sales orders for transfer`);
    res.json(salesOrdersWithItems);

  } catch (error) {
    console.error('Error fetching available sales orders:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch available sales orders' 
    });
  } finally {
    client.release();
  }
});

// Get all transfer orders
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('🔍 Fetching transfer orders...');
    
    const result = await client.query(`
      SELECT 
        to.id,
        to.transfer_number as "transferNumber",
        to.sales_order_id as "salesOrderId",
        so.order_number as "salesOrderNumber",
        to.status,
        to.from_plant as "fromPlant",
        to.to_plant as "toPlant",
        to.from_storage_location as "fromStorageLocation",
        to.to_storage_location as "toStorageLocation",
        to.transfer_date as "transferDate",
        to.total_items as "totalItems",
        to.created_at as "createdAt"
      FROM transfer_orders to
      LEFT JOIN sales_orders so ON to.sales_order_id = so.id
      ORDER BY to.created_at DESC
    `);

    console.log(`✅ Found ${result.rows.length} transfer orders`);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching transfer orders:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch transfer orders' 
    });
  } finally {
    client.release();
  }
});

// Create transfer order from selected sales orders
router.post('/create-from-sales-orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      selectedSalesOrders,
      transferType,
      fromPlant,
      toPlant,
      fromStorageLocation,
      toStorageLocation,
      transferDate,
      priority,
      notes
    } = req.body;

    console.log(`🔍 Creating transfer order for ${selectedSalesOrders.length} sales orders...`);
    console.log('Transfer details:', {
      transferType,
      fromPlant,
      toPlant,
      fromStorageLocation,
      toStorageLocation,
      transferDate,
      priority
    });

    // Validate required fields
    if (!selectedSalesOrders || selectedSalesOrders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No sales orders selected for transfer'
      });
    }

    if (!fromPlant || !toPlant || !fromStorageLocation || !toStorageLocation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required transfer configuration (plants or storage locations)'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    const createdTransferOrders = [];

    // Process each sales order
    for (const salesOrderId of selectedSalesOrders) {
      // Get sales order details
      const salesOrderResult = await client.query(
        'SELECT * FROM sales_orders WHERE id = $1',
        [salesOrderId]
      );

      if (salesOrderResult.rows.length === 0) {
        throw new Error(`Sales order ${salesOrderId} not found`);
      }

      const salesOrder = salesOrderResult.rows[0];

      // Generate transfer order number
      const currentYear = new Date().getFullYear();
      const toCountResult = await client.query(`
        SELECT COUNT(*) as count FROM transfer_orders 
        WHERE transfer_number LIKE $1
      `, [`TO-${currentYear}-%`]);
      const toCount = parseInt(toCountResult.rows[0]?.count || 0) + 1;
      const transferOrderNumber = `TO-${currentYear}-${toCount.toString().padStart(6, '0')}`;

      // Create transfer order
      const transferOrderResult = await client.query(`
        INSERT INTO transfer_orders (
          transfer_number,
          sales_order_id,
          from_plant,
          to_plant,
          from_storage_location,
          to_storage_location,
          transfer_date,
          status,
          movement_type,
          reference_document,
          reference_document_type,
          priority,
          notes,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id
      `, [
        transferOrderNumber,
        salesOrderId,
        fromPlant,
        toPlant,
        fromStorageLocation,
        toStorageLocation,
        transferDate,
        'OPEN',
        '101', // movement_type (101 = transfer)
        salesOrder.order_number,
        'SO', // reference_document_type
        priority,
        notes,
        1 // created_by
      ]);

      const transferOrderId = transferOrderResult.rows[0]?.id;

      // Get sales order items and create transfer order items
      const itemsResult = await client.query(
        'SELECT * FROM sales_order_items WHERE order_id = $1',
        [salesOrderId]
      );

      let itemCount = 0;
      for (const item of itemsResult.rows) {
        await client.query(`
          INSERT INTO transfer_order_items (
            transfer_order_id,
            line_item,
            material_id,
            material_code,
            material_description,
            requested_quantity,
            confirmed_quantity,
            unit,
            from_storage_location,
            to_storage_location,
            status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
        `, [
          transferOrderId,
          itemCount + 1,
          item.material_id,
          item.material_code,
          item.material_description,
          item.ordered_quantity,
          0, // confirmed_quantity (will be updated during picking)
          item.unit,
          fromStorageLocation,
          toStorageLocation,
          'OPEN'
        ]);

        itemCount++;
      }

      // Update transfer order with total items count
      await client.query(
        'UPDATE transfer_orders SET total_items = $1 WHERE id = $2',
        [itemCount, transferOrderId]
      );

      // Create document flow record
      await client.query(`
        INSERT INTO document_flow (
          source_document,
          source_document_type,
          target_document,
          target_document_type,
          flow_type,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW()
        )
      `, [
        salesOrder.order_number,
        'SALES_ORDER',
        transferOrderNumber,
        'TRANSFER_ORDER',
        'CREATE'
      ]);

      createdTransferOrders.push({
        id: transferOrderId,
        transferOrderNumber,
        salesOrderNumber: salesOrder.order_number,
        totalItems: itemCount,
        status: 'OPEN'
      });

      console.log(`✅ Created transfer order ${transferOrderNumber} for sales order ${salesOrder.order_number}`);
    }

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully created ${createdTransferOrders.length} transfer order(s)`,
      transferOrders: createdTransferOrders
    });

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error creating transfer orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create transfer orders'
    });
  } finally {
    client.release();
  }
});

// Get transfer order details
router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    console.log(`🔍 Fetching transfer order details for ID: ${id}`);
    
    // Get transfer order
    const transferOrderResult = await client.query(`
      SELECT 
        to.*,
        so.order_number as "salesOrderNumber",
        c.name as "customerName"
      FROM transfer_orders to
      LEFT JOIN sales_orders so ON to.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE to.id = $1
    `, [id]);

    if (transferOrderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transfer order not found'
      });
    }

    const transferOrder = transferOrderResult.rows[0];

    // Get transfer order items
    const itemsResult = await client.query(`
      SELECT *
      FROM transfer_order_items
      WHERE transfer_order_id = $1
      ORDER BY line_item
    `, [id]);

    transferOrder.items = itemsResult.rows;

    console.log(`✅ Found transfer order: ${transferOrder.transfer_number}`);
    res.json(transferOrder);

  } catch (error) {
    console.error('Error fetching transfer order details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transfer order details'
    });
  } finally {
    client.release();
  }
});

// Update transfer order status
router.put('/:id/status', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    console.log(`🔍 Updating transfer order ${id} status to: ${status}`);

    // Validate status
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Update transfer order status
    const result = await client.query(`
      UPDATE transfer_orders 
      SET status = $1, updated_at = NOW()
      ${notes ? ', notes = $3' : ''}
      WHERE id = $2
      RETURNING *
    `, notes ? [status, id, notes] : [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transfer order not found'
      });
    }

    console.log(`✅ Updated transfer order ${id} status to: ${status}`);
    res.json({
      success: true,
      message: 'Transfer order status updated successfully',
      transferOrder: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating transfer order status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update transfer order status'
    });
  } finally {
    client.release();
  }
});

export default router;
