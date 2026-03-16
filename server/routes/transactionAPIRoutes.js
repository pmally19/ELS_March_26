/**
 * Transaction API Routes
 * Implements missing API endpoints for transaction applications
 */

import express from 'express';
import { ensureActivePool } from '../database.js';
import { DocumentNumberingService } from '../services/documentNumberingService.js';
// import { Pool } from '@neondatabase/serverless';
import pg from 'pg';
const { Pool } = pg
import 'dotenv/config'
const router = express.Router();

// Initialize database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Document Posting API
router.get('/document-posting', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        dp.id,
        dp.document_number,
        dp.company_code,
        dp.document_type,
        dp.posting_date,
        dp.document_date,
        dp.reference,
        dp.header_text,
        dp.total_amount,
        dp.currency,
        dp.status,
        cc.name as company_name
      FROM document_postings dp
      LEFT JOIN company_codes cc ON dp.company_code = cc.code
      ORDER BY dp.posting_date DESC
      LIMIT 100
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching document postings:', error);
    res.status(500).json({
      message: 'Failed to fetch document postings',
      error: error.message
    });
  }
});

router.post('/document-posting', async (req, res) => {
  try {
    const {
      document_number,
      company_code,
      document_type,
      posting_date,
      document_date,
      reference,
      header_text,
      line_items
    } = req.body;

    // Calculate total amount from line items
    const total_amount = line_items.reduce((sum, item) => sum + (item.debit_amount || item.credit_amount || 0), 0);

    // Insert document header
    const headerResult = await pool.query(`
      INSERT INTO document_postings (
        document_number, company_code, document_type, posting_date, 
        document_date, reference, header_text, total_amount, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      document_number, company_code, document_type, posting_date,
      document_date, reference, header_text, total_amount, 'USD', 'Posted'
    ]);

    const document_id = headerResult.rows[0].id;

    // Insert line items
    for (const item of line_items) {
      await pool.query(`
        INSERT INTO document_posting_items (
          document_id, line_number, gl_account, cost_center, 
          debit_amount, credit_amount, text, business_area
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        document_id, item.line_number, item.gl_account, item.cost_center,
        item.debit_amount || 0, item.credit_amount || 0, item.text, item.business_area
      ]);
    }

    res.status(201).json({
      message: 'Document posted successfully',
      document_id: document_id,
      document_number: document_number
    });
  } catch (error) {
    console.error('Error posting document:', error);
    res.status(500).json({
      message: 'Failed to post document',
      error: error.message
    });
  }
});

// Goods Receipt API
router.get('/goods-receipt', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        gr.id,
        gr.receipt_number,
        gr.purchase_order,
        gr.vendor_code,
        gr.plant_code,
        gr.receipt_date,
        gr.delivery_note,
        gr.total_quantity,
        gr.total_amount,
        gr.currency,
        gr.status,
        v.name as vendor_name,
        p.name as plant_name
      FROM goods_receipts gr
      LEFT JOIN vendors v ON gr.vendor_code = v.code
      LEFT JOIN plants p ON gr.plant_code = p.code
      ORDER BY gr.receipt_date DESC
      LIMIT 100
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching goods receipts:', error);
    res.status(500).json({
      message: 'Failed to fetch goods receipts',
      error: error.message
    });
  }
});

router.get('/goods-receipt/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch Header
    const headerResult = await pool.query(`
      SELECT 
        gr.id,
        gr.receipt_number,
        gr.purchase_order_id,
        gr.vendor_code,
        gr.plant_code,
        gr.receipt_date,
        gr.delivery_note,
        gr.total_quantity,
        gr.total_amount,
        gr.currency,
        gr.status,
        v.name as vendor_name,
        p.name as plant_name
      FROM goods_receipts gr
      LEFT JOIN vendors v ON gr.vendor_code = v.code
      LEFT JOIN plants p ON gr.plant_code = p.code
      WHERE gr.id = $1
    `, [id]);

    if (headerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Goods receipt not found' });
    }

    const receipt = headerResult.rows[0];

    // Fetch Items
    const itemsResult = await pool.query(`
      SELECT 
        id,
        line_number,
        material_code,
        quantity,
        unit_price,
        storage_location,
        batch_number,
        quality_inspection
      FROM goods_receipt_items
      WHERE receipt_id = $1
      ORDER BY line_number
    `, [id]);

    // Attach items to receipt
    receipt.items = itemsResult.rows;

    res.json(receipt);
  } catch (error) {
    console.error('Error fetching goods receipt details:', error);
    res.status(500).json({
      message: 'Failed to fetch goods receipt details',
      error: error.message
    });
  }
});

