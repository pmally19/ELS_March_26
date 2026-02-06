/**
 * AR Integration Workflows & Document Management
 * Automatic invoice creation, GL posting, bank reconciliation, document generation
 */

import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join('./uploads', 'ar-documents');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and documents allowed.'));
    }
  }
});

// 5. INTEGRATION WORKFLOWS

// Automatic invoice creation from sales orders
router.post('/auto-create-invoices', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get completed sales orders without invoices
    const salesOrders = await client.query(`
      SELECT 
        so.id as sales_order_id,
        so.order_number,
        so.customer_id,
        so.total_amount,
        so.order_date,
        c.name as customer_name,
        ccm.credit_limit,
        ccm.current_balance,
        ccm.is_on_credit_hold
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      LEFT JOIN customer_credit_management ccm ON c.id = ccm.customer_id
      WHERE so.status = 'completed' 
        AND so.id NOT IN (
          SELECT DISTINCT sales_order_id 
          FROM invoices 
          WHERE sales_order_id IS NOT NULL
        )
    `);

    const createdInvoices = [];
    
    for (const order of salesOrders.rows) {
      // Credit check before invoice creation
      if (order.is_on_credit_hold) {
        console.log(`Skipping invoice creation for order ${order.order_number} - customer on credit hold`);
        continue;
      }

      if ((order.current_balance + order.total_amount) > order.credit_limit) {
        // Put customer on credit hold and skip
        await client.query(`
          UPDATE customer_credit_management 
          SET is_on_credit_hold = true,
              credit_hold_reason = 'Credit limit exceeded during auto-invoice creation',
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $1
        `, [order.customer_id]);
        
        console.log(`Customer ${order.customer_name} placed on credit hold - limit exceeded`);
        continue;
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${order.sales_order_id}`;
      
      // Create invoice
      const invoiceResult = await client.query(`
        INSERT INTO invoices (
          invoice_number, customer_id, sales_order_id, amount,
          invoice_date, due_date, status, description
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'open', $5)
        RETURNING id, invoice_number
      `, [
        invoiceNumber, 
        order.customer_id, 
        order.sales_order_id, 
        order.total_amount,
        `Invoice for Sales Order ${order.order_number}`
      ]);

      const invoiceId = invoiceResult.rows[0].id;

      // Get sales order line items and create invoice line items
      const lineItems = await client.query(`
        SELECT product_id, description, quantity, unit_price, line_total
        FROM sales_order_items
        WHERE sales_order_id = $1
      `, [order.sales_order_id]);

      for (const item of lineItems.rows) {
        await client.query(`
          INSERT INTO sales_invoice_items (
            invoice_id, product_id, description, quantity, unit_price, line_amount
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.line_total]);
      }

      // Update customer balance
      await client.query(`
        UPDATE customer_credit_management 
        SET current_balance = current_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = $2
      `, [order.total_amount, order.customer_id]);

      // Create GL entries
      await this.createGLEntries(client, invoiceId, order.total_amount, order.customer_id);

      createdInvoices.push({
        invoice_id: invoiceId,
        invoice_number: invoiceResult.rows[0].invoice_number,
        sales_order_number: order.order_number,
        customer_name: order.customer_name,
        amount: order.total_amount
      });
    }

    await client.query('COMMIT');
    
    res.json({
      success: true,
      invoices_created: createdInvoices.length,
      invoices: createdInvoices
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Auto invoice creation error:', error);
    res.status(500).json({ error: 'Failed to auto-create invoices' });
  } finally {
    client.release();
  }
});

// GL Posting automation
async function createGLEntries(client, invoiceId, amount, customerId) {
  const timestamp = new Date();
  
  // Debit: Accounts Receivable
  await client.query(`
    INSERT INTO gl_entries (
      account_number, debit_amount, credit_amount, description,
      transaction_date, reference_type, reference_id
    ) VALUES ('1200', $1, 0, 'Invoice created - AR debit', $2, 'invoice', $3)
  `, [amount, timestamp, invoiceId]);

  // Credit: Revenue
  await client.query(`
    INSERT INTO gl_entries (
      account_number, debit_amount, credit_amount, description,
      transaction_date, reference_type, reference_id
    ) VALUES ('4000', 0, $1, 'Invoice created - Revenue credit', $2, 'invoice', $3)
  `, [amount, timestamp, invoiceId]);
}

