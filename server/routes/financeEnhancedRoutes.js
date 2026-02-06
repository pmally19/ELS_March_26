import express from 'express';
import { getPool } from '../database.js';
const router = express.Router();

// Use centralized database pool
const pool = getPool();

// =================== GENERAL LEDGER ROUTES ===================

// Get GL statistics and summary
router.get('/gl/statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN balance_sheet_account = true THEN 1 END) as balance_sheet_accounts,
        COUNT(CASE WHEN pl_account = true THEN 1 END) as pl_accounts,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts
      FROM gl_accounts
    `);

    const docResult = await pool.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'Posted' THEN 1 END) as posted_documents,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_documents,
        SUM(CASE WHEN status = 'Posted' THEN total_amount ELSE 0 END) as posted_amount
      FROM gl_document_headers
    `);

    res.json({
      ...result.rows[0],
      ...docResult.rows[0]
    });
  } catch (error) {
    console.error('GL statistics error:', error);
    res.status(500).json({ message: 'Error fetching GL statistics' });
  }
});

// Get GL accounts (optionally filtered by company code)
router.get('/gl/accounts', async (req, res) => {
  try {
    const { company_code_id } = req.query;

    let query = `
      SELECT ga.*, coa.code as chart_of_accounts_code, coa.name as chart_of_accounts_name
      FROM gl_accounts ga
      LEFT JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      WHERE ga.is_active = true
    `;

    const params = [];

    // If company_code_id is provided, filter by Chart of Accounts assigned to that company code
    if (company_code_id) {
      query += ` AND ga.chart_of_accounts_id IN (
        SELECT chart_of_accounts_id 
        FROM company_codes 
        WHERE id = $1 AND active = true
      )`;
      params.push(company_code_id);
    }

    query += ` ORDER BY ga.account_number`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('GL accounts error:', error);
    res.status(500).json({ message: 'Error fetching GL accounts' });
  }
});

// Get GL document headers
router.get('/gl/documents', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        gdh.*,
        (SELECT COUNT(*) FROM gl_entries WHERE document_number = gdh.document_number AND (source_module = 'GL' OR source_module = 'FINANCE' OR source_module IS NULL)) as line_count
      FROM gl_document_headers gdh
      WHERE gdh.active = true
      ORDER BY gdh.posting_date DESC, gdh.document_number DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('GL documents error:', error);
    res.status(500).json({ message: 'Error fetching GL documents' });
  }
});

// Get GL document by ID with line items
router.get('/gl/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get document header
    const headerResult = await pool.query(`
      SELECT 
        gdh.*,
        cc.code as company_code,
        cc.name as company_name
      FROM gl_document_headers gdh
      LEFT JOIN company_codes cc ON COALESCE(gdh.company_code_id, (SELECT id FROM company_codes WHERE active = true LIMIT 1)) = cc.id
      WHERE gdh.id = $1 AND gdh.active = true
    `, [id]);

    if (headerResult.rows.length === 0) {
      return res.status(404).json({ message: 'GL document not found' });
    }

    const document = headerResult.rows[0];

    // Get document line items
    const itemsResult = await pool.query(`
      SELECT 
        ge.id,
        ge.document_number,
        ge.gl_account_id,
        CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount ELSE 0 END as debit_amount,
        CASE WHEN ge.debit_credit_indicator = 'C' THEN ge.amount ELSE 0 END as credit_amount,
        ge.description,
        ge.cost_center_id,
        ge.profit_center_id,
        ROW_NUMBER() OVER (ORDER BY ge.id) as line_number,
        ga.account_number as gl_account,
        ga.account_name as account_name,
        ga.account_type,
        ga.account_group
      FROM gl_entries ge
      LEFT JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.document_number = $1 AND ge.source_module = 'GL'
      ORDER BY ge.id ASC
    `, [document.document_number]);

    res.json({
      ...document,
      items: itemsResult.rows,
      line_count: itemsResult.rows.length
    });
  } catch (error) {
    console.error('GL document details error:', error);
    res.status(500).json({ message: 'Error fetching GL document details' });
  }
});

