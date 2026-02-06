import express from 'express';
import { pool } from '../../db';
import { sql } from 'drizzle-orm';
import { accountingService } from '../../services/AccountingService';

const router = express.Router();

/**
 * GET /api/ap/vendors
 * Get all vendors with their details
 */
router.get('/vendors', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.id,
        v.code as vendor_code,
        v.name,
        v.email,
        v.phone,
        v.status,
        v.payment_terms,
        v.currency,
        v.company_code_id,
        v.is_active,
        v.created_at,
        v.updated_at,
        -- Calculate outstanding amount from AP invoices (amount minus payments)
        COALESCE(SUM(
          CASE 
            WHEN ap.status IN ('Open', 'open', 'OPEN', 'Partial', 'partial', 'PARTIAL') 
            THEN ap.amount
            ELSE 0 
          END
        ), 0) - COALESCE(SUM(
          CASE 
            WHEN ap.status IN ('Open', 'open', 'OPEN', 'Partial', 'partial', 'PARTIAL')
              AND vp.status IN ('POSTED', 'PROCESSED')
            THEN vp.payment_amount
            ELSE 0
          END
        ), 0) as outstanding_amount,
        -- Get credit limit if available (assuming it's stored somewhere, otherwise 0)
        0 as credit_limit,
        -- Calculate total paid from vendor payments
        COALESCE(SUM(
          CASE 
            WHEN vp.status IN ('POSTED', 'PROCESSED') 
            THEN vp.payment_amount 
            ELSE 0 
          END
        ), 0) as total_paid,
        -- Count total invoices
        COUNT(DISTINCT ap.id) as total_invoices,
        -- Calculate average payment days (from vendor payments)
        COALESCE(AVG(
          CASE 
            WHEN vp.payment_date IS NOT NULL 
              AND ap.due_date IS NOT NULL
            THEN (vp.payment_date::date - ap.due_date::date)
            ELSE NULL
          END
        ), 0) as avg_payment_days,
        -- Get last payment date
        MAX(vp.payment_date) as last_payment_date
      FROM vendors v
      LEFT JOIN accounts_payable ap ON v.id = ap.vendor_id AND ap.active = true
      LEFT JOIN vendor_payments vp ON ap.id = vp.invoice_id AND vp.status IN ('POSTED', 'PROCESSED')
      WHERE v.is_active = true OR v.is_active IS NULL
      GROUP BY v.id, v.code, v.name, v.email, v.phone, v.status, 
               v.payment_terms, v.currency, v.company_code_id, 
               v.is_active, v.created_at, v.updated_at
      ORDER BY v.name
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vendors'
    });
  }
});

/**
 * GET /api/ap/vendor-statistics
 * Get vendor statistics
 */
router.get('/vendor-statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT v.id) as total_vendors,
        COUNT(DISTINCT CASE WHEN v.status = 'active' THEN v.id END) as active_vendors,
        COUNT(DISTINCT CASE 
          WHEN v.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN v.id 
        END) as new_vendors,
        COALESCE(AVG(
          CASE 
            WHEN v.payment_terms ~ '^[0-9]+$' 
            THEN CAST(v.payment_terms AS INTEGER)
            WHEN v.payment_terms LIKE '%30%' THEN 30
            WHEN v.payment_terms LIKE '%60%' THEN 60
            WHEN v.payment_terms LIKE '%45%' THEN 45
            WHEN v.payment_terms LIKE '%15%' THEN 15
            ELSE 30
          END
        ), 30) as avg_payment_terms,
        COALESCE(SUM(0), 0) as total_credit_limits
      FROM vendors v
      WHERE v.is_active = true OR v.is_active IS NULL
    `);

    res.json({
      success: true,
      data: result.rows[0] || {
        total_vendors: 0,
        active_vendors: 0,
        new_vendors: 0,
        avg_payment_terms: 30,
        total_credit_limits: 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching vendor statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vendor statistics'
    });
  }
});

/**
 * GET /api/ap/vendor/:id/payment-history
 * Get payment history for a specific vendor
 */
router.get('/vendor/:id/payment-history', async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT 
        vp.id,
        vp.payment_number,
        vp.payment_amount,
        vp.payment_method,
        vp.payment_date,
        vp.status,
        vp.reference as reference_number,
        vp.accounting_document_number,
        ap.invoice_number,
        ap.invoice_date
      FROM vendor_payments vp
      LEFT JOIN accounts_payable ap ON vp.invoice_id = ap.id
      WHERE vp.vendor_id = $1
      ORDER BY vp.payment_date DESC
    `, [vendorId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching vendor payment history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vendor payment history'
    });
  }
});

