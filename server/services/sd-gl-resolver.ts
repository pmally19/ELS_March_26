/**
 * SD GL Account Resolver — v3 (SAP-standard chain, clean)
 *
 * SAP O2C GL determination chain:
 *   BILLING:
 *     Dr Accounts Receivable  ← customer.reconciliation_account_code → reconciliation_accounts → gl_accounts
 *     Cr Revenue (ERL)        ← pricing_procedure → account_key ERL → account_determination_mapping
 *     Cr Discount (ERS)       ← account_determination_mapping key ERS
 *     Cr Output Tax (MWS)     ← tax_account_determination (separate table, account_key=MWS)
 *
 *   PGI:
 *     Dr COGS (GBB)           ← material_account_determination transaction_key GBB
 *     Cr Inventory (BSX)      ← material_account_determination transaction_key BSX
 *
 * SAP SD Account Keys:
 *   ERL — Revenue (main sales revenue)
 *   ERF — Freight Revenue
 *   ERS — Sales Deductions / Discounts
 *   GBB — Consumption / COGS (PGI)
 *   BSX — Inventory Account (PGI)
 *   MWS — Output Tax (used in tax_account_determination)
 */

import { pool } from '../db';

export interface SDGLAccounts {
    revenue: string | null;       // ERL
    freight: string | null;       // ERF
    discount: string | null;      // ERS
    cogs: string | null;          // GBB
    inventory: string | null;     // BSX
    receivable: string | null;    // Customer recon account or AR fallback
}

export class SDGLResolverService {

    /**
     * Resolve all standard SD GL accounts for a given business scenario.
     * Falls back by name search if not found in account_determination_mapping.
     */
    async resolveAll(businessScenario: string = 'sales scenario'): Promise<SDGLAccounts> {
        const result: SDGLAccounts = {
            revenue: null,
            freight: null,
            discount: null,
            cogs: null,
            inventory: null,
            receivable: null
        };

        try {
            // Step 1: SD account keys from account_determination_mapping (ERL, ERF, ERS)
            const sdKeys = await pool.query(`
        SELECT adm.account_key_code, gl.account_number
        FROM account_determination_mapping adm
        LEFT JOIN gl_accounts gl ON adm.gl_account_id = gl.id
        WHERE adm.account_key_code IN ('ERL', 'ERF', 'ERS', 'ERB')
          AND adm.is_active = true
          AND gl.account_number IS NOT NULL
          AND gl.is_active = true
        ORDER BY adm.account_key_code, adm.id
      `);

            sdKeys.rows.forEach(r => {
                if (r.account_key_code === 'ERL' && !result.revenue) result.revenue = r.account_number;
                if (r.account_key_code === 'ERF' && !result.freight) result.freight = r.account_number;
                if (r.account_key_code === 'ERS' && !result.discount) result.discount = r.account_number;
            });

            // Step 2: COGS (GBB) and Inventory (BSX) from material_account_determination
            const mmKeys = await pool.query(`
        SELECT tk.code, gl.account_number
        FROM material_account_determination mad
        JOIN transaction_keys tk ON tk.id = mad.transaction_key_id
        JOIN gl_accounts gl ON gl.id = mad.gl_account_id
        WHERE tk.code IN ('GBB', 'BSX')
          AND mad.is_active = true
          AND gl.is_active = true
        ORDER BY tk.code, mad.id
        LIMIT 4
      `);

            mmKeys.rows.forEach(r => {
                if (r.code === 'GBB' && !result.cogs) result.cogs = r.account_number;
                if (r.code === 'BSX' && !result.inventory) result.inventory = r.account_number;
            });

        } catch (err: any) {
            console.warn('SD GL resolver warning:', err.message);
        }

        return result;
    }

