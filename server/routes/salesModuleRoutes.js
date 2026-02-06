import express from 'express';
import { pool } from '../db';

const router = express.Router();

// ========= SALES ORDERS ROUTES =========

// Get all orders
router.get('/api/sales/orders', async (req, res) => {
  try {
    // Fetch orders with real-time data from database
    // Join with erp_customers table to get actual customer name
    // Calculate payment_status from billing documents if available
    const result = await pool.query(`
      SELECT 
        so.id,
        so.order_number,
        COALESCE(ec.name, so.customer_name, 'Unknown Customer') as customer_name,
        so.order_date,
        so.delivery_date,
        COALESCE(so.status, 'Pending') as status,
        COALESCE(so.total_amount, 0) as total_amount,
        CASE 
          WHEN bd.id IS NOT NULL THEN
            CASE 
              WHEN COALESCE(bd.paid_amount, 0) >= COALESCE(bd.total_amount, 0) AND COALESCE(bd.total_amount, 0) > 0 THEN 'Paid'
              WHEN COALESCE(bd.paid_amount, 0) > 0 THEN 'Partially Paid'
              ELSE 'Unpaid'
            END
          ELSE COALESCE(so.payment_status, 'Unpaid')
        END as payment_status
      FROM sales_orders so
      LEFT JOIN erp_customers ec ON so.customer_id = ec.id
      LEFT JOIN billing_documents bd ON bd.sales_order_id = so.id
      WHERE (so.active IS NULL OR so.active = true)
      ORDER BY so.order_date DESC, so.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get order details by ID
router.get('/api/sales/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const orderResult = await pool.query(`
      SELECT * FROM sales_orders WHERE id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const itemsResult = await pool.query(`
      SELECT * FROM sales_order_items WHERE order_id = $1
    `, [id]);

    const order = {
      ...orderResult.rows[0],
      items: itemsResult.rows
    };

    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Error fetching order details', error: error.message });
  }
});

// Delete order by ID
router.delete('/api/sales/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if order exists
    const orderResult = await pool.query(`
      SELECT id FROM sales_orders WHERE id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Delete order items first (due to foreign key constraint)
    await pool.query(`
      DELETE FROM sales_order_items WHERE order_id = $1
    `, [id]);

    // Delete the order
    await pool.query(`
      DELETE FROM sales_orders WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});

// Create a new order
router.post('/api/sales/orders', async (req, res) => {
  try {
    const {
      customer_name,
      customerCode,
      orderDate,
      delivery_date,
      status,
      total_amount,
      payment_status,
      shipping_address,
      billing_address,
      notes,
      items
    } = req.body;

    // Handle both customer_name and customerCode parameters
    let finalCustomerName = customer_name;
    if (customerCode && !customer_name) {
      // Look up customer name from customerCode
      try {
        const customerResult = await pool.query('SELECT name FROM customers WHERE code = $1', [customerCode]);
        if (customerResult.rows.length > 0) {
          finalCustomerName = customerResult.rows[0].name;
        } else {
          finalCustomerName = customerCode; // Use code as fallback
        }
      } catch (lookupError) {
        finalCustomerName = customerCode; // Use code as fallback
      }
    }

    // Generate order number (format: SO-YYYY-XXXX)
    const year = new Date().getFullYear();
    const countResult = await pool.query('SELECT COUNT(*) FROM sales_orders');
    const count = parseInt(countResult.rows[0].count) + 1;
    const orderNumber = `SO-${year}-${count.toString().padStart(4, '0')}`;

    // Create order
    const orderResult = await pool.query(`
      INSERT INTO sales_orders (
        order_number, customer_name, delivery_date, status,
        total_amount, payment_status, shipping_address, billing_address, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      orderNumber,
      finalCustomerName,
      delivery_date,
      status || 'Pending',
      total_amount || 0,
      payment_status || 'Unpaid',
      shipping_address,
      billing_address,
      notes
    ]);

    const orderId = orderResult.rows[0].id;

    // Create order items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(`
          INSERT INTO sales_order_items (
            order_id, product_name, quantity, unit_price, discount_percent, tax_percent, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          orderId,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.discount_percent || 0,
          item.tax_percent || 0,
          item.subtotal
        ]);
      }
    }

    // Return order with items
    const fullOrderResult = await pool.query(`
      SELECT * FROM sales_orders WHERE id = $1
    `, [orderId]);

    const itemsResult = await pool.query(`
      SELECT * FROM sales_order_items WHERE order_id = $1
    `, [orderId]);

    const order = {
      ...fullOrderResult.rows[0],
      items: itemsResult.rows
    };

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// ========= QUOTES/ESTIMATES ROUTES =========

// Get all quotes
router.get('/api/sales/quotes', async (req, res) => {
  try {
    // Get status filter from query params
    const { status } = req.query;
    console.log('Quote filter - status:', status);

    // Create query with optional filtering - use sales_quotes table
    let query = `
      SELECT 
        id, quote_number, customer_name, quote_date, 
        valid_until, status, total_amount, grand_total
      FROM sales_quotes
      WHERE (active IS NULL OR active = true)
    `;

    const queryParams = [];

    // Add status filter if provided
    if (status && status !== 'all') {
      // Convert status to match database format (first letter uppercase)
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      query += ` AND status = $1`;
      queryParams.push(formattedStatus);
      console.log(`Filtering quotes by status: ${formattedStatus}`);
    }

    // Add order by
    query += ` ORDER BY quote_date DESC`;

    // Execute query with parameters
    const result = await pool.query(query, queryParams);

    // Return array format for consistency with other endpoints
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ message: 'Error fetching quotes', error: error.message });
  }
});