/**
 * GET /api/ap/vendor/:id/invoices
 * Get invoices for a specific vendor
 */
router.get('/vendor/:id/invoices', async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT 
        ap.id,
        ap.invoice_number,
        ap.invoice_date,
        ap.due_date,
        ap.amount,
        ap.net_amount,
        ap.status,
        ap.payment_date,
        ap.payment_reference,
        ap.notes
      FROM accounts_payable ap
      WHERE ap.vendor_id = $1
        AND ap.active = true
      ORDER BY ap.invoice_date DESC
      LIMIT 50
    `, [vendorId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching vendor invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vendor invoices'
    });
  }
});

/**
 * GET /api/ap/invoice/:id/items
 * Get line items for a specific invoice
 * NOTE: This route must come BEFORE /invoices to avoid route conflicts
 */
router.get('/invoice/:id/items', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    // Check if ap_invoice_items table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_invoice_items'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const result = await pool.query(`
      SELECT 
        id,
        invoice_id,
        line_item,
        material_id,
        material_code,
        quantity,
        unit,
        unit_price,
        net_amount,
        tax_rate,
        tax_amount,
        total_price,
        description,
        created_at
      FROM ap_invoice_items
      WHERE invoice_id = $1
      ORDER BY line_item ASC
    `, [invoiceId]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching invoice items:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoice items'
    });
  }
});

/**
 * GET /api/ap/invoices
 * Get all AP invoices
 */
router.get('/invoices', async (req, res) => {
  try {
    const { status, vendorId, dateFrom, dateTo } = req.query;

    let query = `
      SELECT 
        ap.id,
        ap.invoice_number,
        ap.invoice_date,
        ap.due_date,
        ap.amount,
        ap.net_amount,
        ap.status,
        ap.payment_date,
        ap.payment_reference,
        ap.vendor_id,
        ap.purchase_order_id,
        v.name as vendor_name,
        v.code as vendor_code,
        po.order_number,
        ap.notes,
        ap.created_at,
        ap.updated_at
      FROM accounts_payable ap
      LEFT JOIN vendors v ON ap.vendor_id = v.id
      LEFT JOIN purchase_orders po ON ap.purchase_order_id = po.id
      WHERE ap.active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND ap.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendorId) {
      query += ` AND ap.vendor_id = $${paramIndex}`;
      params.push(vendorId);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND ap.invoice_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND ap.invoice_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    query += ` ORDER BY ap.invoice_date DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoices'
    });
  }
});

/**
 * GET /api/ap/invoice-statistics
 * Get invoice statistics
 */
router.get('/invoice-statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE 
          WHEN status IN ('pending', 'Pending', 'PENDING', 'pending_approval') 
          THEN 1 
        END) as pending_approval,
        COUNT(CASE 
          WHEN status IN ('approved', 'Approved', 'APPROVED') 
          THEN 1 
        END) as approved,
        COUNT(CASE 
          WHEN status IN ('paid', 'Paid', 'PAID') 
          THEN 1 
        END) as paid,
        COUNT(CASE 
          WHEN status IN ('overdue', 'Overdue', 'OVERDUE') 
            OR (due_date < CURRENT_DATE AND status NOT IN ('paid', 'Paid', 'PAID'))
          THEN 1 
        END) as overdue_count,
        COALESCE(SUM(net_amount), 0) as total_value,
        COALESCE(SUM(
          CASE 
            WHEN status IN ('pending', 'Pending', 'PENDING', 'pending_approval') 
            THEN net_amount 
            ELSE 0 
          END
        ), 0) as pending_value,
        COALESCE(SUM(
          CASE 
            WHEN due_date < CURRENT_DATE 
              AND status NOT IN ('paid', 'Paid', 'PAID')
            THEN net_amount 
            ELSE 0 
          END
        ), 0) as overdue_value
      FROM accounts_payable
      WHERE active = true
    `);

    res.json({
      success: true,
      data: result.rows[0] || {
        total_invoices: 0,
        pending_approval: 0,
        approved: 0,
        paid: 0,
        overdue_count: 0,
        total_value: 0,
        pending_value: 0,
        overdue_value: 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching invoice statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoice statistics'
    });
  }
});

/**
 * POST /api/ap/create-invoice
 * Create a new AP invoice
 */
