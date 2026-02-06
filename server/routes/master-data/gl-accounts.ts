import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { pool } from '../../db';
import { eq } from 'drizzle-orm';
import { glAccounts, chartOfAccounts, companyCodes } from '@shared/schema';

const router = Router();

// GET all GL accounts with all fields
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        ga.id,
        ga.account_number,
        ga.account_name,
        ga.long_text,
        ga.chart_of_accounts_id,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_description,
        ga.account_type,
        ga.account_group,
        ga.gl_account_group_id,
        gag.code as gl_account_group_code,
        gag.name as gl_account_group_name,
        ga.balance_sheet_account,
        ga.pl_account,
        ga.reconciliation_account,
        ga.cash_account_indicator,
        ga.block_posting,
        ga.mark_for_deletion,
        ga.is_active,
        ga.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        ga.account_currency,
        ga.field_status_group,
        ga.open_item_management,
        ga.line_item_display,
        ga.sort_key,
        ga.tax_category,
        ga.posting_without_tax_allowed,
        ga.interest_calculation_indicator,
        ga.interest_calculation_frequency,
        ga.interest_calculation_date,
        ga.alternative_account_number,
        ga.group_account_number,
        ga.trading_partner,
        ga.posting_allowed,
        ga.balance_type,
        ga.created_at,
        ga.updated_at,
        ga.created_by,
        ga.updated_by
      FROM gl_accounts ga
      LEFT JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      LEFT JOIN company_codes cc ON ga.company_code_id = cc.id
      LEFT JOIN gl_account_groups gag ON ga.gl_account_group_id = gag.id
      ORDER BY ga.account_number
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching GL accounts:', error);
    res.status(500).json({ error: 'Failed to fetch GL accounts', message: error.message });
  }
});

// GET GL account by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await pool.query(`
      SELECT 
        ga.id,
        ga.account_number,
        ga.account_name,
        ga.long_text,
        ga.chart_of_accounts_id,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_description,
        ga.account_type,
        ga.account_group,
        ga.gl_account_group_id,
        gag.code as gl_account_group_code,
        gag.name as gl_account_group_name,
        ga.balance_sheet_account,
        ga.pl_account,
        ga.reconciliation_account,
        ga.cash_account_indicator,
        ga.block_posting,
        ga.mark_for_deletion,
        ga.is_active,
        ga.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        ga.account_currency,
        ga.field_status_group,
        ga.open_item_management,
        ga.line_item_display,
        ga.sort_key,
        ga.tax_category,
        ga.posting_without_tax_allowed,
        ga.interest_calculation_indicator,
        ga.interest_calculation_frequency,
        ga.interest_calculation_date,
        ga.alternative_account_number,
        ga.group_account_number,
        ga.trading_partner,
        ga.posting_allowed,
        ga.balance_type,
        ga.created_at,
        ga.updated_at,
        ga.created_by,
        ga.updated_by
      FROM gl_accounts ga
      LEFT JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      LEFT JOIN company_codes cc ON ga.company_code_id = cc.id
      LEFT JOIN gl_account_groups gag ON ga.gl_account_group_id = gag.id
      WHERE ga.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GL account not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching GL account:', error);
    res.status(500).json({ error: 'Failed to fetch GL account', message: error.message });
  }
});