// Post GL document (change status from Draft to Posted)
router.post('/gl/documents/:id/post', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Update document status
    const result = await client.query(`
      UPDATE gl_document_headers
      SET status = 'Posted',
          posted_at = NOW()
      WHERE id = $1 AND status = 'Draft'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Document not found or already posted' });
    }

    // Update all gl_entries for this document to 'Posted'
    const documentNumber = result.rows[0].document_number;
    await client.query(`
      UPDATE gl_entries
      SET posting_status = 'Posted'
      WHERE document_number = $1
    `, [documentNumber]);

    await client.query('COMMIT');
    res.json({
      message: 'Document posted successfully',
      document: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('GL document posting error:', error);
    res.status(500).json({ message: 'Error posting GL document' });
  } finally {
    client.release();
  }
});

// Create GL document with items
router.post('/gl/documents', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let { document_number, document_type, posting_date, document_date, company_code_id, currency_id, total_amount, reference, items } = req.body;

    // Auto-generate document number if empty or not provided
    if (!document_number || document_number.trim() === '') {
      try {
        // Generate document number based on document type
        const docTypePrefix = document_type ? document_type.substring(0, 2).toUpperCase() : 'GL';
        const currentYear = new Date().getFullYear();

        // Check for duplicate document numbers with retry logic
        let retryCount = 0;
        const maxRetries = 10;

        while (retryCount < maxRetries) {
          const docCountResult = await client.query(
            'SELECT COUNT(*)::integer as count FROM gl_document_headers WHERE document_type = $1',
            [document_type || 'Adjustment']
          );
          const docCount = parseInt(docCountResult.rows[0]?.count || 0) + retryCount + 1;
          document_number = `${docTypePrefix}-${currentYear}-${docCount.toString().padStart(6, '0')}`;

          // Check if this document number already exists
          const existingDocCheck = await client.query(
            'SELECT id FROM gl_document_headers WHERE document_number = $1 LIMIT 1',
            [document_number]
          );

          if (existingDocCheck.rows.length === 0) {
            // Document number is unique, break out of loop
            break;
          }

          retryCount++;
          if (retryCount >= maxRetries) {
            // Fallback: add timestamp to make it unique
            document_number = `${docTypePrefix}-${currentYear}-${Date.now().toString().slice(-6)}`;
            break;
          }
        }
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to generate document number: ${e.message}`);
      }
    }

    // Validate document number is not empty
    if (!document_number || document_number.trim() === '') {
      await client.query('ROLLBACK');
      throw new Error('Document number is required');
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('At least one line item is required');
    }

    // Validate GL balance (debits must equal credits)
    const totalDebits = items.reduce((sum, item) => sum + parseFloat(item.debit_amount || 0), 0);
    const totalCredits = items.reduce((sum, item) => sum + parseFloat(item.credit_amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      await client.query('ROLLBACK');
      throw new Error(`GL entries are not balanced. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}`);
    }

    // Validate company code exists and is active
    const companyCodeCheck = await client.query(
      'SELECT id, code, name, active FROM company_codes WHERE id = $1',
      [company_code_id]
    );
    if (companyCodeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Selected company code does not exist');
    }
    if (companyCodeCheck.rows[0].active === false) {
      await client.query('ROLLBACK');
      throw new Error('Selected company code is not active');
    }

    // Validate currency exists and is active
    const currencyCheck = await client.query(
      'SELECT id, code, name, is_active FROM currencies WHERE id = $1',
      [currency_id]
    );
    if (currencyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Selected currency does not exist');
    }
    if (currencyCheck.rows[0].is_active === false) {
      await client.query('ROLLBACK');
      throw new Error('Selected currency is not active');
    }

    // Validate posting date is not in the future
    const postingDateObj = new Date(posting_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (postingDateObj > today) {
      await client.query('ROLLBACK');
      throw new Error('Posting date cannot be in the future');
    }

    // Validate document date is not in the future
    if (document_date) {
      const documentDateObj = new Date(document_date);
      if (documentDateObj > today) {
        await client.query('ROLLBACK');
        throw new Error('Document date cannot be in the future');
      }
    }

    // Get Chart of Accounts assigned to the company code
    const chartAssignmentCheck = await client.query(
      `SELECT chart_of_accounts_id 
       FROM company_codes 
       WHERE id = $1 AND active = true
       LIMIT 1`,
      [company_code_id]
    );

    const assignedChartId = chartAssignmentCheck.rows[0]?.chart_of_accounts_id;

    // Validate all GL accounts exist, are active, and belong to the correct Chart of Accounts
    const accountIds = items.map(item => item.gl_account_id).filter(id => id);
    if (accountIds.length > 0) {
      let accountCheckQuery = `
        SELECT id, account_number, account_name, is_active, account_type, chart_of_accounts_id
         FROM gl_accounts 
         WHERE id = ANY($1::int[])
      `;

      const accountCheck = await client.query(accountCheckQuery, [accountIds]);

      if (accountCheck.rows.length !== accountIds.length) {
        await client.query('ROLLBACK');
        throw new Error('One or more selected GL accounts do not exist');
      }

      const inactiveAccounts = accountCheck.rows.filter(acc => !acc.is_active);
      if (inactiveAccounts.length > 0) {
        await client.query('ROLLBACK');
        throw new Error(`The following GL accounts are inactive: ${inactiveAccounts.map(a => a.account_number).join(', ')}`);
      }

      // Validate GL accounts belong to the Chart of Accounts assigned to the company code
      if (assignedChartId) {
        const invalidAccounts = accountCheck.rows.filter(acc => acc.chart_of_accounts_id !== assignedChartId);
        if (invalidAccounts.length > 0) {
          await client.query('ROLLBACK');
          const chartInfo = await client.query(
            'SELECT code, name FROM chart_of_accounts WHERE id = $1',
            [assignedChartId]
          );
          const chartName = chartInfo.rows[0]?.name || chartInfo.rows[0]?.code || 'assigned Chart of Accounts';
          throw new Error(`The following GL accounts do not belong to the ${chartName} assigned to this company: ${invalidAccounts.map(a => a.account_number).join(', ')}`);
        }
      }
    }

    // Validate each line item has either debit or credit (not both, not neither)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const debit = parseFloat(item.debit_amount || 0);
      const credit = parseFloat(item.credit_amount || 0);

      if (debit > 0 && credit > 0) {
        await client.query('ROLLBACK');
        throw new Error(`Line ${i + 1}: Cannot have both debit and credit amounts`);
      }
      if (debit === 0 && credit === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Line ${i + 1}: Must have either a debit or credit amount`);
      }
      if (debit < 0 || credit < 0) {
        await client.query('ROLLBACK');
        throw new Error(`Line ${i + 1}: Amounts cannot be negative`);
      }
    }

    // Insert document header with status 'Draft'
    const status = 'Draft';
    const headerResult = await client.query(`
      INSERT INTO gl_document_headers 
      (document_number, document_type, posting_date, document_date, company_code_id, currency_id, total_amount, reference, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, document_number, status
    `, [document_number, document_type, posting_date, document_date, company_code_id, currency_id, total_amount, reference || null, status, 1]);

    const documentId = headerResult.rows[0].id;

    // Insert document items into gl_entries (existing table)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const debitAmount = parseFloat(item.debit_amount || 0);
      const creditAmount = parseFloat(item.credit_amount || 0);

      // Determine amount and indicator
      let amount = 0;
      let indicator = 'D';
      if (debitAmount > 0) {
        amount = debitAmount;
        indicator = 'D';
      } else if (creditAmount > 0) {
        amount = creditAmount;
        indicator = 'C';
      }

      // Calculate fiscal year and period from posting date
      const postingDateObj = new Date(posting_date);
      const fiscalYear = postingDateObj.getFullYear();
      const fiscalPeriod = postingDateObj.getMonth() + 1; // 1-12

      await client.query(`
        INSERT INTO gl_entries 
        (document_number, gl_account_id, amount, debit_credit_indicator, posting_date, description, cost_center_id, profit_center_id, posting_status, source_module, source_document_type, fiscal_year, fiscal_period)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        document_number,
        item.gl_account_id,
        amount,
        indicator,
        posting_date,
        item.description || null,
        item.cost_center_id || null,
        item.profit_center_id || null,
        'Draft', // Will be 'Posted' when document is posted
        'GL',
        document_type,
        fiscalYear,
        fiscalPeriod
      ]);
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'GL document created successfully',
      document_id: documentId,
      document_number: document_number,
      status: status,
      total_debits: totalDebits.toFixed(2),
      total_credits: totalCredits.toFixed(2)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('GL document creation error:', error);
    res.status(500).json({
      message: 'Error creating GL document',
      error: error.message || 'Unknown error'
    });
  } finally {
    client.release();
  }
});

