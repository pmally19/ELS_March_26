import { Router } from 'express';
import { db } from '../db';
import { pool } from '../db';
import { eq, sql, desc } from 'drizzle-orm';
import { transactionalApplicationsService } from '../services/transactional-applications-service';
import { postGLDocument } from '../services/gl-posting-helper.js';

const router = Router();

// GET /api/general-ledger/gl-accounts - Fetch all GL accounts
router.get('/gl-accounts', async (req, res) => {
  try {
    console.log('Fetching GL accounts from database...');

    // Check if gl_accounts table exists
    try {
      await db.execute(sql`SELECT 1 FROM gl_accounts LIMIT 1`);
    } catch (tableError: any) {
      console.log('gl_accounts table does not exist, returning empty array');
      return res.json([]);
    }

    // Query the actual gl_accounts table with semantic account_type labels
    const result = await db.execute(sql`
      SELECT id, account_number, account_name,
             CASE
               WHEN pl_account = true THEN
                 CASE
                   WHEN CAST(account_number AS bigint) >= 10000 AND CAST(account_number AS bigint) < 12000 THEN 'REVENUE'
                   ELSE 'EXPENSE'
                 END
               WHEN balance_sheet_account = true THEN
                 CASE
                   WHEN CAST(account_number AS bigint) < 3000 THEN 'ASSET'
                   WHEN CAST(account_number AS bigint) < 4000 THEN 'LIABILITY'
                   ELSE 'EQUITY'
                 END
               ELSE account_type
             END as account_type,
             account_group, balance_sheet_account, pl_account, is_active,
             created_at, updated_at
      FROM gl_accounts 
      WHERE is_active = true
      ORDER BY account_number
    `);

    console.log(`Found ${result.rows.length} GL accounts`);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching GL accounts:', error);
    // Return empty array instead of error to prevent UI breakage
    res.json([]);
  }
});

// GET /api/general-ledger/gl-entries - Fetch GL entries with enhanced fields and filtering
router.get('/gl-entries', async (req, res) => {
  try {
    const {
      document_number,
      fiscal_year,
      fiscal_period,
      source_document_type,
      source_module,
      start_date,
      end_date,
      gl_account_id,
      limit = 100,
      offset = 0
    } = req.query;

    const limitValue = parseInt(limit as string) || 100;
    const offsetValue = parseInt(offset as string) || 0;

    // Enhanced query using SAP-pattern tables (BKPF/BSEG)
    const result = await db.execute(sql`
      SELECT 
        jeli.id, 
        je.document_number, 
        CASE WHEN jeli.debit_amount > 0 THEN jeli.debit_amount ELSE jeli.credit_amount END as amount, 
        CASE WHEN jeli.debit_amount > 0 THEN 'D' ELSE 'C' END as debit_credit_indicator, 
        je.posting_date,
        je.status as posting_status,
        je.fiscal_period,
        je.fiscal_year,
        COALESCE(jeli.description, jeli.item_text, je.header_text) as description,
        je.source_module,
        je.source_document_type,
        je.source_document_id,
        jeli.reference,
        jeli.bank_transaction_id,
        jeli.gl_account_id,
        ga.account_number, 
        ga.account_name,
        ga.account_type
      FROM journal_entry_line_items jeli
      JOIN journal_entries je ON jeli.journal_entry_id = je.id
      LEFT JOIN gl_accounts ga ON jeli.gl_account_id = ga.id
      WHERE 1=1
        ${document_number ? sql`AND je.document_number = ${document_number}` : sql``}
        ${fiscal_year ? sql`AND je.fiscal_year = ${parseInt(fiscal_year as string)}` : sql``}
        ${fiscal_period ? sql`AND je.fiscal_period = ${parseInt(fiscal_period as string)}` : sql``}
        ${source_document_type ? sql`AND je.source_document_type = ${source_document_type}` : sql``}
        ${source_module ? sql`AND je.source_module = ${source_module}` : sql``}
        ${gl_account_id ? sql`AND jeli.gl_account_id = ${parseInt(gl_account_id as string)}` : sql``}
        ${start_date ? sql`AND je.posting_date >= ${start_date}` : sql``}
        ${end_date ? sql`AND je.posting_date <= ${end_date}` : sql``}
      ORDER BY je.posting_date DESC, jeli.id DESC
      LIMIT ${limitValue}
      OFFSET ${offsetValue}
    `);

    console.log(`Found ${result.rows.length} GL entries`);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM journal_entry_line_items jeli
      JOIN journal_entries je ON jeli.journal_entry_id = je.id
      WHERE 1=1
        ${document_number ? sql`AND je.document_number = ${document_number}` : sql``}
        ${fiscal_year ? sql`AND je.fiscal_year = ${parseInt(fiscal_year as string)}` : sql``}
        ${fiscal_period ? sql`AND je.fiscal_period = ${parseInt(fiscal_period as string)}` : sql``}
        ${source_document_type ? sql`AND je.source_document_type = ${source_document_type}` : sql``}
        ${source_module ? sql`AND je.source_module = ${source_module}` : sql``}
        ${gl_account_id ? sql`AND jeli.gl_account_id = ${parseInt(gl_account_id as string)}` : sql``}
        ${start_date ? sql`AND je.posting_date >= ${start_date}` : sql``}
        ${end_date ? sql`AND je.posting_date <= ${end_date}` : sql``}
    `);

    const total = parseInt(countResult.rows[0]?.total || '0');

    res.json({
      entries: result.rows,
      total,
      limit: limitValue,
      offset: offsetValue
    });
  } catch (error: any) {
    console.error('Error fetching GL entries:', error);
    // Return empty result object instead of error to prevent UI breakage
    res.json({ entries: [], total: 0, limit: 100, offset: 0 });
  }
});

// GET /api/general-ledger/balance-summary - Account type summaries
router.get('/balance-summary', async (req, res) => {
  try {
    console.log('Calculating balance summary...');

    // Check if gl_accounts table exists
    try {
      await db.execute(sql`SELECT 1 FROM gl_accounts LIMIT 1`);
    } catch (tableError: any) {
      console.log('gl_accounts table does not exist, returning empty array');
      return res.json([]);
    }

    const result = await db.execute(sql`
      SELECT 
        account_type,
        COUNT(*) as account_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM gl_accounts
      GROUP BY account_type
      ORDER BY account_type
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error calculating balance summary:', error);
    // Return empty array instead of error to prevent UI breakage
    res.json([]);
  }
});

