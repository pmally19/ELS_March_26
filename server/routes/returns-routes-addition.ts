// ========================================
// SALES RETURNS AND CREDIT MEMOS ROUTES
// Added: 2025-12-28
// Purpose: Complete returns/credit memo functionality
// ========================================

// Helper: Generate return number
async function generateReturnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const countResult = await db.execute(sql`
    SELECT COUNT(*)::integer as count 
    FROM sales_returns
    WHERE EXTRACT(YEAR FROM return_date) = ${year}
  `);
    const count = parseInt(countResult.rows[0]?.count || '0') + 1;
    return `RET-${year}-${count.toString().padStart(6, '0')}`;
}

// Helper: Generate credit memo number
async function generateCreditMemoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const countResult = await db.execute(sql`
    SELECT COUNT(*)::integer as count 
    FROM credit_memos
    WHERE EXTRACT(YEAR FROM credit_date) = ${year}
  `);
    const count = parseInt(countResult.rows[0]?.count || '0') + 1;
    return `CM-${year}-${count.toString().padStart(6, '0')}`;
}

// Helper: Generate return delivery number
async function generateReturnDeliveryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const countResult = await db.execute(sql`
    SELECT COUNT(*)::integer as count 
    FROM return_deliveries
    WHERE EXTRACT(YEAR FROM receipt_date) = ${year}
  `);
    const count = parseInt(countResult.rows[0]?.count || '0') + 1;
    return `RD-${year}-${count.toString().padStart(6, '0')}`;
}

/**
 * POST /sales-returns
 * Create a new sales return request
 */
router.post('/sales-returns', async (req, res) => {
    try {
        const {
            customerId,
            salesOrderId,
            billingDocumentId,
            returnReason,
            items,
            notes
        } = req.body;

        // Validate required fields
        if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID and items are required'
            });
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

            // Generate return number
            const returnNumber = await generateReturnNumber();

            // Calculate totals
            let totalAmount = 0;
            let taxAmount = 0;

            for (const item of items) {
                const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
                const itemTax = itemTotal * parseFloat(item.tax_rate || 0) / 100;
                totalAmount += itemTotal;
                taxAmount += itemTax;
            }

            const netAmount = totalAmount - taxAmount;

            // Create return header
            const returnResult = await tx.execute(sql`
        INSERT INTO sales_returns (
          return_number,
          sales_order_id,
          billing_document_id,
          customer_id,
          return_date,
          return_reason,
          total_amount,
          tax_amount,
          net_amount,
          status,
          approval_status,
          notes,
          company_code_id,
          currency,
          created_at
        ) VALUES (
          ${returnNumber},
          ${salesOrderId || null},
          ${billingDocumentId || null},
          ${customerId},
          CURRENT_DATE,
          ${returnReason || ''},
          ${totalAmount.toFixed(2)},
          ${taxAmount.toFixed(2)},
          ${netAmount.toFixed(2)},
          'DRAFT',
          'PENDING',
          ${notes || ''},
          ${customer.company_code_id || null},
          ${customer.currency || 'USD'},
          NOW()
        ) RETURNING id
      `);

            const returnId = returnResult.rows[0].id;

            // Create return items
            for (const item of items) {
                const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
                const itemTax = itemTotal * parseFloat(item.tax_rate || 0) / 100;

                await tx.execute(sql`
          INSERT INTO sales_return_items (
            return_id,
            sales_order_item_id,
            billing_item_id,
            product_id,
            quantity,
            unit_price,
            total_amount,
            tax_amount,
            return_reason,
            condition,
            disposition,
            plant_id,
            storage_location_id,
            created_at
          ) VALUES (
            ${returnId},
            ${item.sales_order_item_id || null},
            ${item.billing_item_id || null},
            ${item.product_id},
            ${item.quantity},
            ${item.unit_price},
            ${itemTotal.toFixed(2)},
            ${itemTax.toFixed(2)},
            ${item.return_reason || ''},
            ${item.condition || 'NORMAL'},
            ${item.disposition || 'CREDIT_ONLY'},
            ${item.plant_id || null},
            ${item.storage_location_id || null},
            NOW()
          )
        `);
            }

            // Create document flow link if billing document exists
            if (billingDocumentId) {
                await tx.execute(sql`
          INSERT INTO document_flow (
            source_document_type,
            source_document_id,
            target_document_type,
            target_document_id,
            created_at
          ) VALUES (
            'BILLING',
            ${billingDocumentId},
            'SALES_RETURN',
            ${returnId},
            NOW()
          )
        `);
            }

            res.json({
                success: true,
                data: {
                    returnId,
                    returnNumber,
                    totalAmount,
                    status: 'DRAFT',
                    message: 'Return request created successfully'
                }
            });
        });

    } catch (error: any) {
        console.error('Error creating sales return:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create sales return'
        });
    }
});