// =================== ACCOUNTS RECEIVABLE ROUTES ===================

// Get AR statistics and aging summary
router.get('/ar/statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_open_items,
        SUM(outstanding_amount) as total_outstanding,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_items,
        COUNT(CASE WHEN status = 'Partial' THEN 1 END) as partial_items,
        COUNT(CASE WHEN status = 'Cleared' THEN 1 END) as cleared_items,
        SUM(CASE WHEN aging_bucket = 'Current' THEN outstanding_amount ELSE 0 END) as current_amount,
        SUM(CASE WHEN aging_bucket = '30Days' THEN outstanding_amount ELSE 0 END) as thirty_days_amount,
        SUM(CASE WHEN aging_bucket = '60Days' THEN outstanding_amount ELSE 0 END) as sixty_days_amount,
        SUM(CASE WHEN aging_bucket = 'Over90' THEN outstanding_amount ELSE 0 END) as over_ninety_amount
      FROM ar_open_items
      WHERE active = true
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('AR statistics error:', error);
    res.status(500).json({ message: 'Error fetching AR statistics' });
  }
});

// Get AR open items with customer details
router.get('/ar/open-items', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        aoi.*,
        c.name as customer_name,
        c.customer_code,
        gl.account_name as gl_account_name
      FROM ar_open_items aoi
      LEFT JOIN erp_customers c ON aoi.customer_id = c.id
      LEFT JOIN gl_accounts gl ON aoi.gl_account_id = gl.id
      WHERE aoi.active = true
      ORDER BY aoi.due_date ASC, aoi.outstanding_amount DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('AR open items error:', error);
    res.status(500).json({ message: 'Error fetching AR open items' });
  }
});

// Get AR aging report
router.get('/ar/aging-report', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.name as customer_name,
        c.customer_code,
        SUM(CASE WHEN aoi.aging_bucket = 'Current' THEN aoi.outstanding_amount ELSE 0 END) as current_balance,
        SUM(CASE WHEN aoi.aging_bucket = '30Days' THEN aoi.outstanding_amount ELSE 0 END) as thirty_days,
        SUM(CASE WHEN aoi.aging_bucket = '60Days' THEN aoi.outstanding_amount ELSE 0 END) as sixty_days,
        SUM(CASE WHEN aoi.aging_bucket = 'Over90' THEN aoi.outstanding_amount ELSE 0 END) as over_ninety,
        SUM(aoi.outstanding_amount) as total_outstanding
      FROM ar_open_items aoi
      LEFT JOIN erp_customers c ON aoi.customer_id = c.id
      WHERE aoi.active = true AND aoi.status IN ('Open', 'Partial')
      GROUP BY c.id, c.name, c.customer_code
      ORDER BY total_outstanding DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('AR aging report error:', error);
    res.status(500).json({ message: 'Error generating AR aging report' });
  }
});

// Get customer credit limits with outstanding balances
router.get('/ar/credit-limits', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.customer_code,
        COALESCE(c.credit_limit, 0) as credit_limit,
        COALESCE(SUM(aoi.outstanding_amount), 0) as used_credit,
        CASE 
          WHEN COALESCE(c.credit_limit, 0) > 0 
          THEN (COALESCE(SUM(aoi.outstanding_amount), 0) / c.credit_limit * 100)
          ELSE 0
        END as credit_utilization_percent
      FROM erp_customers c
      LEFT JOIN ar_open_items aoi ON c.id = aoi.customer_id AND aoi.active = true AND aoi.status IN ('Open', 'Partial')
      WHERE (c.active = true OR c.status = 'active') AND (c.credit_limit IS NOT NULL AND c.credit_limit > 0)
      GROUP BY c.id, c.name, c.customer_code, c.credit_limit
      HAVING COALESCE(SUM(aoi.outstanding_amount), 0) > 0 OR c.credit_limit > 0
      ORDER BY used_credit DESC, credit_limit DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('AR credit limits error:', error);
    res.status(500).json({ message: 'Error fetching customer credit limits' });
  }
});

