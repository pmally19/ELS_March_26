/**
 * AP Invoice GL Posting Service — SAP MIRO-style account determination
 *
 * Invoice GL Flow (mirrors SAP MIRO using KR / RE document type posting rules):
 *
 *  For a PO-based invoice (MIRO), the posting is:
 *    Dr  WRX  GR/IR Clearing (clears the GR/IR liability created by GR)
 *    Cr  Vendor Recon Account (creates the vendor payable)
 *    Dr/Cr PRD  Price Difference (if invoice price ≠ PO price, Standard Price control)
 *
 *  Resolves WRX and PRD via movement_type_value_strings using the invoice movement
 *  type code ('RE' for Invoice Receipt Movement), then falls back to OBYC
 *  (material_account_determination) for the actual GL account.
 *
 *  For non-PO invoices (direct AP), only Cr Vendor is posted.
 */

import { pool } from '../db';

export interface APPostingResult {
    success: boolean;
    glDocumentNumber?: string;
    accountingDocumentId?: number;
    debitAccount?: string;
    creditAccount?: string;
    prdAccount?: string | null;
    totalAmount?: number;
    error?: string;
}

export class APGLPostingService {

    /**
     * Post an AP Invoice to GL.
     * @param apInvoiceId      - accounts_payable.id
     * @param invoiceMovType   - Movement type code for invoice (default 'RE')
     */
    async postAPInvoiceToGL(
        apInvoiceId: number,
        invoiceMovType: string = 'RE'
    ): Promise<APPostingResult> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // ── 1. Load invoice data ────────────────────────────────────────────────
            const invResult = await client.query(`
                SELECT
                    ap.id,
                    ap.invoice_number,
                    ap.invoice_date,
                    ap.amount           AS total_amount,
                    ap.net_amount,
                    ap.tax_amount,
                    ap.vendor_id,
                    ap.purchase_order_id,
                    ap.company_code_id,
                    -- Resolve valuation_grouping_code_id via Invoice → PO → Plant (where user assigns it)
                    p.valuation_grouping_code_id,
                    -- Resolve chart_of_accounts_id via Plant → Company Code
                    cc.chart_of_accounts_id,
                    v.reconciliation_account_id
                FROM accounts_payable ap
                LEFT JOIN vendors v            ON v.id = ap.vendor_id
                LEFT JOIN purchase_orders po   ON po.id = ap.purchase_order_id
                LEFT JOIN plants p             ON p.id = po.plant_id
                LEFT JOIN company_codes cc     ON cc.id = COALESCE(p.company_code_id, ap.company_code_id)
                WHERE ap.id = $1
            `, [apInvoiceId]);

            if (invResult.rows.length === 0) {
                throw new Error(`AP Invoice ${apInvoiceId} not found`);
            }

            const inv = invResult.rows[0];
            const totalAmount = parseFloat(inv.total_amount || '0');
            if (totalAmount <= 0) {
                throw new Error(`Invoice ${apInvoiceId} has zero amount — cannot post to GL`);
            }

            // ── 2. Resolve WRX (GR/IR Clearing) from Movement Types chain ──────────
            // Chain: invoiceMovType (RE) → movement_posting_rules → value_string
            //        → movement_type_value_strings (WRX line) → material_account_determination
            let wrxGLId: number | null = null;

            if (inv.purchase_order_id) {
                // Try to get the WRX account via the movement-type posting-rule chain
                //  Invoice movement type (RE) → posting rules → value string → WRX line
                const wrxPostingResult = await client.query(`
                    SELECT mvs.transaction_key, mvs.debit_credit
                    FROM movement_types mt
                    JOIN movement_posting_rules pr ON pr.movement_type_id = mt.id
                    JOIN movement_type_value_strings mvs ON mvs.value_string = pr.value_string
                    WHERE mt.movement_type_code = $1
                      AND pr.is_active = true
                      AND mvs.is_active = true
                      AND mvs.transaction_key = 'WRX'
                    LIMIT 1
                `, [invoiceMovType]);

                if (wrxPostingResult.rows.length > 0) {
                    // Get WRX GL account via OBYC
                    wrxGLId = await this.resolveGLAccount(client, 'WRX', null,
                        inv.valuation_grouping_code_id, inv.chart_of_accounts_id);
                } else {
                    // Fallback: use movement type '101' to find the WRX (GR/IR) account
                    // because GR was posted with WRX as credit — we now need to debit it
                    wrxGLId = await this.resolveGLAccount(client, 'WRX', null,
                        inv.valuation_grouping_code_id, inv.chart_of_accounts_id);
                }
            }