/**
 * GET /sales-returns
 * List all sales returns with optional filters
 */
router.get('/sales-returns', async (req, res) => {
    try {
        const { customerId, status, startDate, endDate } = req.query;

        let query = sql`
      SELECT 
        sr.id,
        sr.return_number,
        sr.customer_id,
        c.name as customer_name,
        sr.sales_order_id,
        so.order_number,
        sr.billing_document_id,
        bd.billing_number,
        sr.return_date,
        sr.return_reason,
        sr.total_amount,
        sr.tax_amount,
        sr.net_amount,
        sr.status,
        sr.approval_status,
        sr.approved_at,
        sr.notes,
        sr.created_at,
        (SELECT COUNT(*) FROM sales_return_items WHERE return_id = sr.id) as item_count
      FROM sales_returns sr
      LEFT JOIN erp_customers c ON sr.customer_id = c.id
      LEFT JOIN sales_orders so ON sr.sales_order_id = so.id
      LEFT JOIN billing_documents bd ON sr.billing_document_id = bd.id
      WHERE sr.active = true
    `;

        if (customerId) {
            query = sql`${query} AND sr.customer_id = ${customerId}`;
        }

        if (status) {
            query = sql`${query} AND sr.status = ${status}`;
        }

        if (startDate) {
            query = sql`${query} AND sr.return_date >= ${startDate}`;
        }

        if (endDate) {
            query = sql`${query} AND sr.return_date <= ${endDate}`;
        }

        query = sql`${query} ORDER BY sr.created_at DESC`;

        const result = await db.execute(query);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error: any) {
        console.error('Error fetching sales returns:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch sales returns'
        });
    }
});

/**
 * PUT /sales-returns/:id/approve
 * Approve or reject a return request
 */
router.put('/sales-returns/:id/approve', async (req, res) => {
    try {
        const returnId = parseIdSafely(req.params.id);
        const { approvalStatus, approvedBy, rejectionReason } = req.body;

        if (!returnId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid return ID'
            });
        }

        if (!approvalStatus || !['APPROVED', 'REJECTED'].includes(approvalStatus)) {
            return res.status(400).json({
                success: false,
                error: 'Valid approval status (APPROVED/REJECTED) is required'
            });
        }

        await db.transaction(async (tx) => {
            // Get current return
            const returnResult = await tx.execute(sql`
        SELECT id, return_number, approval_status
        FROM sales_returns
        WHERE id = ${returnId}
      `);

            if (returnResult.rows.length === 0) {
                throw new Error('Return not found');
            }

            const currentReturn = returnResult.rows[0];

            if (currentReturn.approval_status === 'APPROVED') {
                throw new Error('Return is already approved');
            }

            // Update return approval
            await tx.execute(sql`
        UPDATE sales_returns
        SET approval_status = ${approvalStatus},
            approved_by = ${approvedBy || null},
            approved_at = ${approvalStatus === 'APPROVED' ? sql`NOW()` : null},
            status = ${approvalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED'},
            notes = CASE 
              WHEN ${approvalStatus} = 'REJECTED' AND ${rejectionReason || ''} != '' 
              THEN CONCAT(COALESCE(notes, ''), ' [REJECTED: ', ${rejectionReason}, ']')
              ELSE notes
            END,
            updated_at = NOW()
        WHERE id = ${returnId}
      `);

            res.json({
                success: true,
                data: {
                    returnId,
                    returnNumber: currentReturn.return_number,
                    approvalStatus,
                    message: `Return ${approvalStatus.toLowerCase()} successfully`
                }
            });
        });

    } catch (error: any) {
        console.error('Error approving return:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to approve return'
        });
    }
});

/**
 * POST /credit-memos
 * Generate credit memo from approved return
 */