// Process customer payment
router.post('/ar/payments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_id, payment_amount, payment_date, payment_reference, allocations } = req.body;

    // Process each allocation
    for (const allocation of allocations) {
      // Update outstanding amount
      await client.query(`
        UPDATE ar_open_items 
        SET outstanding_amount = outstanding_amount - $1,
            status = CASE 
              WHEN outstanding_amount - $1 = 0 THEN 'Cleared'
              WHEN outstanding_amount - $1 < original_amount THEN 'Partial'
              ELSE status
            END,
            last_payment_date = $2
        WHERE id = $3
      `, [allocation.amount, payment_date, allocation.open_item_id]);

      // Record payment allocation
      await client.query(`
        INSERT INTO customer_payment_allocations
        (payment_id, open_item_id, allocated_amount, allocation_date, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [0, allocation.open_item_id, allocation.amount, payment_date, 1]); // payment_id would come from payments table
    }

    await client.query('COMMIT');
    res.json({ message: 'Customer payment processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('AR payment processing error:', error);
    res.status(500).json({ message: 'Error processing customer payment' });
  } finally {
    client.release();
  }
});

// =================== ACCOUNTS PAYABLE ROUTES ===================

// Get AP statistics and aging summary
router.get('/ap/statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_open_items,
        SUM(outstanding_amount) as total_outstanding,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_items,
        COUNT(CASE WHEN status = 'Partial' THEN 1 END) as partial_items,
        COUNT(CASE WHEN status = 'Cleared' THEN 1 END) as cleared_items,
        SUM(CASE WHEN aging_bucket = 'Current' THEN outstanding_amount ELSE 0 END) as current_amount,
        SUM(CASE WHEN aging_bucket = '30Days' THEN outstanding_amount ELSE 0 END) as thirty_days_amount,
        SUM(CASE WHEN aging_bucket = '60Days' THEN outstanding_amount ELSE 0 END) as sixty_days_amount,
        SUM(CASE WHEN aging_bucket = 'Over90' THEN outstanding_amount ELSE 0 END) as over_ninety_amount
      FROM ap_open_items
      WHERE active = true
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('AP statistics error:', error);
    res.status(500).json({ message: 'Error fetching AP statistics' });
  }
});

// Get AP open items with vendor details
router.get('/ap/open-items', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        api.*,
        v.name as vendor_name,
        v.code as vendor_code,
        gl.account_name as gl_account_name
      FROM ap_open_items api
      LEFT JOIN vendors v ON api.vendor_id = v.id
      LEFT JOIN gl_accounts gl ON api.gl_account_id = gl.id
      WHERE api.active = true
      ORDER BY api.due_date ASC, api.outstanding_amount DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('AP open items error:', error);
    res.status(500).json({ message: 'Error fetching AP open items' });
  }
});

// Get AP aging report
router.get('/ap/aging-report', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.name as vendor_name,
        v.code as vendor_code,
        SUM(CASE WHEN api.aging_bucket = 'Current' THEN api.outstanding_amount ELSE 0 END) as current_balance,
        SUM(CASE WHEN api.aging_bucket = '30Days' THEN api.outstanding_amount ELSE 0 END) as thirty_days,
        SUM(CASE WHEN api.aging_bucket = '60Days' THEN api.outstanding_amount ELSE 0 END) as sixty_days,
        SUM(CASE WHEN api.aging_bucket = 'Over90' THEN api.outstanding_amount ELSE 0 END) as over_ninety,
        SUM(api.outstanding_amount) as total_outstanding
      FROM ap_open_items api
      LEFT JOIN vendors v ON api.vendor_id = v.id
      WHERE api.active = true AND api.status IN ('Open', 'Partial')
      GROUP BY v.id, v.name, v.code
      ORDER BY total_outstanding DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('AP aging report error:', error);
    res.status(500).json({ message: 'Error generating AP aging report' });
  }
});

// =================== POSTING KEYS ROUTES ===================

// Get all posting keys
router.get('/posting-keys', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM posting_keys
      WHERE active = true
      ORDER BY posting_key
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Posting keys error:', error);
    res.status(500).json({ message: 'Error fetching posting keys' });
  }
});

// Get GL line items (general)
router.get('/gl/line-items', async (req, res) => {
  try {
    const { document_number, gl_account, date_from, date_to, company_code, document_type } = req.query;

    let query = `
      SELECT 
        ge.id,
        COALESCE(gdh.id, ge.id) as document_header_id,
        ge.document_number,
        COALESCE(gdh.document_type, ge.source_document_type, 'GL') as document_type,
        COALESCE(gdh.posting_date, ge.posting_date) as posting_date,
        COALESCE(gdh.document_date, ge.posting_date) as document_date,
        ROW_NUMBER() OVER (PARTITION BY ge.document_number ORDER BY ge.id) as line_number,
        ge.gl_account_id,
        ga.account_number as gl_account,
        ga.account_name as account_name,
        CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount ELSE 0 END as debit_amount,
        CASE WHEN ge.debit_credit_indicator = 'C' THEN ge.amount ELSE 0 END as credit_amount,
        ge.description,
        COALESCE(gdh.company_code_id, (SELECT id FROM company_codes WHERE active = true LIMIT 1)) as company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        COALESCE(ge.fiscal_year, EXTRACT(YEAR FROM COALESCE(gdh.posting_date, ge.posting_date))::integer) as fiscal_year,
        COALESCE(ge.fiscal_period, EXTRACT(MONTH FROM COALESCE(gdh.posting_date, ge.posting_date))::integer) as fiscal_period,
        ga.chart_of_accounts_id,
        coa.code as chart_of_accounts_code,
        COALESCE(coa.name, coa.description, coa.chart_id) as chart_of_accounts_name,
        COALESCE(gdh.status, ge.posting_status, 'Draft') as status,
        ge.posting_status as posting_status
      FROM gl_entries ge
      LEFT JOIN gl_document_headers gdh ON ge.document_number = gdh.document_number AND (gdh.active = true OR gdh.active IS NULL)
      LEFT JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      LEFT JOIN company_codes cc ON COALESCE(gdh.company_code_id, (SELECT id FROM company_codes WHERE active = true LIMIT 1)) = cc.id
      LEFT JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      WHERE (ge.source_module = 'GL' OR ge.source_module = 'FINANCE' OR ge.source_module IS NULL)
    `;

    const params = [];
    let paramIndex = 1;

    if (document_number) {
      query += ` AND ge.document_number ILIKE $${paramIndex}`;
      params.push(`%${document_number}%`);
      paramIndex++;
    }
    if (gl_account) {
      query += ` AND ga.account_number ILIKE $${paramIndex}`;
      params.push(`%${gl_account}%`);
      paramIndex++;
    }
    if (date_from) {
      query += ` AND COALESCE(gdh.posting_date, ge.posting_date) >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    if (date_to) {
      query += ` AND COALESCE(gdh.posting_date, ge.posting_date) <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    if (company_code) {
      query += ` AND cc.code = $${paramIndex}`;
      params.push(company_code);
      paramIndex++;
    }
    if (document_type && document_type !== 'all') {
      query += ` AND COALESCE(gdh.document_type, ge.source_document_type, 'GL') = $${paramIndex}`;
      params.push(document_type);
      paramIndex++;
    }

    query += ` ORDER BY COALESCE(gdh.posting_date, ge.posting_date) DESC, ge.id ASC LIMIT 1000`;

    const result = await pool.query(query, params);
    res.json({ line_items: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('GL line items error:', error);
    res.status(500).json({ message: 'Error fetching GL line items' });
  }
});

// Get customer GL line items
router.get('/gl/customer-line-items', async (req, res) => {
  try {
    const { customer_id, document_number, gl_account, date_from, date_to, company_code, document_type } = req.query;

    let query = `
      SELECT 
        adi.id,
        ad.id as document_header_id,
        ad.document_number,
        ad.document_type,
        ad.posting_date,
        ad.document_date,
        adi.line_item as line_number,
        ga.id as gl_account_id,
        adi.gl_account,
        ga.account_name,
        adi.debit_amount,
        adi.credit_amount,
        adi.item_text as description,
        cc.id as company_code_id,
        ad.company_code,
        cc.name as company_name,
        ad.fiscal_year,
        ad.period as fiscal_period,
        ga.chart_of_accounts_id,
        coa.code as chart_of_accounts_code,
        COALESCE(coa.name, coa.description, coa.chart_id) as chart_of_accounts_name,
        'Posted' as status,
        'Posted' as posting_status,
        COALESCE(adi.partner_id, bd.customer_id) as customer_id,
        c.name as customer_name,
        c.customer_code as customer_number,
        bd.billing_number as source_document_number,
        ad.source_document_type,
        bd.billing_type
      FROM accounting_document_items adi
      INNER JOIN accounting_documents ad ON adi.document_id = ad.id
      LEFT JOIN gl_accounts ga ON adi.gl_account = ga.account_number
      LEFT JOIN company_codes cc ON ad.company_code = cc.code
      LEFT JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      LEFT JOIN billing_documents bd ON ad.source_document_id = bd.id AND (ad.source_document_type = 'AR_INVOICE' OR ad.source_document_type = 'BILLING' OR ad.source_document_type LIKE 'AR%' OR ad.source_document_type LIKE '%INVOICE%' OR ad.source_document_type IS NULL)
      LEFT JOIN erp_customers c ON c.id = COALESCE(adi.partner_id, bd.customer_id)
      WHERE (
        adi.account_type = 'D' 
        OR (ad.source_module = 'SALES' AND ad.source_document_type = 'BILLING' AND bd.customer_id IS NOT NULL AND adi.debit_amount > 0 AND adi.credit_amount = 0)
        OR (ad.source_module = 'SALES' AND ad.source_document_type = 'BILLING' AND bd.customer_id IS NOT NULL AND adi.partner_id IS NOT NULL)
      )
        AND (ad.source_module IN ('FINANCE', 'SALES', 'AR') OR ad.document_type = 'DR' OR ad.source_document_type LIKE 'AR%' OR ad.source_document_type = 'BILLING' OR ad.source_document_type LIKE '%INVOICE%' OR ad.source_document_type IS NULL OR ad.source_module IS NULL)
    `;

    const params = [];
    let paramIndex = 1;

    if (customer_id) {
      query += ` AND (adi.partner_id = $${paramIndex} OR bd.customer_id = $${paramIndex})`;
      params.push(customer_id);
      paramIndex++;
    }
    if (document_number) {
      query += ` AND ad.document_number ILIKE $${paramIndex}`;
      params.push(`%${document_number}%`);
      paramIndex++;
    }
    if (gl_account) {
      query += ` AND adi.gl_account ILIKE $${paramIndex}`;
      params.push(`%${gl_account}%`);
      paramIndex++;
    }
    if (date_from) {
      query += ` AND ad.posting_date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    if (date_to) {
      query += ` AND ad.posting_date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    if (company_code) {
      query += ` AND ad.company_code = $${paramIndex}`;
      params.push(company_code);
      paramIndex++;
    }
    if (document_type && document_type !== 'all') {
      query += ` AND ad.document_type = $${paramIndex}`;
      params.push(document_type);
      paramIndex++;
    }

    query += ` ORDER BY ad.posting_date DESC, adi.id ASC LIMIT 1000`;

    const result = await pool.query(query, params);
    res.json({ line_items: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Customer GL line items error:', error);
    res.status(500).json({ message: 'Error fetching customer GL line items' });
  }
});

// Get vendor GL line items
router.get('/gl/vendor-line-items', async (req, res) => {
  try {
    const { vendor_id, document_number, gl_account, date_from, date_to, company_code, document_type } = req.query;

    let query = `
      SELECT 
        adi.id,
        ad.id as document_header_id,
        ad.document_number,
        ad.document_type,
        ad.posting_date,
        ad.document_date,
        adi.line_item as line_number,
        ga.id as gl_account_id,
        adi.gl_account,
        ga.account_name,
        adi.debit_amount,
        adi.credit_amount,
        adi.item_text as description,
        cc.id as company_code_id,
        ad.company_code,
        cc.name as company_name,
        ad.fiscal_year,
        ad.period as fiscal_period,
        ga.chart_of_accounts_id,
        coa.code as chart_of_accounts_code,
        COALESCE(coa.name, coa.description, coa.chart_id) as chart_of_accounts_name,
        'Posted' as status,
        'Posted' as posting_status,
        adi.partner_id as vendor_id,
        v.name as vendor_name,
        v.code as vendor_number,
        ap.invoice_number as source_document_number
      FROM accounting_document_items adi
      INNER JOIN accounting_documents ad ON adi.document_id = ad.id
      LEFT JOIN gl_accounts ga ON adi.gl_account = ga.account_number
      LEFT JOIN company_codes cc ON ad.company_code = cc.code
      LEFT JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      LEFT JOIN accounts_payable ap ON ad.source_document_id = ap.id AND (ad.source_document_type = 'AP_INVOICE' OR ad.source_document_type LIKE 'AP%')
      LEFT JOIN vendors v ON adi.partner_id = v.id
      WHERE adi.account_type = 'K'
        AND (ad.source_module = 'FINANCE' OR ad.document_type = 'KR' OR ad.source_document_type LIKE 'AP%')
    `;

    const params = [];
    let paramIndex = 1;

    if (vendor_id) {
      query += ` AND adi.partner_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }
    if (document_number) {
      query += ` AND ad.document_number ILIKE $${paramIndex}`;
      params.push(`%${document_number}%`);
      paramIndex++;
    }
    if (gl_account) {
      query += ` AND adi.gl_account ILIKE $${paramIndex}`;
      params.push(`%${gl_account}%`);
      paramIndex++;
    }
    if (date_from) {
      query += ` AND ad.posting_date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    if (date_to) {
      query += ` AND ad.posting_date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    if (company_code) {
      query += ` AND ad.company_code = $${paramIndex}`;
      params.push(company_code);
      paramIndex++;
    }
    if (document_type && document_type !== 'all') {
      query += ` AND ad.document_type = $${paramIndex}`;
      params.push(document_type);
      paramIndex++;
    }

    query += ` ORDER BY ad.posting_date DESC, adi.id ASC LIMIT 1000`;

    const result = await pool.query(query, params);
    res.json({ line_items: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Vendor GL line items error:', error);
    res.status(500).json({ message: 'Error fetching vendor GL line items' });
  }
});

// =================== ASSET MANAGEMENT ROUTES ===================

// Get Asset Management statistics
router.get('/asset-management/statistics', async (req, res) => {
  try {
    const assetResult = await pool.query(`
      SELECT 
        COUNT(*) as total_assets,
        COUNT(CASE WHEN UPPER(TRIM(status)) = 'ACTIVE' THEN 1 END) as active_assets,
        COUNT(CASE WHEN UPPER(TRIM(status)) = 'RETIRED' THEN 1 END) as retired_assets,
        COUNT(CASE WHEN UPPER(TRIM(status)) = 'UNDER CONSTRUCTION' THEN 1 END) as under_construction_assets,
        SUM(COALESCE(acquisition_cost, 0)) as total_acquisition_value,
        SUM(COALESCE(current_value, 0)) as total_current_value
      FROM asset_master
      WHERE (is_active = true)
    `);

    const depreciationResult = await pool.query(`
      SELECT 
        COUNT(*) as total_depreciation_methods
      FROM depreciation_methods
      WHERE is_active = true
    `);

    res.json({
      ...assetResult.rows[0],
      ...depreciationResult.rows[0]
    });
  } catch (error) {
    console.error('Asset Management statistics error:', error);
    res.status(500).json({ message: 'Error fetching Asset Management statistics' });
  }
});

// Get all assets
router.get('/asset-management/assets', async (req, res) => {
  try {
    const { company_code_id, status, search } = req.query;

    let query = `
      SELECT 
        am.*,
        cc.code as company_code,
        cc.name as company_name,
        co.cost_center as cost_center_code,
        co.description as cost_center_description,
        ac.id as asset_class_id,
        ac.code as asset_class_code,
        ac.name as asset_class_name
      FROM asset_master am
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN cost_centers co ON am.cost_center_id = co.id
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE (am.is_active = true)
    `;

    const params = [];
    let paramIndex = 1;

    if (company_code_id) {
      query += ` AND am.company_code_id = $${paramIndex}`;
      params.push(company_code_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND UPPER(TRIM(am.status)) = UPPER(TRIM($${paramIndex}))`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        am.name ILIKE $${paramIndex} OR 
        am.asset_number ILIKE $${paramIndex} OR 
        am.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY am.acquisition_date DESC, am.asset_number DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Asset Management assets error:', error);
    res.status(500).json({ message: 'Error fetching assets' });
  }
});

// Get asset by ID
router.get('/asset-management/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        am.*,
        cc.code as company_code,
        cc.name as company_name,
        co.cost_center as cost_center_code,
        co.description as cost_center_description,
        ac.id as asset_class_id,
        ac.code as asset_class_code,
        ac.name as asset_class_name
      FROM asset_master am
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN cost_centers co ON am.cost_center_id = co.id
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE am.id = $1 AND (am.is_active = true)
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const asset = result.rows[0];

    // Format response to match frontend expectations
    res.json({
      id: asset.id,
      asset_number: asset.asset_number || null,
      name: asset.name || null,
      description: asset.description || null,
      asset_class_id: asset.asset_class_id || null,
      asset_class_code: asset.asset_class_code || null,
      asset_class_name: asset.asset_class_name || null,
      asset_class: asset.asset_class_name || asset.asset_class_code || asset.asset_class || null,
      acquisition_date: asset.acquisition_date || null,
      acquisition_cost: asset.acquisition_cost || null,
      current_value: asset.current_value || null,
      depreciation_method: asset.depreciation_method || null,
      useful_life_years: asset.useful_life_years || null,
      status: asset.status || null,
      location: asset.location || null,
      company_code_id: asset.company_code_id || null,
      cost_center_id: asset.cost_center_id || null,
      company_code: asset.company_code || null,
      company_name: asset.company_name || null,
      cost_center_code: asset.cost_center_code || null,
      cost_center_description: asset.cost_center_description || null,
      is_active: asset.is_active || asset.active || true,
      created_at: asset.created_at || null,
      updated_at: asset.updated_at || null
    });
  } catch (error) {
    console.error('Asset Management asset details error:', error);
    res.status(500).json({ message: 'Error fetching asset details' });
  }
});

// Create new asset
router.post('/asset-management/assets', async (req, res) => {
  try {
    const {
      asset_number,
      name,
      description,
      asset_class_id,
      asset_class,
      acquisition_date,
      acquisition_cost,
      current_value,
      depreciation_method,
      useful_life_years,
      company_code_id,
      cost_center_id,
      location,
      status
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Asset name is required' });
    }

    // Use asset_class_id if provided, otherwise try to find by asset_class text (backward compatibility)
    let finalAssetClassId = asset_class_id ? parseInt(asset_class_id) : null;
    if (!finalAssetClassId && asset_class) {
      const classResult = await pool.query(
        `SELECT id FROM asset_classes WHERE code = $1 OR name = $1 LIMIT 1`,
        [asset_class]
      );
      if (classResult.rows.length > 0) {
        finalAssetClassId = classResult.rows[0].id;
      }
    }

    const result = await pool.query(`
      INSERT INTO asset_master (
        asset_number, name, description, asset_class_id, asset_class, acquisition_date, 
        acquisition_cost, current_value, depreciation_method, useful_life_years,
        company_code_id, cost_center_id, location, status, is_active, active,
        value_date, capitalization_date, accumulated_depreciation, net_book_value,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, true, $15, $16, 0, $17, NOW(), NOW())
      RETURNING *
    `, [
      asset_number || null,
      name,
      description || null,
      finalAssetClassId,
      asset_class || null,
      acquisition_date || null,
      acquisition_cost ? parseFloat(acquisition_cost) : null,
      current_value ? parseFloat(current_value) : null,
      depreciation_method || null,
      useful_life_years ? parseInt(useful_life_years) : null,
      company_code_id ? parseInt(company_code_id) : null,
      cost_center_id ? parseInt(cost_center_id) : null,
      location || null,
      (status || 'active').toLowerCase(),
      acquisition_date || null, // value_date
      acquisition_date || null, // capitalization_date
      acquisition_cost ? parseFloat(acquisition_cost) : null // net_book_value
    ]);

    const newAsset = result.rows[0];

    // Create capitalization transaction if asset has acquisition cost
    if (acquisition_cost && parseFloat(acquisition_cost) > 0 && (status || '').toLowerCase() === 'active') {
      try {
        const { AssetTransactionService } = await import('../services/asset-transaction-service.js');
        const transactionService = new AssetTransactionService();

        await transactionService.createTransaction({
          assetId: newAsset.id,
          transactionType: 'CAPITALIZATION',
          transactionDate: new Date(acquisition_date || new Date()),
          amount: parseFloat(acquisition_cost),
          description: `Asset capitalization: ${name}`,
          createdBy: req.user?.username || 'system'
        });
      } catch (txError) {
        console.error('Error creating capitalization transaction:', txError);
        // Don't fail asset creation if transaction creation fails
      }
    }

    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Asset Management create asset error:', error);
    res.status(500).json({ message: 'Error creating asset', error: error.message });
  }
});

// Update asset
router.put('/asset-management/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      asset_number,
      name,
      description,
      asset_class_id,
      asset_class,
      acquisition_date,
      acquisition_cost,
      current_value,
      depreciation_method,
      useful_life_years,
      company_code_id,
      cost_center_id,
      location,
      status
    } = req.body;

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (asset_number !== undefined) {
      updateFields.push(`asset_number = $${paramIndex++}`);
      values.push(asset_number);
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (asset_class_id !== undefined) {
      updateFields.push(`asset_class_id = $${paramIndex++}`);
      values.push(asset_class_id ? parseInt(asset_class_id) : null);
    } else if (asset_class !== undefined) {
      // Backward compatibility: try to find asset class by text
      let finalAssetClassId = null;
      if (asset_class) {
        const classResult = await pool.query(
          `SELECT id FROM asset_classes WHERE code = $1 OR name = $1 LIMIT 1`,
          [asset_class]
        );
        if (classResult.rows.length > 0) {
          finalAssetClassId = classResult.rows[0].id;
        }
      }
      updateFields.push(`asset_class_id = $${paramIndex++}`);
      values.push(finalAssetClassId);
      updateFields.push(`asset_class = $${paramIndex++}`);
      values.push(asset_class);
    }
    if (acquisition_date !== undefined) {
      updateFields.push(`acquisition_date = $${paramIndex++}`);
      values.push(acquisition_date || null);
    }
    if (acquisition_cost !== undefined) {
      updateFields.push(`acquisition_cost = $${paramIndex++}`);
      values.push(acquisition_cost ? parseFloat(acquisition_cost) : null);
    }
    if (current_value !== undefined) {
      updateFields.push(`current_value = $${paramIndex++}`);
      values.push(current_value ? parseFloat(current_value) : null);
    }
    if (depreciation_method !== undefined) {
      updateFields.push(`depreciation_method = $${paramIndex++}`);
      values.push(depreciation_method);
    }
    if (useful_life_years !== undefined) {
      updateFields.push(`useful_life_years = $${paramIndex++}`);
      values.push(useful_life_years ? parseInt(useful_life_years) : null);
    }
    if (company_code_id !== undefined) {
      updateFields.push(`company_code_id = $${paramIndex++}`);
      values.push(company_code_id ? parseInt(company_code_id) : null);
    }
    if (cost_center_id !== undefined) {
      updateFields.push(`cost_center_id = $${paramIndex++}`);
      values.push(cost_center_id ? parseInt(cost_center_id) : null);
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(parseInt(id));

    const query = `
      UPDATE asset_master 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND (is_active = true)
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Asset Management update asset error:', error);
    res.status(500).json({ message: 'Error updating asset', error: error.message });
  }
});

// Get depreciation methods
router.get('/asset-management/depreciation-methods', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        calculation_type,
        base_value_type,
        depreciation_rate,
        useful_life_years,
        residual_value_percent,
        supports_partial_periods,
        time_basis,
        method_switching_allowed,
        company_code_id,
        applicable_to_asset_class,
        is_active,
        is_default,
        created_at,
        updated_at
      FROM depreciation_methods
      WHERE is_active = true
      ORDER BY name, code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Asset Management depreciation methods error:', error);
    // If table doesn't exist or columns mismatch, return empty array
    res.json([]);
  }
});

// Get company codes for dropdown
router.get('/asset-management/company-codes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, name FROM company_codes
      WHERE active = true
      ORDER BY code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Asset Management company codes error:', error);
    res.status(500).json({ message: 'Error fetching company codes' });
  }
});

// Get cost centers for dropdown
router.get('/asset-management/cost-centers', async (req, res) => {
  try {
    const { company_code_id } = req.query;

    let query = `
      SELECT id, cost_center as code, description as name 
      FROM cost_centers
      WHERE active = true
    `;

    const params = [];
    if (company_code_id) {
      query += ` AND company_code_id = $1`;
      params.push(company_code_id);
    }

    query += ` ORDER BY cost_center`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Asset Management cost centers error:', error);
    res.status(500).json({ message: 'Error fetching cost centers' });
  }
});

// Get asset classes for dropdown
router.get('/asset-management/asset-classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, name, description, default_depreciation_method, default_useful_life_years
      FROM asset_classes
      WHERE is_active = true
      ORDER BY code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Asset Management asset classes error:', error);
    res.status(500).json({ message: 'Error fetching asset classes' });
  }
});