// GET /api/general-ledger/trial-balance - Generate trial balance
router.get('/trial-balance', async (req, res) => {
  try {
    console.log('Generating trial balance...');

    // Check if required tables exist
    let hasGlAccounts = false;
    let hasGlEntries = false;

    try {
      await db.execute(sql`SELECT 1 FROM gl_accounts LIMIT 1`);
      hasGlAccounts = true;
    } catch (e) {
      console.log('gl_accounts table does not exist, returning empty array');
      return res.json([]);
    }

    try {
      await db.execute(sql`SELECT 1 FROM gl_entries LIMIT 1`);
      hasGlEntries = true;
    } catch (e) {
      hasGlEntries = false;
    }

    let result;
    // Full trial balance with entries aggregated from journal_entry_line_items
    result = await db.execute(sql`
      SELECT 
        ga.account_number,
        ga.account_name,
        -- Map account type codes to semantic labels used by the frontend
        CASE
          WHEN ga.pl_account = true THEN
            CASE
              WHEN CAST(ga.account_number AS bigint) >= 10000 AND CAST(ga.account_number AS bigint) < 12000 THEN 'REVENUE'
              ELSE 'EXPENSE'
            END
          WHEN ga.balance_sheet_account = true THEN
            CASE
              WHEN CAST(ga.account_number AS bigint) < 3000 THEN 'ASSET'
              WHEN CAST(ga.account_number AS bigint) < 4000 THEN 'LIABILITY'
              ELSE 'EQUITY'
            END
          ELSE ga.account_type
        END as account_type,
        COALESCE(SUM(jeli.debit_amount), 0) as debit_total,
        COALESCE(SUM(jeli.credit_amount), 0) as credit_total,
        COALESCE(SUM(jeli.debit_amount - jeli.credit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_line_items jeli ON ga.id = jeli.gl_account_id
      WHERE ga.is_active = true
      GROUP BY ga.id, ga.account_number, ga.account_name, ga.account_type, ga.balance_sheet_account, ga.pl_account
      ORDER BY ga.account_number
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error generating trial balance:', error);
    // Return empty array instead of error to prevent UI breakage
    res.json([]);
  }
});

// POST /api/general-ledger/postings - Create GL posting
router.post('/postings', async (req, res) => {
  try {
    const {
      document_number,
      entries,
      document_type,
      company_code,
      posting_date,
      document_date,
      reference,
      currency
    } = req.body;

    console.log('Creating GL posting:', { document_number, entries });

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        message: 'Entries array is required'
      });
    }

    // Validate that debits equal credits
    const totalDebits = entries
      .filter(e => e.debit_credit_indicator === 'D')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const totalCredits = entries
      .filter(e => e.debit_credit_indicator === 'C')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return res.status(400).json({
        message: 'Debits must equal credits',
        debits: totalDebits,
        credits: totalCredits
      });
    }

    // Prepare items for createGLDocument
    // Note: Document number will be auto-generated by createGLDocument if not provided
    const postingDateObj = posting_date ? new Date(posting_date) : new Date();
    const documentDateObj = document_date ? new Date(document_date) : new Date();
    const postingDateStr = postingDateObj.toISOString().split('T')[0];

    // Get document_type dynamically (no hardcoded 'SA')
    let docType = document_type;
    if (!docType) {
      const docTypeResult = await db.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'default_accounting_document_type' AND active = true LIMIT 1
      `);
      if (docTypeResult.rows.length > 0 && docTypeResult.rows[0].config_value) {
        docType = docTypeResult.rows[0].config_value;
      } else {
        // Try to get from GENERAL_LEDGER category
        const defaultDocTypeResult = await db.execute(sql`
          SELECT code FROM sd_document_types 
          WHERE category = 'GENERAL_LEDGER' AND is_active = true ORDER BY id LIMIT 1
        `);
        if (defaultDocTypeResult.rows.length > 0 && defaultDocTypeResult.rows[0].code) {
          docType = defaultDocTypeResult.rows[0].code;
        } else {
          // Last resort: Get any active document type
          const anyDocTypeResult = await db.execute(sql`
            SELECT code FROM sd_document_types 
            WHERE is_active = true ORDER BY id LIMIT 1
          `);
          if (anyDocTypeResult.rows.length > 0 && anyDocTypeResult.rows[0].code) {
            docType = anyDocTypeResult.rows[0].code;
          } else {
            return res.status(400).json({
              message: 'Document type not configured. Please configure document types in master data.'
            });
          }
        }
      }
    }

    // Get company_code dynamically (no hardcoded '1000')
    let companyCode = company_code;
    if (!companyCode) {
      const companyCodeResult = await db.execute(sql`
        SELECT config_value FROM system_configuration 
        WHERE config_key = 'default_company_code' AND active = true LIMIT 1
      `);
      if (companyCodeResult.rows.length > 0 && companyCodeResult.rows[0].config_value) {
        companyCode = companyCodeResult.rows[0].config_value;
      } else {
        const defaultCompanyResult = await db.execute(sql`
          SELECT code FROM company_codes WHERE is_active = true ORDER BY id LIMIT 1
        `);
        if (defaultCompanyResult.rows.length > 0) {
          companyCode = defaultCompanyResult.rows[0].code;
        } else {
          return res.status(400).json({
            message: 'Company code not found. Please configure company code in master data or system configuration.'
          });
        }
      }
    }

    // Get currency dynamically (no hardcoded 'USD')
    let documentCurrency = currency;
    if (!documentCurrency) {
      // Try to get from company_code
      const currencyResult = await db.execute(sql`
        SELECT currency FROM company_codes WHERE code = ${companyCode} AND is_active = true LIMIT 1
      `);
      if (currencyResult.rows.length > 0 && currencyResult.rows[0].currency) {
        documentCurrency = currencyResult.rows[0].currency;
      } else {
        const defaultCurrencyResult = await db.execute(sql`
          SELECT config_value FROM system_configuration 
          WHERE config_key = 'default_currency' AND active = true LIMIT 1
        `);
        if (defaultCurrencyResult.rows.length > 0 && defaultCurrencyResult.rows[0].config_value) {
          documentCurrency = defaultCurrencyResult.rows[0].config_value;
        } else {
          return res.status(400).json({
            message: `Currency not configured for company code ${companyCode}. Please configure currency in company master data or system configuration.`
          });
        }
      }
    }

    // Get GL account numbers from account IDs
    const glAccountNumbers = await Promise.all(
      entries.map(async (entry) => {
        if (entry.gl_account_id) {
          const accountResult = await db.execute(sql`
            SELECT account_number FROM gl_accounts WHERE id = ${entry.gl_account_id}
          `);
          return accountResult.rows[0]?.account_number || null;
        }
        return entry.gl_account_number || null;
      })
    );

    // Convert entries to GL document items format
    const glItems = entries.map((entry, index) => {
      const accountNumber = glAccountNumbers[index] || entry.gl_account_number;
      return {
        glAccount: accountNumber,
        debitAmount: entry.debit_credit_indicator === 'D' ? parseFloat(entry.amount || 0) : 0,
        creditAmount: entry.debit_credit_indicator === 'C' ? parseFloat(entry.amount || 0) : 0,
        costCenter: entry.cost_center || undefined,
        description: entry.description || `Line item ${index + 1}`
      };
    });

    // Create accounting document using the service
    const result = await transactionalApplicationsService.createGLDocument({
      documentType: docType,
      companyCode: companyCode,
      documentDate: documentDateObj,
      postingDate: postingDateObj,
      reference: reference || `GL Posting`,
      currency: documentCurrency,
      items: glItems
    });

    // Post to journal_entries + journal_entry_line_items via shared helper
    const pgClient = await pool.connect();
    try {
      await pgClient.query('BEGIN');

      const companyCodeIdRes = await pgClient.query(
        `SELECT id FROM company_codes WHERE code = $1 LIMIT 1`, [companyCode]
      );
      const companyCodeId = companyCodeIdRes.rows[0]?.id || null;

      const currencyIdRes = await pgClient.query(
        `SELECT id FROM currencies WHERE code = $1 LIMIT 1`, [documentCurrency]
      );
      const currencyId = currencyIdRes.rows[0]?.id || null;

      const glHeader = {
        documentNumber: result.documentNumber,
        documentType: docType,
        companyCodeId,
        postingDate: postingDateObj,
        documentDate: documentDateObj,
        fiscalYear: postingDateObj.getFullYear(),
        fiscalPeriod: postingDateObj.getMonth() + 1,
        currencyId,
        reference: reference || 'GL Posting',
        headerText: reference || 'GL Posting',
        sourceModule: 'FI',
        sourceDocumentType: 'MANUAL_POSTING'
      };

      const glLines = entries.map((entry: any, index: number) => ({
        glAccountId: entry.gl_account_id,
        glAccount: glAccountNumbers[index],
        postingKey: entry.debit_credit_indicator === 'D' ? '40' : '50',
        debitCredit: entry.debit_credit_indicator as 'D' | 'C',
        amount: parseFloat(entry.amount || 0),
        description: entry.description || `Line item ${index + 1}`,
        sourceModule: 'FI',
        sourceDocumentType: 'MANUAL_POSTING'
      }));

      const glResult = await postGLDocument(pgClient, glHeader, glLines);
      if (!glResult.success) throw new Error(glResult.error);

      await pgClient.query('COMMIT');
    } catch (glErr: any) {
      await pgClient.query('ROLLBACK');
      throw glErr;
    } finally {
      pgClient.release();
    }

    res.status(201).json({
      success: true,
      message: 'GL posting created successfully',
      document_number: result.documentNumber,
      total_amount: result.totalAmount,
      entries_count: entries.length
    });

  } catch (error) {
    console.error('Error creating GL posting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create GL posting',
      error: error.message
    });
  }
});