router.post('/credit-memos', async (req, res) => {
    try {
        const { returnId, creditDate, reference, notes } = req.body;

        if (!returnId) {
            return res.status(400).json({
                success: false,
                error: 'Return ID is required'
            });
        }

        await db.transaction(async (tx) => {
            // Get return details
            const returnResult = await tx.execute(sql`
        SELECT 
          sr.id,
          sr.return_number,
          sr.customer_id,
          sr.billing_document_id,
          sr.total_amount,
          sr.tax_amount,
          sr.net_amount,
          sr.approval_status,
          sr.company_code_id,
          sr.currency,
          c.payment_terms
        FROM sales_returns sr
        LEFT JOIN erp_customers c ON sr.customer_id = c.id
        WHERE sr.id = ${returnId}
      `);

            if (returnResult.rows.length === 0) {
                throw new Error('Return not found');
            }

            const returnData = returnResult.rows[0];

            if (returnData.approval_status !== 'APPROVED') {
                throw new Error('Return must be approved before generating credit memo');
            }

            // Check if credit memo already exists
            const existingCMResult = await tx.execute(sql`
        SELECT id, credit_memo_number
        FROM credit_memos
        WHERE return_id = ${returnId}
      `);

            if (existingCMResult.rows.length > 0) {
                throw new Error(`Credit memo already exists: ${existingCMResult.rows[0].credit_memo_number}`);
            }

            // Generate credit memo number
            const creditMemoNumber = await generateCreditMemoNumber();

            // Create credit memo
            const cmResult = await tx.execute(sql`
        INSERT INTO credit_memos (
          credit_memo_number,
          return_id,
          billing_document_id,
          customer_id,
          credit_date,
          total_amount,
          tax_amount,
          net_amount,
          currency,
          posting_status,
          reference,
          notes,
          company_code_id,
          payment_terms,
          created_at
        ) VALUES (
          ${creditMemoNumber},
          ${returnId},
          ${returnData.billing_document_id || null},
          ${returnData.customer_id},
          ${creditDate || sql`CURRENT_DATE`},
          ${returnData.total_amount},
          ${returnData.tax_amount},
          ${returnData.net_amount},
          ${returnData.currency || 'USD'},
          'DRAFT',
          ${reference || ''},
          ${notes || ''},
          ${returnData.company_code_id || null},
          ${returnData.payment_terms || ''},
          NOW()
        ) RETURNING id
      `);

            const creditMemoId = cmResult.rows[0].id;

            // Copy items from return to credit memo
            await tx.execute(sql`
        INSERT INTO credit_memo_items (
          credit_memo_id,
          return_item_id,
          billing_item_id,
          product_id,
          quantity,
          unit_price,
          total_amount,
          tax_amount,
          created_at
        )
        SELECT 
          ${creditMemoId},
          sri.id,
          sri.billing_item_id,
          sri.product_id,
          sri.quantity,
          sri.unit_price,
          sri.total_amount,
          sri.tax_amount,
          NOW()
        FROM sales_return_items sri
        WHERE sri.return_id = ${returnId}
      `);

            // Create document flow
            await tx.execute(sql`
        INSERT INTO document_flow (
          source_document_type,
          source_document_id,
          target_document_type,
          target_document_id,
          created_at
        ) VALUES (
          'SALES_RETURN',
          ${returnId},
          'CREDIT_MEMO',
          ${creditMemoId},
          NOW()
        )
      `);

            res.json({
                success: true,
                data: {
                    creditMemoId,
                    creditMemoNumber,
                    totalAmount: returnData.total_amount,
                    status: 'DRAFT',
                    message: 'Credit memo created successfully. Post to GL to complete.'
                }
            });
        });

    } catch (error: any) {
        console.error('Error creating credit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create credit memo'
        });
    }
});

/**
 * POST /credit-memos/:id/post
 * Post credit memo to GL and update AR
 */