// ==================== DEPRECIATION RUNS ====================

// Run depreciation
router.post('/asset-management/depreciation-runs', async (req, res) => {
  try {
    const { AssetDepreciationRunService } = await import('../services/asset-depreciation-run-service.js');
    const depreciationRunService = new AssetDepreciationRunService();

    const {
      fiscal_year,
      fiscal_period,
      depreciation_area_id,
      company_code_id,
      run_by,
      post_to_gl = true
    } = req.body;

    if (!fiscal_year || !fiscal_period) {
      return res.status(400).json({ message: 'Fiscal year and period are required' });
    }

    const result = await depreciationRunService.runDepreciation({
      fiscalYear: parseInt(fiscal_year),
      fiscalPeriod: parseInt(fiscal_period),
      depreciationAreaId: depreciation_area_id ? parseInt(depreciation_area_id) : undefined,
      companyCodeId: company_code_id ? parseInt(company_code_id) : undefined,
      runBy: run_by,
      postToGL: post_to_gl !== false
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Asset Management depreciation run error:', error);
    res.status(500).json({ message: 'Error running depreciation', error: error.message });
  }
});

// Get depreciation run history
router.get('/asset-management/depreciation-runs', async (req, res) => {
  try {
    const { AssetDepreciationRunService } = await import('../services/asset-depreciation-run-service.js');
    const depreciationRunService = new AssetDepreciationRunService();

    const limit = parseInt(req.query.limit) || 50;
    const runs = await depreciationRunService.getDepreciationRuns(limit);

    res.json(runs);
  } catch (error) {
    console.error('Asset Management get depreciation runs error:', error);
    res.status(500).json({ message: 'Error fetching depreciation runs', error: error.message });
  }
});

// Get depreciation run details
router.get('/asset-management/depreciation-runs/:runId', async (req, res) => {
  try {
    const { AssetDepreciationRunService } = await import('../services/asset-depreciation-run-service.js');
    const depreciationRunService = new AssetDepreciationRunService();

    const runId = parseInt(req.params.runId);
    const details = await depreciationRunService.getDepreciationRunDetails(runId);

    res.json(details);
  } catch (error) {
    console.error('Asset Management get depreciation run details error:', error);
    res.status(500).json({ message: 'Error fetching depreciation run details', error: error.message });
  }
});

// ==================== ASSET TRANSACTIONS ====================

// Create asset transaction
router.post('/asset-management/transactions', async (req, res) => {
  try {
    const { AssetTransactionService } = await import('../services/asset-transaction-service.js');
    const transactionService = new AssetTransactionService();
    const { AssetGLPostingService } = await import('../services/asset-gl-posting-service.js');
    const glPostingService = new AssetGLPostingService();

    const {
      asset_id,
      transaction_type,
      transaction_date,
      amount,
      description,
      from_cost_center_id,
      to_cost_center_id,
      from_company_code_id,
      to_company_code_id,
      from_location,
      to_location,
      retirement_method,
      retirement_revenue,
      created_by,
      post_to_gl = false
    } = req.body;

    if (!asset_id || !transaction_type || !transaction_date) {
      return res.status(400).json({ message: 'Asset ID, transaction type, and date are required' });
    }

    // Create transaction
    const transactionId = await transactionService.createTransaction({
      assetId: parseInt(asset_id),
      transactionType: transaction_type,
      transactionDate: new Date(transaction_date),
      amount: amount ? parseFloat(amount) : undefined,
      description,
      fromCostCenterId: from_cost_center_id ? parseInt(from_cost_center_id) : undefined,
      toCostCenterId: to_cost_center_id ? parseInt(to_cost_center_id) : undefined,
      fromCompanyCodeId: from_company_code_id ? parseInt(from_company_code_id) : undefined,
      toCompanyCodeId: to_company_code_id ? parseInt(to_company_code_id) : undefined,
      fromLocation,
      toLocation,
      retirementMethod: retirement_method,
      retirementRevenue: retirement_revenue ? parseFloat(retirement_revenue) : undefined,
      createdBy: created_by
    });

    // Post to GL if requested and transaction type is CAPITALIZATION
    let glDocumentNumber;
    if (post_to_gl && transaction_type === 'CAPITALIZATION' && amount) {
      try {
        const currentDate = new Date();
        const fiscalYear = currentDate.getFullYear();
        const fiscalPeriod = currentDate.getMonth() + 1;

        glDocumentNumber = await glPostingService.postCapitalization({
          assetId: parseInt(asset_id),
          transactionType: 'CAPITALIZATION',
          amount: parseFloat(amount),
          documentNumber: `AST-CAP-${fiscalYear}-${fiscalPeriod.toString().padStart(2, '0')}-${transactionId}`,
          postingDate: new Date(transaction_date),
          fiscalYear,
          fiscalPeriod,
          description: description || `Asset capitalization`,
          costCenterId: to_cost_center_id ? parseInt(to_cost_center_id) : undefined
        });
      } catch (glError) {
        console.error('Error posting capitalization to GL:', glError);
        // Don't fail the transaction if GL posting fails
      }
    }

    res.status(201).json({
      transactionId,
      glDocumentNumber
    });
  } catch (error) {
    console.error('Asset Management create transaction error:', error);
    res.status(500).json({ message: 'Error creating asset transaction', error: error.message });
  }
});

// Get asset transaction history
router.get('/asset-management/assets/:assetId/transactions', async (req, res) => {
  try {
    const { AssetTransactionService } = await import('../services/asset-transaction-service.js');
    const transactionService = new AssetTransactionService();

    const assetId = parseInt(req.params.assetId);
    const transactions = await transactionService.getTransactionHistory(assetId);

    res.json(transactions);
  } catch (error) {
    console.error('Asset Management get transaction history error:', error);
    res.status(500).json({ message: 'Error fetching transaction history', error: error.message });
  }
});

// Get depreciation areas
router.get('/asset-management/depreciation-areas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        COALESCE(name, code) as name,
        code,
        description,
        useful_life_years,
        depreciation_rate,
        calculation_method,
        company_code_id,
        is_active,
        created_at
      FROM depreciation_areas
      WHERE is_active = true OR is_active IS NULL
      ORDER BY COALESCE(code, name)
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Asset Management depreciation areas error:', error);
    res.json([]);
  }
});

export default router;
