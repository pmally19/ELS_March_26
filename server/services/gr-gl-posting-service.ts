/**
 * GR GL Posting Service — SAP-style account determination & automatic GL posting
 *
 * Flow (mirrors SAP MIGO / MB01 + OBYC):
 *  1. Get GR details (material, qty, price, plant, movement_type)
 *  2. movement_types.transaction_key        → debit account key  (e.g. BSX)
 *  3. movement_types.credit_transaction_key → credit account key (e.g. WRX)
 *  4. material_account_determination:
 *       transaction_key_id + valuation_class_id + valuation_grouping_code_id + chart_of_accounts_id
 *       → gl_account_id
 *  5. Insert accounting_documents header (FI document)
 *  6. Insert journal_entries: 2 lines (Debit BSX + Credit WRX)
 *  7. Update goods_receipts.financial_posting_status = 'POSTED', gl_document_number = <doc#>
 */

import { pool } from '../db';

export interface GRPostingResult {
    success: boolean;
    glDocumentNumber?: string;
    accountingDocumentId?: number;
    debitAccount?: string;
    creditAccount?: string;
    totalAmount?: number;
    error?: string;
}

export class GRGLPostingService {

    /**
     * Main entry point: post a goods receipt to GL
     */
    async postGRToGL(goodsReceiptId: number): Promise<GRPostingResult> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // ── 1. Load GR with material + movement type info ──────────────────────
            const grResult = await client.query(`
        SELECT
          gr.id,
          gr.receipt_number,
          gr.grn_number,
          gr.quantity,
          gr.unit_price,
          gr.total_value,
          gr.movement_type,
          gr.purchase_order_id,
          gr.plant_id,
          gr.currency,
          gr.material_code,
          m.id            AS material_id,
          m.valuation_class_id,
          p.company_code_id,
          cc.chart_of_accounts_id,
          vgc.id          AS valuation_grouping_code_id
        FROM goods_receipts gr
        LEFT JOIN materials m    ON m.code = gr.material_code
        LEFT JOIN plants p       ON p.id   = gr.plant_id
        LEFT JOIN company_codes cc ON cc.id = p.company_code_id
        LEFT JOIN valuation_grouping_codes vgc ON vgc.company_code_id = cc.id
        WHERE gr.id = $1
      `, [goodsReceiptId]);

            if (grResult.rows.length === 0) {
                throw new Error(`Goods receipt ${goodsReceiptId} not found`);
            }

            const gr = grResult.rows[0];
            const totalAmount = parseFloat(gr.total_value || '0') ||
                (parseFloat(gr.quantity || '1') * parseFloat(gr.unit_price || '0'));

            if (totalAmount <= 0) {
                throw new Error(`GR ${goodsReceiptId} has zero value — cannot post to GL`);
            }

            // ── 2. Get movement type transaction keys ──────────────────────────────
            const movTypeResult = await client.query(`
        SELECT transaction_key, credit_transaction_key
        FROM movement_types
        WHERE movement_code = $1
        LIMIT 1
      `, [gr.movement_type || '101']);

            // SAP defaults for movement type 101: BSX (Debit Inventory) / WRX (Credit GR/IR)
            const movType = movTypeResult.rows[0] || {};
            const debitKey = movType.transaction_key || 'BSX';
            const creditKey = movType.credit_transaction_key || 'WRX';

            // ── 3. Resolve GL accounts via material_account_determination ──────────
            const debitGLId = await this.resolveGLAccount(
                client, debitKey, gr.valuation_class_id,
                gr.valuation_grouping_code_id, gr.chart_of_accounts_id
            );
            const creditGLId = await this.resolveGLAccount(
                client, creditKey, gr.valuation_class_id,
                gr.valuation_grouping_code_id, gr.chart_of_accounts_id
            );

            // ── 4. Get GL account numbers for reference ────────────────────────────
            const glLookup = await client.query(`
        SELECT id, account_number FROM gl_accounts WHERE id = ANY($1)
      `, [[debitGLId, creditGLId].filter(Boolean)]);

            const glMap: Record<number, string> = {};
            glLookup.rows.forEach(r => { glMap[r.id] = r.account_number; });

            const debitAccountNum = debitGLId ? glMap[debitGLId] : null;
            const creditAccountNum = creditGLId ? glMap[creditGLId] : null;

            // ── 5. Generate FI document number ─────────────────────────────────────
            const today = new Date();
            const fiscal_year = today.getFullYear();
            const docNumber = `FI-GR-${goodsReceiptId}-${Date.now()}`;

            // ── 6. Insert accounting_documents header ──────────────────────────────
            const adResult = await client.query(`
        INSERT INTO accounting_documents (
          document_number, document_type, posting_date, document_date,
          company_code, fiscal_year, period, reference,
          header_text, total_amount, currency,
          source_module, source_document_id, source_document_type,
          status, created_at
        ) VALUES (
          $1, 'WE', CURRENT_DATE, CURRENT_DATE,
          $2, $3, $4, $5,
          $6, $7, $8,
          'MM', $9, 'GOODS_RECEIPT',
          'POSTED', NOW()
        ) RETURNING id
      `, [
                docNumber,
                gr.company_code_id?.toString() || '1000',
                fiscal_year,
                today.getMonth() + 1,
                gr.receipt_number || gr.grn_number || `GR-${goodsReceiptId}`,
                `Goods Receipt ${gr.receipt_number || goodsReceiptId} — Movement ${gr.movement_type || '101'}`,
                totalAmount,
                gr.currency || 'INR',
                goodsReceiptId
            ]);

            const accountingDocId = adResult.rows[0].id;