    /**
     * Resolve AR (Accounts Receivable) GL account for a specific customer.
     *
     * SAP-standard chain:
     *   erp_customers.reconciliation_account_code (text, e.g. '1010')
     *   → reconciliation_accounts.code → reconciliation_accounts.gl_account_id
     *   → gl_accounts.account_number
     *
     * Falls back to account_determination_mapping or name search if not configured.
     */
    async resolveCustomerARAccount(customerId: number): Promise<string | null> {
        try {
            // Step 1: Get reconciliation_account_code from customer master
            const reconCodeRes = await pool.query(`
        SELECT reconciliation_account_code
        FROM erp_customers
        WHERE id = $1
        LIMIT 1
      `, [customerId]);
            const reconCode = reconCodeRes.rows[0]?.reconciliation_account_code;

            if (reconCode) {
                // Step 1a: reconciliation_accounts table (code → gl_account_id → account_number)
                const raRes = await pool.query(`
          SELECT gl.account_number
          FROM reconciliation_accounts ra
          JOIN gl_accounts gl ON gl.id = ra.gl_account_id
          WHERE ra.code = $1 AND gl.is_active = true
          LIMIT 1
        `, [reconCode]).catch(() => ({ rows: [] }));

                if (raRes.rows[0]?.account_number) {
                    console.log(`[AR Resolver] Customer ${customerId}: recon_code=${reconCode} → GL ${raRes.rows[0].account_number}`);
                    return raRes.rows[0].account_number;
                }

                // Step 1b: direct match — if the code itself is an account number
                const directRes = await pool.query(`
          SELECT account_number FROM gl_accounts
          WHERE account_number = $1 AND is_active = true
          LIMIT 1
        `, [reconCode]).catch(() => ({ rows: [] }));

                if (directRes.rows[0]?.account_number) {
                    console.log(`[AR Resolver] Customer ${customerId}: direct GL match for code ${reconCode}`);
                    return directRes.rows[0].account_number;
                }
            }

            // Step 2: reconciliation_accounts keyed to this customer_id
            const raCustomerRes = await pool.query(`
        SELECT gl.account_number
        FROM reconciliation_accounts ra
        JOIN gl_accounts gl ON gl.id = ra.gl_account_id
        WHERE ra.customer_id = $1 AND gl.is_active = true
        LIMIT 1
      `, [customerId]).catch(() => ({ rows: [] }));

            if (raCustomerRes.rows[0]?.account_number) return raCustomerRes.rows[0].account_number;

            // Step 3: account_determination_mapping for AR accounts
            const admRes = await pool.query(`
        SELECT gl.account_number
        FROM account_determination_mapping adm
        JOIN gl_accounts gl ON gl.id = adm.gl_account_id
        WHERE adm.account_key_code IN ('DEB', 'ARK', 'AR')
          AND adm.is_active = true AND gl.is_active = true
        ORDER BY adm.id LIMIT 1
      `).catch(() => ({ rows: [] }));

            if (admRes.rows[0]?.account_number) return admRes.rows[0].account_number;

            return null;

        } catch (err: any) {
            console.warn('Customer AR account resolution warning:', err.message);
            return null;
        }
    }

    /**
     * Resolve Output Tax GL account from tax_account_determination.
     * SAP chain: tax_account_determination (account_key=MWS) → gl_account_id → account_number
     * Falls back to account_determination_mapping MWS key or name search.
     * @param chartOfAccountsId optional CoA filter for multi-CoA systems
     */
    async resolveTaxAccount(chartOfAccountsId?: number): Promise<string | null> {
        try {
            // PRIMARY: tax_account_determination table
            let taxQuery = `
        SELECT gl.account_number
        FROM tax_account_determination tad
        JOIN gl_accounts gl ON gl.id = tad.gl_account_id
        WHERE tad.account_key IN ('MWS', 'MWST', 'MW1')
          AND gl.is_active = true
      `;
            const params: any[] = [];
            if (chartOfAccountsId) {
                taxQuery += ` AND (tad.chart_of_accounts_id = $1 OR tad.chart_of_accounts_id IS NULL)`;
                params.push(chartOfAccountsId);
                taxQuery += ` ORDER BY CASE WHEN tad.chart_of_accounts_id IS NOT NULL THEN 0 ELSE 1 END, tad.id LIMIT 1`;
            } else {
                taxQuery += ` ORDER BY tad.id LIMIT 1`;
            }

            const taxRes = await pool.query(taxQuery, params);
            if (taxRes.rows[0]?.account_number) {
                console.log(`[Tax Resolver] Found via tax_account_determination: GL ${taxRes.rows[0].account_number}`);
                return taxRes.rows[0].account_number;
            }

            // FALLBACK 1: account_determination_mapping MWS/MWST keys
            const admRes = await pool.query(`
        SELECT gl.account_number
        FROM account_determination_mapping adm
        JOIN gl_accounts gl ON gl.id = adm.gl_account_id
        WHERE adm.account_key_code IN ('MWS', 'MWST', 'MW1', 'MWS1', 'TAX')
          AND adm.is_active = true AND gl.is_active = true
        ORDER BY adm.id LIMIT 1
      `);
            if (admRes.rows[0]?.account_number) return admRes.rows[0].account_number;

            return null;

        } catch (err: any) {
            console.warn('Tax GL account resolution warning:', err.message);
            return null;
        }
    }