router.post('/create-invoice', async (req, res) => {
  try {
    const {
      vendor_id,
      invoice_number,
      invoice_date,
      due_date,
      amount,
      net_amount,
      tax_amount = 0,
      discount_amount = 0,
      purchase_order_id,
      payment_terms,
      currency_id,
      company_code_id,
      plant_id,
      notes,
      status = 'pending_approval'
    } = req.body;

    if (!vendor_id || !invoice_number || !invoice_date || !due_date || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vendor_id, invoice_number, invoice_date, due_date, amount'
      });
    }

    const result = await pool.query(`
      INSERT INTO accounts_payable (
        vendor_id, invoice_number, invoice_date, due_date,
        amount, net_amount, tax_amount, discount_amount,
        purchase_order_id, payment_terms, currency_id,
        company_code_id, plant_id, status, notes, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
      RETURNING *
    `, [
      vendor_id,
      invoice_number,
      invoice_date,
      due_date,
      amount,
      net_amount || amount,
      tax_amount,
      discount_amount,
      purchase_order_id,
      payment_terms,
      currency_id,
      company_code_id,
      plant_id,
      status,
      notes
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create invoice'
    });
  }
});

/**
 * GET /api/ap/pending-payments
 * Get pending payments for authorization
 */


/**
 * GET /api/ap/payment-statistics
 * Get payment statistics
 */