// ========= INVOICES ROUTES =========

// Get all invoices
router.get('/api/sales/invoices', async (req, res) => {
  try {
    // Check if invoices table exists, create if it doesn't
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sales_invoices'
      );
    `);

    if (!checkTableResult.rows[0].exists) {
      // Create invoices table
      await pool.query(`
        CREATE TABLE sales_invoices (
          id SERIAL PRIMARY KEY,
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          order_id INT,
          customer_name VARCHAR(255) NOT NULL,
          invoice_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          due_date TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) DEFAULT 'Pending',
          total_amount DECIMAL(15, 2) DEFAULT 0,
          discount_amount DECIMAL(15, 2) DEFAULT 0,
          tax_amount DECIMAL(15, 2) DEFAULT 0,
          grand_total DECIMAL(15, 2) DEFAULT 0,
          paid_amount DECIMAL(15, 2) DEFAULT 0,
          payment_method VARCHAR(50),
          payment_date TIMESTAMP WITH TIME ZONE,
          notes TEXT,
          created_by INT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sample data
        INSERT INTO sales_invoices (
          invoice_number, customer_name, invoice_date, due_date, 
          status, total_amount, grand_total, paid_amount, payment_method, payment_date
        ) VALUES
        ('INV-2025-1001', 'TechNova Inc', NOW() - INTERVAL '20 DAYS', NOW() - INTERVAL '5 DAYS', 
          'Paid', 5649.75, 5932.24, 5932.24, 'Credit Card', NOW() - INTERVAL '7 DAYS'),
        ('INV-2025-1002', 'Elevate Solutions', NOW() - INTERVAL '18 DAYS', NOW() - INTERVAL '3 DAYS', 
          'Paid', 2375.50, 2494.28, 2494.28, 'Bank Transfer', NOW() - INTERVAL '6 DAYS'),
        ('INV-2025-1003', 'DataWave Analytics', NOW() - INTERVAL '15 DAYS', NOW() + INTERVAL '15 DAYS', 
          'Partially Paid', 8925.33, 9371.60, 4000.00, 'Bank Transfer', NOW() - INTERVAL '10 DAYS'),
        ('INV-2025-1004', 'Quantum Systems', NOW() - INTERVAL '10 DAYS', NOW() + INTERVAL '20 DAYS', 
          'Unpaid', 3450.20, 3622.71, 0.00, null, null),
        ('INV-2025-1005', 'Arctic Innovations', NOW() - INTERVAL '7 DAYS', NOW() + INTERVAL '23 DAYS', 
          'Unpaid', 1875.60, 1969.38, 0.00, null, null);
      `);

      // Create invoice_items table
      await pool.query(`
        CREATE TABLE sales_invoice_items (
          id SERIAL PRIMARY KEY,
          invoice_id INT REFERENCES sales_invoices(id) ON DELETE CASCADE,
          product_name VARCHAR(255) NOT NULL,
          description TEXT,
          quantity INT NOT NULL,
          unit_price DECIMAL(15, 2) NOT NULL,
          discount_percent DECIMAL(5, 2) DEFAULT 0,
          tax_percent DECIMAL(5, 2) DEFAULT 0,
          subtotal DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sample invoice items (will be added after getting invoice IDs)
      `);

      // Add sample invoice items
      const invoicesResult = await pool.query('SELECT id FROM sales_invoices');
      const invoiceIds = invoicesResult.rows;

      for (const invoice of invoiceIds) {
        // Generate 1-3 items per invoice
        const itemCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < itemCount; i++) {
          // Sample product data
          const products = [
            { name: 'Enterprise SaaS License', desc: 'Annual subscription', price: 1299.99 },
            { name: 'Cloud Security Package', desc: 'Advanced security suite', price: 899.50 },
            { name: 'Data Analytics Platform', desc: 'Business intelligence tools', price: 1499.75 },
            { name: 'Mobile Device Management', desc: 'Enterprise mobility solution', price: 699.99 },
            { name: 'Network Infrastructure', desc: 'Network hardware and setup', price: 2499.50 }
          ];

          const product = products[Math.floor(Math.random() * products.length)];
          const quantity = Math.floor(Math.random() * 5) + 1;
          const unitPrice = product.price;
          const subtotal = quantity * unitPrice;

          await pool.query(`
            INSERT INTO sales_invoice_items (
              invoice_id, product_name, description, quantity, unit_price, subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [invoice.id, product.name, product.desc, quantity, unitPrice, subtotal]);
        }
      }
    }

    // Get status filter from query params
    const { status } = req.query;
    console.log('Invoice filter - status:', status);

    // Create query with optional filtering
    let query = `
      SELECT 
        id, invoice_number, customer_name, invoice_date, 
        due_date, status, grand_total, paid_amount
      FROM sales_invoices
    `;

    const queryParams = [];

    // Add status filter if provided
    if (status && status !== 'all') {
      // Filter only invoices with matching status
      if (status === 'Unpaid') {
        // Only show records with status 'Unpaid'
        query += ` WHERE status = 'Unpaid'`;
        console.log(`Filtering invoices for Unpaid status only`);
      }
      else if (status === 'Paid') {
        // Only show records with status 'Paid'
        query += ` WHERE status = 'Paid'`;
        console.log(`Filtering invoices for Paid status only`);
      }
      else if (status === 'Partially Paid') {
        // Only show records with status 'Partially Paid'
        query += ` WHERE status = 'Partially Paid'`;
        console.log(`Filtering invoices for Partially Paid status only`);
      }
      else if (status === 'Overdue') {
        // Only show records with status 'Overdue' 
        query += ` WHERE status = 'Overdue' OR (status = 'Unpaid' AND due_date < NOW())`;
        console.log(`Filtering invoices for Overdue status`);
      }
    }

    // Add order by
    query += ` ORDER BY invoice_date DESC`;

    // Execute query with parameters
    const result = await pool.query(query, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
});

