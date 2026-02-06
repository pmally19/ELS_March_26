import { db } from '../db';
import { eq, sql, and } from 'drizzle-orm';
import { documentSplittingService } from './document-splitting-service.js';
import { vendorPayments, glAccounts, bankAccounts, companyCodes } from '@shared/schema';
import { TransactionalApplicationsService } from './transactional-applications-service';

const transactionalApplicationsService = new TransactionalApplicationsService();

export interface VendorPaymentData {
  purchaseOrderId: number;
  paymentAmount: number;
  paymentMethod: 'CHECK' | 'BANK_TRANSFER' | 'ONLINE_TRANSFER' | 'WIRE_TRANSFER';
  paymentDate: Date;
  valueDate?: Date;
  bankAccountId: number;
  reference?: string; // Check number, transfer reference, transaction ID
  currency?: string;
  notes?: string;
  createdBy?: number;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  purchaseOrder?: any;
  goodsReceipt?: any;
  vendorInvoice?: any;
  bankAccount?: any;
  glAccounts?: {
    apAccount?: any;
    bankAccount?: any;
  };
}

export class VendorPaymentService {
  /**
   * Validate payment prerequisites
   * Checks: Purchase Order, Goods Receipt, Vendor Invoice, Bank Account, GL Accounts
   */
  async validatePayment(paymentData: VendorPaymentData): Promise<PaymentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let purchaseOrder: any = null;
    let goodsReceipt: any = null;
    let vendorInvoice: any = null;
    let bankAccount: any = null;
    let glAccounts: { apAccount?: any; bankAccount?: any } = {};