// Bank reconciliation automation
router.post('/bank-reconciliation', async (req, res) => {
  const client = await pool.connect();
  try {
    const { bank_transactions } = req.body; // Array of bank transactions
    
    const matchedTransactions = [];
    const unmatchedTransactions = [];

    for (const bankTxn of bank_transactions) {
      // Try to match with customer payments
      const paymentMatch = await client.query(`
        SELECT cp.*, c.name as customer_name
        FROM customer_payments cp
        JOIN customers c ON cp.customer_id = c.id
        WHERE cp.payment_amount = $1
          AND cp.payment_date BETWEEN $2::date - INTERVAL '3 days' AND $2::date + INTERVAL '3 days'
          AND cp.bank_reference IS NULL
        ORDER BY ABS(EXTRACT(days FROM (cp.payment_date - $2::date)))
        LIMIT 1
      `, [bankTxn.amount, bankTxn.transaction_date]);

      if (paymentMatch.rows.length > 0) {
        const payment = paymentMatch.rows[0];
        
        // Update payment with bank reference
        await client.query(`
          UPDATE customer_payments 
          SET bank_reference = $1,
              bank_reconciled = true,
              reconciliation_date = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [bankTxn.reference, payment.id]);

        // Create GL entries for bank reconciliation
        await client.query(`
          INSERT INTO gl_entries (
            account_number, debit_amount, credit_amount, description,
            transaction_date, reference_type, reference_id
          ) VALUES 
          ('1000', $1, 0, 'Bank deposit - Cash debit', $2, 'bank_reconciliation', $3),
          ('1200', 0, $1, 'Payment received - AR credit', $2, 'bank_reconciliation', $3)
        `, [bankTxn.amount, bankTxn.transaction_date, payment.id]);

        matchedTransactions.push({
          bank_transaction: bankTxn,
          matched_payment: payment,
          customer_name: payment.customer_name
        });
      } else {
        unmatchedTransactions.push(bankTxn);
      }
    }

    res.json({
      success: true,
      matched_count: matchedTransactions.length,
      unmatched_count: unmatchedTransactions.length,
      matched_transactions: matchedTransactions,
      unmatched_transactions: unmatchedTransactions
    });

  } catch (error) {
    console.error('Bank reconciliation error:', error);
    res.status(500).json({ error: 'Failed to process bank reconciliation' });
  } finally {
    client.release();
  }
});

// 6. DOCUMENT MANAGEMENT

// Upload AR documents
router.post('/documents/upload', upload.single('document'), async (req, res) => {
  try {
    const { customer_id, invoice_id, document_type, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pool.query(`
      INSERT INTO ar_documents (
        customer_id, invoice_id, document_type, document_name,
        file_path, file_size, mime_type, uploaded_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      customer_id,
      invoice_id || null,
      document_type,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      req.user?.id || 1 // Default user ID
    ]);

    res.json({
      success: true,
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get documents for customer or invoice
router.get('/documents', async (req, res) => {
  try {
    const { customer_id, invoice_id, document_type } = req.query;
    
    let query = `
      SELECT 
        ad.*,
        c.name as customer_name,
        i.invoice_number
      FROM ar_documents ad
      JOIN customers c ON ad.customer_id = c.id
      LEFT JOIN invoices i ON ad.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) {
      query += ` AND ad.customer_id = $${params.length + 1}`;
      params.push(customer_id);
    }

    if (invoice_id) {
      query += ` AND ad.invoice_id = $${params.length + 1}`;
      params.push(invoice_id);
    }

    if (document_type) {
      query += ` AND ad.document_type = $${params.length + 1}`;
      params.push(document_type);
    }

    query += ` ORDER BY ad.uploaded_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Generate and email invoice PDF
router.post('/invoices/:invoice_id/generate-pdf', async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const { email_to_customer = false } = req.body;

    // Get invoice details
    const invoiceResult = await pool.query(`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.address as customer_address
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [invoice_id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get line items
    const lineItems = await pool.query(`
      SELECT * FROM sales_invoice_items
      WHERE invoice_id = $1
      ORDER BY id
    `, [invoice_id]);

    // Generate PDF content (simplified HTML for demo)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 20px; }
          .line-items table { width: 100%; border-collapse: collapse; }
          .line-items th, .line-items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .total { text-align: right; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>${invoice.invoice_number}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Bill To:</strong><br>
          ${invoice.customer_name}<br>
          ${invoice.customer_address || ''}</p>
          
          <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
        </div>

        <div class="line-items">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems.rows.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td>$${parseFloat(item.line_amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="total">
          <h3>Total Amount: $${parseFloat(invoice.amount).toFixed(2)}</h3>
        </div>
      </body>
      </html>
    `;

    // Store document record
    const docResult = await pool.query(`
      INSERT INTO ar_documents (
        customer_id, invoice_id, document_type, document_name,
        file_path, mime_type
      ) VALUES ($1, $2, 'invoice_pdf', $3, $4, 'application/pdf')
      RETURNING id
    `, [
      invoice.customer_id,
      invoice_id,
      `Invoice_${invoice.invoice_number}.pdf`,
      `/generated/invoices/invoice_${invoice_id}.pdf`
    ]);

    res.json({
      success: true,
      pdf_generated: true,
      document_id: docResult.rows[0].id,
      html_preview: htmlContent, // For demo purposes
      email_sent: email_to_customer && invoice.customer_email ? true : false
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Tax compliance reporting
router.get('/tax-reporting', async (req, res) => {
  try {
    const { start_date, end_date, tax_period = 'quarterly' } = req.query;

    const result = await pool.query(`
      WITH tax_summary AS (
        SELECT 
          DATE_TRUNC($3, i.invoice_date) as period,
          SUM(i.amount) as gross_revenue,
          SUM(i.amount * 0.1) as estimated_sales_tax, -- 10% assumed rate
          COUNT(*) as invoice_count,
          SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as collected_revenue
        FROM invoices i
        WHERE i.invoice_date BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC($3, i.invoice_date)
      )
      SELECT 
        period,
        gross_revenue,
        estimated_sales_tax,
        invoice_count,
        collected_revenue,
        (collected_revenue / NULLIF(gross_revenue, 0)) * 100 as collection_rate
      FROM tax_summary
      ORDER BY period
    `, [start_date, end_date, tax_period]);

    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.gross_revenue || 0), 0);
    const totalTax = result.rows.reduce((sum, row) => sum + parseFloat(row.estimated_sales_tax || 0), 0);

    res.json({
      tax_period: tax_period,
      period_start: start_date,
      period_end: end_date,
      summary: {
        total_gross_revenue: totalRevenue,
        total_estimated_tax: totalTax,
        average_collection_rate: result.rows.length > 0 ? 
          result.rows.reduce((sum, row) => sum + parseFloat(row.collection_rate || 0), 0) / result.rows.length : 0
      },
      period_details: result.rows
    });
  } catch (error) {
    console.error('Tax reporting error:', error);
    res.status(500).json({ error: 'Failed to generate tax report' });
  }
});

export default router;