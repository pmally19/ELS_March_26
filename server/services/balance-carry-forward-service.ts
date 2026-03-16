import pkg from 'pg';
const { Pool } = pkg;
import { getPool } from '../database.js';

const pool = getPool ? getPool() : new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

export class BalanceCarryForwardService {
  /**
   * Carry forward balances from one period to the next
   * This closes P&L accounts to retained earnings and creates opening balances
   */
  async carryForwardBalances(fiscalPeriodId: number, userId: string = 'system'): Promise<{
    success: boolean;
    message: string;
    openingBalanceJeId?: number;
    retainedEarningsJeId?: number;
  }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current period details
      const periodResult = await client.query(`
        SELECT fp.*, cc.company_code
        FROM fiscal_periods fp
        LEFT JOIN company_codes cc ON fp.company_code_id = cc.id
        WHERE fp.id = $1
      `, [fiscalPeriodId]);

      if (periodResult.rows.length === 0) {
        throw new Error(`Fiscal period ID ${fiscalPeriodId} not found`);
      }

      const currentPeriod = periodResult.rows[0];

      // Check current period status
      if (currentPeriod.status === 'Closed') {
        throw new Error(`Period ${currentPeriod.period}/${currentPeriod.year} is already closed`);
      }

      // Get next period
      const nextPeriodResult = await client.query(`
        SELECT * FROM fiscal_periods 
        WHERE company_code_id = $1 
          AND year = $2 
          AND period = $3
        LIMIT 1
      `, [
        currentPeriod.company_code_id,
        currentPeriod.period === 12 ? currentPeriod.year + 1 : currentPeriod.year,
        currentPeriod.period === 12 ? 1 : currentPeriod.period + 1
      ]);

      if (nextPeriodResult.rows.length === 0) {
        throw new Error(
          `Next period not found. Please create Period ${currentPeriod.period === 12 ? 1 : currentPeriod.period + 1}/${currentPeriod.period === 12 ? currentPeriod.year + 1 : currentPeriod.year} first.`
        );
      }

      const nextPeriod = nextPeriodResult.rows[0];

      // ====================
      // STEP 1: Close P&L accounts to retained earnings
      // ====================

      // Calculate P&L balances
      const plBalances = await client.query(`
        SELECT 
          ga.id,
          ga.account_number,
          ga.account_name,
          ga.account_type,
          ga.normal_balance,
          SUM(jeli.debit_amount - jeli.credit_amount) as balance
        FROM journal_entry_line_items jeli
        JOIN journal_entries je ON jeli.journal_entry_id = je.id
        JOIN gl_accounts ga ON jeli.gl_account = ga.account_number
        WHERE je.fiscal_year = $1 
          AND je.fiscal_period <= $2
          AND je.status = 'POSTED'
          AND ga.balance_sheet_account = false
        GROUP BY ga.id, ga.account_number, ga.account_name, ga.account_type, ga.normal_balance
        HAVING ABS(SUM(jeli.debit_amount - jeli.credit_amount)) > 0.01
      `, [currentPeriod.year, currentPeriod.period]);

      let retainedEarningsJeId = null;
      let totalProfitLoss = 0;

