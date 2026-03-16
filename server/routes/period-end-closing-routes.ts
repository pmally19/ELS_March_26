import { Router } from 'express';
import { dbPool as pool } from '../database.js';
import { z } from 'zod';
import PeriodAuditService from '../services/period-audit-service';
import { balanceCarryForwardService } from '../services/balance-carry-forward-service.js';

const router = Router();

// Schema for period end closing - no hardcoded defaults
const periodEndClosingSchema = z.object({
  fiscalPeriodId: z.number().int().optional().nullable(),
  companyCodeId: z.number().int().optional().nullable(), // Made optional
  year: z.number().int().min(2000).max(2100),
  period: z.number().int().min(1).max(16),
  closingType: z.enum(['month_end', 'quarter_end', 'year_end']).optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updatePeriodEndClosingSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'failed']).optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  validatedEntries: z.number().int().optional(),
  unbalancedEntries: z.number().int().optional(),
  totalDebits: z.string().optional(),
  totalCredits: z.string().optional(),
  closingDocumentNumber: z.string().optional().nullable(),
});

// Reopen a closed period
router.post('/:id/reopen', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, userId } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get closing record
      const closingResult = await client.query(
        `SELECT * FROM period_end_closing WHERE id = $1`,
        [id]
      );

      if (closingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Period closing record not found'
        });
      }

      const closing = closingResult.rows[0];

      if (closing.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Only completed closings can be reopened'
        });
      }

      // Reopen fiscal period
      await client.query(
        `UPDATE fiscal_periods 
         SET status = 'Open', posting_allowed = true, updated_at = NOW() 
         WHERE year = $1 AND period = $2`,
        [closing.year, closing.period]
      );

      // Update closing status
      await client.query(
        `UPDATE period_end_closing 
         SET status = 'cancelled', notes = $1, updated_at = NOW() 
         WHERE id = $2`,
        [reason || 'Period reopened', id]
      );

      // Log audit trail
      await PeriodAuditService.logPeriodStatusChange(
        closing.fiscal_period_id,
        'Closed',
        'Open',
        userId,
        reason || 'Period reopened'
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Period reopened successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Error reopening period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reopen period',
      message: error.message
    });
  }
});

