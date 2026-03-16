/**
 * Transaction API Routes
 * Handles all transactional operations including Document Posting, Goods Receipt, and Payment Processing
 */

const express = require('express');
import pg from 'pg'; // ✅ Correct for CommonJS module in ESM
const { Pool } = pg;
const router = express.Router();

// Initialize database connection
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Document Posting Routes
router.get('/document-posting', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT dp.*, cc.company_name 
      FROM document_posting dp
      LEFT JOIN company_codes cc ON dp.company_code = cc.company_code
      ORDER BY dp.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching document postings:', error);
    res.status(500).json({ error: 'Failed to fetch document postings' });
  }
});

router.post('/document-posting', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const { document_type, posting_date, document_date, reference, currency, company_code, lines } = req.body;
    
    // Generate document number
    const docNumber = `DOC${Date.now()}`;
    
    // Calculate totals
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    
    // Insert document header
    const docResult = await client.query(`
      INSERT INTO document_posting 
      (document_number, document_type, posting_date, document_date, reference, currency, 
       company_code, total_debit, total_credit, status, user_created)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'posted', 'system')
      RETURNING *
    `, [docNumber, document_type, posting_date, document_date, reference, currency, 
        company_code, totalDebit, totalCredit]);
    
    const documentId = docResult.rows[0].id;
    
    // Insert document lines
    for (const line of lines) {
      await client.query(`
        INSERT INTO document_posting_lines 
        (document_id, line_number, gl_account, cost_center, profit_center, 
         debit_amount, credit_amount, description, reference)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [documentId, line.line_number, line.gl_account, line.cost_center, 
          line.profit_center, line.debit_amount, line.credit_amount, 
          line.description, line.reference]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(docResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating document posting:', error);
    res.status(500).json({ error: 'Failed to create document posting' });
  } finally {
    client.release();
  }
});

// Goods Receipt Routes
router.get('/goods-receipt', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT gr.*, v.vendor_name, p.plant_name
      FROM goods_receipt gr
      LEFT JOIN vendors v ON gr.vendor_code = v.vendor_code
      LEFT JOIN plants p ON gr.plant_code = p.plant_code
      ORDER BY gr.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching goods receipts:', error);
    res.status(500).json({ error: 'Failed to fetch goods receipts' });
  }
});

router.post('/goods-receipt', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { vendor_code, purchase_order, plant_code, storage_location, movement_type, receipt_date, lines } = req.body;
    
    // Generate receipt number
    const receiptNumber = `GR${Date.now()}`;
    
    // Calculate totals
    const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity_received || 0), 0);
    const totalValue = lines.reduce((sum, line) => sum + (line.total_amount || 0), 0);
    
    // Insert receipt header
    const receiptResult = await client.query(`
      INSERT INTO goods_receipt 
      (receipt_number, receipt_date, vendor_code, purchase_order, plant_code, 
       storage_location, movement_type, total_quantity, total_value, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'posted', 'system')
      RETURNING *
    `, [receiptNumber, receipt_date, vendor_code, purchase_order, plant_code, 
        storage_location, movement_type, totalQuantity, totalValue]);
    
    const receiptId = receiptResult.rows[0].id;
    
    // Insert receipt lines
    for (const line of lines) {
      await client.query(`
        INSERT INTO goods_receipt_lines 
        (receipt_id, line_number, material_code, quantity_received, unit_price, 
         total_amount, storage_location, batch_number, expiry_date, quality_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [receiptId, line.line_number, line.material_code, line.quantity_received, 
          line.unit_price, line.total_amount, line.storage_location, 
          line.batch_number, line.expiry_date, line.quality_status]);
      
      // Update inventory
      await client.query(`
        INSERT INTO inventory_transactions 
        (material_code, plant_code, storage_location, movement_type, quantity, 
         unit_price, total_value, reference_document, transaction_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [line.material_code, plant_code, line.storage_location, movement_type,
          line.quantity_received, line.unit_price, line.total_amount, 
          receiptNumber, receipt_date]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(receiptResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating goods receipt:', error);
    res.status(500).json({ error: 'Failed to create goods receipt' });
  } finally {
    client.release();
  }
});

// Payment Processing Routes
router.get('/payments', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, v.vendor_name, c.customer_name
      FROM payments p
      LEFT JOIN vendors v ON p.vendor_code = v.vendor_code
      LEFT JOIN customers c ON p.customer_code = c.customer_code
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/payments', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { payment_method, vendor_code, customer_code, payment_type, payment_date, 
            bank_account, reference, currency, lines } = req.body;
    
    // Generate payment number
    const paymentNumber = `PAY${Date.now()}`;
    
    // Calculate totals
    const totalAmount = lines.reduce((sum, line) => sum + (line.payment_amount || 0), 0);
    
    // Insert payment header
    const paymentResult = await client.query(`
      INSERT INTO payments 
      (payment_number, payment_date, payment_method, vendor_code, customer_code, 
       payment_type, total_amount, currency, bank_account, reference, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'processed', 'system')
      RETURNING *
    `, [paymentNumber, payment_date, payment_method, vendor_code, customer_code, 
        payment_type, totalAmount, currency, bank_account, reference]);
    
    const paymentId = paymentResult.rows[0].id;
    
    // Insert payment lines
    for (const line of lines) {
      await client.query(`
        INSERT INTO payment_lines 
        (payment_id, line_number, invoice_number, original_amount, discount_amount, 
         payment_amount, cash_discount, assignment, text)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [paymentId, line.line_number, line.invoice_number, line.original_amount, 
          line.discount_amount, line.payment_amount, line.cash_discount, 
          line.assignment, line.text]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  } finally {
    client.release();
  }
});

// Inventory Management Routes
router.get('/inventory', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        m.material_code,
        m.material_name,
        p.plant_code,
        p.plant_name,
        sl.storage_location_code,
        COALESCE(SUM(CASE WHEN it.movement_type IN ('101', '102', '501', '602') THEN it.quantity 
                          WHEN it.movement_type IN ('201', '261', '301', '502', '601', '701', '702') THEN -it.quantity 
                          ELSE 0 END), 0) as current_stock,
        AVG(it.unit_price) as average_price,
        MAX(it.transaction_date) as last_movement
      FROM materials m
      CROSS JOIN plants p
      CROSS JOIN storage_locations sl
      LEFT JOIN inventory_transactions it ON m.material_code = it.material_code 
        AND p.plant_code = it.plant_code 
        AND sl.storage_location_code = it.storage_location
      WHERE m.active = true AND p.active = true AND sl.active = true
      GROUP BY m.material_code, m.material_name, p.plant_code, p.plant_name, sl.storage_location_code
      HAVING COALESCE(SUM(CASE WHEN it.movement_type IN ('101', '102', '501', '602') THEN it.quantity 
                               WHEN it.movement_type IN ('201', '261', '301', '502', '601', '701', '702') THEN -it.quantity 
                               ELSE 0 END), 0) > 0
      ORDER BY m.material_code, p.plant_code, sl.storage_location_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Cost Element Accounting Routes
router.get('/cost-elements', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM cost_elements 
      ORDER BY cost_element_code ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cost elements:', error);
    res.status(500).json({ error: 'Failed to fetch cost elements' });
  }
});

router.post('/cost-elements', async (req, res) => {
  try {
    const { cost_element_code, cost_element_name, cost_element_type, 
            gl_account, cost_center, description } = req.body;
    
    const result = await db.query(`
      INSERT INTO cost_elements 
      (cost_element_code, cost_element_name, cost_element_type, gl_account, 
       cost_center, description, active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [cost_element_code, cost_element_name, cost_element_type, 
        gl_account, cost_center, description]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cost element:', error);
    res.status(500).json({ error: 'Failed to create cost element' });
  }
});

module.exports = router;