            // ── 7. Insert journal entry lines (Debit + Credit) ─────────────────────
            const grRef = gr.receipt_number || gr.grn_number || `GR-${goodsReceiptId}`;

            // Line 1: Debit (e.g. Inventory — BSX)
            await client.query(`
        INSERT INTO journal_entries (
          document_number, document_type, posting_date, document_date,
          fiscal_year, reference_document, header_text,
          total_debit_amount, total_credit_amount,
          gl_account, account_type,
          debit_amount, credit_amount,
          description, status, entry_date, active, created_at
        ) VALUES (
          $1, 'WE', CURRENT_DATE, CURRENT_DATE,
          $2, $3, $4,
          $5, 0,
          $6, 'GL',
          $5, 0,
          $7, 'POSTED', CURRENT_DATE, true, NOW()
        )
      `, [
                docNumber,
                fiscal_year,
                grRef,
                `GR Posting — ${debitKey} Debit`,
                totalAmount,
                debitAccountNum || debitKey,
                `${debitKey}: ${gr.material_code || 'Material'} — GR ${grRef}`
            ]);

            // Line 2: Credit (e.g. GR/IR Clearing — WRX)
            await client.query(`
        INSERT INTO journal_entries (
          document_number, document_type, posting_date, document_date,
          fiscal_year, reference_document, header_text,
          total_debit_amount, total_credit_amount,
          gl_account, account_type,
          debit_amount, credit_amount,
          description, status, entry_date, active, created_at
        ) VALUES (
          $1, 'WE', CURRENT_DATE, CURRENT_DATE,
          $2, $3, $4,
          0, $5,
          $6, 'GL',
          0, $5,
          $7, 'POSTED', CURRENT_DATE, true, NOW()
        )
      `, [
                docNumber,
                fiscal_year,
                grRef,
                `GR Posting — ${creditKey} Credit`,
                totalAmount,
                creditAccountNum || creditKey,
                `${creditKey}: GR/IR Clearing — GR ${grRef}`
            ]);

            // ── 8. Mark GR as financially posted ──────────────────────────────────
            await client.query(`
        UPDATE goods_receipts
        SET
          financial_posting_status = 'POSTED',
          gl_document_number       = $1,
          posted                   = true,
          posted_date              = NOW()
        WHERE id = $2
      `, [docNumber, goodsReceiptId]);

            await client.query('COMMIT');

            console.log(`✅ GR ${goodsReceiptId} posted to GL: ${docNumber} | Dr(${debitKey}): ${debitAccountNum} Cr(${creditKey}): ${creditAccountNum} | Amount: ${totalAmount}`);

            return {
                success: true,
                glDocumentNumber: docNumber,
                accountingDocumentId: accountingDocId,
                debitAccount: debitAccountNum || debitKey,
                creditAccount: creditAccountNum || creditKey,
                totalAmount
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error(`❌ GR GL posting failed for GR ${goodsReceiptId}:`, error.message);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    /**
     * Resolve GL account from material_account_determination table
     * Chain: transaction_key + valuation_class + valuation_grouping_code + chart_of_accounts → gl_account
     */
    private async resolveGLAccount(
        client: any,
        transactionKeyCode: string,
        valuationClassId: number | null,
        valuationGroupingCodeId: number | null,
        chartOfAccountsId: number | null
    ): Promise<number | null> {
        try {
            // Look up transaction_key ID by code
            const tkResult = await client.query(
                'SELECT id FROM transaction_keys WHERE code = $1 AND is_active = true LIMIT 1',
                [transactionKeyCode]
            );
            if (tkResult.rows.length === 0) return null;
            const transactionKeyId = tkResult.rows[0].id;

            // Try most specific match first, then fall back to less specific
            const attempts = [
                // Most specific: all 4 fields match
                { vcId: valuationClassId, vgcId: valuationGroupingCodeId, coaId: chartOfAccountsId },
                // Without valuation grouping code
                { vcId: valuationClassId, vgcId: null, coaId: chartOfAccountsId },
                // Without chart of accounts
                { vcId: valuationClassId, vgcId: valuationGroupingCodeId, coaId: null },
                // Only transaction key + valuation class
                { vcId: valuationClassId, vgcId: null, coaId: null },
                // Just transaction key (most generic fallback)
                { vcId: null, vgcId: null, coaId: null }
            ];

            for (const attempt of attempts) {
                const conditions: string[] = ['mad.transaction_key_id = $1', 'mad.is_active = true'];
                const params: any[] = [transactionKeyId];
                let idx = 2;

                if (attempt.vcId) {
                    conditions.push(`mad.valuation_class_id = $${idx++}`);
                    params.push(attempt.vcId);
                }
                if (attempt.vgcId) {
                    conditions.push(`mad.valuation_grouping_code_id = $${idx++}`);
                    params.push(attempt.vgcId);
                }
                if (attempt.coaId) {
                    conditions.push(`mad.chart_of_accounts_id = $${idx++}`);
                    params.push(attempt.coaId);
                }

                const result = await client.query(`
          SELECT mad.gl_account_id
          FROM material_account_determination mad
          WHERE ${conditions.join(' AND ')}
          LIMIT 1
        `, params);

                if (result.rows.length > 0 && result.rows[0].gl_account_id) {
                    return result.rows[0].gl_account_id;
                }
            }

            console.warn(`⚠️ No GL account found for transaction key ${transactionKeyCode} — using naming fallback`);
            return null;
        } catch (err: any) {
            console.warn(`GL account resolution failed for ${transactionKeyCode}:`, err.message);
            return null;
        }
    }
}

export const grGLPostingService = new GRGLPostingService();