// Get errors for a failed closing
router.get('/:id/errors', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM period_closing_errors 
       WHERE closing_id = $1 
       ORDER BY detected_at DESC`,
      [id]
    );

    res.json({
      success: true,
      errors: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching closing errors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch closing errors'
    });
  }
});

//  Bulk close multiple periods
router.post('/bulk-close', async (req, res) => {
  try {
    const { periods, userId } = req.body; // periods: [{year, period, companyCodeId}]

    if (!Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Periods array is required'
      });
    }

    const results = [];

    for (const periodData of periods) {
      try {
        // Create closing record
        const createResult = await pool.query(
          `INSERT INTO period_end_closing 
           (year, period, company_code_id, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'pending', NOW(), NOW())
           RETURNING id`,
          [periodData.year, periodData.period, periodData.companyCodeId]
        );

        const closingId = createResult.rows[0].id;

        results.push({
          year: periodData.year,
          period: periodData.period,
          closingId,
          status: 'created'
        });

      } catch (error: any) {
        results.push({
          year: periodData.year,
          period: periodData.period,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      message: `Bulk close initiated for ${periods.length} periods`
    });

  } catch (error: any) {
    console.error('Error in bulk close:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk close'
    });
  }
});

// Cancel period end closing process
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE period_end_closing 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 
      AND status IN ('pending', 'in_progress')
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Period closing cannot be cancelled. It may already be completed, cancelled, or failed.'
      });
    }

    res.json({
      success: true,
      record: result.rows[0],
      message: 'Period closing cancelled successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling period end closing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel period end closing',
      message: error.message
    });
  }
});

// Get all period end closing records with related data
router.get('/', async (req, res) => {
  try {
    const { companyCodeId, year, period, status } = req.query;

    let query = `
      SELECT 
        pec.*,
        cc.code as company_code,
        cc.name as company_name,
        fp.name as fiscal_period_name,
        fp.start_date as fiscal_period_start,
        fp.end_date as fiscal_period_end
      FROM period_end_closing pec
      LEFT JOIN company_codes cc ON pec.company_code_id = cc.id
      LEFT JOIN fiscal_periods fp ON pec.fiscal_period_id = fp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (companyCodeId) {
      paramCount++;
      query += ` AND pec.company_code_id = $${paramCount}`;
      params.push(parseInt(companyCodeId as string));
    }

    if (year) {
      paramCount++;
      query += ` AND pec.year = $${paramCount}`;
      params.push(parseInt(year as string));
    }

    if (period) {
      paramCount++;
      query += ` AND pec.period = $${paramCount}`;
      params.push(parseInt(period as string));
    }

    if (status) {
      paramCount++;
      query += ` AND pec.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY pec.year DESC, pec.period DESC, pec.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      records: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching period end closing records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch period end closing records',
      message: error.message
    });
  }
});

// Get single period end closing record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        pec.*,
        cc.code as company_code,
        cc.name as company_name,
        fp.name as fiscal_period_name,
        fp.start_date as fiscal_period_start,
        fp.end_date as fiscal_period_end
      FROM period_end_closing pec
      LEFT JOIN company_codes cc ON pec.company_code_id = cc.id
      LEFT JOIN fiscal_periods fp ON pec.fiscal_period_id = fp.id
      WHERE pec.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Period end closing record not found'
      });
    }

    res.json({
      success: true,
      record: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching period end closing record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch period end closing record',
      message: error.message
    });
  }
});

// Create new period end closing record
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const validatedData = periodEndClosingSchema.parse(req.body);

    // Get or use default company code
    let companyCodeId = validatedData.companyCodeId;

    if (!companyCodeId) {
      // Get the first active company code as default
      const defaultCompany = await client.query(
        'SELECT id FROM company_codes WHERE active = true ORDER BY id LIMIT 1'
      );

      if (defaultCompany.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'No company code provided and no default company code found'
        });
      }

      companyCodeId = defaultCompany.rows[0].id;
    }

    // Verify company code exists
    const companyCheck = await client.query(
      'SELECT id FROM company_codes WHERE id = $1',
      [companyCodeId]
    );

    if (companyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid company code ID'
      });
    }

    // Check if fiscal period exists and matches year/period
    let fiscalPeriodId = validatedData.fiscalPeriodId;
    if (fiscalPeriodId) {
      const fiscalPeriodCheck = await client.query(
        'SELECT id FROM fiscal_periods WHERE id = $1 AND year = $2 AND period = $3',
        [fiscalPeriodId, validatedData.year, validatedData.period]
      );

      if (fiscalPeriodCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Fiscal period ID does not match year and period'
        });
      }
    } else {
      // Try to find matching fiscal period
      const fiscalPeriodResult = await client.query(
        'SELECT id FROM fiscal_periods WHERE year = $1 AND period = $2 LIMIT 1',
        [validatedData.year, validatedData.period]
      );

      if (fiscalPeriodResult.rows.length > 0) {
        fiscalPeriodId = fiscalPeriodResult.rows[0].id;
      }
    }

    // Use closing type from request, no hardcoded defaults
    const closingType = validatedData.closingType || null;

    const result = await client.query(`
      INSERT INTO period_end_closing (
        fiscal_period_id, company_code_id, year, period,
        closing_type, description, notes, status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW()
      ) RETURNING *
    `, [
      fiscalPeriodId || null,
      companyCodeId,  // Use resolved companyCodeId
      validatedData.year,
      validatedData.period,
      closingType,
      validatedData.description || null,
      validatedData.notes || null
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      record: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating period end closing record:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create period end closing record',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// Update period end closing record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updatePeriodEndClosingSchema.parse(req.body);

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`"${key}" = $${paramCount}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    paramCount++;
    params.push(id);

    const result = await pool.query(`
      UPDATE period_end_closing 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Period end closing record not found'
      });
    }

    res.json({
      success: true,
      record: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating period end closing record:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update period end closing record',
      message: error.message
    });
  }
});

// Process period end closing - validates entries, checks balances, calculates totals
router.post('/:id/process', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get the period closing record
    const periodRecord = await client.query(`
      SELECT * FROM period_end_closing WHERE id = $1
    `, [id]);

    if (periodRecord.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Period end closing record not found'
      });
    }

    const record = periodRecord.rows[0];

    // Check if already completed
    if (record.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Period closing is already completed'
      });
    }

    // Update status to in_progress
    await client.query(`
      UPDATE period_end_closing 
      SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Get company code string for accounting_documents query
    const companyCodeResult = await client.query(`
      SELECT code FROM company_codes WHERE id = $1
    `, [record.company_code_id]);
    const companyCode = companyCodeResult.rows[0]?.code;

    // 1. Validate all GL entries are balanced for this period and company
    // Check both gl_entries (legacy) and accounting_documents (new) tables
    // First check gl_entries
    const unbalancedCheckGL = await client.query(`
      SELECT 
        ge.document_number,
        SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END) as balance
      FROM gl_entries ge
      INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.fiscal_year = $1 
      AND ge.fiscal_period = $2
      AND ge.posting_status ILIKE 'posted'
      AND ga.company_code_id = $3
      GROUP BY ge.document_number
      HAVING ABS(SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE -ge.amount::numeric END)) > 0.01
    `, [record.year, record.period, record.company_code_id]);

    // Check accounting_documents (new accounting system) - use company_code string directly
    const unbalancedCheckAD = await client.query(`
      SELECT 
        ad.document_number,
        SUM(adi.debit_amount::numeric - adi.credit_amount::numeric) as balance
      FROM accounting_documents ad
      INNER JOIN accounting_document_items adi ON ad.id = adi.document_id
      WHERE ad.fiscal_year = $1 
      AND ad.period = $2
      AND ad.status ILIKE 'posted'
      AND ad.company_code = $3
      GROUP BY ad.document_number
      HAVING ABS(SUM(adi.debit_amount::numeric - adi.credit_amount::numeric)) > 0.01
    `, [record.year, record.period, companyCode]);

    const unbalancedCount = unbalancedCheckGL.rows.length + unbalancedCheckAD.rows.length;

    // 2. Count total validated entries (filtered by company) - both tables
    const validatedEntriesResultGL = await client.query(`
      SELECT COUNT(DISTINCT ge.document_number) as count
      FROM gl_entries ge
      INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.fiscal_year = $1 
      AND ge.fiscal_period = $2
      AND ge.posting_status ILIKE 'posted'
      AND ga.company_code_id = $3
    `, [record.year, record.period, record.company_code_id]);

    const validatedEntriesResultAD = await client.query(`
      SELECT COUNT(DISTINCT ad.document_number) as count
      FROM accounting_documents ad
      WHERE ad.fiscal_year = $1 
      AND ad.period = $2
      AND ad.status ILIKE 'posted'
      AND ad.company_code = $3
    `, [record.year, record.period, companyCode]);

    const validatedEntries = parseInt(validatedEntriesResultGL.rows[0]?.count || '0') +
      parseInt(validatedEntriesResultAD.rows[0]?.count || '0');

    // 3. Calculate total debits and credits (filtered by company) - both tables
    const totalsResultGL = await client.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN ge.debit_credit_indicator = 'D' THEN ge.amount::numeric ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN ge.debit_credit_indicator = 'C' THEN ge.amount::numeric ELSE 0 END), 0) as total_credits
      FROM gl_entries ge
      INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.fiscal_year = $1 
      AND ge.fiscal_period = $2
      AND ge.posting_status ILIKE 'posted'
      AND ga.company_code_id = $3
    `, [record.year, record.period, record.company_code_id]);

    const totalsResultAD = await client.query(`
      SELECT 
        COALESCE(SUM(
          CASE WHEN adi.id IS NOT NULL THEN adi.debit_amount::numeric 
          ELSE ad.total_amount::numeric END
        ), 0) as total_debits,
        COALESCE(SUM(
          CASE WHEN adi.id IS NOT NULL THEN adi.credit_amount::numeric 
          ELSE ad.total_amount::numeric END
        ), 0) as total_credits
      FROM accounting_documents ad
      LEFT JOIN accounting_document_items adi ON ad.id = adi.document_id
      WHERE ad.fiscal_year = $1 
      AND ad.period = $2
      AND ad.status ILIKE 'posted'
      AND ad.company_code = $3
    `, [record.year, record.period, companyCode]);

    const totalDebits = (
      parseFloat(totalsResultGL.rows[0]?.total_debits || '0') +
      parseFloat(totalsResultAD.rows[0]?.total_debits || '0')
    ).toFixed(2);
    const totalCredits = (
      parseFloat(totalsResultGL.rows[0]?.total_credits || '0') +
      parseFloat(totalsResultAD.rows[0]?.total_credits || '0')
    ).toFixed(2);

    // 4. Determine final status based on validation
    let finalStatus = 'completed';
    let closingDate = new Date().toISOString();

    if (unbalancedCount > 0) {
      finalStatus = 'failed';
      closingDate = null;
    }

    // 5. Update fiscal period status if closing is successful
    if (finalStatus === 'completed') {
      // Update fiscal_periods - handle both cases: with and without company_code_id
      const updateFiscalPeriod = await client.query(`
        UPDATE fiscal_periods 
         SET status = 'Closed', 
             posting_allowed = false,
             updated_at = NOW()
         WHERE year = $1 
         AND period = $2
         AND (company_code_id = $3 OR company_code_id IS NULL)
         RETURNING id
      `, [record.year, record.period, record.company_code_id]);

      // If no fiscal period was found with company_code_id, try to find/create one
      if (updateFiscalPeriod.rows.length === 0) {
        // Try to find any fiscal period for this year/period (without company filter)
        const findFiscalPeriod = await client.query(`
          SELECT id FROM fiscal_periods 
          WHERE year = $1 AND period = $2 
          LIMIT 1
        `, [record.year, record.period]);

        if (findFiscalPeriod.rows.length > 0) {
          // Update the found fiscal period
          await client.query(`
            UPDATE fiscal_periods 
            SET status = 'Closed', 
                posting_allowed = false,
                company_code_id = $2,
                updated_at = NOW()
            WHERE id = $1
          `, [findFiscalPeriod.rows[0].id, record.company_code_id]);
        }
      }
    }

    // 6. Update period closing record with results
    const updateResult = await client.query(`
      UPDATE period_end_closing 
      SET 
        status = $1::text,
        validated_entries = $2,
        unbalanced_entries = $3,
        total_debits = $4,
        total_credits = $5,
        closing_date = $6,
        completed_at = CASE WHEN $1::text = 'completed' THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      finalStatus,
      validatedEntries,
      unbalancedCount,
      totalDebits.toString(),
      totalCredits.toString(),
      closingDate,
      id
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      record: updateResult.rows[0],
      validation: {
        validatedEntries,
        unbalancedEntries: unbalancedCount,
        totalDebits,
        totalCredits,
        isBalanced: unbalancedCount === 0,
        message: unbalancedCount === 0
          ? `Period ${record.period}/${record.year} closed successfully`
          : `Period closing failed: ${unbalancedCount} unbalanced entries found`
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing period end closing:', error);

    // Update status to failed
    try {
      await pool.query(`
        UPDATE period_end_closing 
        SET status = 'failed', updated_at = NOW()
        WHERE id = $1
      `, [req.params.id]);
    } catch (updateError) {
      console.error('Error updating status to failed:', updateError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process period end closing',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// Delete period end closing record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM period_end_closing 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Period end closing record not found'
      });
    }

    res.json({
      success: true,
      message: 'Period end closing record deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting period end closing record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete period end closing record',
      message: error.message
    });
  }
});

