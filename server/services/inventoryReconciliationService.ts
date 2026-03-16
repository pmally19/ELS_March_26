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
  materialCode?: string;
  glAccountId?: number;
  documentNumber?: string;
}

export class InventoryReconciliationService {
  /**
   * Reconcile Inventory subledger with GL Inventory account balance
   * Compares stock_balances total_value with gl_entries totals
   */
  async reconcileInventorySubledger(companyCode?: string, glAccountId?: number): Promise<ReconciliationResult> {
    try {
      // Calculate Inventory Subledger Total
      // Sum of total_value from stock_balances (current inventory value)
      const subledgerQuery = sql`
        SELECT COALESCE(SUM(total_value), 0) as total
        FROM stock_balances
        WHERE quantity > 0
      `;

      const subledgerResult = await db.execute(subledgerQuery);
      const inventorySubledgerTotal = parseFloat(String(subledgerResult.rows[0]?.total || 0));

      // Calculate GL Inventory Account Balance
      // For Inventory (ASSETS), debits increase the balance (inventory received), credits decrease (inventory sold)
      // GL Balance = Debits - Credits
      let glBalanceQuery;
      
      if (glAccountId) {
        glBalanceQuery = sql`
          SELECT 
            COALESCE(SUM(amount) FILTER (WHERE debit_credit_indicator = 'D'), 0) as total_debits,
            COALESCE(SUM(amount) FILTER (WHERE debit_credit_indicator = 'C'), 0) as total_credits
          FROM gl_entries
          WHERE gl_account_id = ${glAccountId}
            AND posting_status = 'posted'
        `;
      } else {
        // Get all Inventory GL accounts (ASSETS)
        glBalanceQuery = sql`
          SELECT 
            COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) as total_debits,
            COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'C'), 0) as total_credits
          FROM gl_entries ge
          INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
          WHERE ga.account_type = 'ASSETS'
            AND (ga.account_name ILIKE '%inventory%' OR ga.account_name ILIKE '%stock%' OR ga.account_name ILIKE '%material%')
            AND ge.posting_status = 'posted'
        `;
      }

      const glBalanceResult = await db.execute(glBalanceQuery);
      const totalDebits = parseFloat(String(glBalanceResult.rows[0]?.total_debits || 0));
      const totalCredits = parseFloat(String(glBalanceResult.rows[0]?.total_credits || 0));
      const glAccountBalance = totalDebits - totalCredits; // Inventory: Debits - Credits

      // Calculate difference
      const difference = Math.abs(inventorySubledgerTotal - glAccountBalance);
      const isBalanced = difference < 0.01; // Allow for rounding differences

      // Identify discrepancies
      const discrepancies: ReconciliationDiscrepancy[] = [];

      if (!isBalanced) {
        // Find materials in stock_balances that don't have matching GL entries
        // This is complex - we'll check stock_movements that link to GL
        const subledgerItems = await db.execute(sql`
          SELECT 
            sb.material_code,
            sb.total_value,
            COUNT(DISTINCT ge.id) as gl_entry_count
          FROM stock_balances sb
          LEFT JOIN stock_movements sm ON sm.material_code = sb.material_code
            AND sm.plant_code = sb.plant_code
            AND sm.storage_location = sb.storage_location
          LEFT JOIN gl_entries ge ON ge.document_number = sm.document_number
            AND ge.debit_credit_indicator = 'D'
            AND ge.posting_status = 'posted'
          WHERE sb.quantity > 0
          GROUP BY sb.material_code, sb.total_value
          HAVING COUNT(DISTINCT ge.id) = 0
          LIMIT 50
        `);

        for (const item of subledgerItems.rows) {
          discrepancies.push({
            type: 'MISSING_IN_GL',
            description: `Material ${item.material_code} has stock value but no matching GL debit entry`,
            amount: parseFloat(String(item.total_value || 0)),
            materialCode: String(item.material_code || '')
          });
        }

        // Find GL entries that don't have matching inventory movements
        const glEntriesWithoutSubledger = await db.execute(sql`
          SELECT 
            ge.document_number,
            ge.amount,
            ge.gl_account_id,
            COUNT(DISTINCT sm.id) as movement_count
          FROM gl_entries ge
          LEFT JOIN stock_movements sm ON sm.document_number = ge.document_number
          INNER JOIN gl_accounts ga ON ge.gl_account_id = ga.id
          WHERE ge.debit_credit_indicator = 'D'
            AND ge.posting_status = 'posted'
            AND ga.account_type = 'ASSETS'
            AND (ga.account_name ILIKE '%inventory%' OR ga.account_name ILIKE '%stock%' OR ga.account_name ILIKE '%material%')
            ${glAccountId ? sql`AND ge.gl_account_id = ${glAccountId}` : sql``}
          GROUP BY ge.document_number, ge.amount, ge.gl_account_id
          HAVING COUNT(DISTINCT sm.id) = 0
          LIMIT 50
        `);

        for (const entry of glEntriesWithoutSubledger.rows) {
          discrepancies.push({
            type: 'MISSING_IN_SUBLEDGER',
            description: `GL entry ${entry.document_number} has no matching inventory movement`,
            amount: parseFloat(String(entry.amount || 0)),
            documentNumber: String(entry.document_number || ''),
            glAccountId: parseInt(String(entry.gl_account_id || 0))
          });
        }

        // Check for amount mismatches between stock_movements and GL entries
        const amountMismatches = await db.execute(sql`
          SELECT 
            sm.document_number,
            sm.material_code,
            sm.total_value as movement_value,
            SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D') as gl_debit_total,
            ge.gl_account_id
          FROM stock_movements sm
          LEFT JOIN gl_entries ge ON ge.document_number = sm.document_number
            AND ge.debit_credit_indicator = 'D'
            AND ge.posting_status = 'posted'
          WHERE sm.total_value > 0
          GROUP BY sm.document_number, sm.material_code, sm.total_value, ge.gl_account_id
          HAVING ABS(COALESCE(SUM(ge.amount) FILTER (WHERE ge.debit_credit_indicator = 'D'), 0) - sm.total_value) > 0.01
          LIMIT 50
        `);

        for (const mismatch of amountMismatches.rows) {
          discrepancies.push({
            type: 'AMOUNT_MISMATCH',
            description: `Material ${mismatch.material_code} movement ${mismatch.document_number} value (${mismatch.movement_value}) doesn't match GL entry (${mismatch.gl_debit_total})`,
            amount: Math.abs(parseFloat(String(mismatch.movement_value || 0)) - parseFloat(String(mismatch.gl_debit_total || 0))),
            materialCode: String(mismatch.material_code || ''),
            documentNumber: String(mismatch.document_number || ''),
            glAccountId: parseInt(String(mismatch.gl_account_id || 0))
          });
        }
      }

      return {
        subledgerTotal: inventorySubledgerTotal,
        glAccountBalance,
        difference,
        isBalanced,
        discrepancies,
        reconciliationDate: new Date()
      };
    } catch (error: any) {
      console.error('Error reconciling Inventory subledger:', error);
      throw new Error(`Failed to reconcile Inventory subledger: ${error.message}`);
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
          COUNT(DISTINCT material_code) as total_materials,
          SUM(total_value) as total_inventory_value
        FROM stock_balances
        WHERE quantity > 0
        GROUP BY CURRENT_TIMESTAMP
        ORDER BY CURRENT_TIMESTAMP DESC
        LIMIT ${limit}
      `);

      return history.rows;
    } catch (error: any) {
      console.error('Error getting Inventory reconciliation history:', error);
      throw new Error(`Failed to get Inventory reconciliation history: ${error.message}`);
    }
  }
}

export const inventoryReconciliationService = new InventoryReconciliationService();

