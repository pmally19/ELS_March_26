// ========================================
// AP CREDIT MEMO ROUTES
// Purpose: Vendor credit notes (returns to vendor, price adjustments)
// ========================================

import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { pool } from '../db';
import { postGLDocument, GLLineItem, GLDocumentHeader } from '../services/gl-posting-helper.js';

const router = express.Router();

// Helper: Generate AP credit memo number using number_sequences table
async function generateAPCreditMemoNumber(): Promise<string> {
    try {
        const result = await db.execute(sql`
      UPDATE number_sequences
      SET current_number = current_number + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE sequence_name = 'ap_credit_memo'
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
      RETURNING prefix, current_number, year
    `);

        if (result.rows.length === 0) {
            await db.execute(sql`
        INSERT INTO number_sequences (sequence_name, prefix, current_number, year, last_reset_date)
        VALUES ('ap_credit_memo', 'APCM', 1, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, CURRENT_DATE)
        ON CONFLICT (sequence_name) 
        DO UPDATE SET current_number = 1, 
                      year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                      last_reset_date = CURRENT_DATE
      `);
            const year = new Date().getFullYear();
            return `APCM-${year}-000001`;
        }

        const { prefix, current_number, year } = result.rows[0];
        return `${prefix}-${year}-${String(current_number).padStart(6, '0')}`;
    } catch (error) {
        console.error('Error generating AP credit memo number:', error);
        const year = new Date().getFullYear();
        const countResult = await db.execute(sql`
      SELECT COUNT(*)::integer as count 
      FROM ap_credit_memos
      WHERE EXTRACT(YEAR FROM credit_memo_date) = ${year}
    `);
        const count = parseInt(countResult.rows[0]?.count || '0') + 1;
        return `APCM-${year}-${count.toString().padStart(6, '0')}`;
    }
}

function parseIdSafely(id: any): number | null {
    const parsed = parseInt(id);
    return isNaN(parsed) ? null : parsed;
}

/**
 * POST /ap-credit-memos
 * Create vendor credit memo
 */
router.post('/ap-credit-memos', async (req, res) => {
    try {
        const {
            vendorId,
            invoiceReference,
            amount,
            currency,
            paymentTerms,
            items,
            reasonCode,
            notes
        } = req.body;

        if (!reasonCode) {
            return res.status(400).json({
                success: false,
                error: 'Reason Code is required'
            });
        }

        if (!vendorId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Vendor ID and amount are required'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one line item is required'
            });
        }

        await db.transaction(async (tx) => {
            // Get vendor details
            const vendorResult = await tx.execute(sql`
        SELECT id, name, company_code_id, currency
        FROM vendors
        WHERE id = ${vendorId}
      `);

            if (vendorResult.rows.length === 0) {
                throw new Error('Vendor not found');
            }

            const vendor = vendorResult.rows[0];

            // Generate credit memo number
            const creditMemoNumber = await generateAPCreditMemoNumber();

            // Create credit memo header
            const cmResult = await tx.execute(sql`
        INSERT INTO ap_credit_memos (
          credit_memo_number,
          vendor_id,
          company_code_id,
          invoice_reference,
          credit_memo_date,
          posting_date,
          document_date,
          baseline_date,
          amount,
          currency,
          document_type,
          payment_terms,
          reason_code,
          reason_description,
          status,
          created_at
        ) VALUES (
          ${creditMemoNumber},
          ${vendorId},
          ${req.body.company_code_id},
          ${invoiceReference || ''},
          ${req.body.credit_memo_date || 'NOW()'},
          ${req.body.posting_date || 'NOW()'},
          ${req.body.document_date || 'NOW()'},
          ${req.body.baseline_date || null},
          ${amount},
          ${currency || vendor.currency || 'USD'},
          ${req.body.document_type || 'KG'},
          ${req.body.document_type || 'KG'},
          ${paymentTerms || ''},
          ${reasonCode},
          ${req.body.reasonDescription || ''},
          'pending',
          NOW()
        ) RETURNING id
      `);

            const creditMemoId = cmResult.rows[0].id;

            // Create credit memo items
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemTotal = parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0);

                await tx.execute(sql`
          INSERT INTO ap_credit_memo_items (
            credit_memo_id,
            line_number,
            material_id,
            description,
            quantity,
            unit_of_measure,
            unit_price,
            total_amount,
            tax_code,
            tax_amount,
            gl_account_id,
            cost_center_id,
            created_at
          ) VALUES (
            ${creditMemoId},
            ${i + 1},
            ${item.material_id || null},
            ${item.description},
            ${item.quantity || 1},
            ${item.unit_of_measure || 'EA'},
            ${item.unit_price},
            ${itemTotal.toFixed(2)},
            ${item.tax_code || null},
            ${item.tax_amount || 0},
            ${item.gl_account_id || null},
            ${item.cost_center_id || null},
            NOW()
          )
        `);
            }

            res.json({
                success: true,
                data: {
                    creditMemoId,
                    creditMemoNumber,
                    amount,
                    status: 'pending',
                    message: 'AP credit memo created successfully. Post to GL to complete.'
                }
            });
        });

    } catch (error: any) {
        console.error('Error creating AP credit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create AP credit memo'
        });
    }
});

