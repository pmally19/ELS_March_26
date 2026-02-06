import express from 'express';
import { vendorPaymentService } from '../../services/vendorPaymentService';
import { pool } from '../../db';

const router = express.Router();

/**
 * POST /api/purchase/vendor-payments
 * Create vendor payment for a purchase order
 */
router.post('/', async (req, res) => {
  try {
    const {
      purchaseOrderId,
      paymentAmount,
      paymentMethod,
      paymentDate,
      valueDate,
      bankAccountId,
      reference,
      currency,
      notes,
      createdBy
    } = req.body;

    // Validate required fields
    if (!purchaseOrderId || !paymentAmount || !paymentMethod || !bankAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: purchaseOrderId, paymentAmount, paymentMethod, bankAccountId'
      });
    }

    // Validate payment method
    const validPaymentMethods = ['CHECK', 'BANK_TRANSFER', 'ONLINE_TRANSFER', 'WIRE_TRANSFER'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
      });
    }

    // Process payment
    const result = await vendorPaymentService.processVendorPayment({
      purchaseOrderId: parseInt(purchaseOrderId),
      paymentAmount: parseFloat(paymentAmount),
      paymentMethod: paymentMethod as 'CHECK' | 'BANK_TRANSFER' | 'ONLINE_TRANSFER' | 'WIRE_TRANSFER',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      valueDate: valueDate ? new Date(valueDate) : undefined,
      bankAccountId: parseInt(bankAccountId),
      reference,
      currency,
      notes,
      createdBy: createdBy ? parseInt(createdBy) : undefined
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating vendor payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create vendor payment'
    });
  }
});

/**
 * GET /api/purchase/vendor-payments
 * Get all vendor payments with filters
 */