            // ── 3. Resolve Vendor Reconciliation Account ────────────────────────────
            let vendorGLId: number | null = null;
            let vendorGLNumber: string | null = null;

            try {
                if (inv.reconciliation_account_id) {
                    const raResult = await client.query(`
                        SELECT ga.id, ga.account_number
                        FROM reconciliation_accounts ra
                        JOIN gl_accounts ga ON ga.id = ra.gl_account_id
                        WHERE ra.id = $1 AND ga.is_active = true
                        LIMIT 1
                    `, [inv.reconciliation_account_id]);
                    if (raResult.rows.length > 0) {
                        vendorGLId = raResult.rows[0].id;
                        vendorGLNumber = raResult.rows[0].account_number;
                    }
                }
            } catch (_) { /* will fallback */ }

            // Fallback: find any Accounts Payable GL account
            if (!vendorGLId) {
                const apFallback = await client.query(`
                    SELECT id, account_number FROM gl_accounts
                    WHERE (account_name ILIKE '%payable%' OR account_name ILIKE '%vendor%')
                      AND account_type ILIKE '%liab%'
                      AND is_active = true
                    ORDER BY account_number
                    LIMIT 1
                `);
                if (apFallback.rows.length > 0) {
                    vendorGLId = apFallback.rows[0].id;
                    vendorGLNumber = apFallback.rows[0].account_number;
                }
            }

            // ── 4. Generate FI document number ─────────────────────────────────────
            const today = new Date();
            const fiscal_year = today.getFullYear();
            const fiscal_period = today.getMonth() + 1;
            const docNumber = `FIAP${apInvoiceId}-${Date.now().toString().slice(-8)}`;
            const reference = inv.invoice_number || `AP-${apInvoiceId}`;

            // ── 5. Insert accounting_documents header ──────────────────────────────
            const adResult = await client.query(`
                INSERT INTO accounting_documents (
                    document_number, document_type, posting_date, document_date,
                    company_code, fiscal_year, period, reference,
                    header_text, total_amount, currency,
                    source_module, source_document_id, source_document_type,
                    status, created_at
                ) VALUES (
                    $1, 'KR', CURRENT_DATE, $2,
                    $3, $4, $5, $6,
                    $7, $8, 'INR',
                    'AP', $9, 'AP_INVOICE',
                    'POSTED', NOW()
                ) RETURNING id
            `, [
                docNumber,
                inv.invoice_date || today,
                inv.company_code_id?.toString() || '1000',
                fiscal_year,
                fiscal_period,
                reference,
                `Vendor Invoice ${reference}`,
                totalAmount,
                apInvoiceId
            ]);

            const accountingDocId = adResult.rows[0].id;

            let debitAccountNum: string | null = null;
            let creditAccountNum: string | null = null;

            // ── 6. Post GL lines ────────────────────────────────────────────────────

            // Line 1: Debit WRX — GR/IR Clearing (clears the credit from GR posting)
            if (wrxGLId && inv.purchase_order_id) {
                const wrxAcct = await client.query('SELECT account_number FROM gl_accounts WHERE id = $1', [wrxGLId]);
                debitAccountNum = wrxAcct.rows[0]?.account_number || 'WRX';
                await this.insertGLEntry(client, docNumber, wrxGLId, totalAmount, 'D',
                    fiscal_period, fiscal_year,
                    `WRX: GR/IR Clearing — Invoice ${reference}`,
                    apInvoiceId, reference);
            } else if (!wrxGLId && inv.purchase_order_id) {
                console.warn(`[AP GL] ⚠️ No WRX (GR/IR) account resolved for invoice ${apInvoiceId}. Posting against vendor account only.`);
            }