    try {
      // 1. Validate Purchase Order
      const poResult = await db.execute(sql`
        SELECT 
          po.id, po.order_number, po.vendor_id, po.total_amount, po.status,
          po.company_code_id, po.currency_id,
          v.name as vendor_name, v.code as vendor_code,
          cc.code as company_code, cc.currency as company_currency
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN company_codes cc ON po.company_code_id = cc.id
        WHERE po.id = ${paymentData.purchaseOrderId}
          AND (po.active = true OR po.active IS NULL)
      `);

      if (poResult.rows.length === 0) {
        errors.push('Purchase Order not found');
      } else {
        purchaseOrder = poResult.rows[0];

        // Validate PO status
        if (purchaseOrder.status === 'CLOSED' || purchaseOrder.status === 'CANCELLED') {
          errors.push(`Purchase Order is ${purchaseOrder.status} and cannot be paid`);
        }

        // Validate PO amount
        if (paymentData.paymentAmount > parseFloat(purchaseOrder.total_amount || 0)) {
          errors.push(`Payment amount (${paymentData.paymentAmount}) exceeds Purchase Order amount (${purchaseOrder.total_amount})`);
        }
      }

      // 2. Validate Goods Receipt exists
      if (purchaseOrder) {
        const grResult = await db.execute(sql`
          SELECT 
            gr.id, gr.receipt_number, gr.total_value, gr.status,
            gr.purchase_order as po_number
          FROM goods_receipts gr
          WHERE gr.purchase_order = ${purchaseOrder.order_number}
            AND gr.status IN ('COMPLETED', 'POSTED', 'Posted')
          ORDER BY gr.created_at DESC
          LIMIT 1
        `);

        if (grResult.rows.length === 0) {
          warnings.push('No Goods Receipt found for this Purchase Order. Payment can still be processed, but goods may not have been received.');
        } else {
          goodsReceipt = grResult.rows[0];
        }
      }

      // 3. Validate/Create Vendor Invoice
      if (purchaseOrder) {
        const invoiceResult = await db.execute(sql`
          SELECT 
            ap.id, ap.invoice_number, ap.amount, ap.status,
            ap.net_amount, ap.tax_amount, ap.payment_reference
          FROM accounts_payable ap
          WHERE ap.purchase_order_id = ${paymentData.purchaseOrderId}
            AND ap.status IN ('open', 'Open', 'OPEN', 'partial', 'Partial')
            AND (ap.active = true OR ap.active IS NULL)
          ORDER BY ap.invoice_date DESC
          LIMIT 1
        `);

        if (invoiceResult.rows.length === 0) {
          // Invoice doesn't exist - will be created automatically
          warnings.push('Vendor Invoice not found. Will be created automatically from Purchase Order.');
        } else {
          vendorInvoice = invoiceResult.rows[0];

          // Calculate outstanding amount (invoice amount minus any payments)
          // For now, we'll use the net_amount as outstanding since we don't track partial payments in the invoice table
          const invoiceAmount = parseFloat(vendorInvoice.net_amount || vendorInvoice.amount || 0);
          if (paymentData.paymentAmount > invoiceAmount) {
            warnings.push(`Payment amount (${paymentData.paymentAmount}) exceeds invoice amount (${invoiceAmount}). Payment will be processed as partial payment.`);
          }
        }
      }

      // 4. Validate Bank Account and get its GL account
      const bankResult = await db.execute(sql`
        SELECT 
          ba.id, ba.account_number, ba.account_name, ba.bank_name,
          ba.current_balance, ba.available_balance, ba.currency,
          ba.gl_account_id, ba.company_code_id, ba.is_active,
          gl.id as gl_account_id, gl.account_number as gl_account_number,
          gl.account_name as gl_account_name, gl.account_type as gl_account_type,
          gl.is_active as gl_is_active
        FROM bank_accounts ba
        INNER JOIN gl_accounts gl ON ba.gl_account_id = gl.id
        WHERE ba.id = ${paymentData.bankAccountId}
          AND ba.is_active = true
          AND gl.is_active = true
      `);

      if (bankResult.rows.length === 0) {
        errors.push('Bank account not found, inactive, or GL account not linked/inactive');
      } else {
        bankAccount = bankResult.rows[0];

        // Validate bank account has GL account
        if (!bankAccount.gl_account_id) {
          errors.push('Bank account is not linked to a GL account');
        } else {
          // Store bank GL account from the join
          glAccounts.bankAccount = {
            id: bankAccount.gl_account_id,
            account_number: bankAccount.gl_account_number,
            account_name: bankAccount.gl_account_name,
            account_type: bankAccount.gl_account_type,
            is_active: bankAccount.gl_is_active
          };

          // Validate bank GL account type (should be ASSETS)
          if (bankAccount.gl_account_type !== 'ASSETS') {
            warnings.push(`Bank GL account type is '${bankAccount.gl_account_type}', expected 'ASSETS'`);
          }
        }

        // Validate currency match
        const paymentCurrency = paymentData.currency || purchaseOrder?.company_currency || 'USD';
        if (bankAccount.currency !== paymentCurrency) {
          warnings.push(`Bank account currency (${bankAccount.currency}) does not match payment currency (${paymentCurrency})`);
        }

        // Validate company code match
        if (purchaseOrder && bankAccount.company_code_id !== purchaseOrder.company_code_id) {
          warnings.push('Bank account company code does not match Purchase Order company code');
        }
      }

      // 5. Validate AP GL Account (Accounts Payable)
      // Look for AP account, preferably in the same company code as the purchase order or bank account
      const companyCodeId = purchaseOrder?.company_code_id || bankAccount?.company_code_id;

      if (!companyCodeId) {
        errors.push('Cannot determine company code for GL account lookup');
      } else {
        // Try to find AP account linked to company code via chart of accounts assignments
        // Join: gl_accounts -> chart_of_accounts -> company_codes
        // Note: Using subquery to avoid SELECT DISTINCT with ORDER BY issue
        let apGLResult = await db.execute(sql`
          SELECT 
            gl.id, gl.account_number, gl.account_name, gl.account_type, 
            gl.account_group, gl.is_active,
            cc.id as company_code_id,
            CASE 
              WHEN cc.id = ${companyCodeId} THEN 0
              ELSE 1
            END as company_code_priority,
            CASE 
              WHEN gl.account_group ILIKE '%ACCOUNTS_PAYABLE%' THEN 1
              WHEN gl.account_group ILIKE '%PAYABLE%' THEN 2
              WHEN gl.account_number LIKE '2100%' THEN 3
              WHEN gl.account_number LIKE '2110%' THEN 4
              WHEN gl.account_group ILIKE '%VENDOR%' THEN 5
              ELSE 6
            END as account_priority
          FROM gl_accounts gl
          LEFT JOIN chart_of_accounts coa ON gl.chart_of_accounts_id = coa.id
          LEFT JOIN company_codes cc ON coa.id = cc.chart_of_accounts_id
          WHERE gl.account_type = 'LIABILITIES'
            AND (
              gl.account_group ILIKE '%VENDOR%' 
              OR gl.account_group ILIKE '%PAYABLE%' 
              OR gl.account_group ILIKE '%ACCOUNTS_PAYABLE%'
              OR gl.account_number LIKE '2100%'
              OR gl.account_number LIKE '2110%'
            )
            AND gl.is_active = true
            AND (
              cc.id = ${companyCodeId}
              OR cc.id IS NULL
            )
            AND (cc.active = true OR cc.active IS NULL)
          GROUP BY 
            gl.id, gl.account_number, gl.account_name, gl.account_type, 
            gl.account_group, gl.is_active, cc.id
          ORDER BY 
            company_code_priority,
            account_priority,
            gl.account_number
          LIMIT 1
        `);

        // If no AP account found with company code link, try without company code constraint
        if (apGLResult.rows.length === 0) {
          apGLResult = await db.execute(sql`
            SELECT 
              gl.id, gl.account_number, gl.account_name, gl.account_type, 
              gl.account_group, gl.is_active
            FROM gl_accounts gl
            WHERE gl.account_type = 'LIABILITIES'
              AND (
                gl.account_group ILIKE '%VENDOR%' 
                OR gl.account_group ILIKE '%PAYABLE%' 
                OR gl.account_group ILIKE '%ACCOUNTS_PAYABLE%'
                OR gl.account_number LIKE '2100%'
                OR gl.account_number LIKE '2110%'
              )
              AND gl.is_active = true
            ORDER BY 
              CASE 
                WHEN gl.account_group ILIKE '%ACCOUNTS_PAYABLE%' THEN 1
                WHEN gl.account_group ILIKE '%PAYABLE%' THEN 2
                WHEN gl.account_number LIKE '2100%' THEN 3
                WHEN gl.account_number LIKE '2110%' THEN 4
                WHEN gl.account_group ILIKE '%VENDOR%' THEN 5
                ELSE 6
              END,
              gl.account_number
            LIMIT 1
          `);
        }

        if (apGLResult.rows.length === 0) {
          errors.push(
            'Accounts Payable GL account not found. Please create an AP GL account with: ' +
            'account_type = "LIABILITIES", account_group containing "PAYABLE" or "VENDOR", and is_active = true'
          );
        } else {
          glAccounts.apAccount = apGLResult.rows[0];

          // Validate AP account type
          if (glAccounts.apAccount.account_type !== 'LIABILITIES') {
            errors.push(`AP GL account type is '${glAccounts.apAccount.account_type}', expected 'LIABILITIES'`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        purchaseOrder,
        goodsReceipt,
        vendorInvoice,
        bankAccount,
        glAccounts
      };

    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings,
        purchaseOrder,
        goodsReceipt,
        vendorInvoice,
        bankAccount,
        glAccounts
      };
    }
  }

  /**
   * Create vendor invoice from Purchase Order if it doesn't exist
   */
  async createInvoiceFromPO(purchaseOrderId: number, invoiceNumber?: string): Promise<any> {
    try {
      // Check if invoice already exists
      const existingInvoice = await db.execute(sql`
        SELECT id, invoice_number, amount, status
        FROM accounts_payable
        WHERE purchase_order_id = ${purchaseOrderId}
          AND status IN ('open', 'Open', 'OPEN')
        LIMIT 1
      `);

      if (existingInvoice.rows.length > 0) {
        return existingInvoice.rows[0];
      }

      // Get Purchase Order details
      const poResult = await db.execute(sql`
        SELECT 
          po.id, po.order_number, po.vendor_id, po.total_amount,
          po.tax_amount, po.net_amount, po.company_code_id,
          po.currency_id, po.payment_terms,
          v.name as vendor_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = ${purchaseOrderId}
      `);

      if (poResult.rows.length === 0) {
        throw new Error('Purchase Order not found');
      }

      const po = poResult.rows[0];
      const invoiceNum = invoiceNumber || `VINV-${po.order_number}-${Date.now()}`;
      const invoiceDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days

      // Create invoice
      const invoiceResult = await db.execute(sql`
        INSERT INTO accounts_payable (
          vendor_id, invoice_number, invoice_date, due_date,
          amount, tax_amount, net_amount, currency_id,
          company_code_id, purchase_order_id, payment_terms,
          status, active, created_at, updated_at
        ) VALUES (
          ${po.vendor_id}, ${invoiceNum}, ${invoiceDate.toISOString().split('T')[0]}, ${dueDate.toISOString().split('T')[0]},
          ${po.total_amount || po.net_amount}, ${po.tax_amount || 0}, ${po.net_amount || po.total_amount},
          ${po.currency_id || null}, ${po.company_code_id}, ${purchaseOrderId},
          ${po.payment_terms || 'NET30'}, 'open', true, NOW(), NOW()
        )
        RETURNING id, invoice_number, amount, status
      `);

      return invoiceResult.rows[0];

    } catch (error: any) {
      throw new Error(`Failed to create invoice from Purchase Order: ${error.message}`);
    }
  }

  /**
   * Process vendor payment with full integration
   * Creates payment record, GL entries, updates bank balance, AP open items, etc.
   */
  async processVendorPayment(paymentData: VendorPaymentData): Promise<{
    success: boolean;
    paymentId?: number;
    paymentNumber?: string;
    accountingDocumentNumber?: string;
    message?: string;
    errors?: string[];
  }> {
    return await db.transaction(async (tx) => {
      try {
        // 1. Validate payment
        const validation = await this.validatePayment(paymentData);
        if (!validation.isValid) {
          throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`);
        }

        const { purchaseOrder, vendorInvoice: existingInvoice, bankAccount, glAccounts: validationGLAccounts } = validation;

        // 2. Create or get vendor invoice
        let vendorInvoice = existingInvoice;
        if (!vendorInvoice) {
          vendorInvoice = await this.createInvoiceFromPO(paymentData.purchaseOrderId);
        }

        // 3. Generate payment number
        const paymentNumber = `VP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 4. Create vendor payment record
        const paymentResult = await tx.execute(sql`
          INSERT INTO vendor_payments (
            payment_number, vendor_id, purchase_order_id, invoice_id,
            payment_amount, payment_method, payment_date, value_date,
            bank_account_id, reference, currency, status,
            company_code_id, created_by, notes, created_at, updated_at
          ) VALUES (
            ${paymentNumber}, ${purchaseOrder.vendor_id}, ${paymentData.purchaseOrderId}, ${vendorInvoice.id},
            ${paymentData.paymentAmount}, ${paymentData.paymentMethod}, ${paymentData.paymentDate.toISOString().split('T')[0]},
            ${paymentData.valueDate ? paymentData.valueDate.toISOString().split('T')[0] : paymentData.paymentDate.toISOString().split('T')[0]},
            ${paymentData.bankAccountId}, ${paymentData.reference || null}, ${String(paymentData.currency || (purchaseOrder as any).company_currency || 'USD')},
            'PROCESSED', ${purchaseOrder.company_code_id}, ${paymentData.createdBy || 1}, ${paymentData.notes || null}, NOW(), NOW()
          )
          RETURNING id, payment_number
        `);

        const paymentId = parseInt(String(paymentResult.rows[0].id));
        const paymentNumberCreated = String(paymentResult.rows[0].payment_number || '');

        // 5. Validate and get GL account numbers (from validation - should already be validated)
        if (!validationGLAccounts.apAccount || !validationGLAccounts.bankAccount) {
          throw new Error(
            'GL accounts not found: ' +
            (!validationGLAccounts.apAccount ? 'AP account missing. ' : '') +
            (!validationGLAccounts.bankAccount ? 'Bank account missing. ' : '') +
            'Please ensure GL accounts are properly configured.'
          );
        }

        const apAccountNumber = validationGLAccounts.apAccount.account_number;
        const bankAccountNumber = validationGLAccounts.bankAccount.account_number;

        // Additional validation - ensure account numbers are valid
        if (!apAccountNumber || apAccountNumber.trim() === '') {
          throw new Error('AP GL account number is empty or invalid');
        }
        if (!bankAccountNumber || bankAccountNumber.trim() === '') {
          throw new Error('Bank GL account number is empty or invalid');
        }

        // 6. Check if original invoice was split for passive splitting
        let paymentItems = [
          {
            glAccount: apAccountNumber, // Accounts Payable - DEBIT
            debitAmount: paymentData.paymentAmount,
            creditAmount: 0,
            description: `Vendor Payment - ${vendorInvoice.invoice_number || paymentNumberCreated}`
          },
          {
            glAccount: bankAccountNumber, // Bank Account - CREDIT
            debitAmount: 0,
            creditAmount: paymentData.paymentAmount,
            description: `Vendor Payment - ${vendorInvoice.invoice_number || paymentNumberCreated}`
          }
        ];

        // Try to get original invoice accounting document for passive splitting
        try {
          const invoiceDocResult = await tx.execute(sql`
            SELECT ad.id, ad.document_number
            FROM accounting_documents ad
            WHERE ad.source_document_type = 'AP_INVOICE'
              AND ad.source_document_id = ${vendorInvoice.id}
            ORDER BY ad.created_at DESC
            LIMIT 1
          `);

          if (invoiceDocResult.rows.length > 0) {
            const originalDocId = invoiceDocResult.rows[0].id;

            // Perform passive splitting
            const passiveSplitResult = await documentSplittingService.performPassiveSplitting(
              originalDocId,
              paymentItems
            );

            if (passiveSplitResult.success && passiveSplitResult.splitItems.length > 0) {
              paymentItems = passiveSplitResult.splitItems.map(item => ({
                glAccount: item.glAccount,
                debitAmount: item.debitAmount,
                creditAmount: item.creditAmount,
                costCenter: item.costCenter,
                description: item.description || ''
              }));
              console.log('Passive splitting applied to payment:', passiveSplitResult.splitItems.length, 'items');
            }
          }
        } catch (passiveSplitError: any) {
          console.warn('Passive splitting failed, proceeding with original items:', passiveSplitError.message);
          // Continue with original items
        }

        // Create GL document (with or without splitting)
        const glDocumentResult = await transactionalApplicationsService.createGLDocument({
          documentType: "ZP", // Payment document type
          companyCode: String(purchaseOrder.company_code || ''),
          documentDate: paymentData.paymentDate,
          postingDate: paymentData.paymentDate,
          reference: paymentNumberCreated,
          currency: String(paymentData.currency || purchaseOrder.company_currency || 'USD'),
          items: paymentItems
        });

        const accountingDocumentNumber = glDocumentResult.documentNumber;

        // 7. GL entries are already created in accounting_document_items by createGLDocument
        // The accounting_document_items table contains the GL entries (debit AP, credit Bank)

        // 8. Update vendor payment with accounting document number
        await tx.execute(sql`
          UPDATE vendor_payments
          SET accounting_document_number = ${accountingDocumentNumber},
              status = 'POSTED',
              updated_at = NOW()
          WHERE id = ${paymentId}
        `);

        // 9. Update bank account balance (CREDIT - reduce balance)
        await tx.execute(sql`
          UPDATE bank_accounts
          SET current_balance = current_balance - ${paymentData.paymentAmount},
              available_balance = available_balance - ${paymentData.paymentAmount},
              updated_at = NOW()
          WHERE id = ${paymentData.bankAccountId}
        `);

        // 10. Create bank transaction record
        try {
          // Use DEFAULT for id to let the sequence handle it
          await tx.execute(sql`
            INSERT INTO bank_transactions (
              id, bank_account_id, transaction_date, value_date, reference_number,
              description, amount, transaction_type, status, reconciliation_status, created_at
            ) VALUES (
              DEFAULT, ${paymentData.bankAccountId}, ${paymentData.paymentDate.toISOString().split('T')[0]},
              ${paymentData.valueDate ? paymentData.valueDate.toISOString().split('T')[0] : paymentData.paymentDate.toISOString().split('T')[0]},
              ${paymentNumberCreated}, ${`Vendor Payment - ${vendorInvoice.invoice_number || paymentNumberCreated}`},
              ${paymentData.paymentAmount}, 'debit', 'cleared', 'matched', NOW()
            )
          `);
        } catch (error: any) {
          // Bank transactions table might not exist or have issues, log and continue
          console.warn('Could not create bank transaction record:', error?.message || error);
          // Don't throw - bank transaction is optional for payment processing
        }

        // 11. Update AP invoice status and outstanding amount
        const invoiceAmount = parseFloat(vendorInvoice.amount || vendorInvoice.net_amount || 0);
        const paidAmount = paymentData.paymentAmount;
        const newOutstanding = Math.max(0, invoiceAmount - paidAmount);
        const newStatus = newOutstanding === 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'open');

        await tx.execute(sql`
          UPDATE accounts_payable
          SET status = ${newStatus},
              payment_date = ${paymentData.paymentDate.toISOString().split('T')[0]},
              payment_reference = ${paymentNumberCreated},
              updated_at = NOW()
          WHERE id = ${vendorInvoice.id}
        `);

        // 12. Update or create AP open item (optional - don't fail transaction if this fails)
        // Use a savepoint to isolate this operation
        try {
          await tx.execute(sql`SAVEPOINT ap_open_items_update`);

          // Check if ap_open_items table exists and has the right structure
          const tableCheck = await tx.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'ap_open_items'
            )
          `);

          if (tableCheck.rows[0]?.exists) {
            // Check if AP open item exists - use document_number or invoice_number
            const openItemCheck = await tx.execute(sql`
              SELECT id, outstanding_amount, document_number, vendor_id
              FROM ap_open_items
              WHERE (document_number = ${vendorInvoice.invoice_number} OR invoice_number = ${vendorInvoice.invoice_number})
                AND vendor_id = ${purchaseOrder.vendor_id}
              LIMIT 1
            `);

            if (openItemCheck.rows.length > 0) {
              // Update existing open item
              const openItem = openItemCheck.rows[0];
              const currentOutstanding = parseFloat(String(openItem.outstanding_amount || vendorInvoice.amount || vendorInvoice.net_amount || 0));
              const newOutstandingAmount = Math.max(0, currentOutstanding - paidAmount);
              const openItemStatus = newOutstandingAmount === 0 ? 'Cleared' : (paidAmount > 0 ? 'Partial' : 'Open');

              await tx.execute(sql`
                UPDATE ap_open_items
                SET outstanding_amount = ${newOutstandingAmount},
                    status = ${openItemStatus},
                    last_payment_date = ${paymentData.paymentDate.toISOString().split('T')[0]}
                WHERE id = ${openItem.id}
              `);
            }
            // Don't create new AP open items - let it be created separately if needed
          }

          await tx.execute(sql`RELEASE SAVEPOINT ap_open_items_update`);
        } catch (error: any) {
          // Rollback to savepoint and continue - AP open items is optional
          try {
            await tx.execute(sql`ROLLBACK TO SAVEPOINT ap_open_items_update`);
          } catch (e) {
            // Savepoint might not exist, ignore
          }
          console.warn('Could not update AP open items (optional step):', error?.message || error);
        }

        // 13. Create payment allocation (optional - don't fail transaction if this fails)
        // Use a savepoint to isolate this operation
        try {
          await tx.execute(sql`SAVEPOINT payment_allocation`);

          // Check if vendor_payment_allocations table exists
          const allocationTableCheck = await tx.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'vendor_payment_allocations'
            )
          `);

          if (allocationTableCheck.rows[0]?.exists) {
            // Get open item ID if it exists
            let openItemId = vendorInvoice.id; // Fallback to invoice ID
            try {
              const openItemResult = await tx.execute(sql`
                SELECT id FROM ap_open_items
                WHERE document_number = ${vendorInvoice.invoice_number} OR invoice_number = ${vendorInvoice.invoice_number}
                LIMIT 1
              `);
              if (openItemResult.rows.length > 0) {
                openItemId = parseInt(String(openItemResult.rows[0].id));
              }
            } catch (error) {
              // Use invoice ID as fallback
            }

            await tx.execute(sql`
              INSERT INTO vendor_payment_allocations (
                payment_id, open_item_id, allocated_amount,
                allocation_date, allocation_method, created_by, created_at, active
              ) VALUES (
                ${paymentId}, ${openItemId}, ${paymentData.paymentAmount},
                ${paymentData.paymentDate.toISOString().split('T')[0]}, 'manual', ${paymentData.createdBy || 1}, NOW(), true
              )
            `);
          }

          await tx.execute(sql`RELEASE SAVEPOINT payment_allocation`);
        } catch (error: any) {
          // Rollback to savepoint and continue - payment allocation is optional
          try {
            await tx.execute(sql`ROLLBACK TO SAVEPOINT payment_allocation`);
          } catch (e) {
            // Savepoint might not exist, ignore
          }
          console.warn('Could not create payment allocation (optional step):', error?.message || error);
        }

        // 14. Update Purchase Order status to CLOSED if fully paid
        // Check if PO total amount has been fully paid
        try {
          const poPaymentCheck = await tx.execute(sql`
            SELECT 
              po.total_amount,
              COALESCE(SUM(vp.payment_amount), 0) as total_paid
            FROM purchase_orders po
            LEFT JOIN vendor_payments vp ON vp.purchase_order_id = po.id 
              AND vp.status IN ('POSTED', 'PROCESSED', 'COMPLETED')
            WHERE po.id = ${paymentData.purchaseOrderId}
            GROUP BY po.id, po.total_amount
          `);

          if (poPaymentCheck.rows.length > 0) {
            const poData = poPaymentCheck.rows[0];
            const totalAmount = parseFloat(String(poData.total_amount || 0));
            const totalPaid = parseFloat(String(poData.total_paid || 0));

            // Get status from document_settings
            const statusResult = await tx.execute(sql`
              SELECT setting_value 
              FROM document_settings 
              WHERE setting_key = 'po_status_closed'
              LIMIT 1
            `);
            const poStatusClosed = statusResult.rows[0]?.setting_value || 'CLOSED';

            // If fully paid, update PO status to CLOSED
            if (totalPaid >= totalAmount && totalAmount > 0) {
              await tx.execute(sql`
                UPDATE purchase_orders 
                SET status = ${poStatusClosed}, updated_at = NOW()
                WHERE id = ${paymentData.purchaseOrderId}
                  AND status != ${poStatusClosed}
              `);
            }
          }
        } catch (error: any) {
          // Don't fail transaction if PO status update fails
          console.warn('Could not update PO status after payment:', error?.message || error);
        }

        return {
          success: true,
          paymentId: paymentId,
          paymentNumber: paymentNumberCreated,
          accountingDocumentNumber: accountingDocumentNumber,
          message: 'Vendor payment processed successfully'
        };

      } catch (error: any) {
        throw new Error(`Failed to process vendor payment: ${error.message}`);
      }
    });
  }

  /**
   * Get vendor payments by Purchase Order
   */
  async getPaymentsByPO(purchaseOrderId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        vp.id, vp.payment_number, vp.payment_amount, vp.payment_method,
        vp.payment_date, vp.status, vp.reference, vp.accounting_document_number,
        ba.account_name as bank_account_name, ba.account_number as bank_account_number,
        v.name as vendor_name
      FROM vendor_payments vp
      LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
      LEFT JOIN vendors v ON vp.vendor_id = v.id
      WHERE vp.purchase_order_id = ${purchaseOrderId}
      ORDER BY vp.payment_date DESC
    `);

    return result.rows;
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(paymentId: number): Promise<any> {
    const result = await db.execute(sql`
      SELECT 
        vp.*,
        ba.account_name as bank_account_name, ba.account_number as bank_account_number,
        v.name as vendor_name, v.code as vendor_code,
        po.order_number, po.total_amount as po_amount,
        ap.invoice_number, ap.amount as invoice_amount
      FROM vendor_payments vp
      LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
      LEFT JOIN vendors v ON vp.vendor_id = v.id
      LEFT JOIN purchase_orders po ON vp.purchase_order_id = po.id
      LEFT JOIN accounts_payable ap ON vp.invoice_id = ap.id
      WHERE vp.id = ${paymentId}
    `);

    return result.rows[0] || null;
  }
}

export const vendorPaymentService = new VendorPaymentService();

