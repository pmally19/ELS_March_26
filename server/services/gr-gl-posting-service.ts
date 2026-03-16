/**
 * GR GL Posting Service — SAP-style account determination & automatic GL posting
 *
 * Correct SAP Flow (using the Movement Types tabs configuration):
 *
 *  1. Get GR: material_code, quantity, unit_price, movement_type (e.g. '101'), plant
 *  2. movement_types  →  movement_posting_rules  (via movement_type_code)
 *     Each posting rule has: special_stock_ind, movement_ind, VALUE_STRING (e.g. 'WE01')
 *  3. movement_type_value_strings  (per value_string)  →  transaction_key (e.g. 'BSX', 'WRX')
 *     Each row has debit_credit = 'D' or 'C'
 *  4. transaction_keys  →  material_account_determination  →  gl_account_id
 *     Joined on valuation_class + valuation_grouping_code + chart_of_accounts
 *  5. Insert accounting_documents (FI header)
 *  6. Insert gl_entries (one line per transaction key in the value string)
 *  7. Update goods_receipts: set posted = true, gl_document_number
 */

import { pool } from '../db';
import { postGLDocument, generateDocumentNumber, GLLineItem, GLDocumentHeader } from './gl-posting-helper.js';

export interface GRPostingResult {
    success: boolean;
    glDocumentNumber?: string;
    accountingDocumentId?: number;
    debitAccount?: string;
    creditAccount?: string;
    prdAccount?: string | null;
    totalAmount?: number;
    error?: string;
}

interface ValueStringLine {
    transaction_key: string;
    debit_credit: 'D' | 'C';
    account_modifier: string | null;
    description: string | null;
}

export class GRGLPostingService {

    /**
     * Main entry point: post a goods receipt to GL using the Movement Types tab configuration.
     */
    async postGRToGL(goodsReceiptId: number): Promise<GRPostingResult> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // ── 1. Load GR with material + plant + company code info ────────────────
            const grResult = await client.query(`
                SELECT
                    gr.id,
                    gr.receipt_number,
                    gr.grn_number,
                    gr.quantity        AS quantity,
                    gr.unit_price      AS unit_price,
                    gr.total_value     AS total_value,
                    gr.movement_type   AS movement_type,
                    gr.purchase_order_id,
                    gr.plant_id,
                    gr.currency,
                    gr.material_code,
                    m.id                    AS material_id,
                    m.price_control         AS price_control,
                    m.base_unit_price       AS standard_price,
                    -- valuation_class is stored as TEXT code; resolve ID via valuation_classes
                    (SELECT vc.id FROM valuation_classes vc
                     WHERE vc.class_code = m.valuation_class LIMIT 1) AS valuation_class_id,
                    p.company_code_id,
                    cc.chart_of_accounts_id,
                    -- valuation_grouping_code_id is assigned at Plant level (Plant master)
                    p.valuation_grouping_code_id
                FROM goods_receipts gr
                LEFT JOIN materials m     ON m.code = gr.material_code
                LEFT JOIN plants p        ON p.id   = gr.plant_id
                LEFT JOIN company_codes cc ON cc.id  = p.company_code_id
                WHERE gr.id = $1
            `, [goodsReceiptId]);

            if (grResult.rows.length === 0) {
                throw new Error(`Goods receipt ${goodsReceiptId} not found`);
            }

            const gr = grResult.rows[0];
            const movementTypeCode = gr.movement_type || '101';
            const qty = parseFloat(gr.quantity || '1');
            const poUnitPrice = parseFloat(gr.unit_price || '0');
            const totalPoValue = qty * poUnitPrice;

            if (totalPoValue <= 0) {
                throw new Error(`GR ${goodsReceiptId} has zero value — cannot post to GL`);
            }

            // Price-control values for PRD calculation
            const priceControl = gr.price_control || 'V';
            const standardPrice = parseFloat(gr.standard_price || '0');

            let inventoryValue = totalPoValue;
            let varianceAmount = 0;
            if (priceControl === 'S' && standardPrice > 0) {
                inventoryValue = standardPrice * qty;
                varianceAmount = totalPoValue - inventoryValue; // PRD = PO value - Std value
            }
            const hasVariance = Math.abs(varianceAmount) > 0.001;

            // ── 2. Resolve the posting rule for this movement type ─────────────────
            // Chain: movement_types → movement_posting_rules (value_string)
            const postingRuleResult = await client.query(`
                SELECT pr.value_string
                FROM movement_types mt
                JOIN movement_posting_rules pr ON pr.movement_type_id = mt.id
                WHERE mt.movement_type_code = $1
                  AND pr.is_active = true
                  AND (pr.special_stock_ind = '' OR pr.special_stock_ind IS NULL)
                  AND (pr.movement_ind = '' OR pr.movement_ind IS NULL)
                ORDER BY pr.id
                LIMIT 1
            `, [movementTypeCode]);