// ========= RETURNS ROUTES =========

// Get all returns
router.get('/api/sales/returns', async (req, res) => {
  try {
    // Check if returns table exists, create if it doesn't
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sales_returns'
      );
    `);

    if (!checkTableResult.rows[0].exists) {
      // Create returns table
      await pool.query(`
        CREATE TABLE sales_returns (
          id SERIAL PRIMARY KEY,
          return_number VARCHAR(50) UNIQUE NOT NULL,
          order_id INT,
          invoice_id INT,
          customer_name VARCHAR(255) NOT NULL,
          return_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'Pending',
          total_amount DECIMAL(15, 2) DEFAULT 0,
          return_reason TEXT,
          notes TEXT,
          created_by INT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sample data
        INSERT INTO sales_returns (
          return_number, customer_name, return_date, 
          status, total_amount, return_reason
        ) VALUES
        ('RET-2025-1001', 'TechNova Inc', NOW() - INTERVAL '10 DAYS', 
          'Completed', 1299.99, 'Product not needed anymore'),
        ('RET-2025-1002', 'Elevate Solutions', NOW() - INTERVAL '7 DAYS', 
          'Processing', 899.50, 'Incompatible with current systems'),
        ('RET-2025-1003', 'DataWave Analytics', NOW() - INTERVAL '5 DAYS', 
          'Approved', 699.99, 'Duplicate order'),
        ('RET-2025-1004', 'Quantum Systems', NOW() - INTERVAL '3 DAYS', 
          'Pending', 1499.75, 'Wrong product received');
      `);

      // Create return_items table
      await pool.query(`
        CREATE TABLE sales_return_items (
          id SERIAL PRIMARY KEY,
          return_id INT REFERENCES sales_returns(id) ON DELETE CASCADE,
          product_name VARCHAR(255) NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(15, 2) NOT NULL,
          subtotal DECIMAL(15, 2) NOT NULL,
          return_reason TEXT,
          condition VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sample return items (will be added after getting return IDs)
      `);

      // Add sample return items
      const returnsResult = await pool.query('SELECT id FROM sales_returns');
      const returnIds = returnsResult.rows;

      for (const returnRecord of returnIds) {
        // Generate 1-2 items per return
        const itemCount = Math.floor(Math.random() * 2) + 1;

        for (let i = 0; i < itemCount; i++) {
          // Sample product data
          const products = [
            { name: 'Enterprise SaaS License', price: 1299.99 },
            { name: 'Cloud Security Package', price: 899.50 },
            { name: 'Data Analytics Platform', price: 1499.75 },
            { name: 'Mobile Device Management', price: 699.99 },
            { name: 'Network Infrastructure', price: 2499.50 }
          ];

          const conditions = ['New', 'Like New', 'Used', 'Damaged'];

          const product = products[Math.floor(Math.random() * products.length)];
          const quantity = Math.floor(Math.random() * 2) + 1;
          const unitPrice = product.price;
          const subtotal = quantity * unitPrice;
          const condition = conditions[Math.floor(Math.random() * conditions.length)];

          await pool.query(`
            INSERT INTO sales_return_items (
              return_id, product_name, quantity, unit_price, subtotal, condition
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [returnRecord.id, product.name, quantity, unitPrice, subtotal, condition]);
        }
      }
    }

    // Fetch returns
    // Get status filter from query params
    const { status } = req.query;
    console.log('Return filter - status:', status);

    // Create query with optional filtering
    let query = `
      SELECT 
        id, return_number, customer_name, return_date, 
        status, total_amount, return_reason
      FROM sales_returns
    `;

    const queryParams = [];

    // Add status filter if provided
    if (status && status !== 'all') {
      // Filter returns based on specific status values
      if (status === 'Pending') {
        query += ` WHERE status = 'Pending'`;
        console.log(`Filtering returns for Pending status only`);
      }
      else if (status === 'Approved') {
        query += ` WHERE status = 'Approved'`;
        console.log(`Filtering returns for Approved status only`);
      }
      else if (status === 'Processing') {
        query += ` WHERE status = 'Processing'`;
        console.log(`Filtering returns for Processing status only`);
      }
      else if (status === 'Completed') {
        query += ` WHERE status = 'Completed'`;
        console.log(`Filtering returns for Completed status only`);
      }
      else if (status === 'Rejected') {
        query += ` WHERE status = 'Rejected'`;
        console.log(`Filtering returns for Rejected status only`);
      }
    }

    // Add order by
    query += ` ORDER BY return_date DESC`;

    // Execute query with parameters
    const result = await pool.query(query, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({ message: 'Error fetching returns', error: error.message });
  }
});

