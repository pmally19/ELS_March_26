import express from 'express';
import { pool } from '../../db.ts';

const router = express.Router();

// Get all invoices with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', date_from = '', date_to = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        i.id,
        i.invoice_number,
        i.customer_id,
        i.invoice_date,
        i.due_date,
        i.status,
        i.subtotal,
        i.tax_amount,
        i.total_amount,
        i.currency,
        i.payment_terms,
        i.notes,
        i.created_at,
        i.updated_at,
        c.name as customer_name,
        c.code as customer_code,
        c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (i.invoice_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      params.push(status);
    }

    if (date_from) {
      paramCount++;
      query += ` AND i.invoice_date >= $${paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      paramCount++;
      query += ` AND i.invoice_date <= $${paramCount}`;
      params.push(date_to);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.json([]);
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      customer_id,
      invoice_date,
      due_date,
      payment_terms = 'NET30',
      currency = 'USD',
      reference_order_id,
      notes = '',
      items = []
    } = req.body;

    // Validation with specific error messages
    if (!customer_id) {
      throw new Error('Customer is required');
    }
    
    if (!invoice_date) {
      throw new Error('Invoice date is required');
    }
    
    if (!due_date) {
      throw new Error('Due date is required');
    }
    
    if (!items || items.length === 0) {
      throw new Error('At least one item is required');
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description) {
        throw new Error(`Item ${i + 1}: Description is required`);
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
    
    const tax_amount = subtotal * 0.1; // 10% tax
    const total_amount = subtotal + tax_amount;

    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_terms VARCHAR(20) DEFAULT 'NET30',
        reference_order_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        description TEXT NOT NULL,
        quantity DECIMAL(15,3) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        discount DECIMAL(5,2) DEFAULT 0,
        line_total DECIMAL(15,2) NOT NULL,
        product_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Generate invoice number
    const invoiceNumberResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1 as next_number
      FROM invoices 
      WHERE invoice_number LIKE 'INV%'
    `);
    
    const invoice_number = `INV${invoiceNumberResult.rows[0].next_number.toString().padStart(6, '0')}`;

    // Insert invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        invoice_number, customer_id, invoice_date, due_date, status,
        subtotal, tax_amount, total_amount, currency, payment_terms,
        reference_order_id, notes
      ) VALUES (
        $1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11
      ) RETURNING id
    `, [
      invoice_number, customer_id, invoice_date, due_date,
      subtotal, tax_amount, total_amount, currency, payment_terms,
      reference_order_id, notes
    ]);

    const invoice_id = invoiceResult.rows[0].id;

    // Insert invoice items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const line_total = item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
      
      await client.query(`
        INSERT INTO invoice_items (
          invoice_id, line_number, description, quantity, unit_price,
          discount, line_total, product_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        invoice_id, i + 1, item.description, item.quantity, item.unit_price,
        item.discount || 0, line_total, item.product_id || null, item.notes || ''
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice_id,
      invoice_number,
      total_amount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(400).json({ 
      message: error.message || 'Failed to create invoice'
    });
  } finally {
    client.release();
  }
});

// Get single invoice with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceResult = await pool.query(`
      SELECT 
        i.*,
        c.name as customer_name,
        c.code as customer_code,
        c.address as customer_address,
        c.email as customer_email,
        c.phone as customer_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const itemsResult = await pool.query(`
      SELECT 
        ii.*,
        m.name as product_name,
        m.code as product_code
      FROM invoice_items ii
      LEFT JOIN materials m ON ii.product_id = m.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.line_number
    `, [id]);

    const invoice = {
      ...invoiceResult.rows[0],
      items: itemsResult.rows
    };

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Failed to fetch invoice' });
  }
});

// Update invoice status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status',
        validStatuses 
      });
    }

    const result = await pool.query(`
      UPDATE invoices 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, invoice_number, status
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({
      message: 'Invoice status updated successfully',
      invoice: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ 
      message: 'Failed to update invoice status'
    });
  }
});

// Get invoice statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
        COALESCE(SUM(total_amount), 0) as total_value,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_value,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total_amount ELSE 0 END), 0) as outstanding_value
      FROM invoices
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch statistics'
    });
  }
});

export default router;