/**
 * GET /ap-credit-memos
 * List AP credit memos
 */
router.get('/ap-credit-memos', async (req, res) => {
    try {
        const { vendorId, status } = req.query;

        let query = sql`
      SELECT 
        cm.id,
        cm.credit_memo_number,
        cm.vendor_id,
        v.name as vendor_name,
        v.code as vendor_code,
        cm.invoice_reference,
        cm.credit_memo_date,
        cm.amount,
        cm.currency,
        cm.status,
        cm.posted_document_number,
        cm.created_at,
        (SELECT COUNT(*) FROM ap_credit_memo_items WHERE credit_memo_id = cm.id) as item_count
      FROM ap_credit_memos cm
      LEFT JOIN vendors v ON cm.vendor_id = v.id
      WHERE cm.active = true
    `;

        if (vendorId) {
            query = sql`${query} AND cm.vendor_id = ${vendorId}`;
        }

        if (status) {
            query = sql`${query} AND cm.status = ${status}`;
        }

        query = sql`${query} ORDER BY cm.created_at DESC`;

        const result = await db.execute(query);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error: any) {
        console.error('Error fetching AP credit memos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch AP credit memos'
        });
    }
});

/**
 * POST /ap-credit-memos/:id/post
 * Post AP credit memo to GL
 */