router.get('/', async (req, res) => {
  try {
    const { vendorId, purchaseOrderId, status, dateFrom, dateTo } = req.query;

    let query = `
      SELECT 
        vp.id, vp.payment_number, vp.payment_amount, vp.payment_method,
        vp.payment_date, vp.value_date, vp.status, vp.reference,
        vp.accounting_document_number, vp.currency, vp.notes,
        vp.created_at, vp.updated_at,
        v.name as vendor_name, v.code as vendor_code,
        po.order_number, po.total_amount as po_amount,
        ba.account_name as bank_account_name, ba.account_number as bank_account_number,
        ap.invoice_number, ap.amount as invoice_amount
      FROM vendor_payments vp
      LEFT JOIN vendors v ON vp.vendor_id = v.id
      LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
      LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
      LEFT JOIN accounts_payable ap ON vp.invoice_id = ap.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (vendorId) {
      query += ` AND vp.vendor_id = $${paramIndex}`;
      params.push(vendorId);
      paramIndex++;
    }

    if (purchaseOrderId) {
      query += ` AND vp.purchase_order_id = $${paramIndex}`;
      params.push(purchaseOrderId);
      paramIndex++;
    }

    if (status) {
      query += ` AND vp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND vp.payment_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND vp.payment_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    query += ` ORDER BY vp.payment_date DESC, vp.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching vendor payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vendor payments'
    });
  }
});

/**
 * GET /api/purchase/vendor-payments/:id
 * Get payment details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    if (isNaN(paymentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID'
      });
    }

    const payment = await vendorPaymentService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error: any) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment details'
    });
  }
});

/**
 * GET /api/purchase/vendor-payments/purchase-order/:poId
 * Get payments for a specific purchase order
 */
router.get('/purchase-order/:poId', async (req, res) => {
  try {
    const poId = parseInt(req.params.poId);
    if (isNaN(poId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purchase order ID'
      });
    }

    const payments = await vendorPaymentService.getPaymentsByPO(poId);
    res.json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error: any) {
    console.error('Error fetching payments for PO:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payments for purchase order'
    });
  }
});

/**
 * POST /api/purchase/vendor-payments/validate
 * Validate payment before processing
 */
router.post('/validate', async (req, res) => {
  try {
    const {
      purchaseOrderId,
      paymentAmount,
      paymentMethod,
      bankAccountId,
      currency
    } = req.body;

    if (!purchaseOrderId || !paymentAmount || !bankAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: purchaseOrderId, paymentAmount, bankAccountId'
      });
    }

    const validation = await vendorPaymentService.validatePayment({
      purchaseOrderId: parseInt(purchaseOrderId),
      paymentAmount: parseFloat(paymentAmount),
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      paymentDate: new Date(),
      bankAccountId: parseInt(bankAccountId),
      currency
    });

    res.json({
      success: validation.isValid,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        glAccounts: validation.glAccounts || undefined, // Include GL account info
      },
      message: validation.isValid 
        ? 'Payment validation passed' 
        : `Payment validation failed: ${validation.errors.join(', ')}`
    });
  } catch (error: any) {
    console.error('Error validating payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate payment'
    });
  }
});

/**
 * GET /api/purchase/vendor-payments/verify-gl-accounts
 * Verify GL accounts are set up correctly
 */
router.get('/verify-gl-accounts', async (req, res) => {
  try {
    // Check AP GL account using the same logic as vendorPaymentService
    const apAccountResult = await pool.query(`
      SELECT id, account_number, account_name, account_type, account_group, is_active
      FROM gl_accounts
      WHERE account_type = 'LIABILITIES'
        AND (
          account_group ILIKE '%VENDOR%' 
          OR account_group ILIKE '%PAYABLE%' 
          OR account_group ILIKE '%ACCOUNTS_PAYABLE%'
          OR account_number LIKE '2100%'
          OR account_number LIKE '2110%'
        )
        AND is_active = true
      ORDER BY 
        CASE 
          WHEN account_group ILIKE '%ACCOUNTS_PAYABLE%' THEN 1
          WHEN account_group ILIKE '%PAYABLE%' THEN 2
          WHEN account_number LIKE '2100%' THEN 3
          WHEN account_number LIKE '2110%' THEN 4
          WHEN account_group ILIKE '%VENDOR%' THEN 5
          ELSE 6
        END,
        account_number
      LIMIT 1
    `);

    // Check Bank GL accounts
    const bankAccountResult = await pool.query(`
      SELECT 
        ba.id as bank_account_id, ba.account_name, ba.account_number,
        gl.id as gl_account_id, gl.account_number as gl_account_number,
        gl.account_name as gl_account_name, gl.account_type, gl.is_active
      FROM bank_accounts ba
      INNER JOIN gl_accounts gl ON ba.gl_account_id = gl.id
      WHERE ba.is_active = true
        AND gl.is_active = true
      LIMIT 5
    `);

    res.json({
      success: true,
      apAccount: apAccountResult.rows[0] || null,
      bankAccounts: bankAccountResult.rows,
      message: apAccountResult.rows.length > 0 
        ? 'GL accounts are set up correctly'
        : 'AP GL account not found. Please create an AP GL account with account_type = "LIABILITIES" and account_group containing "PAYABLE" or "VENDOR".'
    });
  } catch (error: any) {
    console.error('Error verifying GL accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify GL accounts'
    });
  }
});

/**
 * POST /api/purchase/vendor-payments/create-sample-bank
 * Create sample bank account if none exists
 */
router.post('/create-sample-bank', async (req, res) => {
  try {
    const { companyCodeId, currency, initialBalance } = req.body;

    // Check if bank account exists
    const existingBank = await pool.query(`
      SELECT id FROM bank_accounts WHERE is_active = true LIMIT 1
    `);

    if (existingBank.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Bank account already exists',
        bankAccountId: existingBank.rows[0].id
      });
    }

    // Get or create Bank GL account
    let bankGLAccount = await pool.query(`
      SELECT id, account_number FROM gl_accounts
      WHERE account_type = 'ASSETS'
        AND (account_group LIKE '%BANK%' OR account_group LIKE '%CASH%' OR account_number LIKE '1000%')
        AND is_active = true
      LIMIT 1
    `);

    let glAccountId: number;
    if (bankGLAccount.rows.length === 0) {
      // Create Bank GL account
      const newGLAccount = await pool.query(`
        INSERT INTO gl_accounts (
          account_number, account_name, account_type, account_group,
          balance_sheet_account, reconciliation_account, is_active,
          created_at, updated_at
        ) VALUES (
          '1000-0000', 'Bank Account', 'ASSETS', 'BANK',
          true, true, true, NOW(), NOW()
        )
        RETURNING id, account_number
      `);
      glAccountId = newGLAccount.rows[0].id;
    } else {
      glAccountId = bankGLAccount.rows[0].id;
    }

    // Create sample bank account
    const companyCode = companyCodeId || 1;
    const bankCurrency = currency || 'USD';
    const balance = initialBalance || 0;

    const bankAccountResult = await pool.query(`
      INSERT INTO bank_accounts (
        account_number, account_name, bank_name, currency,
        current_balance, available_balance, account_type,
        is_active, company_code_id, gl_account_id,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING id, account_number, account_name
    `, [
      `BANK-${Date.now()}`,
      'Main Operating Account',
      'Sample Bank',
      bankCurrency,
      balance,
      balance,
      'checking',
      true,
      companyCode,
      glAccountId
    ]);

    res.status(201).json({
      success: true,
      message: 'Sample bank account created successfully',
      bankAccount: bankAccountResult.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating sample bank account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create sample bank account'
    });
  }
});

export default router;