router.post('/goods-receipt', async (req, res) => {
  try {
    const {
      receipt_number: temp_receipt_number, // We will ignore this and generate our own
      movement_type_code, // Must accept movement_type_code to determine type
      purchase_order,
      vendor_code,
      plant_code,
      receipt_date,
      delivery_note,
      line_items
    } = req.body;

    // Determine the Document Type and generate the Number Sequence automatically
    let documentNumber = temp_receipt_number;
    let documentTypeId = null;
    try {
      const generationResult = await DocumentNumberingService.getNextDocumentNumber(
        movement_type_code || '101',
        'WE' // WE = Goods Receipt Fallback
      );
      documentNumber = generationResult.documentNumber;
      documentTypeId = generationResult.documentTypeId;
    } catch (err) {
      console.error("Number Range Generation Failed", err);
      return res.status(500).json({ message: "Failed to generate Material Document Number", error: err.message });
    }

    // Calculate totals
    const total_quantity = line_items.reduce((sum, item) => sum + item.quantity, 0);
    const total_amount = line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // Insert goods receipt header
    const headerResult = await pool.query(`
      INSERT INTO goods_receipts (
        receipt_number, document_type_id, purchase_order, vendor_code, plant_code,
        receipt_date, delivery_note, total_quantity, total_amount, currency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      documentNumber, documentTypeId, purchase_order, vendor_code, plant_code,
      receipt_date, delivery_note, total_quantity, total_amount, 'USD', 'Received'
    ]);

    const receipt_id = headerResult.rows[0].id;

    // Insert line items
    for (const item of line_items) {
      await pool.query(`
        INSERT INTO goods_receipt_items (
          receipt_id, line_number, material_code, quantity, 
          unit_price, storage_location, batch_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        receipt_id, item.line_number, item.material_code, item.quantity,
        item.unit_price, item.storage_location, item.batch_number
      ]);
    }

    res.status(201).json({
      message: 'Goods receipt posted successfully',
      receipt_id: receipt_id,
      receipt_number: documentNumber
    });
  } catch (error) {
    console.error('Error posting goods receipt:', error);
    res.status(500).json({
      message: 'Failed to post goods receipt',
      error: error.message
    });
  }
});

// Payment Processing API
router.get('/payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.payment_number,
        p.payment_method,
        p.vendor_code,
        p.customer_code,
        p.amount,
        p.currency,
        p.payment_date,
        p.value_date,
        p.reference,
        p.status,
        p.bank_account,
        v.name as vendor_name,
        c.name as customer_name
      FROM payments p
      LEFT JOIN vendors v ON p.vendor_code = v.code
      LEFT JOIN customers c ON p.customer_code = c.code
      ORDER BY p.payment_date DESC
      LIMIT 100
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});