router.post('/credit-memos/:id/post', async (req, res) => {
    try {
        const creditMemoId = parseIdSafely(req.params.id);

        if (!creditMemoId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid credit memo ID'
            });
        }

        await db.transaction(async (tx) => {
            // Get credit memo details
            const cmResult = await tx.execute(sql`
        SELECT 
          cm.id,
          cm.credit_memo_number,
          cm.customer_id,
          cm.billing_document_id,
          cm.total_amount,
          cm.tax_amount,
          cm.net_amount,
          cm.posting_status,
          cm.company_code_id,
          cm.credit_date
        FROM credit_memos cm
        WHERE cm.id = ${creditMemoId}
      `);

            if (cmResult.rows.length === 0) {
                throw new Error('Credit memo not found');
            }

            const cm = cmResult.rows[0];

            if (cm.posting_status === 'POSTED') {
                throw new Error('Credit memo is already posted');
            }

            // Get GL accounts using account determination service
            let revenueAccount = null;
            let arAccount = null;

            try {
                const accounts = await accountDeterminationService.determineAccounts({
                    transactionType: 'CREDIT_MEMO',
                    companyCodeId: cm.company_code_id,
                    customerId: cm.customer_id
                });

                revenueAccount = accounts.revenueAccount;
                arAccount = accounts.arAccount;
            } catch (error) {
                console.warn('Account determination failed, using defaults');
            }

            // Fallback: Get accounts from configuration
            if (!revenueAccount || !arAccount) {
                const accountConfig = await tx.execute(sql`
          SELECT 
            (SELECT config_value FROM system_configuration WHERE config_key = 'revenue_account' LIMIT 1) as revenue_account,
            (SELECT config_value FROM system_configuration WHERE config_key = 'ar_account' LIMIT 1) as ar_account
        `);

                revenueAccount = accountConfig.rows[0]?.revenue_account || '400000';
                arAccount = accountConfig.rows[0]?.ar_account || '120000';
            }

            // Generate GL document number
            const glDocNumber = `GL-CM-${cm.credit_memo_number}`;

            // Create Journal Entry: DR Revenue, CR AR (reversal of invoice)
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
          ${cm.credit_date},
          CURRENT_DATE,
          'CREDIT_MEMO',
          ${cm.credit_memo_number},
          ${revenueAccount},
          'REVENUE',
          ${cm.total_amount},
          0,
          'Credit Memo - Revenue Reversal',
          ${cm.company_code_id},
          NOW()
        ),
        (
          ${glDocNumber},
          ${cm.credit_date},
          CURRENT_DATE,
          'CREDIT_MEMO',
          ${cm.credit_memo_number},
          ${arAccount},
          'AR',
          0,
          ${cm.total_amount},
          'Credit Memo - AR Reduction',
          ${cm.company_code_id},
          NOW()
        )
      `);

            // Update credit memo with GL doc number
            await tx.execute(sql`
        UPDATE credit_memos
        SET posting_status = 'POSTED',
            accounting_document_number = ${glDocNumber},
            updated_at = NOW()
        WHERE id = ${creditMemoId}
      `);

            // Update AR open items if billing document exists
            if (cm.billing_document_id) {
                await tx.execute(sql`
          UPDATE ar_open_items
          SET outstanding_amount = outstanding_amount - ${cm.total_amount},
              status = CASE 
                WHEN outstanding_amount - ${cm.total_amount} <= 0.01 THEN 'CLEARED'
                WHEN outstanding_amount - ${cm.total_amount} < outstanding_amount THEN 'PARTIAL'
                ELSE status
              END,
              updated_at = NOW()
          WHERE billing_document_id = ${cm.billing_document_id}
            AND active = true
        `);

                // Update billing document outstanding amount
                await tx.execute(sql`
          UPDATE billing_documents
          SET outstanding_amount = outstanding_amount - ${cm.total_amount},
              updated_at = NOW()
          WHERE id = ${cm.billing_document_id}
        `);
            }

            res.json({
                success: true,
                data: {
                    creditMemoId,
                    creditMemoNumber: cm.credit_memo_number,
                    glDocumentNumber: glDocNumber,
                    totalAmount: cm.total_amount,
                    postingStatus: 'POSTED',
                    message: 'Credit memo posted to GL successfully'
                }
            });
        });

    } catch (error: any) {
        console.error('Error posting credit memo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to post credit memo'
        });
    }
});

/**
 * GET /credit-memos
 * List all credit memos
 */
router.get('/credit-memos', async (req, res) => {
    try {
        const { customerId, postingStatus } = req.query;

        let query = sql`
      SELECT 
        cm.id,
        cm.credit_memo_number,
        cm.return_id,
        sr.return_number,
        cm.customer_id,
        c.name as customer_name,
        cm.billing_document_id,
        bd.billing_number,
        cm.credit_date,
        cm.total_amount,
        cm.tax_amount,
        cm.posting_status,
        cm.accounting_document_number,
        cm.created_at,
        (SELECT COUNT(*) FROM credit_memo_items WHERE credit_memo_id = cm.id) as item_count
      FROM credit_memos cm
      LEFT JOIN erp_customers c ON cm.customer_id = c.id
      LEFT JOIN sales_returns sr ON cm.return_id = sr.id
      LEFT JOIN billing_documents bd ON cm.billing_document_id = bd.id
      WHERE cm.active = true
    `;

        if (customerId) {
            query = sql`${query} AND cm.customer_id = ${customerId}`;
        }

        if (postingStatus) {
            query = sql`${query} AND cm.posting_status = ${postingStatus}`;
        }

        query = sql`${query} ORDER BY cm.created_at DESC`;

        const result = await db.execute(query);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error: any) {
        console.error('Error fetching credit memos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch credit memos'
        });
    }
});

/**
 * POST /return-deliveries
 * Process return delivery (goods receipt for returns)
 */
router.post('/return-deliveries', async (req, res) => {
    try {
        const { returnId, plantId, storageLocationId, items, receiverName, notes } = req.body;

        if (!returnId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Return ID and items are required'
            });
        }

        await db.transaction(async (tx) => {
            // Verify return exists and is approved
            const returnResult = await tx.execute(sql`
        SELECT id, return_number, approval_status
        FROM sales_returns
        WHERE id = ${returnId}
      `);

            if (returnResult.rows.length === 0) {
                throw new Error('Return not found');
            }

            if (returnResult.rows[0].approval_status !== 'APPROVED') {
                throw new Error('Return must be approved before processing return delivery');
            }

            // Generate return delivery number
            const returnDeliveryNumber = await generateReturnDeliveryNumber();

            // Create return delivery
            const rdResult = await tx.execute(sql`
        INSERT INTO return_deliveries (
          return_delivery_number,
          return_id,
          receipt_date,
          plant_id,
          storage_location_id,
          status,
          inventory_posting_status,
          receiver_name,
          notes,
          created_at
        ) VALUES (
          ${returnDeliveryNumber},
          ${returnId},
          CURRENT_DATE,
          ${plantId || null},
          ${storageLocationId || null},
          'PENDING',
          'NOT_POSTED',
          ${receiverName || ''},
          ${notes || ''},
          NOW()
        ) RETURNING id
      `);

            const returnDeliveryId = rdResult.rows[0].id;

            // Create return delivery items
            for (const item of items) {
                await tx.execute(sql`
          INSERT INTO return_delivery_items (
            return_delivery_id,
            return_item_id,
            product_id,
            quantity_received,
            quantity_accepted,
            quantity_rejected,
            condition,
            disposition,
            batch_number,
            serial_number,
            created_at
          ) VALUES (
            ${returnDeliveryId},
            ${item.return_item_id},
            ${item.product_id},
            ${item.quantity_received},
            ${item.quantity_accepted || item.quantity_received},
            ${item.quantity_rejected || 0},
            ${item.condition || 'NORMAL'},
            ${item.disposition || 'RESTOCK'},
            ${item.batch_number || ''},
            ${item.serial_number || ''},
            NOW()
          )
        `);

                // If disposition is RESTOCK, increase inventory
                if ((item.disposition || 'RESTOCK') === 'RESTOCK') {
                    await tx.execute(sql`
            UPDATE products
            SET stock = stock + ${item.quantity_accepted || item.quantity_received},
                updated_at = NOW()
            WHERE id = ${item.product_id}
          `);
                }
            }

            // Update return delivery status
            await tx.execute(sql`
        UPDATE return_deliveries
        SET status = 'COMPLETED',
            inventory_posting_status = 'POSTED',
            inventory_document_number = ${`INV-${returnDeliveryNumber}`},
            updated_at = NOW()
        WHERE id = ${returnDeliveryId}
      `);

            // Update return status
            await tx.execute(sql`
        UPDATE sales_returns
        SET status = 'COMPLETED',
            updated_at = NOW()
        WHERE id = ${returnId}
      `);

            res.json({
                success: true,
                data: {
                    returnDeliveryId,
                    returnDeliveryNumber,
                    status: 'COMPLETED',
                    inventoryPostingStatus: 'POSTED',
                    message: 'Return delivery processed and inventory updated successfully'
                }
            });
        });

    } catch (error: any) {
        console.error('Error processing return delivery:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process return delivery'
        });
    }
});