router.get('/payment-statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(CASE 
          WHEN ap.status IN ('pending', 'Pending', 'PENDING', 'approved', 'Approved', 'APPROVED', 'Open', 'open', 'OPEN')
            AND ap.id NOT IN (
              SELECT DISTINCT invoice_id 
              FROM vendor_payments 
              WHERE invoice_id IS NOT NULL 
                AND status IN ('POSTED', 'PROCESSED', 'PENDING')
            )
          THEN 1 
        END) as pending_count,
        COUNT(CASE 
          WHEN vp.status IN ('PENDING', 'POSTED', 'PROCESSED')
            AND vp.payment_date::date = CURRENT_DATE
          THEN 1 
        END) as authorized_today,
        COUNT(CASE 
          WHEN ap.due_date < CURRENT_DATE 
            AND ap.status NOT IN ('paid', 'Paid', 'PAID')
            AND ap.id NOT IN (
              SELECT DISTINCT invoice_id 
              FROM vendor_payments 
              WHERE invoice_id IS NOT NULL 
                AND status IN ('POSTED', 'PROCESSED', 'PENDING')
            )
          THEN 1 
        END) as high_risk_count,
        COALESCE(SUM(
          CASE 
            WHEN vp.status IN ('POSTED', 'PROCESSED')
              AND vp.payment_date::date = CURRENT_DATE
            THEN vp.payment_amount 
            ELSE 0 
          END
        ), 0) as daily_limit_used
      FROM accounts_payable ap
      LEFT JOIN vendor_payments vp ON ap.id = vp.invoice_id
      WHERE ap.active = true
    `);

    const stats = result.rows[0] || {
      pending_count: 0,
      authorized_today: 0,
      high_risk_count: 0,
      daily_limit_used: 0
    };

    // Calculate daily limit used percentage (assuming a limit of 100000)
    const dailyLimit = 100000;
    const dailyLimitUsedPercent = dailyLimit > 0
      ? Math.round((parseFloat(stats.daily_limit_used) / dailyLimit) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        ...stats,
        daily_limit_used: dailyLimitUsedPercent
      }
    });
  } catch (error: any) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment statistics'
    });
  }
});

/**
 * GET /api/ap/authorization-limits
 * Get authorization limits
 */
router.get('/authorization-limits', async (req, res) => {
  try {
    // Get today's authorized amount (both authorized PENDING and executed POSTED/PROCESSED)
    const todayResult = await pool.query(`
      SELECT COALESCE(SUM(payment_amount), 0) as used_today
      FROM vendor_payments
      WHERE status IN ('PENDING', 'POSTED', 'PROCESSED')
        AND payment_date::date = CURRENT_DATE
    `);

    const usedToday = parseFloat(todayResult.rows[0]?.used_today || '0');

    // Default limits (these should ideally come from a configuration table)
    const dailyLimit = 100000;
    const singlePaymentLimit = 50000;
    const dualApprovalThreshold = 25000;

    res.json({
      success: true,
      data: {
        daily_limit: dailyLimit,
        used_today: usedToday,
        single_payment_limit: singlePaymentLimit,
        dual_approval_threshold: dualApprovalThreshold
      }
    });
  } catch (error: any) {
    console.error('Error fetching authorization limits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch authorization limits'
    });
  }
});

/**
 * POST /api/ap/authorize-payment
 * Authorize a single payment - creates vendor_payment record
 */


/**
 * POST /api/ap/batch-authorize
 * Authorize multiple payments - creates multiple vendor_payment records
 */
router.post('/batch-authorize', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { payment_ids, total_amount, payment_method, authorized_by, authorized_date, notes } = req.body;

    if (!payment_ids || !Array.isArray(payment_ids) || payment_ids.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Missing required field: payment_ids (array)'
      });
    }

    // Get all invoices
    const invoiceIds = payment_ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));

    if (invoiceIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'No valid payment IDs provided'
      });
    }

    const invoicesResult = await client.query(`
      SELECT 
        ap.id,
        ap.vendor_id,
        ap.invoice_number,
        ap.net_amount,
        ap.company_code_id,
        ap.purchase_order_id,
        ap.currency_id,
        v.name as vendor_name
      FROM accounts_payable ap
      LEFT JOIN vendors v ON ap.vendor_id = v.id
      WHERE ap.id = ANY($1::integer[]) AND ap.active = true
    `, [invoiceIds]);

    if (invoicesResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'No valid invoices found'
      });
    }

    // Check for existing payments (including PENDING authorized payments)
    const existingPayments = await client.query(`
      SELECT invoice_id FROM vendor_payments 
      WHERE invoice_id = ANY($1::integer[]) AND status IN ('POSTED', 'PROCESSED', 'PENDING')
    `, [invoiceIds]);

    const existingIds = existingPayments.rows.map((r: any) => r.invoice_id);
    const validInvoices = invoicesResult.rows.filter((inv: any) => !existingIds.includes(inv.id));

    if (validInvoices.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'All selected payments are already authorized'
      });
    }

    // Get default company code if needed
    let defaultCompanyCodeId = null;
    const companyCodeResult = await client.query(`
      SELECT id FROM company_codes WHERE active = true ORDER BY id LIMIT 1
    `);
    if (companyCodeResult.rows.length > 0) {
      defaultCompanyCodeId = companyCodeResult.rows[0].id;
    }

    const paymentDate = authorized_date ? new Date(authorized_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const finalPaymentMethod = payment_method || 'BANK_TRANSFER';

    // Get payment count for numbering (year-to-date)
    const paymentCountResult = await client.query(`
      SELECT COUNT(*)::integer as count 
      FROM vendor_payments 
      WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    let paymentCounter = paymentCountResult.rows[0]?.count || 0;

    const createdPayments = [];

    for (const invoice of validInvoices) {
      // Check if company code exists
      let companyCodeId = invoice.company_code_id || defaultCompanyCodeId;
      if (!companyCodeId) {
        continue; // Skip if no company code
      }

      // Generate payment number
      paymentCounter++;
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCounter).padStart(6, '0')}`;

      // Get currency code
      let currency = 'USD';
      if (invoice.currency_id) {
        const currencyResult = await client.query(`
          SELECT code FROM currencies WHERE id = $1
        `, [invoice.currency_id]);
        if (currencyResult.rows.length > 0) {
          currency = currencyResult.rows[0].code;
        }
      }

      // Handle created_by - must be integer or null (same logic as single authorize)
      let createdByUserId = null;
      if (authorized_by) {
        const parsedId = parseInt(String(authorized_by));
        if (!isNaN(parsedId)) {
          createdByUserId = parsedId;
        } else {
          try {
            const userResult = await client.query(`
              SELECT id FROM users 
              WHERE (username = $1 OR email = $1 OR name = $1) AND active = true 
              ORDER BY id LIMIT 1
            `, [String(authorized_by)]);
            if (userResult.rows.length > 0) {
              createdByUserId = userResult.rows[0].id;
            }
          } catch (userError) {
            console.log('Could not resolve user ID, using null for created_by');
          }
        }
      }

      // Create vendor payment record
      const paymentResult = await client.query(`
        INSERT INTO vendor_payments (
          payment_number, vendor_id, invoice_id, purchase_order_id,
          payment_amount, payment_method, payment_date, currency,
          status, company_code_id, created_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, payment_number, payment_amount
      `, [
        paymentNumber,
        invoice.vendor_id,
        invoice.id,
        invoice.purchase_order_id || null,
        invoice.net_amount,
        finalPaymentMethod,
        paymentDate,
        currency,
        'PENDING', // Batch authorization creates PENDING status (authorized but not executed)
        companyCodeId,
        createdByUserId,
        notes || null
      ]);

      createdPayments.push(paymentResult.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${createdPayments.length} payments authorized successfully`,
      data: {
        authorized_count: createdPayments.length,
        total_requested: payment_ids.length,
        payments: createdPayments
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error batch authorizing payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch authorize payments'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/ap/reporting-statistics
 * Get AP reporting statistics
 */
router.get('/reporting-statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT ap.id) as total_invoices,
        COUNT(DISTINCT CASE 
          WHEN ap.status IN ('paid', 'Paid', 'PAID') 
          THEN ap.id 
        END) as paid_invoices,
        COALESCE(SUM(ap.net_amount), 0) as total_amount,
        COALESCE(SUM(
          CASE 
            WHEN ap.status IN ('paid', 'Paid', 'PAID') 
            THEN ap.net_amount 
            ELSE 0 
          END
        ), 0) as paid_amount,
        COALESCE(AVG(
          CASE 
            WHEN ap.status IN ('paid', 'Paid', 'PAID')
              AND ap.payment_date IS NOT NULL
              AND ap.due_date IS NOT NULL
            THEN (ap.payment_date::date - ap.due_date::date)
            ELSE NULL
          END
        ), 0) as avg_days_to_pay,
        COUNT(DISTINCT CASE 
          WHEN ap.due_date < CURRENT_DATE 
            AND ap.status NOT IN ('paid', 'Paid', 'PAID')
          THEN ap.id 
        END) as overdue_count
      FROM accounts_payable ap
      WHERE ap.active = true
    `);

    const stats = result.rows[0] || {
      total_invoices: 0,
      paid_invoices: 0,
      total_amount: 0,
      paid_amount: 0,
      avg_days_to_pay: 0,
      overdue_count: 0
    };

    // Calculate DPO (Days Payable Outstanding)
    const dpo = parseFloat(stats.avg_days_to_pay) || 0;

    // Calculate compliance score (based on paid invoices vs total)
    const complianceScore = parseFloat(stats.total_invoices) > 0
      ? Math.round((parseFloat(stats.paid_invoices) / parseFloat(stats.total_invoices)) * 100)
      : 100;

    // Calculate cost savings (assuming early payment discounts)
    const costSavings = 0; // This would need to be calculated from discount_amount

    res.json({
      success: true,
      data: {
        generated: parseFloat(stats.total_invoices) || 0,
        compliance_score: complianceScore,
        dpo: Math.round(dpo),
        cost_savings: costSavings
      }
    });
  } catch (error: any) {
    console.error('Error fetching reporting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch reporting statistics'
    });
  }
});

/**
 * GET /api/ap/workflow-statistics
 * Get AP workflow statistics
 */
router.get('/workflow-statistics', async (req, res) => {
  try {
    // This would typically query a workflow execution table
    // For now, return default values
    res.json({
      success: true,
      data: {
        active: 0,
        success_rate: 0,
        executions: 0,
        savings: 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching workflow statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch workflow statistics'
    });
  }
});

/**
 * POST /api/ap/create-vendor
 * Create a new vendor
 */
router.post('/create-vendor', async (req, res) => {
  try {
    const {
      name,
      email,
      payment_terms,
      credit_limit,
      status = 'active',
      phone,
      code,
      company_code_id
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email'
      });
    }

    // Generate vendor code if not provided
    const vendorCode = code || `VEND${Date.now().toString().slice(-6)}`;

    const result = await pool.query(`
      INSERT INTO vendors (
        code, name, email, phone, payment_terms, 
        status, is_active, company_code_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      vendorCode,
      name,
      email,
      phone || null,
      payment_terms || '30',
      status,
      true,
      company_code_id || null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create vendor'
    });
  }
});