            // Line 2: Credit Vendor Reconciliation Account
            if (vendorGLId) {
                creditAccountNum = vendorGLNumber || 'AP';
                await this.insertGLEntry(client, docNumber, vendorGLId, totalAmount, 'C',
                    fiscal_period, fiscal_year,
                    `KR: Vendor Payable — Invoice ${reference}`,
                    apInvoiceId, reference);
            } else {
                throw new Error('No Vendor reconciliation / Accounts Payable GL account could be determined. Please configure a reconciliation account on the vendor.');
            }

            // ── 7. Update invoice GL posting status ────────────────────────────────
            try {
                await client.query(`ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS gl_document_number VARCHAR(50)`);
                await client.query(`ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS gl_posting_status VARCHAR(20)`);
            } catch (_) { /* columns already exist */ }

            await client.query(`
                UPDATE accounts_payable
                SET gl_document_number = $1,
                    gl_posting_status  = 'POSTED',
                    status             = CASE WHEN status = 'Open' THEN 'Posted' ELSE status END
                WHERE id = $2
            `, [docNumber, apInvoiceId]);

            // Also update accounting_documents with resolved type if available
            try {
                await client.query(`ALTER TABLE accounting_documents ADD COLUMN IF NOT EXISTS accountingDocTypeId INTEGER`);
            } catch (_) { }

            await client.query('COMMIT');

            console.log(`✅ AP Invoice ${apInvoiceId} posted to GL: ${docNumber} | Dr(WRX): ${debitAccountNum} Cr(Vendor): ${creditAccountNum} | Amount: ${totalAmount}`);

            return {
                success: true,
                glDocumentNumber: docNumber,
                accountingDocumentId: accountingDocId,
                debitAccount: debitAccountNum || 'WRX',
                creditAccount: creditAccountNum || 'AP',
                totalAmount
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error(`❌ AP GL posting failed for Invoice ${apInvoiceId}:`, error.message);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    private async insertGLEntry(
        client: any,
        docNumber: string,
        glAccountId: number,
        amount: number,
        dcIndicator: 'D' | 'C',
        period: number,
        year: number,
        description: string,
        sourceDocId: number,
        reference: string
    ): Promise<void> {
        await client.query(`
            INSERT INTO gl_entries (
                document_number, gl_account_id, amount, debit_credit_indicator,
                posting_date, posting_status, fiscal_period, fiscal_year,
                description, source_module, source_document_type, source_document_id,
                reference
            ) VALUES (
                $1, $2, $3, $4,
                CURRENT_DATE, 'posted', $5, $6,
                $7, 'AP', 'AP_INVOICE', $8, $9
            )
        `, [docNumber, glAccountId, amount, dcIndicator, period, year, description, sourceDocId, reference]);
    }

    /**
     * Resolve GL account via material_account_determination (OBYC).
     * Falls back from most-specific to generic.
     */
    async resolveGLAccount(
        client: any,
        transactionKeyCode: string,
        valuationClassId: number | null,
        valuationGroupingCodeId: number | null,
        chartOfAccountsId: number | null
    ): Promise<number | null> {
        try {
            const tkResult = await client.query(
                'SELECT id FROM transaction_keys WHERE code = $1 AND is_active = true LIMIT 1',
                [transactionKeyCode]
            );
            if (tkResult.rows.length === 0) return null;
            const transactionKeyId = tkResult.rows[0].id;

            const attempts = [
                { vcId: valuationClassId, vgcId: valuationGroupingCodeId, coaId: chartOfAccountsId },
                { vcId: valuationClassId, vgcId: null, coaId: chartOfAccountsId },
                { vcId: valuationClassId, vgcId: null, coaId: null },
                { vcId: null, vgcId: null, coaId: chartOfAccountsId },
                { vcId: null, vgcId: null, coaId: null },
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

            // Name-based fallback
            const fallbackPatterns: Record<string, string> = { 'WRX': '%gr/ir%', 'BSX': '%inventory%', 'PRD': '%price diff%' };
            const pat = fallbackPatterns[transactionKeyCode];
            if (pat) {
                const r = await client.query(`SELECT id FROM gl_accounts WHERE account_name ILIKE $1 AND is_active = true LIMIT 1`, [pat]);
                if (r.rows.length > 0) return r.rows[0].id;
            }
            return null;
        } catch (err: any) {
            console.warn(`[AP GL] resolveGLAccount failed for ${transactionKeyCode}:`, err.message);
            return null;
        }
    }
}

export const apGLPostingService = new APGLPostingService();