// POST create GL account
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      // Section 1: Basic Data
      account_number,
      account_name,
      long_text,
      chart_of_accounts_id,
      account_type,
      account_group,
      gl_account_group_id,
      // Section 2: Account Characteristics
      balance_sheet_account,
      pl_account,
      reconciliation_account,
      cash_account_indicator,
      block_posting,
      mark_for_deletion,
      is_active,
      // Section 3: Company Code Assignment
      company_code_id,
      account_currency,
      field_status_group,
      open_item_management,
      line_item_display,
      sort_key,
      // Section 4: Tax Settings
      tax_category,
      posting_without_tax_allowed,
      // Section 5: Interest Calculation
      interest_calculation_indicator,
      interest_calculation_frequency,
      interest_calculation_date,
      // Section 6: Account Relationships
      alternative_account_number,
      group_account_number,
      trading_partner,
      // Section 7: Additional Settings
      posting_allowed,
      balance_type,
    } = req.body;

    // Validate required fields
    if (!account_number || !account_name || !account_type) {
      return res.status(400).json({ error: 'Account number, name, and type are required' });
    }

    // Validate that gl_account_group_id is provided (preferred over legacy account_group)
    if (!gl_account_group_id && !account_group) {
      return res.status(400).json({ error: 'GL Account Group is required' });
    }

    // Validate account_number format
    if (account_number.length < 1 || account_number.length > 20) {
      return res.status(400).json({ error: 'Account number must be between 1 and 20 characters' });
    }

    // Validate account_name format
    if (account_name.length < 1 || account_name.length > 100) {
      return res.status(400).json({ error: 'Account name must be between 1 and 100 characters' });
    }

    // Validate account_type
    const validAccountTypes = ['assets', 'liabilities', 'equity', 'revenue', 'expenses'];
    if (!validAccountTypes.includes(account_type.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    // Check if account_number already exists for the same company code
    // Account numbers must be unique per company code
    if (company_code_id) {
      const existingCheck = await pool.query(
        'SELECT id, account_name FROM gl_accounts WHERE account_number = $1 AND company_code_id = $2',
        [account_number, company_code_id]
      );

      if (existingCheck.rows.length > 0) {
        const existingAccount = existingCheck.rows[0];
        return res.status(409).json({
          error: `GL account with account number "${account_number}" already exists for this company code (Existing: ${existingAccount.account_name})`
        });
      }
    } else {
      // If no company code, check for duplicates across all accounts without company code
      const existingCheck = await pool.query(
        'SELECT id, account_name FROM gl_accounts WHERE account_number = $1 AND company_code_id IS NULL',
        [account_number]
      );

      if (existingCheck.rows.length > 0) {
        const existingAccount = existingCheck.rows[0];
        return res.status(409).json({
          error: `GL account with account number "${account_number}" already exists without a company code (Existing: ${existingAccount.account_name})`
        });
      }
    }

    // Validate foreign keys if provided
    if (chart_of_accounts_id) {
      const chartExists = await pool.query(
        'SELECT id FROM chart_of_accounts WHERE id = $1',
        [chart_of_accounts_id]
      );
      if (chartExists.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid chart of accounts ID' });
      }

      // If company_code_id is provided, validate that Chart of Accounts is assigned to Company Code
      if (company_code_id) {
        const assignmentCheck = await pool.query(`
          SELECT chart_of_accounts_id 
          FROM company_codes
          WHERE id = $1 
            AND chart_of_accounts_id = $2
            AND active = TRUE
        `, [parseInt(company_code_id), parseInt(chart_of_accounts_id)]).catch(() => ({ rows: [] }));

        if (assignmentCheck.rows.length === 0) {
          // Get details for error message
          const companyCodeResult = await pool.query(
            'SELECT code, name FROM company_codes WHERE id = $1',
            [parseInt(company_code_id)]
          ).catch(() => ({ rows: [] }));

          const coaResult = await pool.query(
            'SELECT COALESCE(code, chart_id, id::VARCHAR) as code, COALESCE(name, description) as name FROM chart_of_accounts WHERE id = $1',
            [parseInt(chart_of_accounts_id)]
          ).catch(() => ({ rows: [] }));

          const companyCode = companyCodeResult.rows[0]?.code || 'Unknown';
          const companyName = companyCodeResult.rows[0]?.name || '';
          const coaCode = coaResult.rows[0]?.code || 'Unknown';
          const coaName = coaResult.rows[0]?.name || 'Unknown';

          return res.status(400).json({
            error: `Chart of Accounts "${coaCode} - ${coaName}" is not assigned to Company Code "${companyCode}${companyName ? ' - ' + companyName : ''}". Please assign the Chart of Accounts to the Company Code first before creating GL accounts.`,
            chart_of_accounts_id: parseInt(chart_of_accounts_id),
            company_code_id: parseInt(company_code_id)
          });
        }
      }
    }

    if (company_code_id) {
      const companyExists = await pool.query(
        'SELECT id FROM company_codes WHERE id = $1',
        [company_code_id]
      );
      if (companyExists.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid company code ID' });
      }
    }

    // Validate gl_account_group_id if provided and get group details for validation
    let glAccountGroup = null;
    if (gl_account_group_id) {
      const glGroupResult = await pool.query(
        'SELECT * FROM gl_account_groups WHERE id = $1',
        [gl_account_group_id]
      );
      if (glGroupResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid GL account group ID' });
      }
      glAccountGroup = glGroupResult.rows[0];
    }

    // Validate account number against GL Account Group range if group is provided
    if (glAccountGroup && account_number) {
      const accountNumStr = account_number.trim();

      // Validate length if min/max length is defined
      if (glAccountGroup.account_number_min_length || glAccountGroup.account_number_max_length) {
        const minLength = glAccountGroup.account_number_min_length || 1;
        const maxLength = glAccountGroup.account_number_max_length || 20;
        if (accountNumStr.length < minLength || accountNumStr.length > maxLength) {
          return res.status(400).json({
            error: `Account number must be between ${minLength} and ${maxLength} characters for GL Account Group "${glAccountGroup.code}"`
          });
        }
      }

      // Validate numeric range if range is defined
      if (glAccountGroup.number_range_start && glAccountGroup.number_range_end) {
        // Check if account number is numeric
        if (!/^\d+$/.test(accountNumStr)) {
          return res.status(400).json({
            error: `Account number must be numeric for GL Account Group "${glAccountGroup.code}"`
          });
        }

        const accountNum = parseInt(accountNumStr, 10);
        const rangeStart = parseInt(glAccountGroup.number_range_start, 10);
        const rangeEnd = parseInt(glAccountGroup.number_range_end, 10);

        if (isNaN(accountNum)) {
          return res.status(400).json({ error: 'Account number must be a valid number' });
        }

        if (!isNaN(rangeStart) && !isNaN(rangeEnd)) {
          if (accountNum < rangeStart || accountNum > rangeEnd) {
            return res.status(400).json({
              error: `Account number must be between ${glAccountGroup.number_range_start} and ${glAccountGroup.number_range_end} for GL Account Group "${glAccountGroup.code}"`
            });
          }
        }
      }
    }

    // Insert into database
    const result = await pool.query(`
      INSERT INTO gl_accounts (
        account_number, account_name, long_text, chart_of_accounts_id, account_type, account_group, gl_account_group_id,
        balance_sheet_account, pl_account, reconciliation_account, cash_account_indicator,
        block_posting, mark_for_deletion, is_active,
        company_code_id, account_currency, field_status_group, open_item_management,
        line_item_display, sort_key,
        tax_category, posting_without_tax_allowed,
        interest_calculation_indicator, interest_calculation_frequency, interest_calculation_date,
        alternative_account_number, group_account_number, trading_partner,
        posting_allowed, balance_type,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW(), NOW()
      )
      RETURNING *
    `, [
      account_number,
      account_name,
      long_text || null,
      chart_of_accounts_id || null,
      account_type.toLowerCase(),
      account_group || null,
      gl_account_group_id || null,
      balance_sheet_account || false,
      pl_account || false,
      reconciliation_account || false,
      cash_account_indicator || false,
      block_posting || false,
      mark_for_deletion || false,
      is_active !== undefined ? is_active : true,
      company_code_id || null,
      account_currency || null,
      field_status_group || null,
      open_item_management || false,
      line_item_display !== undefined ? line_item_display : true,
      sort_key || null,
      tax_category || null,
      posting_without_tax_allowed || false,
      interest_calculation_indicator || false,
      interest_calculation_frequency || null,
      interest_calculation_date || null,
      alternative_account_number || null,
      group_account_number || null,
      trading_partner || null,
      posting_allowed !== undefined ? posting_allowed : true,
      balance_type || null,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating GL account:', error);
    if (error.code === '23505') {
      // Check if it's a primary key constraint violation (sequence issue)
      if (error.constraint === 'gl_accounts_pkey') {
        // Try to fix the sequence and retry once
        try {
          const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM gl_accounts');
          const maxId = maxIdResult.rows[0].max_id || 0;
          const nextId = maxId + 1;
          await pool.query(`SELECT setval('gl_accounts_id_seq', $1, false)`, [nextId]);
          console.log(`Fixed sequence to ${nextId}, retrying insert...`);

          // Retry the insert with the same values from req.body
          const {
            account_number: retry_account_number,
            account_name: retry_account_name,
            long_text: retry_long_text,
            chart_of_accounts_id: retry_chart_of_accounts_id,
            account_type: retry_account_type,
            account_group: retry_account_group,
            gl_account_group_id: retry_gl_account_group_id,
            balance_sheet_account: retry_balance_sheet_account,
            pl_account: retry_pl_account,
            reconciliation_account: retry_reconciliation_account,
            cash_account_indicator: retry_cash_account_indicator,
            block_posting: retry_block_posting,
            mark_for_deletion: retry_mark_for_deletion,
            is_active: retry_is_active,
            company_code_id: retry_company_code_id,
            account_currency: retry_account_currency,
            field_status_group: retry_field_status_group,
            open_item_management: retry_open_item_management,
            line_item_display: retry_line_item_display,
            sort_key: retry_sort_key,
            tax_category: retry_tax_category,
            posting_without_tax_allowed: retry_posting_without_tax_allowed,
            interest_calculation_indicator: retry_interest_calculation_indicator,
            interest_calculation_frequency: retry_interest_calculation_frequency,
            interest_calculation_date: retry_interest_calculation_date,
            alternative_account_number: retry_alternative_account_number,
            group_account_number: retry_group_account_number,
            trading_partner: retry_trading_partner,
            posting_allowed: retry_posting_allowed,
            balance_type: retry_balance_type,
          } = req.body;

          const retryResult = await pool.query(`
            INSERT INTO gl_accounts (
              account_number, account_name, long_text, chart_of_accounts_id, account_type, account_group, gl_account_group_id,
              balance_sheet_account, pl_account, reconciliation_account, cash_account_indicator,
              block_posting, mark_for_deletion, is_active,
              company_code_id, account_currency, field_status_group, open_item_management,
              line_item_display, sort_key,
              tax_category, posting_without_tax_allowed,
              interest_calculation_indicator, interest_calculation_frequency, interest_calculation_date,
              alternative_account_number, group_account_number, trading_partner,
              posting_allowed, balance_type,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW(), NOW()
            )
            RETURNING *
          `, [
            retry_account_number,
            retry_account_name,
            retry_long_text || null,
            retry_chart_of_accounts_id || null,
            retry_account_type.toLowerCase(),
            retry_account_group || null,
            retry_gl_account_group_id || null,
            retry_balance_sheet_account || false,
            retry_pl_account || false,
            retry_reconciliation_account || false,
            retry_cash_account_indicator || false,
            retry_block_posting || false,
            retry_mark_for_deletion || false,
            retry_is_active !== undefined ? retry_is_active : true,
            retry_company_code_id || null,
            retry_account_currency || null,
            retry_field_status_group || null,
            retry_open_item_management || false,
            retry_line_item_display !== undefined ? retry_line_item_display : true,
            retry_sort_key || null,
            retry_tax_category || null,
            retry_posting_without_tax_allowed || false,
            retry_interest_calculation_indicator || false,
            retry_interest_calculation_frequency || null,
            retry_interest_calculation_date || null,
            retry_alternative_account_number || null,
            retry_group_account_number || null,
            retry_trading_partner || null,
            retry_posting_allowed !== undefined ? retry_posting_allowed : true,
            retry_balance_type || null,
          ]);

          return res.status(201).json(retryResult.rows[0]);
        } catch (retryError: any) {
          console.error('Error on retry:', retryError);
          return res.status(500).json({ error: 'Failed to create GL account after sequence fix', message: retryError.message });
        }
      }
      // Check if it's a duplicate account_number for the same company code
      const accountNum = req.body.account_number;
      const companyCodeId = req.body.company_code_id;
      if (accountNum) {
        if (companyCodeId) {
          const duplicateCheck = await pool.query(
            'SELECT id, account_name FROM gl_accounts WHERE account_number = $1 AND company_code_id = $2',
            [accountNum, companyCodeId]
          );
          if (duplicateCheck.rows.length > 0) {
            const duplicateAccount = duplicateCheck.rows[0];
            return res.status(409).json({
              error: `GL account with account number "${accountNum}" already exists for this company code (Existing: ${duplicateAccount.account_name})`
            });
          }
        } else {
          const duplicateCheck = await pool.query(
            'SELECT id, account_name FROM gl_accounts WHERE account_number = $1 AND company_code_id IS NULL',
            [accountNum]
          );
          if (duplicateCheck.rows.length > 0) {
            const duplicateAccount = duplicateCheck.rows[0];
            return res.status(409).json({
              error: `GL account with account number "${accountNum}" already exists without a company code (Existing: ${duplicateAccount.account_name})`
            });
          }
        }
      }
      res.status(409).json({ error: 'Duplicate entry detected' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference' });
    } else {
      res.status(500).json({ error: 'Failed to create GL account', message: error.message });
    }
  }
});

// PUT update GL account
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if account exists and get current data
    const existingCheck = await pool.query(
      'SELECT id, gl_account_group_id FROM gl_accounts WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'GL account not found' });
    }

    const existingAccount = existingCheck.rows[0];

    const {
      account_number,
      account_name,
      long_text,
      chart_of_accounts_id,
      account_type,
      account_group,
      gl_account_group_id,
      balance_sheet_account,
      pl_account,
      reconciliation_account,
      cash_account_indicator,
      block_posting,
      mark_for_deletion,
      is_active,
      company_code_id,
      account_currency,
      field_status_group,
      open_item_management,
      line_item_display,
      sort_key,
      tax_category,
      posting_without_tax_allowed,
      interest_calculation_indicator,
      interest_calculation_frequency,
      interest_calculation_date,
      alternative_account_number,
      group_account_number,
      trading_partner,
      posting_allowed,
      balance_type,
    } = req.body;

    // Validate if account_number is being changed
    if (account_number) {
      if (account_number.length < 1 || account_number.length > 20) {
        return res.status(400).json({ error: 'Account number must be between 1 and 20 characters' });
      }

      // Check for duplicate account number within the same company code (or without company code)
      // Get the company_code_id to check - use the new one if provided, otherwise use existing
      const companyIdToCheck = company_code_id !== undefined ? company_code_id : existingAccount.company_code_id;

      if (companyIdToCheck) {
        const duplicateCheck = await pool.query(
          'SELECT id, account_name FROM gl_accounts WHERE account_number = $1 AND company_code_id = $2 AND id != $3',
          [account_number, companyIdToCheck, id]
        );

        if (duplicateCheck.rows.length > 0) {
          const duplicateAccount = duplicateCheck.rows[0];
          return res.status(409).json({
            error: `GL account with account number "${account_number}" already exists for this company code (Existing: ${duplicateAccount.account_name})`
          });
        }
      } else {
        // Check for duplicates without company code
        const duplicateCheck = await pool.query(
          'SELECT id, account_name FROM gl_accounts WHERE account_number = $1 AND company_code_id IS NULL AND id != $2',
          [account_number, id]
        );

        if (duplicateCheck.rows.length > 0) {
          const duplicateAccount = duplicateCheck.rows[0];
          return res.status(409).json({
            error: `GL account with account number "${account_number}" already exists without a company code (Existing: ${duplicateAccount.account_name})`
          });
        }
      }
    }

    // Validate gl_account_group_id if provided and get group details for validation
    let glAccountGroup = null;
    if (gl_account_group_id) {
      const glGroupResult = await pool.query(
        'SELECT * FROM gl_account_groups WHERE id = $1',
        [gl_account_group_id]
      );
      if (glGroupResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid GL account group ID' });
      }
      glAccountGroup = glGroupResult.rows[0];
    }

    // Validate account number against GL Account Group range if account number is being changed and group is provided
    if (account_number && (gl_account_group_id || existingAccount?.gl_account_group_id)) {
      // Use the new group_id if provided, otherwise use existing one
      const groupIdToCheck = gl_account_group_id || existingAccount?.gl_account_group_id;
      if (!glAccountGroup && groupIdToCheck) {
        const glGroupResult = await pool.query(
          'SELECT * FROM gl_account_groups WHERE id = $1',
          [groupIdToCheck]
        );
        if (glGroupResult.rows.length > 0) {
          glAccountGroup = glGroupResult.rows[0];
        }
      }

      if (glAccountGroup) {
        const accountNumStr = account_number.trim();

        // Validate length if min/max length is defined
        if (glAccountGroup.account_number_min_length || glAccountGroup.account_number_max_length) {
          const minLength = glAccountGroup.account_number_min_length || 1;
          const maxLength = glAccountGroup.account_number_max_length || 20;
          if (accountNumStr.length < minLength || accountNumStr.length > maxLength) {
            return res.status(400).json({
              error: `Account number must be between ${minLength} and ${maxLength} characters for GL Account Group "${glAccountGroup.code}"`
            });
          }
        }

        // Validate numeric range if range is defined
        if (glAccountGroup.number_range_start && glAccountGroup.number_range_end) {
          // Check if account number is numeric
          if (!/^\d+$/.test(accountNumStr)) {
            return res.status(400).json({
              error: `Account number must be numeric for GL Account Group "${glAccountGroup.code}"`
            });
          }

          const accountNum = parseInt(accountNumStr, 10);
          const rangeStart = parseInt(glAccountGroup.number_range_start, 10);
          const rangeEnd = parseInt(glAccountGroup.number_range_end, 10);

          if (isNaN(accountNum)) {
            return res.status(400).json({ error: 'Account number must be a valid number' });
          }

          if (!isNaN(rangeStart) && !isNaN(rangeEnd)) {
            if (accountNum < rangeStart || accountNum > rangeEnd) {
              return res.status(400).json({
                error: `Account number must be between ${glAccountGroup.number_range_start} and ${glAccountGroup.number_range_end} for GL Account Group "${glAccountGroup.code}"`
              });
            }
          }
        }
      }
    }

    // Update account
    const result = await pool.query(`
      UPDATE gl_accounts SET
        account_number = COALESCE($1, account_number),
        account_name = COALESCE($2, account_name),
        long_text = $3,
        chart_of_accounts_id = $4,
        account_type = COALESCE($5, account_type),
        account_group = COALESCE($6, account_group),
        gl_account_group_id = COALESCE($7, gl_account_group_id),
        balance_sheet_account = COALESCE($8, balance_sheet_account),
        pl_account = COALESCE($9, pl_account),
        reconciliation_account = COALESCE($10, reconciliation_account),
        cash_account_indicator = COALESCE($11, cash_account_indicator),
        block_posting = COALESCE($12, block_posting),
        mark_for_deletion = COALESCE($13, mark_for_deletion),
        is_active = COALESCE($14, is_active),
        company_code_id = $15,
        account_currency = $16,
        field_status_group = $17,
        open_item_management = COALESCE($18, open_item_management),
        line_item_display = COALESCE($19, line_item_display),
        sort_key = $20,
        tax_category = $21,
        posting_without_tax_allowed = COALESCE($22, posting_without_tax_allowed),
        interest_calculation_indicator = COALESCE($23, interest_calculation_indicator),
        interest_calculation_frequency = $24,
        interest_calculation_date = $25,
        alternative_account_number = $26,
        group_account_number = $27,
        trading_partner = $28,
        posting_allowed = COALESCE($29, posting_allowed),
        balance_type = $30,
        updated_at = NOW()
      WHERE id = $31
      RETURNING *
    `, [
      account_number,
      account_name,
      long_text,
      chart_of_accounts_id,
      account_type,
      account_group,
      gl_account_group_id,
      balance_sheet_account,
      pl_account,
      reconciliation_account,
      cash_account_indicator,
      block_posting,
      mark_for_deletion,
      is_active,
      company_code_id,
      account_currency,
      field_status_group,
      open_item_management,
      line_item_display,
      sort_key,
      tax_category,
      posting_without_tax_allowed,
      interest_calculation_indicator,
      interest_calculation_frequency,
      interest_calculation_date,
      alternative_account_number,
      group_account_number,
      trading_partner,
      posting_allowed,
      balance_type,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating GL account:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'GL account with this account number already exists' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference' });
    } else {
      res.status(500).json({ error: 'Failed to update GL account', message: error.message });
    }
  }
});

// DELETE GL account
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await pool.query(
      'DELETE FROM gl_accounts WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GL account not found' });
    }

    res.status(200).json({ message: 'GL account deleted successfully', id: result.rows[0].id });
  } catch (error: any) {
    console.error('Error deleting GL account:', error);
    res.status(500).json({ error: 'Failed to delete GL account', message: error.message });
  }
});

export default router;