// GET /api/general-ledger/accounts/:id - Get account details
router.get('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching account details for ID: ${id}`);

    const accountResult = await db.execute(sql`
      SELECT * FROM gl_accounts WHERE id = ${id}
    `);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const entriesResult = await db.execute(sql`
      SELECT 
        jeli.*,
        je.document_number,
        je.posting_date,
        je.status as posting_status
      FROM journal_entry_line_items jeli
      JOIN journal_entries je ON jeli.journal_entry_id = je.id
      WHERE jeli.gl_account_id = ${id}
      ORDER BY je.posting_date DESC, jeli.id DESC
      LIMIT 100
    `);

    res.json({
      account: accountResult.rows[0],
      entries: entriesResult.rows
    });
  } catch (error) {
    console.error('Error fetching account details:', error);
    res.status(500).json({
      message: 'Failed to fetch account details',
      error: error.message
    });
  }
});

// GET /api/general-ledger/profit-loss - Generate Profit & Loss Report
router.get('/profit-loss', async (req, res) => {
  try {
    const { startDate, endDate, companyCode } = req.query;
    console.log('Generating Profit & Loss report...', { startDate, endDate, companyCode });

    // Check if required tables exist
    let hasGlAccounts = false;
    let hasGlEntries = false;

    try {
      await db.execute(sql`SELECT 1 FROM gl_accounts LIMIT 1`);
      hasGlAccounts = true;
    } catch (e) {
      console.log('gl_accounts table does not exist, returning empty report');
      return res.json({
        success: true,
        revenue: [],
        expenses: [],
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        period: { startDate: startDate || null, endDate: endDate || null }
      });
    }

    try {
      await db.execute(sql`SELECT 1 FROM gl_entries LIMIT 1`);
      hasGlEntries = true;
    } catch (e) {
      hasGlEntries = false;
    }

    let revenueResult, expensesResult;

    if (hasGlEntries) {
      // Build date filter condition
      let dateCondition = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (startDate && endDate) {
        dateCondition = `AND ge.posting_date >= $${paramIndex} AND ge.posting_date <= $${paramIndex + 1}`;
        params.push(startDate, endDate);
        paramIndex += 2;
      } else if (startDate) {
        dateCondition = `AND ge.posting_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex += 1;
      } else if (endDate) {
        dateCondition = `AND ge.posting_date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex += 1;
      }

      // Revenue query - REVENUE accounts (credit entries increase revenue)
      const revenueQuery = `
        SELECT 
          ga.account_number,
          ga.account_name,
          ga.account_type,
          ga.account_group,
          COALESCE(SUM(jeli.credit_amount), 0) - COALESCE(SUM(jeli.debit_amount), 0) as net_amount
        FROM gl_accounts ga
        LEFT JOIN journal_entry_line_items jeli ON ga.id = jeli.gl_account_id
        LEFT JOIN journal_entries je ON jeli.journal_entry_id = je.id
        WHERE ga.is_active = true 
          AND ga.account_type = 'REVENUE'
          AND ga.pl_account = true
          ${dateCondition ? `AND ${dateCondition.replace(/ge\./g, 'je.')}` : ''}
        GROUP BY ga.id, ga.account_number, ga.account_name, ga.account_type, ga.account_group
        HAVING COALESCE(SUM(jeli.credit_amount), 0) - COALESCE(SUM(jeli.debit_amount), 0) != 0
        ORDER BY ga.account_number
      `;

      // Expenses query - EXPENSE accounts (debit entries increase expenses)
      const expensesQuery = `
        SELECT 
          ga.account_number,
          ga.account_name,
          ga.account_type,
          ga.account_group,
          COALESCE(SUM(jeli.debit_amount), 0) - COALESCE(SUM(jeli.credit_amount), 0) as net_amount
        FROM gl_accounts ga
        LEFT JOIN journal_entry_line_items jeli ON ga.id = jeli.gl_account_id
        LEFT JOIN journal_entries je ON jeli.journal_entry_id = je.id
        WHERE ga.is_active = true 
          AND ga.account_type = 'EXPENSE'
          AND ga.pl_account = true
          ${dateCondition ? `AND ${dateCondition.replace(/ge\./g, 'je.')}` : ''}
        GROUP BY ga.id, ga.account_number, ga.account_name, ga.account_type, ga.account_group
        HAVING COALESCE(SUM(jeli.debit_amount), 0) - COALESCE(SUM(jeli.credit_amount), 0) != 0
        ORDER BY ga.account_number
      `;

      // Execute queries using pool
      if (params.length > 0) {
        revenueResult = await pool.query(revenueQuery, params);
        expensesResult = await pool.query(expensesQuery, params);
      } else {
        revenueResult = await pool.query(revenueQuery);
        expensesResult = await pool.query(expensesQuery);
      }
    } else {
      // If no entries, return accounts with zero amounts
      revenueResult = await pool.query(`
        SELECT 
          account_number,
          account_name,
          account_type,
          account_group,
          0 as net_amount
        FROM gl_accounts
        WHERE is_active = true 
          AND account_type = 'REVENUE'
          AND pl_account = true
        ORDER BY account_number
      `);

      expensesResult = await pool.query(`
        SELECT 
          account_number,
          account_name,
          account_type,
          account_group,
          0 as net_amount
        FROM gl_accounts
        WHERE is_active = true 
          AND account_type = 'EXPENSE'
          AND pl_account = true
        ORDER BY account_number
      `);
    }

    const revenue = revenueResult.rows.map((row: any) => ({
      accountNumber: row.account_number,
      accountName: row.account_name,
      accountType: row.account_type,
      accountGroup: row.account_group || '',
      amount: parseFloat(row.net_amount || 0)
    }));

    const expenses = expensesResult.rows.map((row: any) => ({
      accountNumber: row.account_number,
      accountName: row.account_name,
      accountType: row.account_type,
      accountGroup: row.account_group || '',
      amount: parseFloat(row.net_amount || 0)
    }));

    const totalRevenue = revenue.reduce((sum: number, item: any) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum: number, item: any) => sum + item.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      success: true,
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating Profit & Loss report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Profit & Loss report',
      error: error.message
    });
  }
});

export const generalLedgerRoutes = router;