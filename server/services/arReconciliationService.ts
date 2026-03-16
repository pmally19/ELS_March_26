import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface ReconciliationResult {
  arSubledgerTotal: number;
  glAccountBalance: number;
  difference: number;
  isBalanced: boolean;
  discrepancies: ReconciliationDiscrepancy[];
  reconciliationDate: Date;
  summary: {
    totalOpenItems: number;
    totalDebits: number;
    totalCredits: number;
    netBalance: number;
  };
}

export interface ReconciliationDiscrepancy {
  type: 'MISSING_IN_SUBLEDGER' | 'MISSING_IN_GL' | 'AMOUNT_MISMATCH';
  description: string;
  amount: number;
  documentNumber?: string;
  glAccountId?: number;
  subledgerAmount?: number;
  glAmount?: number;
}

export class ARReconciliationService {
  /**
   * Reconcile AR subledger with GL AR account balance
   * Compares ar_open_items totals with gl_entries totals
   * Follows standard accounting reconciliation principles
   */
  async reconcileARSubledger(companyCode?: string, glAccountId?: number): Promise<ReconciliationResult> {
    try {
      // Calculate AR Subledger Total
      // Sum of outstanding amounts from ar_open_items where active = true
      // This represents the total amount customers owe (open receivables)
      let subledgerQuery;
      
      if (glAccountId) {
        if (companyCode) {
          // Filter by both GL account and company code
          subledgerQuery = sql`
            SELECT 
              COALESCE(SUM(aoi.outstanding_amount), 0) as total,
              COUNT(*) FILTER (WHERE aoi.active = true AND aoi.outstanding_amount > 0) as open_count
            FROM ar_open_items aoi
            LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
            LEFT JOIN company_codes cc ON ec.company_code_id = cc.id
            WHERE aoi.active = true
              AND aoi.outstanding_amount > 0
              AND aoi.gl_account_id = ${glAccountId}
              AND cc.code = ${companyCode}
          `;
        } else {
          subledgerQuery = sql`
            SELECT 
              COALESCE(SUM(outstanding_amount), 0) as total,
              COUNT(*) FILTER (WHERE active = true AND outstanding_amount > 0) as open_count
            FROM ar_open_items
            WHERE active = true
              AND outstanding_amount > 0
              AND gl_account_id = ${glAccountId}
          `;
        }
      } else {
        if (companyCode) {
          // Filter by company code only
          subledgerQuery = sql`
            SELECT 
              COALESCE(SUM(aoi.outstanding_amount), 0) as total,
              COUNT(*) FILTER (WHERE aoi.active = true AND aoi.outstanding_amount > 0) as open_count
            FROM ar_open_items aoi
            LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
            LEFT JOIN company_codes cc ON ec.company_code_id = cc.id
            WHERE aoi.active = true
              AND aoi.outstanding_amount > 0
              AND cc.code = ${companyCode}
          `;
        } else {
          // All active AR open items with outstanding amounts
          subledgerQuery = sql`
            SELECT 
              COALESCE(SUM(outstanding_amount), 0) as total,
              COUNT(*) FILTER (WHERE active = true AND outstanding_amount > 0) as open_count
            FROM ar_open_items
            WHERE active = true
              AND outstanding_amount > 0
          `;
        }
      }

      const subledgerResult = await db.execute(subledgerQuery);
      const arSubledgerTotal = parseFloat(String(subledgerResult.rows[0]?.total || 0));
      const totalOpenItems = parseInt(String(subledgerResult.rows[0]?.open_count || 0));

      // Calculate GL AR Account Balance
      // Sum of debit entries minus sum of credit entries for AR accounts
      // Debits increase AR (invoices), Credits decrease AR (payments)
      let glBalanceQuery;
      
      if (glAccountId) {
        if (companyCode) {
          // Filter by GL account and company code from accounting documents
          glBalanceQuery = sql`
            SELECT 
              COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as total_debits,
              COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'C'), 0) as total_credits
            FROM gl_entries ge
            LEFT JOIN accounting_documents ad ON ge.document_number = ad.document_number
            WHERE ge.gl_account_id = ${glAccountId}
              AND ge.posting_status = 'posted'
              AND (${companyCode ? sql`ad.company_code = ${companyCode}` : sql`true`})
          `;
        } else {
          glBalanceQuery = sql`
            SELECT 
              COALESCE(SUM(amount) FILTER (WHERE debit_credit_indicator = 'D'), 0) as total_debits,
              COALESCE(SUM(amount) FILTER (WHERE debit_credit_indicator = 'C'), 0) as total_credits
            FROM gl_entries
            WHERE gl_account_id = ${glAccountId}
              AND posting_status = 'posted'
          `;
        }
      } else {
        if (companyCode) {
          // Filter by company code from accounting documents
          glBalanceQuery = sql`
            SELECT 
              COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as total_debits,
              COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'C'), 0) as total_credits
            FROM gl_entries ge
            INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
            LEFT JOIN accounting_documents ad ON ge.document_number = ad.document_number
            WHERE ga.account_type = 'ASSETS'
              AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%')
              AND ge.posting_status = 'posted'
              AND (${companyCode ? sql`ad.company_code = ${companyCode}` : sql`true`})
          `;
        } else {
          // Get all AR GL accounts
          glBalanceQuery = sql`
            SELECT 
              COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as total_debits,
              COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'C'), 0) as total_credits
            FROM gl_entries ge
            INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
            WHERE ga.account_type = 'ASSETS'
              AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%')
              AND ge.posting_status = 'posted'
          `;
        }
      }

      const glBalanceResult = await db.execute(glBalanceQuery);
      const totalDebits = parseFloat(String(glBalanceResult.rows[0]?.total_debits || 0));
      const totalCredits = parseFloat(String(glBalanceResult.rows[0]?.total_credits || 0));
      const glAccountBalance = totalDebits - totalCredits;

      // Calculate difference
      const difference = Math.abs(arSubledgerTotal - glAccountBalance);
      const isBalanced = difference < 0.01; // Allow for rounding differences

      // Identify discrepancies
      const discrepancies: ReconciliationDiscrepancy[] = [];

      if (!isBalanced) {
        // 1. Find items in subledger that don't have matching GL debit entries
        let subledgerItemsQuery;
        if (glAccountId) {
          if (companyCode) {
            subledgerItemsQuery = sql`
              SELECT 
                aoi.id,
                aoi.document_number,
                aoi.outstanding_amount,
                aoi.original_amount,
                aoi.gl_account_id,
                COUNT(ge.id) as gl_entry_count,
                COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as gl_debit_total
              FROM ar_open_items aoi
              LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
              LEFT JOIN company_codes cc ON ec.company_code_id = cc.id
              LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number 
                AND ge.gl_account_id = aoi.gl_account_id
                AND ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
              WHERE aoi.active = true
                AND aoi.outstanding_amount > 0
                AND aoi.gl_account_id = ${glAccountId}
                AND cc.code = ${companyCode}
              GROUP BY aoi.id, aoi.document_number, aoi.outstanding_amount, aoi.original_amount, aoi.gl_account_id
              HAVING COUNT(ge.id) = 0 OR ABS(aoi.original_amount - COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0)) > 0.01
            `;
          } else {
            subledgerItemsQuery = sql`
              SELECT 
                aoi.id,
                aoi.document_number,
                aoi.outstanding_amount,
                aoi.original_amount,
                aoi.gl_account_id,
                COUNT(ge.id) as gl_entry_count,
                COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as gl_debit_total
              FROM ar_open_items aoi
              LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number 
                AND ge.gl_account_id = aoi.gl_account_id
                AND ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
              WHERE aoi.active = true
                AND aoi.outstanding_amount > 0
                AND aoi.gl_account_id = ${glAccountId}
              GROUP BY aoi.id, aoi.document_number, aoi.outstanding_amount, aoi.original_amount, aoi.gl_account_id
              HAVING COUNT(ge.id) = 0 OR ABS(aoi.original_amount - COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0)) > 0.01
            `;
          }
        } else {
          if (companyCode) {
            subledgerItemsQuery = sql`
              SELECT 
                aoi.id,
                aoi.document_number,
                aoi.outstanding_amount,
                aoi.original_amount,
                aoi.gl_account_id,
                COUNT(ge.id) as gl_entry_count,
                COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as gl_debit_total
              FROM ar_open_items aoi
              LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
              LEFT JOIN company_codes cc ON ec.company_code_id = cc.id
              LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number 
                AND ge.gl_account_id = aoi.gl_account_id
                AND ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
              WHERE aoi.active = true
                AND aoi.outstanding_amount > 0
                AND cc.code = ${companyCode}
              GROUP BY aoi.id, aoi.document_number, aoi.outstanding_amount, aoi.original_amount, aoi.gl_account_id
              HAVING COUNT(ge.id) = 0 OR ABS(aoi.original_amount - COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0)) > 0.01
            `;
          } else {
            subledgerItemsQuery = sql`
              SELECT 
                aoi.id,
                aoi.document_number,
                aoi.outstanding_amount,
                aoi.original_amount,
                aoi.gl_account_id,
                COUNT(ge.id) as gl_entry_count,
                COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as gl_debit_total
              FROM ar_open_items aoi
              LEFT JOIN gl_entries ge ON ge.document_number = aoi.document_number 
                AND ge.gl_account_id = aoi.gl_account_id
                AND ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
              WHERE aoi.active = true
                AND aoi.outstanding_amount > 0
              GROUP BY aoi.id, aoi.document_number, aoi.outstanding_amount, aoi.original_amount, aoi.gl_account_id
              HAVING COUNT(ge.id) = 0 OR ABS(aoi.original_amount - COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0)) > 0.01
            `;
          }
        }
        
        const subledgerItems = await db.execute(subledgerItemsQuery);

        for (const item of subledgerItems.rows) {
          const glDebitTotal = parseFloat(String(item.gl_debit_total || 0));
          const originalAmount = parseFloat(String(item.original_amount || 0));
          const glEntryCount = parseInt(String(item.gl_entry_count || 0));

          if (glEntryCount === 0) {
            // Missing GL entry
            discrepancies.push({
              type: 'MISSING_IN_GL',
              description: `AR open item ${item.document_number} has no matching GL debit entry`,
              amount: parseFloat(String(item.outstanding_amount || 0)),
              documentNumber: String(item.document_number || ''),
              glAccountId: parseInt(String(item.gl_account_id || 0)),
              subledgerAmount: originalAmount
            });
          } else if (Math.abs(originalAmount - glDebitTotal) > 0.01) {
            // Amount mismatch
            discrepancies.push({
              type: 'AMOUNT_MISMATCH',
              description: `AR open item ${item.document_number} amount mismatch: Subledger ${originalAmount.toFixed(2)} vs GL ${glDebitTotal.toFixed(2)}`,
              amount: Math.abs(originalAmount - glDebitTotal),
              documentNumber: String(item.document_number || ''),
              glAccountId: parseInt(String(item.gl_account_id || 0)),
              subledgerAmount: originalAmount,
              glAmount: glDebitTotal
            });
          }
        }

        // 2. Find GL debit entries that don't have matching subledger items
        let glDebitEntriesQuery;
        if (glAccountId) {
          if (companyCode) {
            glDebitEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(aoi.id) as subledger_count,
                COALESCE(SUM(aoi.original_amount), 0) as subledger_total
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
                AND aoi.active = true
              LEFT JOIN accounting_documents ad ON ge.document_number = ad.document_number
              WHERE ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
                AND ge.gl_account_id = ${glAccountId}
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
                AND (${companyCode ? sql`ad.company_code = ${companyCode}` : sql`true`})
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(aoi.id) = 0 OR ABS(ge.amount - COALESCE(SUM(aoi.original_amount), 0)) > 0.01
            `;
          } else {
            glDebitEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(aoi.id) as subledger_count,
                COALESCE(SUM(aoi.original_amount), 0) as subledger_total
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
                AND aoi.active = true
              WHERE ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
                AND ge.gl_account_id = ${glAccountId}
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(aoi.id) = 0 OR ABS(ge.amount - COALESCE(SUM(aoi.original_amount), 0)) > 0.01
            `;
          }
        } else {
          if (companyCode) {
            glDebitEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(aoi.id) as subledger_count,
                COALESCE(SUM(aoi.original_amount), 0) as subledger_total
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
                AND aoi.active = true
              LEFT JOIN accounting_documents ad ON ge.document_number = ad.document_number
              WHERE ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
                AND (${companyCode ? sql`ad.company_code = ${companyCode}` : sql`true`})
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(aoi.id) = 0 OR ABS(ge.amount - COALESCE(SUM(aoi.original_amount), 0)) > 0.01
            `;
          } else {
            glDebitEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(aoi.id) as subledger_count,
                COALESCE(SUM(aoi.original_amount), 0) as subledger_total
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
                AND aoi.active = true
              WHERE ge.debit_credit_indicator = 'D'
                AND ge.posting_status = 'posted'
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(aoi.id) = 0 OR ABS(ge.amount - COALESCE(SUM(aoi.original_amount), 0)) > 0.01
            `;
          }
        }
        
        const glDebitEntriesWithoutSubledger = await db.execute(glDebitEntriesQuery);

        for (const entry of glDebitEntriesWithoutSubledger.rows) {
          const glAmount = parseFloat(String(entry.amount || 0));
          const subledgerTotal = parseFloat(String(entry.subledger_total || 0));
          const subledgerCount = parseInt(String(entry.subledger_count || 0));

          if (subledgerCount === 0) {
            // Missing subledger item
            discrepancies.push({
              type: 'MISSING_IN_SUBLEDGER',
              description: `GL debit entry ${entry.document_number} has no matching AR open item`,
              amount: glAmount,
              documentNumber: String(entry.document_number || ''),
              glAccountId: parseInt(String(entry.gl_account_id || 0)),
              glAmount: glAmount
            });
          } else if (Math.abs(glAmount - subledgerTotal) > 0.01) {
            // Amount mismatch
            discrepancies.push({
              type: 'AMOUNT_MISMATCH',
              description: `GL debit entry ${entry.document_number} amount mismatch: GL ${glAmount.toFixed(2)} vs Subledger ${subledgerTotal.toFixed(2)}`,
              amount: Math.abs(glAmount - subledgerTotal),
              documentNumber: String(entry.document_number || ''),
              glAccountId: parseInt(String(entry.gl_account_id || 0)),
              subledgerAmount: subledgerTotal,
              glAmount: glAmount
            });
          }
        }

        // 3. Check for CREDIT entries (payments) that don't have proper payment applications
        // This helps identify payments that were posted to GL but don't have corresponding payment records
        let creditEntriesQuery;
        if (glAccountId) {
          if (companyCode) {
            creditEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(DISTINCT aoi.id) as ar_item_count,
                COUNT(DISTINCT cp.id) as payment_count,
                COUNT(DISTINCT pa.id) as payment_app_count
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN accounting_documents ad ON ge.document_number = ad.document_number
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
              LEFT JOIN customer_payments cp ON cp.accounting_document_number = ge.document_number
              LEFT JOIN payment_applications pa ON pa.payment_id = cp.id
              WHERE ge.debit_credit_indicator = 'C'
                AND ge.posting_status = 'posted'
                AND ge.gl_account_id = ${glAccountId}
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
                AND (${companyCode ? sql`ad.company_code = ${companyCode}` : sql`true`})
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(DISTINCT cp.id) = 0
            `;
          } else {
            creditEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(DISTINCT aoi.id) as ar_item_count,
                COUNT(DISTINCT cp.id) as payment_count,
                COUNT(DISTINCT pa.id) as payment_app_count
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
              LEFT JOIN customer_payments cp ON cp.accounting_document_number = ge.document_number
              LEFT JOIN payment_applications pa ON pa.payment_id = cp.id
              WHERE ge.debit_credit_indicator = 'C'
                AND ge.posting_status = 'posted'
                AND ge.gl_account_id = ${glAccountId}
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(DISTINCT cp.id) = 0
            `;
          }
        } else {
          if (companyCode) {
            creditEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(DISTINCT aoi.id) as ar_item_count,
                COUNT(DISTINCT cp.id) as payment_count,
                COUNT(DISTINCT pa.id) as payment_app_count
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN accounting_documents ad ON ge.document_number = ad.document_number
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
              LEFT JOIN customer_payments cp ON cp.accounting_document_number = ge.document_number
              LEFT JOIN payment_applications pa ON pa.payment_id = cp.id
              WHERE ge.debit_credit_indicator = 'C'
                AND ge.posting_status = 'posted'
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
                AND (${companyCode ? sql`ad.company_code = ${companyCode}` : sql`true`})
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(DISTINCT cp.id) = 0
            `;
          } else {
            creditEntriesQuery = sql`
              SELECT 
                ge.document_number,
                ge.amount,
                ge.gl_account_id,
                COUNT(DISTINCT aoi.id) as ar_item_count,
                COUNT(DISTINCT cp.id) as payment_count,
                COUNT(DISTINCT pa.id) as payment_app_count
              FROM gl_entries ge
              INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
              LEFT JOIN ar_open_items aoi ON aoi.document_number = ge.document_number 
                AND aoi.gl_account_id = ge.gl_account_id
              LEFT JOIN customer_payments cp ON cp.accounting_document_number = ge.document_number
              LEFT JOIN payment_applications pa ON pa.payment_id = cp.id
              WHERE ge.debit_credit_indicator = 'C'
                AND ge.posting_status = 'posted'
                AND (ga.account_type = 'ASSETS' AND (ga.account_name ILIKE '%receivable%' OR ga.account_name ILIKE '%AR%'))
              GROUP BY ge.document_number, ge.amount, ge.gl_account_id
              HAVING COUNT(DISTINCT cp.id) = 0
            `;
          }
        }
        
        const creditEntriesWithoutSubledger = await db.execute(creditEntriesQuery);
        
        for (const entry of creditEntriesWithoutSubledger.rows) {
          discrepancies.push({
            type: 'MISSING_IN_SUBLEDGER',
            description: `GL credit entry ${entry.document_number} (payment) has no matching customer payment record`,
            amount: parseFloat(String(entry.amount || 0)),
            documentNumber: String(entry.document_number || ''),
            glAccountId: parseInt(String(entry.gl_account_id || 0)),
            glAmount: parseFloat(String(entry.amount || 0))
          });
        }
      }

      return {
        arSubledgerTotal,
        glAccountBalance,
        difference,
        isBalanced,
        discrepancies,
        reconciliationDate: new Date(),
        summary: {
          totalOpenItems,
          totalDebits,
          totalCredits,
          netBalance: glAccountBalance
        }
      };
    } catch (error: any) {
      console.error('Error reconciling AR subledger:', error);
      throw new Error(`Failed to reconcile AR subledger: ${error.message}`);
    }
  }

  /**
   * Save reconciliation result to history
   */
  async saveReconciliationHistory(
    result: ReconciliationResult,
    companyCode?: string,
    glAccountId?: number,
    createdBy?: number
  ): Promise<void> {
    try {
      // Check if reconciliation_history table exists
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'reconciliation_history'
        )
      `);

      if (!tableExists.rows[0]?.exists) {
        // Table doesn't exist, skip saving
        return;
      }

      await db.execute(sql`
        INSERT INTO reconciliation_history (
          reconciliation_type,
          reconciliation_date,
          company_code,
          gl_account_id,
          ar_subledger_total,
          gl_account_balance,
          difference,
          is_balanced,
          total_open_items,
          total_debits,
          total_credits,
          discrepancies_count,
          created_by
        ) VALUES (
          'AR',
          ${result.reconciliationDate},
          ${companyCode || null},
          ${glAccountId || null},
          ${result.arSubledgerTotal},
          ${result.glAccountBalance},
          ${result.difference},
          ${result.isBalanced},
          ${result.summary.totalOpenItems},
          ${result.summary.totalDebits},
          ${result.summary.totalCredits},
          ${result.discrepancies.length},
          ${createdBy || null}
        )
      `);
    } catch (error: any) {
      // Log error but don't fail the reconciliation
      console.error('Error saving reconciliation history:', error);
    }
  }

  /**
   * Get reconciliation history
   * Retrieves stored reconciliation runs for audit trail
   */
  async getReconciliationHistory(limit: number = 10): Promise<any[]> {
    try {
      // Check if reconciliation_history table exists
      const tableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'reconciliation_history'
        )
      `);

      if (tableExists.rows[0]?.exists) {
        // Use reconciliation_history table
        const history = await db.execute(sql`
          SELECT 
            reconciliation_date,
            total_open_items,
            ar_subledger_total as total_outstanding,
            is_balanced,
            discrepancies_count
          FROM reconciliation_history
          WHERE reconciliation_type = 'AR'
          ORDER BY reconciliation_date DESC
          LIMIT ${limit}
        `);
        return history.rows;
      } else {
        // Fallback to ar_open_items if table doesn't exist
        const history = await db.execute(sql`
          SELECT 
            CURRENT_TIMESTAMP as reconciliation_date,
            COUNT(*) FILTER (WHERE active = true AND outstanding_amount > 0) as total_open_items,
            COALESCE(SUM(outstanding_amount) FILTER (WHERE active = true AND outstanding_amount > 0), 0) as total_outstanding
          FROM ar_open_items
          GROUP BY CURRENT_TIMESTAMP
          ORDER BY CURRENT_TIMESTAMP DESC
          LIMIT ${limit}
        `);
        return history.rows;
      }
    } catch (error: any) {
      console.error('Error getting reconciliation history:', error);
      throw new Error(`Failed to get reconciliation history: ${error.message}`);
    }
  }
}

export const arReconciliationService = new ARReconciliationService();