      if (plBalances.rows.length > 0) {
        // Calculate net income/loss
        totalProfitLoss = plBalances.rows.reduce((sum, account) => {
          const balance = parseFloat(account.balance);
          // Revenue has credit normal balance, so negative balance = revenue
          // Expense has debit normal balance, so positive balance = expense
          if (account.account_type === 'REVENUE' || account.account_type === 'revenue') {
            return sum - balance; // Revenue increases net income
          } else {
            return sum + balance; // Expense decreases net income
          }
        }, 0);

        // Get retained earnings account
        const retainedEarningsResult = await client.query(`
          SELECT id, account_number, account_name 
          FROM gl_accounts 
          WHERE account_type IN ('EQUITY', 'equity') 
            AND (account_name ILIKE '%retained%' OR account_name ILIKE '%earnings%')
          LIMIT 1
        `);

        if (retainedEarningsResult.rows.length === 0) {
          throw new Error('Retained earnings account not found. Please create a retained earnings account first.');
        }

        const retainedEarningsAccount = retainedEarningsResult.rows[0];

        // Generate document number for retained earnings JE
        const retEarnDocNum = await client.query(`
          SELECT 'RETEAR' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('journal_entries_id_seq')::TEXT, 6, '0') as doc_num
        `);

        // Create closing journal entry (close P&L to retained earnings)
        const closingJeResult = await client.query(`
          INSERT INTO journal_entries (
            document_number, company_code_id, posting_date, document_date,
            fiscal_year, fiscal_period, reference, header_text,
            total_debit, total_credit, balance_check, created_by, status
          ) VALUES (
            $1, $2, $3, $3, $4, $5, $6, $7, $8, $8, true, $9, 'POSTED'
          ) RETURNING id
        `, [
          retEarnDocNum.rows[0].doc_num,
          currentPeriod.company_code_id,
          currentPeriod.end_date,
          currentPeriod.year,
          currentPeriod.period,
          `CLOSING-${currentPeriod.period}/${currentPeriod.year}`,
          `Close P&L to Retained Earnings - Period ${currentPeriod.period}/${currentPeriod.year}`,
          Math.abs(totalProfitLoss),
          userId
        ]);

        retainedEarningsJeId = closingJeResult.rows[0].id;

        let lineNum = 1;

        // Create line items to zero out P&L accounts
        for (const account of plBalances.rows) {
          const balance = parseFloat(account.balance);

          // Reverse the balance (debit becomes credit, credit becomes debit)
          await client.query(`
            INSERT INTO journal_entry_line_items (
              journal_entry_id, line_number, gl_account,
              debit_amount, credit_amount, item_text
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            retainedEarningsJeId,
            lineNum++,
            account.account_number,
            balance < 0 ? Math.abs(balance) : 0,  // If credit balance, debit to zero
            balance > 0 ? Math.abs(balance) : 0,  // If debit balance, credit to zero
            `Close ${account.account_name}`
          ]);
        }

        // Post the net to retained earnings
        await client.query(`
          INSERT INTO journal_entry_line_items (
            journal_entry_id, line_number, gl_account,
            debit_amount, credit_amount, item_text
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          retainedEarningsJeId,
          lineNum,
          retainedEarningsAccount.account_number,
          totalProfitLoss < 0 ? Math.abs(totalProfitLoss) : 0,  // Loss = debit RE
          totalProfitLoss > 0 ? Math.abs(totalProfitLoss) : 0,  // Profit = credit RE
          `Net Income/Loss for Period ${currentPeriod.period}/${currentPeriod.year}`
        ]);
      }

      // ====================
      // STEP 2: Create opening balances for next period (Balance Sheet accounts only)
      // ====================

      const bsBalances = await client.query(`
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
      `, [currentPeriod.year, currentPeriod.period]);

      let openingBalanceJeId = null;

      if (bsBalances.rows.length > 0) {
        const totalDebit = bsBalances.rows
          .filter(b => parseFloat(b.balance) > 0)
          .reduce((sum, b) => sum + parseFloat(b.balance), 0);

        const totalCredit = bsBalances.rows
          .filter(b => parseFloat(b.balance) < 0)
          .reduce((sum, b) => sum + Math.abs(parseFloat(b.balance)), 0);

        // Generate document number
        const openBalDocNum = await client.query(`
          SELECT 'OPBAL' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('journal_entries_id_seq')::TEXT, 6, '0') as doc_num
        `);

        // Create opening balance journal entry
        const openingJeResult = await client.query(`
          INSERT INTO journal_entries (
            document_number, company_code_id, posting_date, document_date,
            fiscal_year, fiscal_period, reference, header_text,
            total_debit, total_credit, balance_check, created_by, status
          ) VALUES (
            $1, $2, $3, $3, $4, $5, $6, $7, $8, $9, true, $10, 'POSTED'
          ) RETURNING id
        `, [
          openBalDocNum.rows[0].doc_num,
          currentPeriod.company_code_id,
          nextPeriod.start_date,
          nextPeriod.year,
          nextPeriod.period,
          `OPENING-${nextPeriod.period}/${nextPeriod.year}`,
          `Opening Balance - Period ${nextPeriod.period}/${nextPeriod.year}`,
          totalDebit,
          totalCredit,
          userId
        ]);

        openingBalanceJeId = openingJeResult.rows[0].id;

        // Create line items for opening balances
        let lineNum = 1;
        for (const account of bsBalances.rows) {
          const balance = parseFloat(account.balance);

          await client.query(`\n            INSERT INTO journal_entry_line_items (\n              journal_entry_id, line_number, gl_account,\n              debit_amount, credit_amount, item_text\n            ) VALUES ($1, $2, $3, $4, $5, $6)\n          `, [
            openingBalanceJeId,
            lineNum++,
            account.account_number,
            balance > 0 ? balance : 0,
            balance < 0 ? Math.abs(balance) : 0,
            `Opening Balance - ${account.account_name}`
          ]);
        }
      }

      // ====================
      // STEP 3: Close current period and open next period
      // ====================

      await client.query(`
        UPDATE fiscal_periods 
        SET status = 'Closed',
            posting_allowed = false,
            updated_at = NOW()
        WHERE id = $1
      `, [fiscalPeriodId]);

      await client.query(`
        UPDATE fiscal_periods 
        SET status = 'Open',
            posting_allowed = true,
            updated_at = NOW()
        WHERE id = $1
      `, [nextPeriod.id]);

      await client.query('COMMIT');

      return {
        success: true,
        message: `Successfully closed Period ${currentPeriod.period}/${currentPeriod.year} and opened Period ${nextPeriod.period}/${nextPeriod.year}. Net P&L: ${totalProfitLoss.toFixed(2)}`,
        openingBalanceJeId,
        retainedEarningsJeId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const balanceCarryForwardService = new BalanceCarryForwardService();
