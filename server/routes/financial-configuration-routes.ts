import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Company Code Configuration
router.post('/company-code', async (req, res) => {
  try {
    const { code, name, currency, country } = req.body;
    
    const result = await pool.query(
      'INSERT INTO company_codes (code, name, currency, country) VALUES ($1, $2, $3, $4) RETURNING *',
      [code, name, currency, country]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Company Code creation error:', error);
    res.status(500).json({ error: 'Failed to create company code' });
  }
});

// Chart of Accounts Configuration
router.post('/chart-of-accounts', async (req, res) => {
  try {
    const { chartId, description, accountLength } = req.body;
    
    const result = await pool.query(
      'INSERT INTO chart_of_accounts (chart_id, description, account_length) VALUES ($1, $2, $3) RETURNING *',
      [chartId, description, accountLength || 10]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Chart of Accounts creation error:', error);
    res.status(500).json({ error: 'Failed to create chart of accounts' });
  }
});

// Fiscal Year Variant Configuration
router.post('/fiscal-year-variant', async (req, res) => {
  try {
    const { variantId, description, postingPeriods } = req.body;
    
    const result = await pool.query(
      'INSERT INTO fiscal_year_variants (variant_id, description, posting_periods) VALUES ($1, $2, $3) RETURNING *',
      [variantId, description, postingPeriods || 12]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Fiscal Year Variant creation error:', error);
    res.status(500).json({ error: 'Failed to create fiscal year variant' });
  }
});

// GL Accounts Configuration
router.post('/gl-accounts', async (req, res) => {
  try {
    const { accountNumber, accountName, accountType, chartOfAccountsId } = req.body;
    
    const result = await pool.query(
      'INSERT INTO gl_accounts (account_number, account_name, account_type, chart_of_accounts_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [accountNumber, accountName, accountType, chartOfAccountsId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('GL Account creation error:', error);
    res.status(500).json({ error: 'Failed to create GL account' });
  }
});

// Configuration Status Check
router.get('/status', async (req, res) => {
  try {
    const companyCodes = await pool.query('SELECT COUNT(*) FROM company_codes');
    const chartOfAccounts = await pool.query('SELECT COUNT(*) FROM chart_of_accounts');
    const fiscalYearVariants = await pool.query('SELECT COUNT(*) FROM fiscal_year_variants');
    const glAccounts = await pool.query('SELECT COUNT(*) FROM gl_accounts');

    const status = {
      enterprise: parseInt(companyCodes.rows[0].count) > 0,
      accounts: parseInt(chartOfAccounts.rows[0].count) > 0 && parseInt(glAccounts.rows[0].count) > 0,
      fiscal: parseInt(fiscalYearVariants.rows[0].count) > 0,
      posting: true,
      parameters: true
    };

    res.json({ 
      success: true, 
      status,
      counts: {
        company_codes: parseInt(companyCodes.rows[0].count),
        chart_of_accounts: parseInt(chartOfAccounts.rows[0].count),
        fiscal_year_variants: parseInt(fiscalYearVariants.rows[0].count),
        gl_accounts: parseInt(glAccounts.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Configuration status check error:', error);
    res.status(500).json({ error: 'Failed to check configuration status' });
  }
});

// Auto-configuration endpoint
router.post('/auto-configure', async (req, res) => {
  try {
    const results = [];

    // 1. Create Company Code
    const companyResult = await pool.query(
      'INSERT INTO company_codes (code, name, currency, country) VALUES ($1, $2, $3, $4) RETURNING *',
      ['1000', 'Sample Company LLC', 'USD', 'US']
    );
    results.push({ step: 'company_code', status: 'completed', data: companyResult.rows[0] });

    // 2. Create Chart of Accounts
    const chartResult = await pool.query(
      'INSERT INTO chart_of_accounts (chart_id, description, account_length) VALUES ($1, $2, $3) RETURNING *',
      ['COPA', 'Corporate Chart of Accounts', 10]
    );
    results.push({ step: 'chart_of_accounts', status: 'completed', data: chartResult.rows[0] });

    // 3. Create Fiscal Year Variant
    const fiscalResult = await pool.query(
      'INSERT INTO fiscal_year_variants (variant_id, description, posting_periods) VALUES ($1, $2, $3) RETURNING *',
      ['K4', 'Calendar Year (Jan-Dec)', 12]
    );
    results.push({ step: 'fiscal_year_variant', status: 'completed', data: fiscalResult.rows[0] });

    // 4. Create GL Accounts
    const glAccountsData = [
      ['100000', 'Cash and Cash Equivalents', 'Asset', chartResult.rows[0].id],
      ['120000', 'Accounts Receivable', 'Asset', chartResult.rows[0].id],
      ['140000', 'Inventory', 'Asset', chartResult.rows[0].id],
      ['200000', 'Accounts Payable', 'Liability', chartResult.rows[0].id],
      ['400000', 'Sales Revenue', 'Revenue', chartResult.rows[0].id],
      ['500000', 'Cost of Goods Sold', 'Expense', chartResult.rows[0].id],
      ['600000', 'Operating Expenses', 'Expense', chartResult.rows[0].id]
    ];

    for (const [accountNumber, accountName, accountType, chartId] of glAccountsData) {
      const accountResult = await pool.query(
        'INSERT INTO gl_accounts (account_number, account_name, account_type, chart_of_accounts_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [accountNumber, accountName, accountType, chartId]
      );
      results.push({ step: 'gl_account', status: 'completed', data: accountResult.rows[0] });
    }

    res.json({ 
      success: true, 
      message: 'Auto-configuration completed successfully',
      results,
      totalSteps: results.length
    });
  } catch (error) {
    console.error('Auto-configuration error:', error);
    res.status(500).json({ error: 'Failed to complete auto-configuration' });
  }
});

export default router;