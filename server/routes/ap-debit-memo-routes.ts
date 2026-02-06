// ========================================
// AP DEBIT MEMO ROUTES
// Purpose: Vendor claims (quality issues, shortages, returns to vendor)
// ========================================

import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Helper: Generate AP debit memo number
async function generateAPDebitMemoNumber(): Promise<string> {
    try {
        const result = await db.execute(sql`
      UPDATE number_sequences
      SET current_number = current_number + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE sequence_name = 'ap_debit_memo'
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
      RETURNING prefix, current_number, year
    `);

        if (result.rows.length === 0) {
            await db.execute(sql`
        INSERT INTO number_sequences (sequence_name, prefix, current_number, year, last_reset_date)
        VALUES ('ap_debit_memo', 'APDM', 1, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, CURRENT_DATE)
        ON CONFLICT (sequence_name) 
        DO UPDATE SET current_number = 1, 
                      year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                      last_reset_date = CURRENT_DATE
      `);
            const year = new Date().getFullYear();
            return `APDM-${year}-000001`;
        }

        const { prefix, current_number, year } = result.rows[0];
        return `${prefix}-${year}-${String(current_number).padStart(6, '0')}`;
    } catch (error) {
        console.error('Error generating AP debit memo number:', error);
        const year = new Date().getFullYear();
        const countResult = await db.execute(sql`
      SELECT COUNT(*)::integer as count 
      FROM ap_debit_memos
      WHERE EXTRACT(YEAR FROM debit_memo_date) = ${year}
    `);
        const count = parseInt(countResult.rows[0]?.count || '0') + 1;
        return `APDM-${year}-${count.toString().padStart(6, '0')}`;
    }
}

function parseIdSafely(id: any): number | null {
    const parsed = parseInt(id);
    return isNaN(parsed) ? null : parsed;
}

/**
 * POST /ap-debit-memos
 * Create vendor debit memo
 */