// Balance carry forward - close P&L and carry BS balances to next period
router.post('/:periodId/carry-forward', async (req, res) => {
  try {
    const { periodId } = req.params;
    const { userId } = req.body;

    const result = await balanceCarryForwardService.carryForwardBalances(
      parseInt(periodId),
      userId || 'system'
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        openingBalanceJeId: result.openingBalanceJeId,
        retainedEarningsJeId: result.retainedEarningsJeId
      }
    });
  } catch (error: any) {
    console.error('Error in balance carry forward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to carry forward balances',
      message: error.message
    });
  }
});

// Get balance sheet accounts preview for carry forward
router.get('/:periodId/balance-preview', async (req, res) => {
  try {
    const { periodId } = req.params;

    // Get period details
    const periodResult = await pool.query(`
      SELECT * FROM fiscal_periods WHERE id = $1
    `, [periodId]);

    if (periodResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Period not found'
      });
    }

    const period = periodResult.rows[0];

    // Get P&L balances
    const plBalances = await pool.query(`
      SELECT 
        ga.id,
        ga.account_number,
        ga.account_name,
        ga.account_type,
        SUM(jeli.debit_amount - jeli.credit_amount) as balance
      FROM journal_entry_line_items jeli
      JOIN journal_entries je ON jeli.journal_entry_id = je.id
      JOIN gl_accounts ga ON jeli.gl_account = ga.account_number
      WHERE je.fiscal_year = $1 
        AND je.fiscal_period <= $2
        AND je.status = 'POSTED'
        AND ga.balance_sheet_account = false
      GROUP BY ga.id, ga.account_number, ga.account_name, ga.account_type
      HAVING ABS(SUM(jeli.debit_amount - jeli.credit_amount)) > 0.01
      ORDER BY ga.account_number
    `, [period.year, period.period]);

    // Get BS balances
    const bsBalances = await pool.query(`
      SELECT 
        ga.id,
        ga.account_number,
        ga.account_name,
        ga.account_type,
        SUM(jeli.debit_amount - jeli.credit_amount) as balance
      FROM journal_entry_line_items jeli
      JOIN journal_entries je ON jeli.journal_entry_id = je.id
      JOIN gl_accounts ga ON jeli.gl_account = ga.account_number
      WHERE je.fiscal_year = $1 
        AND je.fiscal_period <= $2
        AND je.status = 'POSTED'
        AND ga.balance_sheet_account = true
      GROUP BY ga.id, ga.account_number, ga.account_name, ga.account_type
      HAVING ABS(SUM(jeli.debit_amount - jeli.credit_amount)) > 0.01
      ORDER BY ga.account_number
    `, [period.year, period.period]);

    // Calculate net P&L
    const netPL = plBalances.rows.reduce((sum, account) => {
      const balance = parseFloat(account.balance);
      if (account.account_type === 'REVENUE' || account.account_type === 'revenue') {
        return sum - balance;
      } else {
        return sum + balance;
      }
    }, 0);

    res.json({
      success: true,
      data: {
        period: {
          id: period.id,
          year: period.year,
          period: period.period,
          name: period.name,
          status: period.status
        },
        plAccounts: plBalances.rows.map(row => ({
          ...row,
          balance: parseFloat(row.balance)
        })),
        bsAccounts: bsBalances.rows.map(row => ({
          ...row,
          balance: parseFloat(row.balance)
        })),
        netProfitLoss: netPL
      }
    });
  } catch (error: any) {
    console.error('Error fetching balance preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance preview',
      message: error.message
    });
  }
});

export default router;