            if (postingRuleResult.rows.length === 0) {
                // Try with any posting rule for this movement type
                const fallbackRule = await client.query(`
                    SELECT pr.value_string
                    FROM movement_types mt
                    JOIN movement_posting_rules pr ON pr.movement_type_id = mt.id
                    WHERE mt.movement_type_code = $1
                      AND pr.is_active = true
                    ORDER BY pr.id
                    LIMIT 1
                `, [movementTypeCode]);

                if (fallbackRule.rows.length === 0) {
                    throw new Error(`No posting rule configured for movement type ${movementTypeCode}. Please add a Posting Rule in the Movement Types configuration.`);
                }
                postingRuleResult.rows.push(fallbackRule.rows[0]);
            }

            const valueString = postingRuleResult.rows[0].value_string as string;
            console.log(`[GR GL] Movement ${movementTypeCode} → Posting Rule → Value String: ${valueString}`);

            // ── 3. Get all transaction key lines for this value string ─────────────
            // Chain: movement_type_value_strings → transaction_keys
            const vsLinesResult = await client.query(`
                SELECT
                    mvs.transaction_key,
                    mvs.debit_credit,
                    mvs.account_modifier,
                    mvs.description
                FROM movement_type_value_strings mvs
                WHERE mvs.value_string = $1
                  AND mvs.is_active = true
                ORDER BY mvs.sort_order, mvs.debit_credit
            `, [valueString]);

            if (vsLinesResult.rows.length === 0) {
                throw new Error(`Value String "${valueString}" has no transaction key lines configured. Please add lines in the Value Strings tab.`);
            }

            const vsLines: ValueStringLine[] = vsLinesResult.rows;
            console.log(`[GR GL] Value String ${valueString} → ${vsLines.length} line(s):`, vsLines.map(l => `${l.debit_credit}(${l.transaction_key})`).join(', '));

            // ── 4. Generate FI document number ─────────────────────────────────────
            const today = new Date();
            const fiscal_year = today.getFullYear();
            const fiscal_period = today.getMonth() + 1;
            const docNumber = await generateDocumentNumber(client, 'FIGR');
            const grRef = gr.receipt_number || gr.grn_number || `GR-${goodsReceiptId}`;

            // GL lines will be collected and posted via the shared helper
            const glLines: GLLineItem[] = [];

            // ── 6. Insert GL entry lines — one per value string line ──────────────
            let debitAccountNum: string | null = null;
            let creditAccountNum: string | null = null;
            let prdAccountNum: string | null = null;

            for (const line of vsLines) {
                const txKey = line.transaction_key;
                const dcIndicator = line.debit_credit as 'D' | 'C';
                const isPrd = txKey === 'PRD';

                if (isPrd && !hasVariance) continue;

                const glAccountId = await this.resolveGLAccount(
                    client, txKey,
                    gr.valuation_class_id,
                    gr.valuation_grouping_code_id,
                    gr.chart_of_accounts_id
                );

                if (!glAccountId) {
                    console.warn(`[GR GL] ⚠️ No GL account for tx key ${txKey}. Skipping.`);
                    continue;
                }

                let postingAmount: number;
                let actualDC: 'D' | 'C' = dcIndicator;
                if (isPrd) {
                    postingAmount = Math.abs(varianceAmount);
                    actualDC = varianceAmount > 0 ? dcIndicator : (dcIndicator === 'D' ? 'C' : 'D');
                } else {
                    postingAmount = dcIndicator === 'D' ? inventoryValue : totalPoValue;
                }

                const postingKey = actualDC === 'D' ? '40' : '50';
                const lineDesc = isPrd
                    ? `${txKey}: Price Variance — ${grRef}`
                    : dcIndicator === 'D'
                        ? `${txKey}: ${gr.material_code || 'Inventory'} — ${grRef}`
                        : `${txKey}: GR/IR Clearing — ${grRef}`;

                glLines.push({
                    glAccountId,
                    postingKey,
                    debitCredit: actualDC,
                    amount: postingAmount,
                    description: lineDesc,
                    reference: grRef,
                    sourceModule: 'MM',
                    sourceDocumentId: goodsReceiptId,
                    sourceDocumentType: 'GOODS_RECEIPT'
                });

                // Track account numbers for logging
                const acctResult = await client.query('SELECT account_number FROM gl_accounts WHERE id = $1', [glAccountId]);
                const acctNum = acctResult.rows[0]?.account_number || glAccountId.toString();
                if (dcIndicator === 'D' && !isPrd) debitAccountNum = acctNum;
                else if (dcIndicator === 'C') creditAccountNum = acctNum;
                else if (isPrd) prdAccountNum = acctNum;
            }