router.post('/payments', async (req, res) => {
  try {
    const {
      payment_number,
      payment_method,
      vendor_code,
      customer_code,
      amount,
      currency,
      payment_date,
      value_date,
      reference,
      bank_account
    } = req.body;

    const result = await pool.query(`
      INSERT INTO payments (
        payment_number, payment_method, vendor_code, customer_code,
        amount, currency, payment_date, value_date, reference, bank_account, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      payment_number, payment_method, vendor_code, customer_code,
      amount, currency, payment_date, value_date, reference, bank_account, 'Processed'
    ]);

    res.status(201).json({
      message: 'Payment processed successfully',
      payment_id: result.rows[0].id,
      payment_number: payment_number
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      message: 'Failed to process payment',
      error: error.message
    });
  }
});

// Movement Types API (Master Data)
router.get('/movement-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        movement_type,
        description,
        movement_indicator,
        special_stock_indicator,
        quantity_update,
        value_update,
        active,
        created_at
      FROM movement_types
      WHERE active = true
      ORDER BY movement_type
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching movement types:', error);
    res.status(500).json({
      message: 'Failed to fetch movement types',
      error: error.message
    });
  }
});

router.post('/movement-types', async (req, res) => {
  try {
    const {
      movement_type,
      description,
      movement_indicator,
      special_stock_indicator,
      quantity_update,
      value_update
    } = req.body;

    const result = await pool.query(`
      INSERT INTO movement_types (
        movement_type, description, movement_indicator, special_stock_indicator,
        quantity_update, value_update, active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id
    `, [
      movement_type, description, movement_indicator, special_stock_indicator,
      quantity_update, value_update
    ]);

    res.status(201).json({
      message: 'Movement type created successfully',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error creating movement type:', error);
    res.status(500).json({
      message: 'Failed to create movement type',
      error: error.message
    });
  }
});

// Sales Order API
router.get('/sales-order', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        so.id,
        so.order_number,
        so.customer_code,
        so.order_date,
        so.delivery_date,
        so.status,
        so.total_amount,
        so.currency,
        c.name as customer_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_code = c.code
      ORDER BY so.order_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.json([]);
  }
});

// Invoice API
router.get('/invoice', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.customer_code,
        i.invoice_date,
        i.due_date,
        i.status,
        i.total_amount,
        i.currency,
        c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_code = c.code
      ORDER BY i.invoice_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.json([]);
  }
});

// Sales Billing API
router.get('/sales-billing', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sb.id,
        sb.billing_number,
        sb.customer_code,
        sb.billing_date,
        sb.amount,
        sb.currency,
        sb.status,
        c.name as customer_name
      FROM sales_billing sb
      LEFT JOIN customers c ON sb.customer_code = c.code
      ORDER BY sb.billing_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching sales billing:', error);
    res.json([]);
  }
});

// Accounts Payable API
router.get('/accounts-payable', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ap.id,
        ap.vendor_code,
        ap.invoice_number,
        ap.invoice_date,
        ap.due_date,
        ap.amount,
        ap.currency,
        ap.status,
        v.name as vendor_name
      FROM accounts_payable ap
      LEFT JOIN vendors v ON ap.vendor_code = v.code
      ORDER BY ap.invoice_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching accounts payable:', error);
    res.json([]);
  }
});

// Accounts Receivable API
router.get('/accounts-receivable', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ar.id,
        ar.customer_code,
        ar.invoice_number,
        ar.invoice_date,
        ar.due_date,
        ar.amount,
        ar.currency,
        ar.status,
        c.name as customer_name
      FROM accounts_receivable ar
      LEFT JOIN customers c ON ar.customer_code = c.code
      ORDER BY ar.invoice_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching accounts receivable:', error);
    res.json([]);
  }
});

// General Ledger Posting API
router.get('/general-ledger-posting', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        gl.id,
        gl.document_number,
        gl.posting_date,
        gl.account_code,
        gl.debit_amount,
        gl.credit_amount,
        gl.currency,
        gl.description,
        gl.status
      FROM general_ledger_postings gl
      ORDER BY gl.posting_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching general ledger postings:', error);
    res.json([]);
  }
});

// Goods Issue API
router.get('/goods-issue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        gi.id,
        gi.document_number,
        gi.posting_date,
        gi.material_code,
        gi.quantity,
        gi.unit,
        gi.plant_code,
        gi.storage_location,
        gi.movement_type,
        m.name as material_name
      FROM goods_issues gi
      LEFT JOIN materials m ON gi.material_code = m.code
      ORDER BY gi.posting_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching goods issues:', error);
    res.json([]);
  }
});

// Stock Transfer API
router.get('/stock-transfer', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        st.id,
        st.transfer_number,
        st.transfer_date,
        st.material_code,
        st.quantity,
        st.from_plant,
        st.to_plant,
        st.from_storage_location,
        st.to_storage_location,
        st.status,
        m.name as material_name
      FROM stock_transfers st
      LEFT JOIN materials m ON st.material_code = m.code
      ORDER BY st.transfer_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching stock transfers:', error);
    res.json([]);
  }
});

// Purchase Order API
router.get('/purchase-order', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        po.id,
        po.purchase_order_number,
        po.vendor_code,
        po.order_date,
        po.delivery_date,
        po.total_amount,
        po.currency,
        po.status,
        v.name as vendor_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_code = v.code
      ORDER BY po.order_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.json([]);
  }
});

// Purchase Requisition API
router.get('/purchase-requisition', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pr.id,
        pr.requisition_number,
        pr.requestor,
        pr.request_date,
        pr.required_date,
        pr.total_amount,
        pr.currency,
        pr.status,
        pr.approval_status
      FROM purchase_requisitions pr
      ORDER BY pr.request_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching purchase requisitions:', error);
    res.json([]);
  }
});

// Invoice Verification API
router.get('/invoice-verification', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        iv.id,
        iv.invoice_number,
        iv.vendor_code,
        iv.invoice_date,
        iv.amount,
        iv.currency,
        iv.verification_status,
        iv.verification_date,
        v.name as vendor_name
      FROM invoice_verifications iv
      LEFT JOIN vendors v ON iv.vendor_code = v.code
      ORDER BY iv.invoice_date DESC
      LIMIT 100
    `);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching invoice verifications:', error);
    res.json([]);
  }
});

export default router;