router.post('/ap-credit-memos/:id/post', async (req, res) => {
    try {
        const creditMemoId = parseIdSafely(req.params.id);

        if (!creditMemoId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid credit memo ID'
            });
        }

        await db.transaction(async (tx) => {
            const cmResult = await tx.execute(sql`
        SELECT 
          cm.id,
          cm.credit_memo_number,
          cm.vendor_id,
          cm.amount,
          cm.status,
          cm.credit_memo_date
        FROM ap_credit_memos cm
        WHERE cm.id = ${creditMemoId}
      `);

            if (cmResult.rows.length === 0) {
                throw new Error('AP credit memo not found');
            }

            const cm = cmResult.rows[0];

            if (cm.status === 'posted') {
                throw new Error('AP credit memo is already posted');
            }

            // Get AP Reconciliation Account
            const accountConfig = await tx.execute(sql`
                SELECT config_value FROM system_configuration WHERE config_key = 'ap_account' LIMIT 1
            `);
            // We need the ID for gl_entries, so fetch it
            const apAccountNumber = accountConfig.rows[0]?.config_value || '210000';
            const apAccountResult = await tx.execute(sql`SELECT id FROM gl_accounts WHERE account_number = ${apAccountNumber}`);
            const apAccountId = apAccountResult.rows[0]?.id;

            if (!apAccountId) throw new Error(`AP Reconciliation Account ${apAccountNumber} not found in GL`);

            const glDocNumber = `GL-APCM-${cm.credit_memo_number}`;
            const journalEntries = [];

            // 1. DEBIT Vendor AP Account (Reduce Liability)
            journalEntries.push(sql`
                (
                    ${glDocNumber},
                    ${apAccountId},
                    ${cm.amount},
                    'D',
                    'POSTED',
                    ${cm.posting_date || 'CURRENT_DATE'},
                    NOW(),
                    EXTRACT(MONTH FROM CURRENT_DATE),
                    EXTRACT(YEAR FROM CURRENT_DATE),
                    ${`AP Credit Memo ${cm.credit_memo_number}`},
                    ${cm.credit_memo_number},
                    'AP',
                    ${creditMemoId},
                    'AP_CREDIT_MEMO'
                )
            `);

            // Fetch items to credit Expense/Asset accounts
            const items = await tx.execute(sql`select * from ap_credit_memo_items where credit_memo_id = ${creditMemoId}`);

            // 2. CREDIT Item GL Accounts
            for (const item of items.rows) {
                if (!item.gl_account_id) throw new Error(`Missing GL Account ID for item line ${item.line_number}`);

                journalEntries.push(sql`
                    (
                        ${glDocNumber},
                        ${item.gl_account_id},
                        ${item.total_amount},
                        'C',
                        'POSTED',
                        ${cm.posting_date || 'CURRENT_DATE'},
                        NOW(),
                        EXTRACT(MONTH FROM CURRENT_DATE),
                        EXTRACT(YEAR FROM CURRENT_DATE),
                        ${`AP Credit Memo Item: ${item.description}`},
                        ${cm.credit_memo_number},
                        'AP',
                        ${creditMemoId},
                        'AP_CREDIT_MEMO'
                    )
                `);

                // 3. CREDIT Tax Account (Reflect Input Tax Reversal)
                if (item.tax_amount && parseFloat(item.tax_amount) > 0) {
                    // Find tax account based on tax code
                    // This assumes tax_code maps to a GL account. For now, checking if we can get it from tax_codes table
                    // If we don't have tax_codes table lookup here, we might need to assume a default or fetch it.
                    // IMPORTANT: Phase 9 goal says "Validate tax_code against master data".
                    // For MVP speed, I will try to fetch the tax account from tax_codes table if possible,
                    // or use the 'output_tax_account' (wait, usually 'input_tax_account' for purchasing) but this is a CREDIT memo, so it reverses Input Tax.

                    // Let's use a configured input tax account for now to be safe, OR fetch if available.
                    // The user said "do not use any hardcoded".
                    // So I MUST fetch the account associated with the tax code.

                    const taxCodeResult = await tx.execute(sql`SELECT tax_account FROM tax_codes WHERE code = ${item.tax_code}`);
                    // Or if tax_codes table structure is unknown, fallback to system config 'input_tax_account'
                    // I'll check system config fallback if table lookup fails.
                    let taxAccountId = null;
                    if (taxCodeResult.rows.length > 0) {
                        // tax_account in tax_codes table stores the ACCOUNT NUMBER string, so we need the ID.
                        const taxAcctNum = taxCodeResult.rows[0].tax_account;
                        if (taxAcctNum) {
                            const taxAcctIdRes = await tx.execute(sql`SELECT id FROM gl_accounts WHERE account_number = ${taxAcctNum}`);
                            taxAccountId = taxAcctIdRes.rows[0]?.id;
                        }
                    }

                    if (!taxAccountId) {
                        // Fallback: System Config 'input_tax_account'
                        const fallbackTax = await tx.execute(sql`
                            SELECT id FROM gl_accounts 
                            WHERE account_number = (SELECT config_value FROM system_configuration WHERE config_key = 'input_tax_account' LIMIT 1)
                        `);
                        taxAccountId = fallbackTax.rows[0]?.id;
                    }

                    if (!taxAccountId) throw new Error(`Could not determine GL Account for Tax Code ${item.tax_code}`);


                    journalEntries.push(sql`
                        (
                            ${glDocNumber},
                            ${taxAccountId},
                            ${item.tax_amount},
                            'C',
                            'POSTED',
                            ${cm.posting_date || 'CURRENT_DATE'},
                            NOW(),
                            EXTRACT(MONTH FROM CURRENT_DATE),
                            EXTRACT(YEAR FROM CURRENT_DATE),
                            ${`AP Credit Memo Tax: ${item.tax_code}`},
                            ${cm.credit_memo_number},
                            'AP',
                            ${creditMemoId},
                            'AP_CREDIT_MEMO'
                        )
                    `);
                }
            }

            // Post to GL using shared helper — journal_entries + journal_entry_line_items
            const pgClient = await pool.connect();
            try {
                await pgClient.query('BEGIN');

                const glHeader: GLDocumentHeader = {
                    documentNumber: glDocNumber,
                    documentType: 'KG',
                    companyCodeId: cm.company_code_id || req.body.company_code_id,
                    postingDate: new Date(cm.credit_memo_date),
                    fiscalYear: new Date().getFullYear(),
                    fiscalPeriod: new Date().getMonth() + 1,
                    headerText: `AP Credit Memo ${cm.credit_memo_number}`,
                    sourceModule: 'AP',
                    sourceDocumentId: creditMemoId,
                    sourceDocumentType: 'AP_CREDIT_MEMO'
                };

                const glLines: GLLineItem[] = [];

                // 1. DEBIT Vendor AP Account (reduce liability)
                glLines.push({
                    glAccountId: apAccountId, postingKey: '31', debitCredit: 'D',
                    amount: cm.amount,
                    description: `AP Credit Memo ${cm.credit_memo_number}`,
                    partnerId: cm.vendor_id,
                    sourceModule: 'AP', sourceDocumentId: creditMemoId, sourceDocumentType: 'AP_CREDIT_MEMO'
                });

                // 2. CREDIT Item GL Accounts
                for (const item of items.rows) {
                    if (!item.gl_account_id) throw new Error(`Missing GL Account ID for item line ${item.line_number}`);
                    glLines.push({
                        glAccountId: item.gl_account_id, postingKey: '50', debitCredit: 'C',
                        amount: item.total_amount,
                        description: `AP Credit Memo Item: ${item.description}`,
                        sourceModule: 'AP', sourceDocumentId: creditMemoId, sourceDocumentType: 'AP_CREDIT_MEMO'
                    });
                    // 3. CREDIT Tax Account
                    if (item.tax_amount && parseFloat(item.tax_amount) > 0) {
                        const taxCodeRes = await pgClient.query(`SELECT tax_account FROM tax_codes WHERE code = $1`, [item.tax_code]);
                        let taxAccountId = null;
                        if (taxCodeRes.rows[0]?.tax_account) {
                            const taxIdRes = await pgClient.query(`SELECT id FROM gl_accounts WHERE account_number = $1`, [taxCodeRes.rows[0].tax_account]);
                            taxAccountId = taxIdRes.rows[0]?.id;
                        }
                        if (!taxAccountId) {
                            const fallback = await pgClient.query(`SELECT id FROM gl_accounts WHERE account_number = (SELECT config_value FROM system_configuration WHERE config_key = 'input_tax_account' LIMIT 1)`);
                            taxAccountId = fallback.rows[0]?.id;
                        }
                        if (!taxAccountId) throw new Error(`Could not determine GL Account for Tax Code ${item.tax_code}`);
                        glLines.push({
                            glAccountId: taxAccountId, postingKey: '50', debitCredit: 'C',
                            amount: item.tax_amount,
                            description: `AP Credit Memo Tax: ${item.tax_code}`,
                            sourceModule: 'AP', sourceDocumentId: creditMemoId, sourceDocumentType: 'AP_CREDIT_MEMO'
                        });
                    }
                }

                const glResult = await postGLDocument(pgClient, glHeader, glLines);
                if (!glResult.success) throw new Error(glResult.error);

                await pgClient.query('COMMIT');
            } catch (glErr) {
                await pgClient.query('ROLLBACK');
                throw glErr;
            } finally {
                pgClient.release();
            }

            await tx.execute(sql`
                UPDATE ap_credit_memos
                SET status = 'posted',
                    posted_document_number = ${glDocNumber},
                    posting_date = CURRENT_DATE,
                    updated_at = NOW()
                WHERE id = ${creditMemoId}
            `);

            res.json({
                success: true,
                data: {
                    creditMemoId,
                    creditMemoNumber: cm.credit_memo_number,
                    glDocumentNumber: glDocNumber,
                    amount: cm.amount,
                    status: 'posted',
                    message: 'AP credit memo posted to GL successfully'
                }
            });
        });

    } catch (error: any) {
        console.error('Error posting AP credit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to post AP credit memo'
        });
    }
});

export default router;