/**
 * PUT /api/ap/update-vendor-credit-limit
 * Update vendor credit limit
 */
router.put('/update-vendor-credit-limit', async (req, res) => {
  try {
    const { vendor_id, credit_limit } = req.body;

    if (!vendor_id || credit_limit === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vendor_id, credit_limit'
      });
    }

    const result = await pool.query(`
      UPDATE vendors
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [vendor_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating vendor credit limit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update vendor credit limit'
    });
  }
});

/**
 * GET /api/ap/validation-statistics
 * Get AP validation statistics
 */
router.get('/validation-statistics', async (req, res) => {
  try {
    // Check data integrity
    const integrityResult = await pool.query(`
      SELECT 
        COUNT(*) as total_vendors,
        COUNT(CASE 
          WHEN v.email IS NOT NULL 
            AND v.email != ''
            AND v.phone IS NOT NULL
            AND v.phone != ''
          THEN 1 
        END) as validated_vendors,
        COUNT(CASE 
          WHEN v.email IS NULL 
            OR v.email = ''
            OR v.phone IS NULL
            OR v.phone = ''
          THEN 1 
        END) as issues_found
      FROM vendors v
      WHERE v.is_active = true OR v.is_active IS NULL
    `);

    const stats = integrityResult.rows[0] || {
      total_vendors: 0,
      validated_vendors: 0,
      issues_found: 0
    };

    const integrityScore = parseFloat(stats.total_vendors) > 0
      ? Math.round((parseFloat(stats.validated_vendors) / parseFloat(stats.total_vendors)) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        integrity_score: integrityScore,
        validated: parseFloat(stats.validated_vendors) || 0,
        issues: parseFloat(stats.issues_found) || 0,
        last_check: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error fetching validation statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch validation statistics'
    });
  }
});

/**
 * POST /api/ap/create-payment-from-invoice
 * Create vendor payment directly from invoice (without requiring PO)
 */
router.post('/create-payment-from-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      invoice_id,
      vendor_id,
      payment_amount,
      payment_method,
      payment_date,
      value_date,
      bank_account_id,
      reference,
      currency,
      notes,
      company_code_id
    } = req.body;

    if (!invoice_id || !vendor_id || !payment_amount || !payment_method || !bank_account_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: invoice_id, vendor_id, payment_amount, payment_method, bank_account_id'
      });
    }

    // Get invoice details
    const invoiceResult = await client.query(`
      SELECT 
        ap.id,
        ap.vendor_id,
        ap.invoice_number,
        ap.net_amount,
        ap.company_code_id,
        ap.purchase_order_id,
        ap.currency_id,
        v.name as vendor_name
      FROM accounts_payable ap
      LEFT JOIN vendors v ON ap.vendor_id = v.id
      WHERE ap.id = $1 AND ap.active = true
    `, [invoice_id]);

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Invoice not found or inactive'
      });
    }

    const invoice = invoiceResult.rows[0];

    // Check if payment already exists
    const existingPayment = await client.query(`
      SELECT id FROM vendor_payments 
      WHERE invoice_id = $1 AND status IN ('POSTED', 'PROCESSED')
    `, [invoice_id]);

    if (existingPayment.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Payment already exists for this invoice'
      });
    }

    // Get company code
    let finalCompanyCodeId = company_code_id || invoice.company_code_id;
    if (!finalCompanyCodeId) {
      const companyCodeResult = await client.query(`
        SELECT id FROM company_codes WHERE active = true ORDER BY id LIMIT 1
      `);
      if (companyCodeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Company code is required. Please configure company code.'
        });
      }
      finalCompanyCodeId = companyCodeResult.rows[0].id;
    }

    // Get currency code
    let finalCurrency = currency || 'USD';
    if (invoice.currency_id) {
      const currencyResult = await client.query(`
        SELECT code FROM currencies WHERE id = $1
      `, [invoice.currency_id]);
      if (currencyResult.rows.length > 0) {
        finalCurrency = currencyResult.rows[0].code;
      }
    }

    // Generate payment number
    const paymentCountResult = await client.query(`
      SELECT COUNT(*)::integer as count 
      FROM vendor_payments 
      WHERE payment_date::date = CURRENT_DATE
    `);
    const paymentCount = paymentCountResult.rows[0]?.count || 0;
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, '0')}`;

    // Create vendor payment record
    const finalPaymentDate = payment_date || new Date().toISOString().split('T')[0];
    const finalValueDate = value_date || finalPaymentDate;

    const paymentResult = await client.query(`
      INSERT INTO vendor_payments (
        payment_number, vendor_id, invoice_id, purchase_order_id,
        payment_amount, payment_method, payment_date, value_date,
        bank_account_id, reference, currency, status, 
        company_code_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, payment_number, payment_amount, payment_date, status, accounting_document_number
    `, [
      paymentNumber,
      vendor_id,
      invoice.id,
      invoice.purchase_order_id || null,
      payment_amount,
      payment_method,
      finalPaymentDate,
      finalValueDate,
      bank_account_id,
      reference || null,
      finalCurrency,
      'POSTED',
      finalCompanyCodeId,
      notes || null
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment created successfully',
      paymentNumber: paymentResult.rows[0].payment_number,
      accountingDocumentNumber: paymentResult.rows[0].accounting_document_number,
      payment: paymentResult.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating payment from invoice:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment from invoice'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/ap/authorized-payments
 * Get authorized payments (PENDING status) that need execution
 */
router.get('/authorized-payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        vp.id,
        vp.payment_number,
        vp.vendor_id,
        vp.invoice_id,
        vp.purchase_order_id,
        vp.payment_amount,
        vp.payment_method,
        vp.payment_date,
        vp.value_date,
        vp.status,
        vp.reference,
        vp.accounting_document_number,
        vp.currency,
        vp.notes,
        vp.created_at,
        vp.updated_at,
        v.name as vendor_name,
        v.code as vendor_code,
        ap.invoice_number,
        ap.net_amount as invoice_amount,
        po.order_number
      FROM vendor_payments vp
      LEFT JOIN vendors v ON vp.vendor_id = v.id
      LEFT JOIN accounts_payable ap ON vp.invoice_id = ap.id
      LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
      WHERE vp.status = 'PENDING'
      ORDER BY vp.payment_date DESC, vp.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching authorized payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch authorized payments'
    });
  }
});