// ========= CUSTOMERS ROUTES =========

// Get all customers
router.get('/api/sales/customers', async (req, res) => {
  try {
    // Check if customers table exists, create if it doesn't
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sales_customers'
      );
    `);

    if (!checkTableResult.rows[0].exists) {
      // Create customers table
      await pool.query(`
        CREATE TABLE sales_customers (
          id SERIAL PRIMARY KEY,
          customer_number VARCHAR(50) UNIQUE NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          contact_person VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          website VARCHAR(255),
          industry VARCHAR(100),
          customer_type VARCHAR(50) DEFAULT 'Business',
          billing_address TEXT,
          shipping_address TEXT,
          tax_id VARCHAR(100),
          payment_terms VARCHAR(100),
          credit_limit DECIMAL(15, 2),
          status VARCHAR(50) DEFAULT 'Active',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sample data
        INSERT INTO sales_customers (
          customer_number, company_name, contact_person, email, phone,
          website, industry, customer_type, status, credit_limit
        ) VALUES
        ('CUST-1001', 'TechNova Inc', 'John Smith', 'john.smith@technova.com', '(555) 123-4567',
          'www.technova.com', 'Technology', 'Business', 'Active', 50000.00),
        ('CUST-1002', 'Elevate Solutions', 'Sarah Johnson', 'sarah@elevatesolutions.com', '(555) 234-5678',
          'www.elevatesolutions.com', 'Consulting', 'Business', 'Active', 35000.00),
        ('CUST-1003', 'DataWave Analytics', 'Michael Chen', 'michael@datawave.com', '(555) 345-6789',
          'www.datawave.com', 'Data Services', 'Business', 'Active', 75000.00),
        ('CUST-1004', 'Quantum Systems', 'Emily Rodriguez', 'emily@quantumsystems.com', '(555) 456-7890',
          'www.quantumsystems.com', 'Manufacturing', 'Business', 'Active', 100000.00),
        ('CUST-1005', 'Arctic Innovations', 'David Wilson', 'david@arcticinnovations.com', '(555) 567-8901',
          'www.arcticinnovations.com', 'Research', 'Business', 'Active', 25000.00),
        ('CUST-1006', 'Sunrise Healthcare', 'Lisa Morgan', 'lisa@sunrisehealthcare.com', '(555) 678-9012',
          'www.sunrisehealthcare.com', 'Healthcare', 'Business', 'Inactive', 40000.00),
        ('CUST-1007', 'Velocity Logistics', 'Robert Brown', 'robert@velocitylogistics.com', '(555) 789-0123',
          'www.velocitylogistics.com', 'Transportation', 'Business', 'Active', 60000.00);
      `);

      // Create customer_contacts table
      await pool.query(`
        CREATE TABLE sales_customer_contacts (
          id SERIAL PRIMARY KEY,
          customer_id INT REFERENCES sales_customers(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          position VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(50),
          is_primary BOOLEAN DEFAULT FALSE,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sample customer contacts (will be added after getting customer IDs)
      `);

      // Add sample customer contacts
      const customersResult = await pool.query('SELECT id, contact_person, email, phone FROM sales_customers');
      const customers = customersResult.rows;

      for (const customer of customers) {
        // Add primary contact based on customer data
        await pool.query(`
          INSERT INTO sales_customer_contacts (
            customer_id, name, position, email, phone, is_primary
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [customer.id, customer.contact_person, 'Primary Contact', customer.email, customer.phone, true]);

        // Add additional contact for some customers
        if (Math.random() > 0.5) {
          const positions = ['Sales Manager', 'Finance Director', 'Technical Lead', 'Operations Manager'];
          const position = positions[Math.floor(Math.random() * positions.length)];
          const name = ['Alex Wong', 'Maria Garcia', 'Tom Baker', 'Jessica Lee'][Math.floor(Math.random() * 4)];
          const email = `${name.split(' ')[0].toLowerCase()}@${customer.email.split('@')[1]}`;
          const phone = '(555) ' + Math.floor(Math.random() * 900 + 100) + '-' + Math.floor(Math.random() * 9000 + 1000);

          await pool.query(`
            INSERT INTO sales_customer_contacts (
              customer_id, name, position, email, phone, is_primary
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [customer.id, name, position, email, phone, false]);
        }
      }
    }

    // Get status filter from query params
    const { status } = req.query;
    console.log('Customer filter - status:', status);

    // Determine sources: default to master-only unless includeSales=true
    const includeSales = String(req.query.includeSales || '').toLowerCase() === 'true';

    // Build combined list but prefer sales_customers on id collisions (when included)
    const baseQuery = `
      WITH combined AS (
        ${includeSales ? `
        SELECT id, company_name AS name, 'sales' AS source, contact_person, email, phone, industry,
               status
        FROM sales_customers
        UNION ALL
        ` : ''}
        SELECT c.id, c.name, 'master' AS source, NULL AS contact_person, c.email, c.phone, NULL AS industry,
               CASE WHEN c.is_active THEN 'Active' ELSE 'Inactive' END AS status
        FROM customers c
      ), ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY (CASE WHEN source='sales' THEN 1 ELSE 2 END)) AS rnk
        FROM combined
      )
      SELECT id,
             ('CUST-' || id) AS customer_number,
             name AS company_name,
             contact_person,
             email,
             phone,
             industry,
             status
      FROM ranked
      WHERE rnk = 1
    `;

    let query = `SELECT * FROM (${baseQuery}) t ORDER BY company_name`;
    let params = [];
    if (status && status !== 'all') {
      query = `SELECT * FROM (${baseQuery}) t WHERE status = $1 ORDER BY company_name`;
      params = [status];
    }

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// ========= DROPDOWN/REFERENCE DATA ROUTES =========

// Get all lead sources for dropdown
router.get('/api/sales/lead-sources', async (req, res) => {
  try {
    const sources = [
      { value: 'Website', label: 'Website' },
      { value: 'Email Campaign', label: 'Email Campaign' },
      { value: 'Cold Call', label: 'Cold Call' },
      { value: 'Trade Show', label: 'Trade Show' },
      { value: 'Webinar', label: 'Webinar' },
      { value: 'Social Media', label: 'Social Media' },
      { value: 'Referral', label: 'Referral' },
      { value: 'Partner', label: 'Partner' },
      { value: 'Direct Marketing', label: 'Direct Marketing' },
      { value: 'Advertisement', label: 'Advertisement' }
    ];

    res.json(sources);
  } catch (error) {
    console.error('Error fetching lead sources:', error);
    res.status(500).json({ message: 'Error fetching lead sources', error: error.message });
  }
});

// Get all industries for dropdown
router.get('/api/sales/industries', async (req, res) => {
  try {
    const industries = [
      { value: 'Technology', label: 'Technology' },
      { value: 'Manufacturing', label: 'Manufacturing' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Financial Services', label: 'Financial Services' },
      { value: 'Retail', label: 'Retail' },
      { value: 'Education', label: 'Education' },
      { value: 'Professional Services', label: 'Professional Services' },
      { value: 'Energy', label: 'Energy' },
      { value: 'Telecommunications', label: 'Telecommunications' },
      { value: 'Transportation', label: 'Transportation' },
      { value: 'Real Estate', label: 'Real Estate' },
      { value: 'Hospitality', label: 'Hospitality' },
      { value: 'Agriculture', label: 'Agriculture' },
      { value: 'Construction', label: 'Construction' },
      { value: 'Other', label: 'Other' }
    ];

    res.json(industries);
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ message: 'Error fetching industries', error: error.message });
  }
});

// Lightweight dropdown endpoint (unifies master customers + sales_customers)
router.get('/api/sales/customers/dropdown', async (req, res) => {
  try {
    const { q } = req.query;
    const hasQuery = typeof q === 'string' && q.trim() !== '';

    const includeSales = String(req.query.includeSales || '').toLowerCase() === 'true';

    // Combine sources conditionally; prefer sales_customers when included
    const base = `
      WITH combined AS (
        ${includeSales ? `SELECT id, company_name AS name, 'sales' AS source FROM sales_customers UNION ALL` : ''}
        SELECT id, name, 'master' AS source FROM customers
      ), ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY (CASE WHEN source='sales' THEN 1 ELSE 2 END)) AS rnk
        FROM combined
      )
      SELECT id, name
      FROM ranked
      WHERE rnk = 1
    `;

    let sqlText = `SELECT * FROM (${base}) t`;
    let params = [];
    if (hasQuery) {
      sqlText += ` WHERE name ILIKE $1 OR CAST(id AS TEXT) ILIKE $1`;
      params = [`%${q}%`];
    }

    sqlText += ` ORDER BY name LIMIT 100`;
    const result = await pool.query(sqlText, params);

    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching sales customers dropdown:', error);
    return res.status(500).json({ success: false, error: 'Failed to load customer dropdown' });
  }
});

// ========= CONVERSION ROUTES =========

// Convert lead to quote
router.post('/api/sales/leads/:id/convert-to-quote', async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`Converting lead ${id} to quote...`);

    // Get lead details
    const leadResult = await pool.query(
      'SELECT * FROM sales_leads WHERE id = $1',
      [id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];
    console.log('Found lead:', lead);

    // Generate quote number
    const quoteNumber = `QT-${Date.now()}`;

    // Create quote from lead
    const quoteResult = await pool.query(
      `INSERT INTO sales_quotes 
       (quote_number, customer_name, contact_person, email, phone, 
        status, quote_date, valid_until, lead_id, created_at, active)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $7, NOW(), true)
       RETURNING *`,
      [quoteNumber, lead.name, lead.contact_person, lead.email, lead.phone, 'Draft', id]
    );

    console.log('Created quote:', quoteResult.rows[0]);

    // Update lead status
    await pool.query(
      'UPDATE sales_leads SET status = $1 WHERE id = $2',
      ['Qualified', id]
    );

    res.json({
      success: true,
      quote_number: quoteNumber,
      quote: quoteResult.rows[0]
    });
  } catch (error) {
    console.error('Error converting lead to quote:', error);
    res.status(500).json({ success: false, error: 'Failed to convert lead to quote', message: error.message });
  }
});

// Convert quote to order
router.post('/api/sales/quotes/:id/convert-to-order', async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`Converting quote ${id} to order...`);

    // Get quote details
    const quoteResult = await pool.query(
      'SELECT * FROM sales_quotes WHERE id = $1',
      [id]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];
    console.log('Found quote:', quote);

    // Generate order number
    const orderNumber = `SO-${Date.now()}`;

    // Create order from quote
    const orderResult = await pool.query(
      `INSERT INTO sales_orders 
       (order_number, customer_name, order_date, status, 
        total_amount, quote_id, created_at, active)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, NOW(), true)
       RETURNING *`,
      [orderNumber, quote.customer_name, 'open', quote.grand_total || quote.total_amount || 0, id]
    );

    console.log('Created order:', orderResult.rows[0]);

    // Update quote status
    await pool.query(
      'UPDATE sales_quotes SET status = $1 WHERE id = $2',
      ['Converted', id]
    );

    res.json({
      success: true,
      order_number: orderNumber,
      order: orderResult.rows[0]
    });
  } catch (error) {
    console.error('Error converting quote to order:', error);
    res.status(500).json({ success: false, error: 'Failed to convert quote to order', message: error.message });
  }
});

// --- CREATE SALES CUSTOMER (needed by Customers tile) ---
router.post('/api/sales/customers', async (req, res) => {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_customers (
        id SERIAL PRIMARY KEY,
        customer_number VARCHAR(50) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255),
        industry VARCHAR(100),
        customer_type VARCHAR(50) DEFAULT 'Business',
        billing_address TEXT,
        shipping_address TEXT,
        tax_id VARCHAR(100),
        payment_terms VARCHAR(100),
        credit_limit DECIMAL(15, 2),
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const {
      company_name,
      contact_person,
      email,
      phone,
      industry,
      status
    } = req.body || {};

    if (!company_name || !contact_person || !email || !phone || !industry) {
      return res.status(400).json({ message: 'company_name, contact_person, email, phone, industry are required' });
    }

    // Generate customer_number CUST-YYYY-XXXX
    const year = new Date().getFullYear();
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM sales_customers');
    const seq = (countRows[0]?.cnt || 0) + 1;
    const customerNumber = `CUST-${year}-${String(seq).padStart(4, '0')}`;

    const insert = await pool.query(`
      INSERT INTO sales_customers (
        customer_number, company_name, contact_person, email, phone, industry, status
      ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'Active'))
      RETURNING id, customer_number, company_name, contact_person, email, phone, industry, status
    `, [customerNumber, company_name, contact_person, email, phone, industry, status]);

    return res.status(201).json(insert.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ message: 'Error creating customer' });
  }
});

export default router;