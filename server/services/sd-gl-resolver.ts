/**
 * SD GL Account Resolver
 * 
 * Resolves GL account numbers from account_determination_mapping
 * for Sales & Distribution (SD) posting events.
 *
 * SAP SD Account Keys used in billing/invoicing:
 *   ERL — Revenue Account (main sales revenue)
 *   ERF — Freight Revenue Account
 *   ERS — Sales Deductions / Discounts
 *   ERB — Sales of Raw Materials
 *   UMB — Revenue Account Determination (output tax base)
 *
 * SAP SD Account Keys used in PGI (Goods Issue for Delivery):
 *   GBB — COGS / Consumption Account (Debit)
 *   BSX — Inventory Account          (Credit)
 *
 * Usage:
 *   const gl = await sdGLResolver.resolveAll('sales scenario');
 *   console.log(gl.revenue);   // ERL GL account number
 *   console.log(gl.cogs);      // GBB GL account number
 *   console.log(gl.inventory); // BSX GL account number
 */

import { pool } from '../db';

export interface SDGLAccounts {
    // Billing / Invoice
    revenue: string | null;       // ERL
    freight: string | null;       // ERF
    discount: string | null;      // ERS
    // PGI - Goods Issue for Sales
    cogs: string | null;          // GBB (COGS debit)
    inventory: string | null;     // BSX (Inventory credit)
    // Accounts Receivable (customer invoice debit)
    receivable: string | null;
}

export class SDGLResolverService {

    /**
     * Resolve all standard SD GL accounts for a given business scenario
     * Falls back to GL account lookup by type if not in account_determination_mapping
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
            // Step 1: Pull from account_determination_mapping (SD keys: ERL, ERF, ERS)
            const sdKeys = await pool.query(`
        SELECT adm.account_key_code, gl.account_number
        FROM account_determination_mapping adm
        LEFT JOIN gl_accounts gl ON adm.gl_account_id = gl.id
        WHERE adm.account_key_code IN ('ERL', 'ERF', 'ERS', 'ERB')
          AND adm.is_active = true
          AND gl.account_number IS NOT NULL
        ORDER BY adm.account_key_code
      `);

            sdKeys.rows.forEach(r => {
                if (r.account_key_code === 'ERL') result.revenue = r.account_number;
                if (r.account_key_code === 'ERF') result.freight = r.account_number;
                if (r.account_key_code === 'ERS') result.discount = r.account_number;
            });

            // Step 2: Pull COGS (GBB) and Inventory (BSX) from material_account_determination
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

            // Step 3: Fallback — find accounts by naming convention if not found above
            if (!result.revenue) {
                const rev = await pool.query(`
          SELECT account_number FROM gl_accounts
          WHERE is_active = true
            AND (account_name ILIKE '%sales revenue%' OR account_name ILIKE '%revenue%domestic%' OR account_name ILIKE '%domestic sales%')
          ORDER BY account_number LIMIT 1
        `);
                result.revenue = rev.rows[0]?.account_number || null;
            }

            if (!result.cogs) {
                const cogs = await pool.query(`
          SELECT account_number FROM gl_accounts
          WHERE is_active = true
            AND (account_name ILIKE '%cost of good%' OR account_name ILIKE '%cogs%' OR account_name ILIKE '%cost of sales%')
          ORDER BY account_number LIMIT 1
        `);
                result.cogs = cogs.rows[0]?.account_number || null;
            }

            if (!result.inventory) {
                const inv = await pool.query(`
          SELECT account_number FROM gl_accounts
          WHERE is_active = true AND account_type = 'ASSETS'
            AND (account_name ILIKE '%inventory%' OR account_name ILIKE '%stock%')
          ORDER BY account_number LIMIT 1
        `);
                result.inventory = inv.rows[0]?.account_number || null;
            }

            if (!result.receivable) {
                const ar = await pool.query(`
          SELECT account_number FROM gl_accounts
          WHERE is_active = true
            AND (account_name ILIKE '%account%receivable%' OR account_name ILIKE '%receivable%' OR account_name ILIKE '%debtor%')
          ORDER BY account_number LIMIT 1
        `);
                result.receivable = ar.rows[0]?.account_number || null;
            }

        } catch (err: any) {
            console.warn('SD GL resolver warning:', err.message);
        }

        return result;
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
     * Returns lines ready to insert into journal_entries / accounting_documents
     *
     * SAP Standard Invoice Posting:
     *   Dr Accounts Receivable   (customer owes us)
     *   Cr Revenue (ERL)         (we earned revenue)
     *   Cr Discount (ERS)        (if discount applied, reduce revenue)
     *   Cr Output Tax            (if applicable)
     */
    async buildBillingJournalLines(params: {
        netAmount: number;
        taxAmount: number;
        discountAmount: number;
        totalAmount: number;
        currency: string;
        reference: string;
        businessScenario?: string;
    }) {
        const gl = await this.resolveAll(params.businessScenario);
        const lines = [];

        // Line 1: Dr Accounts Receivable (customer owes full amount)
        lines.push({
            account: gl.receivable || 'AR_DEFAULT',
            debit: params.totalAmount,
            credit: 0,
            description: `Customer Receivable — Invoice ${params.reference}`
        });

        // Line 2: Cr Revenue (net amount)
        const netRevenue = params.netAmount - (params.discountAmount || 0);
        lines.push({
            account: gl.revenue || 'REVENUE_DEFAULT',
            debit: 0,
            credit: netRevenue,
            description: `Revenue (ERL) — Invoice ${params.reference}`
        });

        // Line 3: Cr Discount (if any)
        if (params.discountAmount > 0 && gl.discount) {
            lines.push({
                account: gl.discount,
                debit: params.discountAmount,
                credit: 0,
                description: `Sales Discount (ERS) — Invoice ${params.reference}`
            });
        }

        // Line 4: Cr Output Tax (if any)
        if (params.taxAmount > 0) {
            lines.push({
                account: 'TAX_PAYABLE',  // Will be updated once tax GL is configured
                debit: 0,
                credit: params.taxAmount,
                description: `Output Tax — Invoice ${params.reference}`
            });
        }

        return { lines, glAccounts: gl };
    }

    /**
     * Build standard PGI journal entries (Post Goods Issue for Sales delivery)
     * 
     * SAP Standard PGI Posting (movement type 601):
     *   Dr COGS (GBB)       — cost of goods sold
     *   Cr Inventory (BSX)  — inventory decreases
     */
    async buildPGIJournalLines(params: {
        totalValue: number;
        currency: string;
        reference: string;
        materialCode?: string;
    }) {
        const gl = await this.resolveAll();
        const lines = [];

        // Line 1: Dr COGS
        lines.push({
            account: gl.cogs || 'COGS_DEFAULT',
            debit: params.totalValue,
            credit: 0,
            description: `COGS (GBB) — PGI ${params.reference}${params.materialCode ? ' Mat: ' + params.materialCode : ''}`
        });

        // Line 2: Cr Inventory
        lines.push({
            account: gl.inventory || 'INVENTORY_DEFAULT',
            debit: 0,
            credit: params.totalValue,
            description: `Inventory (BSX) — PGI ${params.reference}`
        });

        return { lines, glAccounts: gl };
    }
}

export const sdGLResolver = new SDGLResolverService();