    /**
     * Quick lookup: single account key → GL account number
     */
    async resolveByKey(accountKeyCode: string, businessScenario?: string): Promise<string | null> {
        try {
            const res = await pool.query(`
        SELECT gl.account_number
        FROM account_determination_mapping adm
        LEFT JOIN gl_accounts gl ON adm.gl_account_id = gl.id
        WHERE adm.account_key_code = $1
          AND adm.is_active = true
          AND gl.account_number IS NOT NULL
        ${businessScenario ? `AND adm.business_scenario = $2` : ''}
        ORDER BY adm.id
        LIMIT 1
      `, businessScenario ? [accountKeyCode, businessScenario] : [accountKeyCode]);

            return res.rows[0]?.account_number || null;
        } catch {
            return null;
        }
    }

    /**
     * Build standard billing journal entries for an invoice
     *
     * SAP Standard Invoice Posting (VF01 → FI):
     *   Dr Accounts Receivable   ← customer recon account (posting key 01)
     *   Cr Revenue (ERL)         ← account_determination_mapping ERL (posting key 50)
     *   Cr Discount (ERS)        ← account_determination_mapping ERS (posting key 40 debit, reduces revenue)
     *   Cr Output Tax (MWS)      ← tax_account_determination MWS (posting key 50)
     */
    async buildBillingJournalLines(params: {
        netAmount: number;
        taxAmount: number;
        discountAmount: number;
        totalAmount: number;
        currency: string;
        reference: string;
        businessScenario?: string;
        customerId?: number;          // Used to look up customer recon account
        chartOfAccountsId?: number;   // Used to filter tax_account_determination

        // Exact accounts from billing document items to avoid fallbacks
        revenueItems?: Array<{ account: string, amount: number, description?: string }>;
        arAccount?: string | null;
        taxAccount?: string | null;
    }) {
        const gl = await this.resolveAll(params.businessScenario);
        const lines = [];

        // ── Line 1: Dr Accounts Receivable ─────────────────────────────────────────
        // SAP: Customer Debit → posting key 01 (Account type D)
        let arAccount = params.arAccount || null;
        if (!arAccount && params.customerId) {
            const custAR = await this.resolveCustomerARAccount(params.customerId);
            if (custAR) arAccount = custAR;
        }
        if (!arAccount) arAccount = gl.receivable || null;

        if (!arAccount) {
            throw new Error(`STRICT VERIFICATION FAILED: Cannot determine Accounts Receivable GL account for Customer ID ${params.customerId}. Please configure a Reconciliation Account in Customer Master or map Account Key 'DEB' in Account Determination Mapping.`);
        }

        lines.push({
            account: arAccount,
            posting_key: '01',      // Customer Debit — SAP OB41 PK01
            debit: params.totalAmount,
            credit: 0,
            description: `Customer Receivable — Invoice ${params.reference}`
        });

        // ── Line 2: Cr Revenue (ERL) ────────────────────────────────────────────────
        // SAP: Revenue credit → posting key 50 (Account type S)
        if (params.revenueItems && params.revenueItems.length > 0) {
            const groupedRev = new Map<string, number>();
            for (const revItem of params.revenueItems) {
                if (revItem.amount > 0) {
                    groupedRev.set(revItem.account, (groupedRev.get(revItem.account) || 0) + revItem.amount);
                }
            }
            for (const [account, amount] of Array.from(groupedRev.entries())) {
                lines.push({
                    account: account,
                    posting_key: '50',
                    debit: 0,
                    credit: amount,
                    description: `Revenue (ERL) — Invoice ${params.reference}`
                });
            }
        } else {
            // Fallback to single globally determined revenue account
            const netRevenue = params.netAmount - (params.discountAmount || 0);
            const revenueAccount = gl.revenue;

            if (!revenueAccount && netRevenue > 0) {
                throw new Error(`STRICT VERIFICATION FAILED: Cannot determine Revenue GL account for Invoice ${params.reference}. Please map Account Key 'ERL' correctly.`);
            }

            if (revenueAccount && netRevenue > 0) {
                lines.push({
                    account: revenueAccount,
                    posting_key: '50',      // GL Credit — SAP OB41 PK50
                    debit: 0,
                    credit: netRevenue,
                    description: `Revenue (ERL) — Invoice ${params.reference}`
                });
            }
        }

        // ── Line 3: Discount/Deduction (ERS) ───────────────────────────────────────
        // SAP: Discount reduces revenue — posting key 40 (Debit on GL)
        if (params.discountAmount > 0 && gl.discount) {
            lines.push({
                account: gl.discount,
                posting_key: '40',  // GL Debit
                debit: params.discountAmount,
                credit: 0,
                description: `Sales Discount (ERS) — Invoice ${params.reference}`
            });
        }

        // ── Line 4: Cr Output Tax (MWS) ─────────────────────────────────────────────
        // SAP: Tax credit → posting key 50
        if (params.taxAmount > 0) {
            const taxAccount = params.taxAccount || await this.resolveTaxAccount(params.chartOfAccountsId);
            if (!taxAccount) {
                throw new Error(`STRICT VERIFICATION FAILED: Cannot determine Output Tax GL account for Invoice ${params.reference}. Please configure Tax Account Determination for Account Key 'MWS'.`);
            }

            lines.push({
                account: taxAccount,
                posting_key: '50',  // GL Credit
                debit: 0,
                credit: params.taxAmount,
                description: `Output Tax (MWS) — Invoice ${params.reference}`
            });
        }

        return { lines, glAccounts: gl };
    }