router.post('/ap-debit-memos', async (req, res) => {
    try {
        const {
            vendorId,
            purchaseOrderId,
            reasonCode,
            reasonDescription,
            amount,
            currency,
            items,
            notes,
            reference
        } = req.body;

        if (!vendorId || !reasonCode || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Vendor ID, reason code, and amount are required'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one line item is required'
            });
        }

        await db.transaction(async (tx) => {
            const vendorResult = await tx.execute(sql`
        SELECT id, name, company_code_id, currency
        FROM erp_vendors
        WHERE id = ${vendorId}
      `);

            if (vendorResult.rows.length === 0) {
                throw new Error('Vendor not found');
            }

            const vendor = vendorResult.rows[0];

            const debitMemoNumber = await generateAPDebitMemoNumber();

            const dmResult = await tx.execute(sql`
        INSERT INTO ap_debit_memos (
          debit_memo_number,
          vendor_id,
          purchase_order_id,
          debit_memo_date,
          amount,
          currency,
          document_type,
          posting_status,
          reason_code,
          reason_description,
          reference,
          notes,
          company_code_id,
          created_at
        ) VALUES (
          ${debitMemoNumber},
          ${vendorId},
          ${purchaseOrderId || null},
          CURRENT_DATE,
          ${amount},
          ${currency || vendor.currency || 'USD'},
          'DR',
          'DRAFT',
          ${reasonCode},
          ${reasonDescription || ''},
          ${reference || ''},
          ${notes || ''},
          ${vendor.company_code_id || null},
          NOW()
        ) RETURNING id
      `);

            const debitMemoId = dmResult.rows[0].id;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemTotal = parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0);

                await tx.execute(sql`
          INSERT INTO ap_debit_memo_items (
            debit_memo_id,
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
            ${debitMemoId},
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
                    debitMemoId,
                    debitMemoNumber,
                    amount,
                    status: 'DRAFT',
                    message: 'AP debit memo created successfully. Post to GL to complete.'
                }
            });
        });

    } catch (error: any) {
        console.error('Error creating AP debit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create AP debit memo'
        });
    }
});

/**
 * GET /ap-debit-memos
 * List AP debit memos
 */
router.get('/ap-debit-memos', async (req, res) => {
    try {
        const { vendorId, postingStatus } = req.query;

        let query = sql`
      SELECT 
        dm.id,
        dm.debit_memo_number,
        dm.vendor_id,
        v.name as vendor_name,
        v.code as vendor_code,
        dm.purchase_order_id,
        po.po_number,
        dm.debit_memo_date,
        dm.amount,
        dm.currency,
        dm.posting_status,
        dm.reason_code,
        dm.reason_description,
        dm.posted_document_number,
        dm.created_at,
        (SELECT COUNT(*) FROM ap_debit_memo_items WHERE debit_memo_id = dm.id) as item_count
      FROM ap_debit_memos dm
      LEFT JOIN erp_vendors v ON dm.vendor_id = v.id
      LEFT JOIN purchase_orders po ON dm.purchase_order_id = po.id
      WHERE dm.active = true
    `;

        if (vendorId) {
            query = sql`${query} AND dm.vendor_id = ${vendorId}`;
        }

        if (postingStatus) {
            query = sql`${query} AND dm.posting_status = ${postingStatus}`;
        }

        query = sql`${query} ORDER BY dm.created_at DESC`;

        const result = await db.execute(query);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error: any) {
        console.error('Error fetching AP debit memos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch AP debit memos'
        });
    }
});

/**
 * POST /ap-debit-memos/:id/post
 * Post AP debit memo to GL
 */
router.post('/ap-debit-memos/:id/post', async (req, res) => {
    try {
        const debitMemoId = parseIdSafely(req.params.id);

        if (!debitMemoId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid debit memo ID'
            });
        }

        await db.transaction(async (tx) => {
            const dmResult = await tx.execute(sql`
        SELECT 
          dm.id,
          dm.debit_memo_number,
          dm.vendor_id,
          dm.amount,
          dm.posting_status,
          dm.debit_memo_date,
          dm.company_code_id
        FROM ap_debit_memos dm
        WHERE dm.id = ${debitMemoId}
      `);

            if (dmResult.rows.length === 0) {
                throw new Error('AP debit memo not found');
            }

            const dm = dmResult.rows[0];

            if (dm.posting_status === 'POSTED') {
                throw new Error('AP debit memo is already posted');
            }

            const accountConfig = await tx.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ap_account' LIMIT 1) as ap_account,
          (SELECT config_value FROM system_configuration WHERE config_key = 'expense_account' LIMIT 1) as expense_account
      `);

            const apAccount = accountConfig.rows[0]?.ap_account || '210000';
            const expenseAccount = accountConfig.rows[0]?.expense_account || '500000';

            const glDocNumber = `GL-APDM-${dm.debit_memo_number}`;

            // CR AP (reduce liability), DR Expense
            await tx.execute(sql`
        INSERT INTO journal_entries (
          document_number,
          document_date,
          posting_date,
          document_type,
          reference_document,
          gl_account,
          account_type,
          debit_amount,
          credit_amount,
          description,
          company_code_id,
          created_at
        ) VALUES
        (
          ${glDocNumber},
          ${dm.debit_memo_date},
          CURRENT_DATE,
          'AP_DEBIT_MEMO',
          ${dm.debit_memo_number},
          ${expenseAccount},
          'EXPENSE',
          ${dm.amount},
          0,
          'AP Debit Memo - Expense',
          ${dm.company_code_id},
          NOW()
        ),
        (
          ${glDocNumber},
          ${dm.debit_memo_date},
          CURRENT_DATE,
          'AP_DEBIT_MEMO',
          ${dm.debit_memo_number},
          ${apAccount},
          'AP',
          0,
          ${dm.amount},
          'AP Debit Memo - AP Reduction',
          ${dm.company_code_id},
          NOW()
        )
      `);

            await tx.execute(sql`
        UPDATE ap_debit_memos
        SET posting_status = 'POSTED',
            posted_document_number = ${glDocNumber},
            posting_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = ${debitMemoId}
      `);

            res.json({
                success: true,
                data: {
                    debitMemoId,
                    debitMemoNumber: dm.debit_memo_number,
                    glDocumentNumber: glDocNumber,
                    amount: dm.amount,
                    postingStatus: 'POSTED',
                    message: 'AP debit memo posted to GL successfully'
                }
            });
        });

    } catch (error: any) {
        console.error('Error posting AP debit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to post AP debit memo'
        });
    }
});

export default router;