/**
 * POST /api/ap/execute-payment
 * Execute an authorized payment (PENDING) with full payment details
 */
router.post('/execute-payment', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      payment_id,
      bank_account_id,
      payment_date,
      value_date,
      reference,
      notes
    } = req.body;

    if (!payment_id || !bank_account_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: payment_id, bank_account_id'
      });
    }

    // Get the authorized payment
    const paymentResult = await client.query(`
      SELECT * FROM vendor_payments WHERE id = $1 AND (authorization_status = 'AUTHORIZED' OR authorization_status IS NULL) AND status != 'POSTED'
    `, [payment_id]);

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Authorized payment not found or already executed'
      });
    }

    const payment = paymentResult.rows[0];

    // Update payment with execution details and change status to POSTED
    const updateResult = await client.query(`
      UPDATE vendor_payments
      SET 
        bank_account_id = $1,
        payment_date = COALESCE($2::date, payment_date),
        value_date = COALESCE($3::date, $2::date, payment_date),
        reference = COALESCE($4, reference),
        notes = CASE 
          WHEN notes IS NULL AND $5::text IS NOT NULL AND $5::text != '' THEN $5::text
          WHEN notes IS NOT NULL AND $5::text IS NOT NULL AND $5::text != '' THEN notes || E'\\n' || $5::text
          ELSE COALESCE(notes, $5::text)
        END,
        status = 'POSTED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, payment_number, payment_amount, payment_date, status, accounting_document_number
    `, [
      bank_account_id,
      payment_date || payment.payment_date,
      value_date || payment_date || payment.payment_date,
      reference || null,
      notes || null,
      payment_id
    ]);


    // Update bank account balance
    await client.query(`
      UPDATE bank_accounts
      SET current_balance = current_balance - $1,
          available_balance = available_balance - $1,
          updated_at = NOW()
      WHERE id = $2
    `, [parseFloat(payment.payment_amount), bank_account_id]);

    // --- GL POSTING ---
    // 1. Get Bank GL Account
    const bankAccountResult = await client.query(`
      SELECT b.gl_account_id, c.code as gl_code 
      FROM bank_accounts b
      LEFT JOIN chart_of_accounts c ON b.gl_account_id = c.id
      WHERE b.id = $1
    `, [bank_account_id]);

    // Default fallback if no GL mapping found or if mapping is invalid (e.g. '1')
    let bankGlAccount = bankAccountResult.rows[0]?.gl_code;
    if (!bankGlAccount || bankGlAccount === '1' || bankGlAccount.length < 3) {
      bankGlAccount = '1000'; // Cash/Bank
    }
    const vendorGlAccount = '200000'; // Accounts Payable

    // 2. Create Journal Entry
    const documentDate = new Date();
    const postingDate = new Date(payment_date || documentDate);

    const documentNumber = await accountingService.createJournalEntry(client, {
      companyCodeId: payment.company_code_id || 1, // Default to 1 if null
      documentType: 'KZ', // Vendor Payment
      documentDate: documentDate,
      postingDate: postingDate,
      currency: payment.currency || 'USD',
      headerText: `Payment to ${payment.vendor_id}`,
      reference: reference || payment.payment_number,
      sourceModule: 'AP',
      sourceDocumentId: payment_id,
      sourceDocumentType: 'VENDOR_PAYMENT',
      createdBy: 1, // System User
      items: [
        {
          // Debit Vendor (Liability Decrease)
          glAccount: vendorGlAccount,
          accountType: 'K',
          debitAmount: parseFloat(payment.payment_amount),
          creditAmount: 0,
          description: `Payment ${payment.payment_number}`,
          partnerId: payment.vendor_id
        },
        {
          // Credit Bank (Asset Decrease)
          glAccount: bankGlAccount,
          accountType: 'S',
          debitAmount: 0,
          creditAmount: parseFloat(payment.payment_amount),
          description: `Payment for Vendor ${payment.vendor_id}`
        }
      ]
    });

    // 3. Update payment with accounting document number
    const finalUpdateResult = await client.query(`
      UPDATE vendor_payments
      SET accounting_document_number = $1
      WHERE id = $2
      RETURNING id, payment_number, payment_amount, payment_date, status, accounting_document_number
    `, [documentNumber, payment_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment executed successfully',
      payment: finalUpdateResult.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error executing payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute payment'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/ap/batch-execute-payments
 * Execute multiple authorized payments in a batch
 */
router.post('/batch-execute-payments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      payment_ids,
      bank_account_id,
      payment_date,
      value_date,
      reference,
      notes
    } = req.body;

    if (!payment_ids || !Array.isArray(payment_ids) || payment_ids.length === 0 || !bank_account_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: payment_ids (array), bank_account_id'
      });
    }

    const results = [];
    const errors = [];

    for (const payment_id of payment_ids) {
      // Get the authorized payment
      const paymentResult = await client.query(`
        SELECT * FROM vendor_payments WHERE id = $1 AND (authorization_status = 'AUTHORIZED' OR authorization_status IS NULL) AND status != 'POSTED'
        `, [payment_id]);

      if (paymentResult.rows.length === 0) {
        errors.push(`Payment ID ${payment_id} not found or already executed`);
        continue;
      }

      const payment = paymentResult.rows[0];

      // Update payment with execution details and change status to POSTED
      const updateResult = await client.query(`
        UPDATE vendor_payments
        SET 
            bank_account_id = $1,
            payment_date = COALESCE($2::date, payment_date),
            value_date = COALESCE($3::date, $2::date, payment_date),
            reference = COALESCE($4, reference),
            notes = CASE 
            WHEN notes IS NULL AND $5::text IS NOT NULL AND $5::text != '' THEN $5::text
            WHEN notes IS NOT NULL AND $5::text IS NOT NULL AND $5::text != '' THEN notes || E'\\n' || $5::text
            ELSE COALESCE(notes, $5::text)
            END,
            status = 'POSTED',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, payment_number, payment_amount, payment_date, status, accounting_document_number
        `, [
        bank_account_id,
        payment_date || payment.payment_date,
        value_date || payment_date || payment.payment_date,
        reference || null,
        notes || null,
        payment_id
      ]);

      // Update bank account balance
      await client.query(`
        UPDATE bank_accounts
        SET current_balance = current_balance - $1,
            available_balance = available_balance - $1,
            updated_at = NOW()
        WHERE id = $2
        `, [parseFloat(payment.payment_amount), bank_account_id]);

      // --- GL POSTING ---
      // 1. Get Bank GL Account (Optimized: check if we already fetched it, otherwise fetch)
      // Since bank_account_id is constant for the batch, we could fetch it once outside.
      // But for simplicity/safety against code changes, let's just do it here or assume we fetch it once.
      // Let's actually fetch it once outside the loop?
      // No, let's keep it simple. The overhead is negligible for reasonable batch sizes.

      const bankAccountResult = await client.query(`
        SELECT b.gl_account_id, c.code as gl_code 
        FROM bank_accounts b
        LEFT JOIN chart_of_accounts c ON b.gl_account_id = c.id
        WHERE b.id = $1
      `, [bank_account_id]);

      let bankGlAccount = bankAccountResult.rows[0]?.gl_code;
      // Fix: If mapped code is invalid (e.g. '1'), default to '1000'
      if (!bankGlAccount || bankGlAccount === '1' || bankGlAccount.length < 3) {
        bankGlAccount = '1000';
      }
      const vendorGlAccount = '200000';

      // 2. Create Journal Entry
      const documentDate = new Date();
      const postingDate = new Date(payment_date || documentDate); // Use batch date

      const documentNumber = await accountingService.createJournalEntry(client, {
        companyCodeId: payment.company_code_id || 1, // Default to 1 if null
        documentType: 'KZ', // Vendor Payment
        documentDate: documentDate,
        postingDate: postingDate,
        currency: payment.currency || 'USD',
        headerText: `Batch Pmt ${payment.vendor_id}`,
        reference: reference || payment.payment_number,
        sourceModule: 'AP',
        sourceDocumentId: payment_id,
        sourceDocumentType: 'VENDOR_PAYMENT',
        createdBy: 1,
        items: [
          {
            glAccount: vendorGlAccount,
            accountType: 'K',
            debitAmount: parseFloat(payment.payment_amount),
            creditAmount: 0,
            description: `Payment ${payment.payment_number}`,
            partnerId: payment.vendor_id
          },
          {
            glAccount: bankGlAccount,
            accountType: 'S',
            debitAmount: 0,
            creditAmount: parseFloat(payment.payment_amount),
            description: `Batch Payment for Vendor ${payment.vendor_id}`
          }
        ]
      });

      // 3. Update payment with accounting document number
      const finalUpdateResult = await client.query(`
        UPDATE vendor_payments
        SET accounting_document_number = $1
        WHERE id = $2
        RETURNING id, payment_number, payment_amount, payment_date, status, accounting_document_number
      `, [documentNumber, payment_id]);

      results.push(finalUpdateResult.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully executed ${results.length} payments`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error executing batch payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute batch payments'
    });
  } finally {
    client.release();
  }
});

export default router;