    /**
     * Build standard PGI journal entries (Post Goods Issue for Sales Delivery)
     *
     * SAP Standard PGI Posting (Movement Type 601):
     *   Dr COGS (GBB)       — cost of goods sold (posting key 91)
     *   Cr Inventory (BSX)  — inventory decreases (posting key 99)
     */
    async buildPGIJournalLines(params: {
        totalValue: number;
        currency: string;
        reference: string;
        materialCode?: string;
    }) {
        const gl = await this.resolveAll();

        if (!gl.cogs) {
            throw new Error(`STRICT VERIFICATION FAILED: Cannot determine COGS GL account (GBB) for PGI ${params.reference}. Please map Account Key 'GBB' in Material Account Determination.`);
        }
        if (!gl.inventory) {
            throw new Error(`STRICT VERIFICATION FAILED: Cannot determine Inventory GL account (BSX) for PGI ${params.reference}. Please map Account Key 'BSX' in Material Account Determination.`);
        }

        const lines = [];

        // Line 1: Dr COGS
        lines.push({
            account: gl.cogs,
            debit: params.totalValue,
            credit: 0,
            description: `COGS (GBB) — PGI ${params.reference}${params.materialCode ? ' Mat: ' + params.materialCode : ''}`
        });

        // Line 2: Cr Inventory
        lines.push({
            account: gl.inventory,
            debit: 0,
            credit: params.totalValue,
            description: `Inventory (BSX) — PGI ${params.reference}`
        });

        return { lines, glAccounts: gl };
    }
}

export const sdGLResolver = new SDGLResolverService();
