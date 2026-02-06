import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id, i.invoice_number, i.order_id, i.issue_date, 
        i.due_date, i.amount, i.status, i.paid_date, i.created_at,
        o.customer_id, c.name as customer_name, c.email as customer_email
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE i.active = true
      ORDER BY i.issue_date DESC, i.invoice_number DESC
    `);
    
    console.log(`✅ Invoices fetched: ${result.rows.length} records`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
});

// GET invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        i.*, 
        c.name as customer_name, c.email as customer_email,
        c.address as customer_address, c.phone as customer_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Failed to fetch invoice', error: error.message });
  }
});

// POST create new invoice
router.post('/', async (req, res) => {
  try {
    const { 
      customer_id, invoice_date, due_date, total_amount, 
      tax_amount, net_amount, currency, description, items 
    } = req.body;
    
    // Validate required fields
    if (!customer_id || !total_amount) {
      return res.status(400).json({ message: 'Customer ID and total amount are required' });
    }
    
    // Generate invoice number
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const countResult = await pool.query(
      'SELECT COUNT(*) + 1 as next_number FROM invoices WHERE invoice_number LIKE $1',
      [`INV-${yearMonth}%`]
    );
    const invoiceNumber = `INV-${yearMonth}-${String(countResult.rows[0].next_number).padStart(4, '0')}`;
    
    const result = await pool.query(`
      INSERT INTO invoices (
        invoice_number, customer_id, invoice_date, due_date,
        total_amount, tax_amount, net_amount, currency, description,
        status, payment_status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', 'unpaid', NOW(), NOW())
      RETURNING *
    `, [
      invoiceNumber, customer_id, 
      invoice_date || new Date().toISOString().split('T')[0],
      due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_amount, tax_amount || 0, net_amount || total_amount,
      currency || 'USD', description
    ]);
    
    console.log('✅ Invoice created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Failed to create invoice', error: error.message });
  }
});

// PUT update invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_id, invoice_date, due_date, total_amount,
      tax_amount, net_amount, currency, description, status, payment_status 
    } = req.body;
    
    // Get current invoice status before update
    const currentInvoice = await pool.query('SELECT status, invoice_number FROM invoices WHERE id = $1', [id]);
    
    if (currentInvoice.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    const oldStatus = currentInvoice.rows[0].status;
    const invoice_number = currentInvoice.rows[0].invoice_number;
    
    const result = await pool.query(`
      UPDATE invoices SET 
        customer_id = $1, invoice_date = $2, due_date = $3,
        total_amount = $4, tax_amount = $5, net_amount = $6,
        currency = $7, description = $8, status = $9, 
        payment_status = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      customer_id, invoice_date, due_date, total_amount,
      tax_amount, net_amount, currency, description, status, payment_status, id
    ]);
    
    const updatedInvoice = result.rows[0];
    
    // SAP Standard: Auto-create AR document when invoice status changes from draft/created to posted/open
    if ((oldStatus === 'draft' || oldStatus === 'created') && (status === 'posted' || status === 'open')) {
      const { autoCreateARDocument, arDocumentExists } = require('../services/invoiceToARService');
      
      try {
        // Check if AR document already exists
        const existingAR = await arDocumentExists(id, invoice_number);
        
        if (!existingAR) {
          // Auto-create AR document (SAP Standard behavior)
          const arDocument = await autoCreateARDocument({
            invoice_id: id,
            invoice_number: invoice_number,
            customer_id: customer_id || updatedInvoice.customer_id,
            invoice_date: invoice_date || updatedInvoice.invoice_date,
            due_date: due_date || updatedInvoice.due_date,
            total_amount: total_amount || updatedInvoice.total_amount,
            tax_amount: tax_amount || updatedInvoice.tax_amount || 0,
            net_amount: net_amount || updatedInvoice.net_amount,
            currency: currency || updatedInvoice.currency || 'USD',
            payment_terms: description, // You may want to pass payment_terms separately
            sales_order_id: null, // Add if available
            company_code_id: null, // Add if available
            plant_id: null // Add if available
          });
          
          console.log(`✅ AR Document auto-created: ${arDocument.ar_document_number || 'AR-DOC-XXX'} for Invoice: ${invoice_number}`);
        } else {
          console.log(`ℹ️ AR Document already exists for Invoice: ${invoice_number}`);
        }
      } catch (arError) {
        console.error('⚠️ Warning: Invoice updated but AR document creation failed:', arError);
        // Don't fail the invoice update, just log the error
      }
    }
    
    console.log('✅ Invoice updated successfully:', updatedInvoice);
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Failed to update invoice', error: error.message });
  }
});

// POST mark invoice as paid
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, payment_amount, payment_method } = req.body;
    
    const result = await pool.query(`
      UPDATE invoices SET 
        payment_status = 'paid',
        status = 'completed',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    console.log('✅ Invoice marked as paid:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ message: 'Failed to mark invoice as paid', error: error.message });
  }
});

// GET invoice statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_invoices,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND payment_status = 'unpaid' THEN 1 END) as overdue_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END), 0) as outstanding_amount
      FROM invoices
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({ message: 'Failed to fetch invoice statistics', error: error.message });
  }
});

export default router;