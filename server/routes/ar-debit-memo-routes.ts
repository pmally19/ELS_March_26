// ========================================
// AR DEBIT MEMO ROUTES
// Purpose: Additional customer charges (freight, restocking, price adjustments, late fees)
// ========================================

import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Helper: Generate debit memo number using number_sequences table
async function generateDebitMemoNumber(): Promise<string> {
    try {
        // Update and get sequence in single transaction
        const result = await db.execute(sql`
      UPDATE number_sequences
      SET current_number = current_number + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE sequence_name = 'debit_memo'
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
      RETURNING prefix, current_number, year
    `);

        if (result.rows.length === 0) {
            // Create or reset sequence for new year
            await db.execute(sql`
        INSERT INTO number_sequences (sequence_name, prefix, current_number, year, last_reset_date)
        VALUES ('debit_memo', 'DM', 1, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, CURRENT_DATE)
        ON CONFLICT (sequence_name) 
        DO UPDATE SET current_number = 1, 
                      year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                      last_reset_date = CURRENT_DATE
      `);
            const year = new Date().getFullYear();
            return `DM-${year}-000001`;
        }

        const { prefix, current_number, year } = result.rows[0];
        return `${prefix}-${year}-${String(current_number).padStart(6, '0')}`;
    } catch (error) {
        console.error('Error generating debit memo number:', error);
        // Fallback to count-based approach
        const year = new Date().getFullYear();
        const countResult = await db.execute(sql`
      SELECT COUNT(*)::integer as count 
      FROM debit_memos
      WHERE EXTRACT(YEAR FROM debit_date) = ${year}
    `);
        const count = parseInt(countResult.rows[0]?.count || '0') + 1;
        return `DM-${year}-${count.toString().padStart(6, '0')}`;
    }
}

// Helper: Parse ID safely
function parseIdSafely(id: any): number | null {
    const parsed = parseInt(id);
    return isNaN(parsed) ? null : parsed;
}

/**
 * POST /debit-memos
 * Create a new debit memo for additional customer charges
 */
