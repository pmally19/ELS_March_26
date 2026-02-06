import express from 'express';
import { pool } from '../../db.ts';
import { InventoryTrackingService } from '../../services/inventoryTrackingService.js';

const router = express.Router();
const inventoryTrackingService = new InventoryTrackingService(pool);

// Get all sales orders with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        so.id,
        so.order_number,
        so.customer_id,
        so.order_date,
        so.delivery_date,
        so.status,
        so.payment_terms,
        so.shipping_method,
        so.currency,
        so.subtotal,
        so.tax_amount,
        so.shipping_amount,
        so.total_amount,
        so.notes,
        so.sales_rep,
        so.sales_office_code,
        so.priority,
        so.created_at,
        so.updated_at,
        c.name as customer_name,
        c.code as customer_code
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (so.order_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND so.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY so.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.json([]);
  }
});

// Create new sales order
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      customer_id,
      customer_name = 'Unknown Customer',
      order_date,
      delivery_date,
      payment_terms = 'NET30',
      shipping_method = 'Standard',
      currency = 'USD',
      sales_rep = '',
      sales_office_code = '',
      priority = 'Normal',
      notes = '',
      items = []
    } = req.body;

    // Validation with specific error messages
    if (!customer_id) {
      throw new Error('Customer is required');
    }

    if (!order_date) {
      throw new Error('Order date is required');
    }

    if (!delivery_date) {
      throw new Error('Delivery date is required');
    }

    if (!items || items.length === 0) {
      throw new Error('At least one item is required');
    }

    // Validate each item with detailed error messages
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        throw new Error(`Item ${i + 1}: Product is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Item ${i + 1}: Valid quantity is required`);
      }
      if (item.unit_price === undefined || item.unit_price < 0) {
        throw new Error(`Item ${i + 1}: Valid unit price is required`);
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
      return sum + lineTotal;
    }, 0);

    const tax_amount = subtotal * 0.1;
    const shipping_amount = subtotal > 1000 ? 0 : 50;
    const total_amount = subtotal + tax_amount + shipping_amount;

    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        order_date DATE NOT NULL,
        delivery_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        payment_terms VARCHAR(20) DEFAULT 'NET30',
        shipping_method VARCHAR(50) DEFAULT 'Standard',
        currency VARCHAR(3) DEFAULT 'USD',
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        shipping_amount DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        sales_rep VARCHAR(100),
        sales_office_code VARCHAR(4),
        priority VARCHAR(20) DEFAULT 'Normal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id SERIAL PRIMARY KEY,
        sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity DECIMAL(15,3) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        discount DECIMAL(5,2) DEFAULT 0,
        line_total DECIMAL(15,2) NOT NULL,
        delivery_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Generate order number
    const year = new Date().getFullYear();
    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM sales_orders WHERE order_number LIKE 'SO-${year}-%'
    `);

    const nextNumber = parseInt(countResult.rows[0].count) + 1;
    const order_number = `SO-${year}-${nextNumber.toString().padStart(4, '0')}`;

    // Insert sales order (without customer_id to avoid foreign key constraint)
    const orderResult = await client.query(`
      INSERT INTO sales_orders (
        order_number, customer_name, order_date, delivery_date, status,
        payment_terms, shipping_method, currency, subtotal, tax_amount,
        shipping_amount, total_amount, notes, sales_rep, priority
      ) VALUES (
        $1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING id
    `, [
      order_number, customer_name, order_date, delivery_date,
      payment_terms, shipping_method, currency, subtotal, tax_amount,
      shipping_amount, total_amount, notes, sales_rep, priority
    ]);

    const order_id = orderResult.rows[0].id;

    // Get the sales_office_code from the customer if not provided
    let finalSalesOfficeCode = sales_office_code;
    if (!finalSalesOfficeCode && customer_id) {
      try {
        const customerResult = await client.query(
          `SELECT sales_office_code FROM customers WHERE id = $1`,
          [customer_id]
        );
        if (customerResult.rows.length > 0 && customerResult.rows[0].sales_office_code) {
          finalSalesOfficeCode = customerResult.rows[0].sales_office_code;
        }
      } catch (err) {
        console.log('Note: Could not fetch sales_office_code from customer:', err.message);
      }
    }

    // Ensure customer_id and sales_office_code are persisted on the order header
    await client.query(
      `UPDATE sales_orders SET customer_id = $1, sales_office_code = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [customer_id, finalSalesOfficeCode || null, order_id]
    );

    // Insert order items and update inventory committed quantity
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const line_total = item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
      const quantity = parseFloat(item.quantity) || 0;

      await client.query(`
        INSERT INTO sales_order_items (
          order_id, product_id, quantity, unit_price,
          discount_percent, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        order_id, item.product_id, item.quantity, item.unit_price,
        item.discount || 0, line_total
      ]);

      // Update inventory committed quantity using centralized inventory tracking service
      if (item.product_id && quantity > 0) {
        try {
          // Get material details
          const materialResult = await client.query(`
            SELECT 
              m.id, m.material_code, m.base_uom as unit, m.plant_code
            FROM materials m
            WHERE m.id = $1
          `, [item.product_id]);

          if (materialResult.rows.length > 0) {
            const material = materialResult.rows[0];
            const materialCode = material.material_code;

            // Get unit of measure
            let unit = material.unit;
            if (!unit) {
              // Try system configuration
              const unitConfigResult = await client.query(`
                  SELECT config_value FROM system_configuration 
                  WHERE config_key = 'default_unit_of_measure' AND active = true LIMIT 1
                `);
              if (unitConfigResult.rows.length > 0 && unitConfigResult.rows[0].config_value) {
                unit = unitConfigResult.rows[0].config_value;
              }
              // Fallback
              unit = unit || 'EA';
            }

            // Get plant code
            const plantCode = material.plant_code || 'PL01';

            // Get storage location code
            let storageLocationCode = null;
            // Try to find a default storage location for the plant
            const defaultStorageResult = await client.query(`
                SELECT sl.code 
                FROM storage_locations sl
                JOIN plants p ON sl.plant_id = p.id
                WHERE p.code = $1
                ORDER BY sl.id LIMIT 1
            `, [plantCode]);

            if (defaultStorageResult.rows.length > 0) {
              storageLocationCode = defaultStorageResult.rows[0].code;
            } else {
              storageLocationCode = 'MAIN'; // Fallback
            }

            // Validate required fields
            if (materialCode && plantCode && storageLocationCode && unit) {
              // Use centralized inventory tracking service to increase committed quantity
              await inventoryTrackingService.increaseCommittedQuantity(
                materialCode,
                plantCode,
                storageLocationCode,
                quantity,
                client // Pass transaction client to ensure it's part of the same transaction
              );

              console.log(`✅ Updated inventory committed_quantity for material ${materialCode}: +${quantity} at plant ${plantCode}, storage ${storageLocationCode}`);

            } else {
              const missingFields = [];
              if (!materialCode) missingFields.push('materialCode');
              if (!plantCode) missingFields.push('plantCode');
              console.error(`❌ Cannot update inventory for product ${item.product_id}: missing ${missingFields.join(', ')}`);
            }
          } else {
            console.error(`❌ Product (Material) ${item.product_id} not found - cannot update inventory`);
          }
        } catch (invError) {
          console.error(`❌ Failed to update inventory for product ${item.product_id}:`, invError.message);
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Sales order created successfully',
      order_id,
      order_number,
      total_amount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sales order:', error);
    res.status(400).json({
      message: error.message || 'Failed to create sales order'
    });
  } finally {
    client.release();
  }
});

// Get single sales order with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(`
      SELECT 
        so.*,
        c.name as customer_name,
        c.code as customer_code
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    const itemsResult = await pool.query(`
      SELECT 
        soi.*,
        m.description as product_name,
        m.material_code as product_code
      FROM sales_order_items soi
      LEFT JOIN materials m ON soi.product_id = m.id
      WHERE soi.sales_order_id = $1
      ORDER BY soi.line_number
    `, [id]);

    const order = {
      ...orderResult.rows[0],
      items: itemsResult.rows
    };

    res.json(order);
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ message: 'Failed to fetch sales order' });
  }
});

export default router;

// Update sales order header (supports updating customer)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({ message: 'customer_id is required' });
    }

    const result = await pool.query(
      `UPDATE sales_orders 
       SET customer_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, customer_id`,
      [customer_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    return res.json({
      message: 'Sales order updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating sales order:', error);
    return res.status(500).json({ message: 'Failed to update sales order' });
  }
});