            // ── 6. Post all GL lines via the shared helper ─────────────────────────
            if (glLines.length > 0) {
                const header: GLDocumentHeader = {
                    documentNumber: docNumber,
                    documentType: 'WE',
                    companyCodeId: gr.company_code_id,
                    postingDate: today,
                    fiscalYear: fiscal_year,
                    fiscalPeriod: fiscal_period,
                    reference: grRef,
                    headerText: `GR ${grRef} — ${movementTypeCode} — ${valueString}`,
                    sourceModule: 'MM',
                    sourceDocumentId: goodsReceiptId,
                    sourceDocumentType: 'GOODS_RECEIPT'
                };
                const postResult = await postGLDocument(client, header, glLines);
                if (!postResult.success) throw new Error(postResult.error);
                console.log(`[GR GL] Posted to journal_entries id=${postResult.journalEntryId}`);
            } else {
                console.warn(`[GR GL] No GL lines generated for GR ${goodsReceiptId} — check account determination.`);
            }

            // ── 7. Mark GR as financially posted ──────────────────────────────────
            // Add columns if they don't exist (defensive migration)
            try {
                await client.query(`ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS financial_posting_status VARCHAR(20)`);
                await client.query(`ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS gl_document_number VARCHAR(50)`);
            } catch (_) { /* columns exist */ }

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

            console.log(`✅ GR ${goodsReceiptId} posted to journal_entries: ${docNumber} | ValueString=${valueString} | Dr: ${debitAccountNum} Cr: ${creditAccountNum}${hasVariance ? ` PRD: ${prdAccountNum}` : ''} | Amount: ${totalPoValue}`);

            return {
                success: true,
                glDocumentNumber: docNumber,
                accountingDocumentId: undefined,
                debitAccount: debitAccountNum || 'BSX',
                creditAccount: creditAccountNum || 'WRX',
                prdAccount: hasVariance ? (prdAccountNum || 'PRD') : null,
                totalAmount: totalPoValue
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error(`❌ GR GL posting failed for GR ${goodsReceiptId}:`, error.message);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    // insertGLEntry removed — now using shared postGLDocument helper (gl-posting-helper.ts)

    /**
     * Resolve GL account via material_account_determination.
     * Chain: transaction_key code → transaction_key_id → material_account_determination → gl_account_id
     * Falls back from most-specific to least-specific match (SAP OBYC logic).
     */
    private async resolveGLAccount(
        client: any,
        transactionKeyCode: string,
        valuationClassId: number | null,
        valuationGroupingCodeId: number | null,
        chartOfAccountsId: number | null
    ): Promise<number | null> {
        try {
            // Resolve transaction_key ID from code
            const tkResult = await client.query(
                'SELECT id FROM transaction_keys WHERE code = $1 AND is_active = true LIMIT 1',
                [transactionKeyCode]
            );
            if (tkResult.rows.length === 0) {
                console.warn(`[GR GL] Transaction key "${transactionKeyCode}" not found in transaction_keys table`);
                return null;
            }
            const transactionKeyId = tkResult.rows[0].id;

            // Try from most-specific to least-specific (SAP fallback logic)
            const attempts = [
                { vcId: valuationClassId, vgcId: valuationGroupingCodeId, coaId: chartOfAccountsId },
                { vcId: valuationClassId, vgcId: null, coaId: chartOfAccountsId },
                { vcId: valuationClassId, vgcId: valuationGroupingCodeId, coaId: null },
                { vcId: valuationClassId, vgcId: null, coaId: null },
                { vcId: null, vgcId: null, coaId: chartOfAccountsId },
                { vcId: null, vgcId: null, coaId: null }, // last resort
            ];

            for (const attempt of attempts) {
                const conditions: string[] = ['mad.transaction_key_id = $1', 'mad.is_active = true'];
                const params: any[] = [transactionKeyId];
                let idx = 2;

                if (attempt.vcId) { conditions.push(`mad.valuation_class_id = $${idx++}`); params.push(attempt.vcId); }
                if (attempt.vgcId) { conditions.push(`mad.valuation_grouping_code_id = $${idx++}`); params.push(attempt.vgcId); }
                if (attempt.coaId) { conditions.push(`mad.chart_of_accounts_id = $${idx++}`); params.push(attempt.coaId); }

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

            // Name-based fallback as last resort
            const fallbackMap: Record<string, string> = {
                'BSX': '%inventory%',
                'WRX': '%gr/ir%',
                'PRD': '%price diff%',
                'GBB': '%consumption%',
                'FRL': '%freight%',
            };
            const pattern = fallbackMap[transactionKeyCode];
            if (pattern) {
                const nameResult = await client.query(
                    `SELECT id FROM gl_accounts WHERE account_name ILIKE $1 AND is_active = true LIMIT 1`,
                    [pattern]
                );
                if (nameResult.rows.length > 0) {
                    console.warn(`[GR GL] ⚠️ Using name-based fallback for ${transactionKeyCode}: ${nameResult.rows[0].id}`);
                    return nameResult.rows[0].id;
                }
            }

            console.warn(`[GR GL] No GL account found for transaction key ${transactionKeyCode}`);
            return null;
        } catch (err: any) {
            console.warn(`[GR GL] GL account resolution failed for ${transactionKeyCode}:`, err.message);
            return null;
        }
    }
}

export const grGLPostingService = new GRGLPostingService();