router.post('/debit-memos', async (req, res) => {
    try {
        const {
            customerId,
            billingDocumentId,
            salesOrderId,
            reasonCode,
            reasonDescription,
            totalAmount,
            taxAmount,
            items,
            notes,
            reference,
            // New FI-compliant fields
            document_date,
            company_code_id,
            currency
        } = req.body;

        // Validate required fields
        if (!customerId || !reasonCode || !totalAmount) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID, reason code, and total amount are required'
            });
        }

        // Validate FI-compliant mandatory fields
        if (!document_date) {
            return res.status(400).json({
                success: false,
                error: 'Document date is required for FI compliance'
            });
        }

        if (!company_code_id) {
            return res.status(400).json({
                success: false,
                error: 'Company code is required for FI compliance'
            });
        }

        if (!currency || currency.length !== 3) {
            return res.status(400).json({
                success: false,
                error: 'Valid 3-character currency code is required (e.g., USD, EUR, INR)'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one line item is required'
            });
        }

        // Validate line items for FI compliance
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (!item.gl_account_id) {
                return res.status(400).json({
                    success: false,
                    error: `Line ${i + 1}: G/L Account is required for FI compliance`
                });
            }

            if (!item.tax_code) {
                return res.status(400).json({
                    success: false,
                    error: `Line ${i + 1}: Tax code is required for FI compliance`
                });
            }

            if (!item.description) {
                return res.status(400).json({
                    success: false,
                    error: `Line ${i + 1}: Description is required`
                });
            }
        }

        await db.transaction(async (tx) => {
            // Get customer details
            const customerResult = await tx.execute(sql`
        SELECT id, name, company_code_id, currency
        FROM erp_customers
        WHERE id = ${customerId}
      `);

            if (customerResult.rows.length === 0) {
                throw new Error('Customer not found');
            }

            const customer = customerResult.rows[0];

            // Validate company code exists
            const companyCodeResult = await tx.execute(sql`
        SELECT id, code, name, currency
        FROM company_codes
        WHERE id = ${company_code_id}
      `);

            if (companyCodeResult.rows.length === 0) {
                throw new Error(`Company code ID ${company_code_id} not found`);
            }

            // Generate debit memo number
            const debitMemoNumber = await generateDebitMemoNumber();

            // Calculate totals
            const taxAmt = taxAmount || 0;
            const netAmt = parseFloat(totalAmount) + parseFloat(taxAmt);

            // Create debit memo header
            const dmResult = await tx.execute(sql`
        INSERT INTO debit_memos (
          debit_memo_number,
          customer_id,
          billing_document_id,
          sales_order_id,
          debit_date,
          document_date,
          total_amount,
          tax_amount,
          net_amount,
          currency,
          posting_status,
          reason_code,
          reason_description,
          reference,
          notes,
          company_code_id,
          created_at
        ) VALUES (
          ${debitMemoNumber},
          ${customerId},
          ${billingDocumentId || null},
          ${salesOrderId || null},
          ${document_date},
          ${document_date},
          ${totalAmount},
          ${taxAmt},
          ${netAmt},
          ${currency},
          'DRAFT',
          ${reasonCode},
          ${reasonDescription || ''},
          ${reference || ''},
          ${notes || ''},
          ${company_code_id},
          NOW()
        ) RETURNING id
      `);

            const debitMemoId = dmResult.rows[0].id;

            // Create debit memo items
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemTotal = parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0);
                const itemTax = parseFloat(item.tax_amount || 0);

                await tx.execute(sql`
          INSERT INTO debit_memo_items (
            debit_memo_id,
            line_number,
            product_id,
            material_id,
            description,
            quantity,
            unit_of_measure,
            unit_price,
            total_amount,
            tax_amount,
            tax_code,
            gl_account_id,
            cost_center_id,
            created_at
          ) VALUES (
            ${debitMemoId},
            ${i + 1},
            ${item.product_id || null},
            ${item.material_id || null},
            ${item.description},
            ${item.quantity || 1},
            ${item.unit_of_measure || 'EA'},
            ${item.unit_price},
            ${itemTotal.toFixed(2)},
            ${itemTax},
            ${item.tax_code || null},
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
                    totalAmount: netAmt,
                    status: 'DRAFT',
                    message: 'Debit memo created successfully. Post to GL to complete.'
                }
            });
        });

    } catch (error: any) {
        console.error('Error creating debit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create debit memo'
        });
    }
});

/**
 * GET /debit-memos
 * List all debit memos with optional filters
 */
router.get('/debit-memos', async (req, res) => {
    try {
        const { customerId, postingStatus, startDate, endDate } = req.query;

        let query = sql`
      SELECT 
        dm.id,
        dm.debit_memo_number,
        dm.customer_id,
        c.name as customer_name,
        c.customer_code as customer_code,
        dm.billing_document_id,
        bd.billing_number,
        dm.debit_date,
        dm.total_amount,
        dm.tax_amount,
        dm.net_amount,
        dm.posting_status,
        dm.reason_code,
        dm.reason_description,
        dm.accounting_document_number,
        dm.created_at,
        (SELECT COUNT(*) FROM debit_memo_items WHERE debit_memo_id = dm.id) as item_count
      FROM debit_memos dm
      LEFT JOIN erp_customers c ON dm.customer_id = c.id
      LEFT JOIN billing_documents bd ON dm.billing_document_id = bd.id
      WHERE dm.active = true
    `;

        if (customerId) {
            query = sql`${query} AND dm.customer_id = ${customerId}`;
        }

        if (postingStatus) {
            query = sql`${query} AND dm.posting_status = ${postingStatus}`;
        }

        if (startDate) {
            query = sql`${query} AND dm.debit_date >= ${startDate}`;
        }

        if (endDate) {
            query = sql`${query} AND dm.debit_date <= ${endDate}`;
        }

        query = sql`${query} ORDER BY dm.created_at DESC`;

        const result = await db.execute(query);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error: any) {
        console.error('Error fetching debit memos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch debit memos'
        });
    }
});

/**
 * GET /debit-memos/:id
 * Get single debit memo with line items and customer details
 */
router.get('/debit-memos/:id', async (req, res) => {
    try {
        const debitMemoId = parseIdSafely(req.params.id);

        if (!debitMemoId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid debit memo ID'
            });
        }

        // Get debit memo header with customer details
        const headerResult = await db.execute(sql`
      SELECT 
        dm.id,
        dm.debit_memo_number,
        dm.customer_id,
        c.name as customer_name,
        c.customer_code as customer_code,
        c.email as customer_email,
        dm.billing_document_id,
        bd.billing_number,
        dm.sales_order_id,
        dm.debit_date,
        dm.due_date,
        dm.posting_date,
        dm.total_amount,
        dm.tax_amount,
        dm.net_amount,
        dm.currency,
        dm.posting_status,
        dm.accounting_document_number,
        dm.reason_code,
        dm.reason_description,
        dm.reference,
        dm.notes,
        dm.company_code_id,
        dm.created_at,
        dm.created_by,
        dm.updated_at
      FROM debit_memos dm
      LEFT JOIN erp_customers c ON dm.customer_id = c.id
      LEFT JOIN billing_documents bd ON dm.billing_document_id = bd.id
      WHERE dm.id = ${debitMemoId} AND dm.active = true
    `);

        if (headerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Debit memo not found'
            });
        }

        // Get line items
        const itemsResult = await db.execute(sql`
      SELECT 
        id,
        line_number,
        billing_item_id,
        product_id,
        material_id,
        description,
        quantity,
        unit_of_measure,
        unit_price,
        total_amount,
        tax_amount,
        tax_code,
        gl_account_id,
        cost_center_id,
        profit_center_id
      FROM debit_memo_items
      WHERE debit_memo_id = ${debitMemoId}
      ORDER BY line_number
    `);

        // Combine header and items
        const debitMemo = {
            ...headerResult.rows[0],
            items: itemsResult.rows
        };

        res.json({
            success: true,
            data: debitMemo
        });

    } catch (error: any) {
        console.error('Error fetching debit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch debit memo'
        });
    }
});

/**
 * POST /debit-memos/:id/post
 * Post debit memo to GL and update AR
 */
router.post('/debit-memos/:id/post', async (req, res) => {
    try {
        const debitMemoId = parseIdSafely(req.params.id);

        if (!debitMemoId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid debit memo ID'
            });
        }

        await db.transaction(async (tx) => {
            // Get debit memo header
            const dmResult = await tx.execute(sql`
        SELECT 
          dm.id,
          dm.debit_memo_number,
          dm.customer_id,
          dm.billing_document_id,
          dm.total_amount,
          dm.tax_amount,
          dm.net_amount,
          dm.posting_status,
          dm.company_code_id,
          dm.debit_date,
          dm.reason_code,
          dm.reason_description,
          dm.currency
        FROM debit_memos dm
        WHERE dm.id = ${debitMemoId}
      `);

            if (dmResult.rows.length === 0) {
                throw new Error('Debit memo not found');
            }

            const dm = dmResult.rows[0];

            if (dm.posting_status === 'POSTED') {
                throw new Error('Debit memo is already posted');
            }

            // Get debit memo items with GL account details
            const itemsResult = await tx.execute(sql`
        SELECT 
          dmi.total_amount, -- Corrected from 'amount' to 'total_amount'
          dmi.tax_amount,
          dmi.gl_account_id,
          gl.account_number,
          gl.account_name,
          dmi.description
        FROM debit_memo_items dmi
        LEFT JOIN gl_accounts gl ON dmi.gl_account_id = gl.id
        WHERE dmi.debit_memo_id = ${debitMemoId}
      `);

            const items = itemsResult.rows;

            // Get System Configuration for AR and Tax Accounts
            const accountConfig = await tx.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_account' LIMIT 1) as ar_account,
          (SELECT config_value FROM system_configuration WHERE config_key = 'output_tax_account' LIMIT 1) as output_tax_account
      `);

            const arAccount = accountConfig.rows[0]?.ar_account || '120000';
            const outputTaxAccount = accountConfig.rows[0]?.output_tax_account || '210000';

            // Fetch GL Account IDs for AR and Tax accounts
            const glAccountIds = await tx.execute(sql`
                SELECT id, account_number 
                FROM gl_accounts 
                WHERE account_number IN (${arAccount}, ${outputTaxAccount})
            `);

            const arAccountId = glAccountIds.rows.find((a: any) => a.account_number === arAccount)?.id;
            const taxAccountId = glAccountIds.rows.find((a: any) => a.account_number === outputTaxAccount)?.id;

            if (!arAccountId) throw new Error(`GL Account ID not found for AR Account ${arAccount}`);
            if (!taxAccountId && parseFloat(dm.tax_amount) > 0) throw new Error(`GL Account ID not found for Tax Account ${outputTaxAccount}`);

            // Generate GL document number
            const glDocNumber = `GL-DM-${dm.debit_memo_number}`;
            const journalEntries = [];

            // 1. AR Debit Entry (Customer Receivable - Full Amount)
            journalEntries.push(sql`
        (
          ${glDocNumber},
          ${arAccountId},
          ${dm.net_amount},
          'D',
          'POSTED',
          CURRENT_DATE,
          NOW(),
          EXTRACT(MONTH FROM CURRENT_DATE),
          EXTRACT(YEAR FROM CURRENT_DATE),
          ${`Debit Memo ${dm.debit_memo_number} - ${dm.reason_code}`},
          ${dm.reference || dm.debit_memo_number},
          'AR',
          ${debitMemoId},
          'DEBIT_MEMO'
        )`);

            // 2. Revenue/Income Credit Entries (One per line item)
            for (const item of items) {
                if (!item.gl_account_id) {
                    throw new Error(`GL Account ID not found for item: ${item.description}`);
                }

                // Assuming dmi.total_amount is the net amount for the line item (before tax)
                journalEntries.push(sql`
          (
            ${glDocNumber},
            ${item.gl_account_id},
            ${item.total_amount},
            'C',
            'POSTED',
            CURRENT_DATE,
            NOW(),
            EXTRACT(MONTH FROM CURRENT_DATE),
            EXTRACT(YEAR FROM CURRENT_DATE),
            ${`Debit Memo Item: ${item.description}`},
            ${dm.reference || dm.debit_memo_number},
            'AR',
            ${debitMemoId},
            'DEBIT_MEMO'
          )`);

                // 3. Output Tax Credit Entries (One per line item, if tax exists)
                if (parseFloat(item.tax_amount) > 0) {
                    journalEntries.push(sql`
            (
              ${glDocNumber},
              ${taxAccountId},
              ${item.tax_amount},
              'C',
              'POSTED',
              CURRENT_DATE,
              NOW(),
              EXTRACT(MONTH FROM CURRENT_DATE),
              EXTRACT(YEAR FROM CURRENT_DATE),
              ${`Debit Memo Item Tax: ${item.description}`},
              ${dm.reference || dm.debit_memo_number},
              'AR',
              ${debitMemoId},
              'DEBIT_MEMO'
            )`);
                }
            }

            // Insert all journal entries into gl_entries table
            const insertQuery = sql`
        INSERT INTO gl_entries (
          document_number,
          gl_account_id,
          amount,
          debit_credit_indicator,
          posting_status,
          posting_date,
          created_at,
          fiscal_period,
          fiscal_year,
          description,
          reference,
          source_module,
          source_document_id,
          source_document_type
        ) VALUES ${sql.join(journalEntries, sql`, `)}
      `;

            await tx.execute(insertQuery);

            // Update debit memo with GL doc number
            await tx.execute(sql`
        UPDATE debit_memos
        SET posting_status = 'POSTED',
            accounting_document_number = ${glDocNumber},
            posting_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = ${debitMemoId}
      `);

            // Update AR open items if billing document exists
            if (dm.billing_document_id) {
                await tx.execute(sql`
          UPDATE ar_open_items
          SET outstanding_amount = outstanding_amount + ${dm.net_amount},
              updated_at = NOW()
          WHERE billing_document_id = ${dm.billing_document_id}
            AND active = true
        `);

                // Update billing document outstanding amount
                await tx.execute(sql`
          UPDATE billing_documents
          SET outstanding_amount = outstanding_amount + ${dm.net_amount},
              updated_at = NOW()
          WHERE id = ${dm.billing_document_id}
        `);
            }

            res.json({
                success: true,
                data: {
                    debitMemoId,
                    debitMemoNumber: dm.debit_memo_number,
                    glDocumentNumber: glDocNumber,
                    totalAmount: dm.net_amount,
                    postingStatus: 'POSTED',
                    message: 'Debit memo posted to GL successfully'
                }
            });
        });

    } catch (error: any) {
        console.error('Error posting debit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to post debit memo'
        });
    }
});

export default router;

