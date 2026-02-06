import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface ReconciliationResult {
  subledgerTotal: number;
  glAccountBalance: number;
  difference: number;
  isBalanced: boolean;
  discrepancies: ReconciliationDiscrepancy[];
  reconciliationDate: Date;
}

export interface ReconciliationDiscrepancy {
  type: 'MISSING_IN_SUBLEDGER' | 'MISSING_IN_GL' | 'AMOUNT_MISMATCH';
  description: string;
  amount: number;
  documentNumber?: string;
  glAccountId?: number;
}

export class APReconciliationService {
  /**
   * Reconcile AP subledger with GL AP account balance
   * Compares ap_open_items totals with gl_entries totals
   */
  async reconcileAPSubledger(companyCode?: string, glAccountId?: number): Promise<ReconciliationResult> {
    try {
      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ap_status_open' AND active = true LIMIT 1) as open_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ap_status_partial' AND active = true LIMIT 1) as partial_status
      `);

      const openStatus = String(statusConfigResult.rows[0]?.open_status || 'Open');
      const partialStatus = String(statusConfigResult.rows[0]?.partial_status || 'Partial');

      // Calculate AP Subledger Total
      // Sum of outstanding amounts from ap_open_items where status is Open or Partial
      const subledgerQuery = glAccountId
        ? sql`SELECT COALESCE(SUM(outstanding_amount), 0) as total
              FROM ap_open_items
              WHERE active = true
                AND status IN (${openStatus}, ${partialStatus})
                AND gl_account_id = ${glAccountId}`
        : sql`SELECT COALESCE(SUM(outstanding_amount), 0) as total
              FROM ap_open_items
              WHERE active = true
                AND status IN (${openStatus}, ${partialStatus})`;

      const subledgerResult = await db.execute(subledgerQuery);
      const apSubledgerTotal = parseFloat(String(subledgerResult.rows[0]?.total || 0));

      // Calculate GL AP Account Balance
      // For AP, credits increase the balance (we owe more), debits decrease (we paid)
      // GL Balance = Credits - Debits (opposite of AR)
      let glBalanceQuery;
      
      if (glAccountId) {
        glBalanceQuery = sql`
          SELECT 
            COALESCE(SUM(amount) FILTER (WHERE debit_credit_indicator = 'C'), 0) as total_credits,
            COALESCE(SUM(amount) FILTER (WHERE debit_credit_indicator = 'D'), 0) as total_debits
          FROM gl_entries
          WHERE gl_account_id = ${glAccountId}
            AND posting_status = 'posted'
        `;
      } else {
        // Get all AP GL accounts (LIABILITIES)
        glBalanceQuery = sql`
          SELECT 
            COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'C'), 0) as total_credits,
            COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as total_debits
          FROM gl_entries ge
          INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
          WHERE ga.account_type = 'LIABILITIES'
            AND (ga.account_name ILIKE '%payable%' OR ga.account_name ILIKE '%AP%')
            AND ge.posting_status = 'posted'
        `;
      }

      const glBalanceResult = await db.execute(glBalanceQuery);
      const totalCredits = parseFloat(String(glBalanceResult.rows[0]?.total_credits || 0));
      const totalDebits = parseFloat(String(glBalanceResult.rows[0]?.total_debits || 0));
      const glAccountBalance = totalCredits - totalDebits; // AP: Credits - Debits

      // Calculate difference
      const difference = Math.abs(apSubledgerTotal - glAccountBalance);
      const isBalanced = difference < 0.01; // Allow for rounding differences

      // Identify discrepancies
      const discrepancies: ReconciliationDiscrepancy[] = [];

      if (!isBalanced) {
        // Find items in subledger that don't have matching GL entries
        const subledgerItems = await db.execute(sql`
          SELECT 
            aoi.id,
            aoi.document_number,
            aoi.outstanding_amount,
            aoi.gl_account_id,
            COUNT(ge.id) as gl_entry_count
          FROM ap_open_items aoi
          LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number 
            AND ge.gl_account_id = aoi.gl_account_id
            AND ge.debit_credit_indicator = 'C'
            AND ge.posting_status = 'posted'
          WHERE aoi.active = true
            AND aoi.status IN (${openStatus}, ${partialStatus})
            ${glAccountId ? sql`AND aoi.gl_account_id = ${glAccountId}` : sql``}
          GROUP BY aoi.id, aoi.document_number, aoi.outstanding_amount, aoi.gl_account_id
          HAVING COUNT(ge.id) = 0
        `);

        for (const item of subledgerItems.rows) {
          discrepancies.push({
            type: 'MISSING_IN_GL',
            description: `AP open item ${item.document_number} has no matching GL credit entry`,
            amount: parseFloat(String(item.outstanding_amount || 0)),
            documentNumber: String(item.document_number || ''),
            glAccountId: parseInt(String(item.gl_account_id || 0))
          });
        }

        // Find GL entries that don't have matching subledger items
        const glEntriesWithoutSubledger = await db.execute(sql`
          SELECT 
            ge.document_number,
            ge.amount,
            ge.gl_account_id,
            COUNT(aoi.id) as subledger_count
          FROM gl_entries ge
          LEFT JOIN ap_open_items aoi ON aoi.document_number = ge.document_number 
            AND aoi.gl_account_id = ge.gl_account_id
            AND aoi.active = true
            AND aoi.status IN (${openStatus}, ${partialStatus})
          WHERE ge.debit_credit_indicator = 'C'
            AND ge.posting_status = 'posted'
            ${glAccountId ? sql`AND ge.gl_account_id = ${glAccountId}` : sql``}
          GROUP BY ge.document_number, ge.amount, ge.gl_account_id
          HAVING COUNT(aoi.id) = 0
        `);

        for (const entry of glEntriesWithoutSubledger.rows) {
          discrepancies.push({
            type: 'MISSING_IN_SUBLEDGER',
            description: `GL entry ${entry.document_number} has no matching AP open item`,
            amount: parseFloat(String(entry.amount || 0)),
            documentNumber: String(entry.document_number || ''),
            glAccountId: parseInt(String(entry.gl_account_id || 0))
          });
        }
      }

      return {
        subledgerTotal: apSubledgerTotal,
        glAccountBalance,
        difference,
        isBalanced,
        discrepancies,
        reconciliationDate: new Date()
      };
    } catch (error: any) {
      console.error('Error reconciling AP subledger:', error);
      throw new Error(`Failed to reconcile AP subledger: ${error.message}`);
    }
  }

  /**
   * Get reconciliation history
   */
  async getReconciliationHistory(limit: number = 10): Promise<any[]> {
    try {
      const history = await db.execute(sql`
        SELECT 
          CURRENT_TIMESTAMP as reconciliation_date,
          COUNT(*) FILTER (WHERE active = true) as total_open_items,
          SUM(outstanding_amount) FILTER (WHERE active = true) as total_outstanding
        FROM ap_open_items
        GROUP BY CURRENT_TIMESTAMP
        ORDER BY CURRENT_TIMESTAMP DESC
        LIMIT ${limit}
      `);

      return history.rows;
    } catch (error: any) {
      console.error('Error getting AP reconciliation history:', error);
      throw new Error(`Failed to get AP reconciliation history: ${error.message}`);
    }
  }
}

export const apReconciliationService = new APReconciliationService();

