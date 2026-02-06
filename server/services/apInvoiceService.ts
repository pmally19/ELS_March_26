import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';
import { InventoryTrackingService } from './inventoryTrackingService.js';
import { documentSplittingService } from './document-splitting-service.js';

interface ThreeWayMatchResult {
  isValid: boolean;
  discrepancies: Array<{
    type: 'quantity' | 'price' | 'missing';
    field: string;
    expected: any;
    actual: any;
    tolerance?: number;
  }>;
  warnings: string[];
}

interface InvoiceLineItem {
  materialId?: number;
  materialCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

export class APInvoiceService {
  private pool: PoolType;
  private inventoryTrackingService: InventoryTrackingService;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.inventoryTrackingService = new InventoryTrackingService(pool);
  }

  /**
   * Perform three-way match validation
   * Purchase Order ↔ Goods Receipt ↔ Accounts Payable Invoice
   * Validates quantities and prices match across all three documents
   */
  async performThreeWayMatch(
    purchaseOrderId: number,
    goodsReceiptId: number | null,
    invoiceItems: InvoiceLineItem[],
    tolerancePercentage: number = 5.0
  ): Promise<ThreeWayMatchResult> {
    const discrepancies: ThreeWayMatchResult['discrepancies'] = [];
    const warnings: string[] = [];

    try {
      // Get PO details
      const poResult = await this.pool.query(`
        SELECT 
          po.id,
          po.order_number,
          po.vendor_id,
          poi.material_id,
          m.code as material_code,
          poi.quantity as ordered_quantity,
          poi.unit_price as po_unit_price,
          poi.received_quantity,
          poi.invoiced_quantity
        FROM purchase_orders po
        JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        LEFT JOIN materials m ON poi.material_id = m.id
        WHERE po.id = $1 AND (poi.active = true OR poi.active IS NULL)
      `, [purchaseOrderId]);

      if (poResult.rows.length === 0) {
        return {
          isValid: false,
          discrepancies: [{
            type: 'missing',
            field: 'purchase_order',
            expected: purchaseOrderId,
            actual: null
          }],
          warnings: []
        };
      }

      // Get Goods Receipt details if exists
      let goodsReceiptItems: any[] = [];
      if (goodsReceiptId || purchaseOrderId) {
        // Check which status columns exist in goods_receipts table
        const grColumnsCheck = await this.pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'goods_receipts'
          AND column_name IN ('posted', 'status', 'gr_status')
        `);

        const grColumns = grColumnsCheck.rows.map((r: any) => r.column_name);
        const hasPosted = grColumns.includes('posted');
        const hasStatus = grColumns.includes('status');
        const hasGrStatus = grColumns.includes('gr_status');

        // Build status condition based on available columns
        let statusCondition = '1=1'; // Default: no status filter
        if (hasPosted) {
          statusCondition = 'gr.posted = true';
        } else if (hasGrStatus) {
          statusCondition = "gr.gr_status IN ('Posted', 'COMPLETED')";
        } else if (hasStatus) {
          statusCondition = "gr.status IN ('Posted', 'COMPLETED', 'Received')";
        }

        // Check which columns exist for material and quantity
        const grDataColumnsCheck = await this.pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'goods_receipts'
          AND column_name IN ('material_code', 'quantity', 'total_quantity', 'unit_price', 'purchase_order_id', 'purchase_order')
        `);

        const grDataColumns = grDataColumnsCheck.rows.map((r: any) => r.column_name);
        const hasMaterialCode = grDataColumns.includes('material_code');
        const hasQuantity = grDataColumns.includes('quantity');
        const hasTotalQuantity = grDataColumns.includes('total_quantity');
        const hasUnitPrice = grDataColumns.includes('unit_price');
        const hasPurchaseOrderId = grDataColumns.includes('purchase_order_id');
        const hasPurchaseOrder = grDataColumns.includes('purchase_order');

        const materialCodeCol = hasMaterialCode ? 'gr.material_code' : 'NULL as material_code';
        const quantityCol = hasQuantity ? 'gr.quantity' : (hasTotalQuantity ? 'gr.total_quantity' : 'NULL as quantity');
        const unitPriceCol = hasUnitPrice ? 'gr.unit_price' : 'NULL as unit_price';
        const poIdCol = hasPurchaseOrderId ? 'gr.purchase_order_id' : 'NULL as purchase_order_id';

        // Build WHERE condition
        let whereCondition = '';
        let queryParams: any[] = [];

        if (goodsReceiptId) {
          whereCondition = 'gr.id = $1';
          queryParams = [goodsReceiptId];
        } else if (purchaseOrderId) {
          // Get goods receipts linked to this PO
          if (hasPurchaseOrderId) {
            whereCondition = 'gr.purchase_order_id = $1';
            queryParams = [purchaseOrderId];
          } else if (hasPurchaseOrder) {
            // Need to get PO order_number first
            const poNumberResult = await this.pool.query(
              'SELECT order_number FROM purchase_orders WHERE id = $1',
              [purchaseOrderId]
            );
            if (poNumberResult.rows.length > 0) {
              whereCondition = `gr.purchase_order = $1`;
              queryParams = [poNumberResult.rows[0].order_number];
            } else {
              whereCondition = '1=0'; // PO not found
            }
          } else {
            whereCondition = '1=0'; // No PO column found
          }
        }

        if (whereCondition) {
          const goodsReceiptResult = await this.pool.query(`
          SELECT 
              ${materialCodeCol},
              ${quantityCol} as received_quantity,
              ${unitPriceCol} as goods_receipt_unit_price,
              ${poIdCol} as purchase_order_id
          FROM goods_receipts gr
            WHERE ${whereCondition} AND ${statusCondition}
          `, queryParams);

          goodsReceiptItems = goodsReceiptResult.rows;
        }
      }

      // Match invoice items against PO and Goods Receipt
      for (const invoiceItem of invoiceItems) {
        const poItem = poResult.rows.find(
          row => row.material_code === invoiceItem.materialCode ||
            row.material_id === invoiceItem.materialId
        );

        if (!poItem) {
          discrepancies.push({
            type: 'missing',
            field: 'material',
            expected: invoiceItem.materialCode,
            actual: null
          });
          continue;
        }

        // Validate quantity against Goods Receipt (if exists) or PO
        const expectedQuantity = goodsReceiptItems.length > 0
          ? goodsReceiptItems.find(gr => gr.material_code === invoiceItem.materialCode)?.received_quantity
          : poItem.ordered_quantity;

        if (expectedQuantity) {
          const quantityDiff = Math.abs(invoiceItem.quantity - expectedQuantity);
          const quantityTolerance = (expectedQuantity * tolerancePercentage) / 100;

          if (quantityDiff > quantityTolerance) {
            discrepancies.push({
              type: 'quantity',
              field: 'quantity',
              expected: expectedQuantity,
              actual: invoiceItem.quantity,
              tolerance: tolerancePercentage
            });
          }
        }

        // Validate price against PO
        const priceDiff = Math.abs(invoiceItem.unitPrice - parseFloat(poItem.po_unit_price || 0));
        const priceTolerance = (parseFloat(poItem.po_unit_price || 0) * tolerancePercentage) / 100;

        if (priceDiff > priceTolerance) {
          discrepancies.push({
            type: 'price',
            field: 'unit_price',
            expected: poItem.po_unit_price,
            actual: invoiceItem.unitPrice,
            tolerance: tolerancePercentage
          });
          warnings.push(`Price variance for ${invoiceItem.materialCode}: ${priceDiff.toFixed(2)}`);
        }

        // Check if already invoiced
        const alreadyInvoiced = parseFloat(poItem.invoiced_quantity || 0);
        if (alreadyInvoiced > 0) {
          warnings.push(`Material ${invoiceItem.materialCode} has already been invoiced: ${alreadyInvoiced}`);
        }
      }

      // Check if Goods Receipt exists but invoice is being created without it
      if (goodsReceiptItems.length > 0 && !goodsReceiptId && purchaseOrderId) {
        warnings.push('Goods Receipt exists for this PO, but invoice is not linked to Goods Receipt');
        // Use goods receipt quantities for validation if available
        // This allows validation even when goodsReceiptId is not explicitly provided
      }

      return {
        isValid: discrepancies.length === 0,
        discrepancies,
        warnings
      };
    } catch (error) {
      console.error('Error performing three-way match:', error);
      return {
        isValid: false,
        discrepancies: [{
          type: 'missing',
          field: 'validation_error',
          expected: 'success',
          actual: error.message
        }],
        warnings: []
      };
    }
  }

  /**
   * Create A/P Invoice with three-way match validation
   */
  async createAPInvoice(
    invoiceData: {
      vendorId: number;
      invoiceNumber: string;
      invoiceDate: Date;
      dueDate: Date;
      purchaseOrderId?: number;
      goodsReceiptId?: number;
      items: InvoiceLineItem[];
      currency?: string;
      notes?: string;
    },
    performValidation: boolean = true
  ): Promise<{
    success: boolean;
    invoiceId?: number;
    validationResult?: ThreeWayMatchResult;
    errors?: string[];
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Perform three-way match if PO/Goods Receipt exists
      let validationResult: ThreeWayMatchResult | undefined;
      if (performValidation && invoiceData.purchaseOrderId) {
        validationResult = await this.performThreeWayMatch(
          invoiceData.purchaseOrderId,
          invoiceData.goodsReceiptId || null,
          invoiceData.items
        );

        // If validation fails, return error (but allow override in future)
        if (!validationResult.isValid && performValidation) {
          await client.query('ROLLBACK');
          return {
            success: false,
            validationResult,
            errors: validationResult.discrepancies.map(d =>
              `${d.type} mismatch: ${d.field} expected ${d.expected}, got ${d.actual}`
            )
          };
        }
      }

      // Calculate totals
      const totalAmount = invoiceData.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalNetAmount = invoiceData.items.reduce((sum, item) => sum + (item.totalPrice - (item.totalPrice * 0.1)), 0); // Assuming 10% tax if not specified
      const totalTaxAmount = totalAmount - totalNetAmount;

      // Get vendor information
      const vendorCheck = await client.query(
        'SELECT id, name, company_code_id, payment_terms FROM vendors WHERE id = $1',
        [invoiceData.vendorId]
      );

      if (vendorCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          errors: ['Vendor not found']
        };
      }

      const vendor = vendorCheck.rows[0];

      // Get company code
      let companyCodeId = vendor.company_code_id;
      if (!companyCodeId) {
        const companyCodeResult = await client.query(
          'SELECT id FROM company_codes WHERE active = true ORDER BY id LIMIT 1'
        );
        if (companyCodeResult.rows.length > 0) {
          companyCodeId = companyCodeResult.rows[0].id;
        } else {
          await client.query('ROLLBACK');
          return {
            success: false,
            errors: ['No active company code found']
          };
        }
      }

      // Get company code details
      const companyCodeResult = await client.query(
        'SELECT id, code, fiscal_year_variant_id FROM company_codes WHERE id = $1',
        [companyCodeId]
      );
      const companyCode = companyCodeResult.rows[0];
      const companyCodeString = companyCode.code;

      // Get currency ID
      const currencyCode = invoiceData.currency || 'USD';
      const currencyResult = await client.query(
        'SELECT id FROM currencies WHERE code = $1',
        [currencyCode]
      );
      const currencyId = currencyResult.rows.length > 0 ? currencyResult.rows[0].id : 1;

      // Calculate fiscal year and period
      // For now, use calendar year - can be enhanced later with fiscal year variant logic
      const invoiceDate = new Date(invoiceData.invoiceDate);
      const fiscalYear = invoiceDate.getFullYear();
      const period = invoiceDate.getMonth() + 1;

      // Get created_by user
      let createdBy = null;
      try {
        const systemUserResult = await client.query(
          "SELECT id FROM users WHERE (role = 'system' OR role = 'admin') AND active = true ORDER BY id LIMIT 1"
        );
        if (systemUserResult.rows.length > 0) {
          createdBy = systemUserResult.rows[0].id;
        } else {
          const activeUserResult = await client.query(
            'SELECT id FROM users WHERE active = true ORDER BY id LIMIT 1'
          );
          if (activeUserResult.rows.length > 0) {
            createdBy = activeUserResult.rows[0].id;
          }
        }
      } catch (e) {
        console.log('Could not fetch user, using null for created_by');
      }

      // Check if Goods Receipt exists for this Purchase Order
      let goodsReceiptExists = false;
      if (invoiceData.purchaseOrderId) {
        // Check which columns exist in goods_receipts table
        const grColumnsCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'goods_receipts'
          AND column_name IN ('posted', 'status', 'gr_status', 'purchase_order_id', 'purchase_order')
        `);

        const grColumns = grColumnsCheck.rows.map((r: any) => r.column_name);
        const hasPosted = grColumns.includes('posted');
        const hasStatus = grColumns.includes('status');
        const hasGrStatus = grColumns.includes('gr_status');
        const hasPurchaseOrderId = grColumns.includes('purchase_order_id');
        const hasPurchaseOrder = grColumns.includes('purchase_order');

        // Build status condition
        let statusCondition = '1=1';
        if (hasPosted) {
          statusCondition = 'gr.posted = true';
        } else if (hasGrStatus) {
          statusCondition = "gr.gr_status IN ('Posted', 'COMPLETED')";
        } else if (hasStatus) {
          statusCondition = "gr.status IN ('Posted', 'COMPLETED', 'Received')";
        }

        // Build purchase order condition
        let poCondition = '1=0';
        if (hasPurchaseOrderId) {
          poCondition = 'gr.purchase_order_id = $1';
        } else if (hasPurchaseOrder) {
          // Need to get PO order_number first
          const poNumberResult = await client.query(
            'SELECT order_number FROM purchase_orders WHERE id = $1',
            [invoiceData.purchaseOrderId]
          );
          if (poNumberResult.rows.length > 0) {
            poCondition = `gr.purchase_order = '${poNumberResult.rows[0].order_number}'`;
          }
        }

        const goodsReceiptCheck = await client.query(`
          SELECT id FROM goods_receipts gr
          WHERE ${poCondition} AND ${statusCondition}
          LIMIT 1
        `, hasPurchaseOrderId ? [invoiceData.purchaseOrderId] : []);
        goodsReceiptExists = goodsReceiptCheck.rows.length > 0;
      }

      // Also check if goodsReceiptId is provided directly
      if (invoiceData.goodsReceiptId) {
        goodsReceiptExists = true;
      }

      // Create invoice in accounts_payable table
      const invoiceResult = await client.query(`
        INSERT INTO accounts_payable (
          vendor_id, invoice_number, invoice_date, due_date, amount,
          net_amount, tax_amount, discount_amount, currency_id,
          company_code_id, payment_terms, purchase_order_id, status,
          notes, created_by, created_at, updated_at, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Open', $13, $14, NOW(), NOW(), true)
        RETURNING id, invoice_number, invoice_date, due_date, amount, net_amount, tax_amount
      `, [
        invoiceData.vendorId,
        invoiceData.invoiceNumber,
        invoiceData.invoiceDate,
        invoiceData.dueDate,
        totalAmount.toFixed(2),
        totalNetAmount.toFixed(2),
        totalTaxAmount.toFixed(2),
        0, // discount_amount
        currencyId,
        companyCodeId,
        vendor.payment_terms || null,
        invoiceData.purchaseOrderId || null,
        invoiceData.notes || null,
        createdBy
      ]);

      const invoiceId = invoiceResult.rows[0].id;
      console.log('Invoice created successfully with ID:', invoiceId);

      // Create invoice line items using ap_invoice_items table with dynamic column handling
      try {
        const tableCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'ap_invoice_items'
          ORDER BY ordinal_position
        `);

        if (tableCheck.rows.length > 0) {
          const columns = tableCheck.rows.map((r: any) => r.column_name);
          const hasLineItem = columns.includes('line_item');
          const hasUnit = columns.includes('unit');
          const hasNetAmount = columns.includes('net_amount');
          const hasTaxRate = columns.includes('tax_rate');
          const hasTaxAmount = columns.includes('tax_amount');
          const hasMaterialCode = columns.includes('material_code');

          let lineItemNumber = 1;
          for (const item of invoiceData.items) {
            const totalPrice = item.totalPrice;
            const itemNetAmount = item.totalPrice * 0.9; // Assuming 10% tax if not specified
            const itemTaxAmount = item.totalPrice * 0.1;

            // Build columns and values dynamically
            const itemColumns: string[] = ['invoice_id'];
            const itemValues: any[] = [invoiceId];
            let paramIndex = 2;

            if (hasLineItem) {
              itemColumns.push('line_item');
              itemValues.push(lineItemNumber);
              paramIndex++;
            }

            itemColumns.push('material_id');
            itemValues.push(item.materialId || null);
            paramIndex++;

            if (hasMaterialCode) {
              itemColumns.push('material_code');
              itemValues.push(item.materialCode || null);
              paramIndex++;
            }

            itemColumns.push('quantity');
            itemValues.push(item.quantity);
            paramIndex++;

            if (hasUnit) {
              itemColumns.push('unit');
              itemValues.push('EA'); // Default unit
              paramIndex++;
            }

            itemColumns.push('unit_price');
            itemValues.push(item.unitPrice.toFixed(2));
            paramIndex++;

            if (hasNetAmount) {
              itemColumns.push('net_amount');
              itemValues.push(itemNetAmount.toFixed(2));
              paramIndex++;
            }

            if (hasTaxRate) {
              itemColumns.push('tax_rate');
              itemValues.push(10); // Default 10% if not specified
              paramIndex++;
            }

            if (hasTaxAmount) {
              itemColumns.push('tax_amount');
              itemValues.push(itemTaxAmount.toFixed(2));
              paramIndex++;
            }

            itemColumns.push('total_price');
            itemValues.push(totalPrice.toFixed(2));
            paramIndex++;

            itemColumns.push('description');
            itemValues.push(item.description || null);
            paramIndex++;

            itemColumns.push('created_at');

            // Build placeholders
            const placeholders = itemValues.map((_, i) => `$${i + 1}`).join(', ');

            // Insert
            await client.query(`
            INSERT INTO ap_invoice_items (
                ${itemColumns.join(', ')}
              ) VALUES (${placeholders}, NOW())
            `, itemValues);

            lineItemNumber++;
          }
          console.log(`Created ${invoiceData.items.length} invoice line items in ap_invoice_items table`);
        }
      } catch (error: any) {
        console.log('Could not create invoice line items:', error.message);
      }

      // ========== GL POSTING (MANDATORY) ==========
      // Generate accounting document number
      let accountingDocNumber = null;
      try {
        let retryCount = 0;
        const maxRetries = 10;

        while (retryCount < maxRetries) {
          const docCountResult = await client.query(
            'SELECT COUNT(*)::integer as count FROM accounting_documents WHERE document_type = $1',
            ['KR'] // KR = Vendor Invoice (Accounts Payable)
          );
          const docCount = parseInt(docCountResult.rows[0]?.count || 0) + retryCount + 1;
          accountingDocNumber = `AP-${new Date().getFullYear()}-${docCount.toString().padStart(6, '0')}`;

          const existingDocCheck = await client.query(
            'SELECT id FROM accounting_documents WHERE document_number = $1 LIMIT 1',
            [accountingDocNumber]
          );

          if (existingDocCheck.rows.length === 0) {
            break;
          }

          retryCount++;
          if (retryCount >= maxRetries) {
            accountingDocNumber = `AP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
            break;
          }
        }
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to generate accounting document number: ${e.message}`);
      }

      if (!accountingDocNumber) {
        await client.query('ROLLBACK');
        throw new Error('Accounting document number is required for GL posting');
      }

      // Get vendor GL account
      let vendorGlAccount = null;
      let vendorGlAccountNumber = null;
      try {
        const columnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vendors' 
            AND column_name = 'gl_account_id'
          )
        `);

        if (columnCheck.rows[0].exists) {
          const vendorGlResult = await client.query(
            `SELECT gl_account_id FROM vendors WHERE id = $1`,
            [invoiceData.vendorId]
          );
          if (vendorGlResult.rows.length > 0 && vendorGlResult.rows[0].gl_account_id) {
            const glAccountCheck = await client.query(
              `SELECT id, account_type, is_active FROM gl_accounts WHERE id = $1`,
              [vendorGlResult.rows[0].gl_account_id]
            );
            if (glAccountCheck.rows.length > 0 && glAccountCheck.rows[0].is_active) {
              vendorGlAccount = vendorGlResult.rows[0].gl_account_id;
              const accountNumResult = await client.query(
                'SELECT account_number FROM gl_accounts WHERE id = $1',
                [vendorGlAccount]
              );
              if (accountNumResult.rows.length > 0) {
                vendorGlAccountNumber = accountNumResult.rows[0].account_number;
              }
            }
          }
        }
      } catch (e: any) {
        console.log('Could not fetch vendor GL account, using default AP account:', e.message);
      }

      // Get default AP account if vendor doesn't have one
      if (!vendorGlAccount) {
        try {
          const defaultApResult = await client.query(`
            SELECT 
              gl.id, gl.account_number, gl.account_name, gl.account_type, 
              gl.account_group, gl.is_active,
              CASE 
                WHEN gl.account_group ILIKE '%ACCOUNTS_PAYABLE%' THEN 1
                WHEN gl.account_group ILIKE '%PAYABLE%' THEN 2
                WHEN gl.account_number LIKE '2100%' THEN 3
                WHEN gl.account_number LIKE '2110%' THEN 4
                WHEN gl.account_group ILIKE '%VENDOR%' THEN 5
                ELSE 6
              END as account_priority
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
            ORDER BY account_priority, gl.account_number
            LIMIT 1
          `);
          if (defaultApResult.rows.length > 0) {
            vendorGlAccount = defaultApResult.rows[0].id;
            vendorGlAccountNumber = defaultApResult.rows[0].account_number;
          }
        } catch (e: any) {
          await client.query('ROLLBACK');
          throw new Error(`Failed to fetch default AP account: ${e.message}`);
        }
      }

      // Get expense account
      let expenseGlAccount = null;
      let expenseGlAccountNumber = null;
      try {
        const expenseResult = await client.query(`
          SELECT 
            gl.id, gl.account_number, gl.account_name, gl.account_type,
            CASE 
              WHEN gl.account_group ILIKE '%EXPENSE%' THEN 1
              WHEN gl.account_group ILIKE '%COST%' THEN 2
              WHEN gl.account_number LIKE '5%' THEN 3
              WHEN gl.account_number LIKE '6%' THEN 4
              ELSE 5
            END as account_priority
          FROM gl_accounts gl
          WHERE UPPER(TRIM(gl.account_type)) IN ('EXPENSE', 'EXPENSES')
            AND gl.is_active = true
          ORDER BY account_priority, gl.account_number
          LIMIT 1
        `);
        if (expenseResult.rows.length > 0) {
          expenseGlAccount = expenseResult.rows[0].id;
          expenseGlAccountNumber = expenseResult.rows[0].account_number;
        }
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to fetch expense account: ${e.message}`);
      }

      // Validate required GL accounts exist
      if (!vendorGlAccount || !vendorGlAccountNumber) {
        await client.query('ROLLBACK');
        throw new Error('Accounts Payable GL account is required. Please configure AP account in GL accounts.');
      }

      if (!expenseGlAccount || !expenseGlAccountNumber) {
        await client.query('ROLLBACK');
        throw new Error('Expense GL account is required. Please configure expense account in GL accounts.');
      }

      // Create accounting document header
      let accountingDocumentId = null;
      try {
        const companyCodeShort = companyCodeString ? companyCodeString.substring(0, 4) : '1000';
        const createdById = createdBy ? parseInt(createdBy.toString()) : 1;
        const headerText = `Vendor Invoice ${invoiceData.invoiceNumber}`.substring(0, 100);
        const referenceText = (invoiceData.notes || invoiceData.invoiceNumber || '').substring(0, 50);

        const accountingDocResult = await client.query(`
          INSERT INTO accounting_documents (
            document_number, company_code, fiscal_year, document_type, 
            posting_date, document_date, period, reference, header_text, 
            total_amount, currency, source_module, source_document_id, 
            source_document_type, created_by
          ) VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
        `, [
          accountingDocNumber,
          companyCodeShort,
          fiscalYear,
          'KR', // KR = Vendor Invoice (Accounts Payable)
          invoiceData.invoiceDate,
          invoiceData.invoiceDate,
          period,
          referenceText,
          headerText,
          totalAmount.toFixed(2),
          currencyCode,
          'FINANCE',
          invoiceId,
          'AP_INVOICE',
          createdById
        ]);
        accountingDocumentId = accountingDocResult.rows[0].id;
        console.log('Accounting document created successfully with ID:', accountingDocumentId);

        // Prepare items for document splitting
        const expenseGlAccountNum = (expenseGlAccountNumber || '').substring(0, 10);
        const vendorGlAccountNum = (vendorGlAccountNumber || '').substring(0, 10);

        // Collect profit center and cost center from invoice items (if material-based)
        let profitCenterFromMaterial = null;
        let costCenterFromMaterial = null;
        if (invoiceData.items && invoiceData.items.length > 0) {
          // Try to get from first item with material
          for (const item of invoiceData.items) {
            if (item.materialId) {
              try {
                const materialResult = await client.query(
                  'SELECT profit_center, cost_center FROM materials WHERE id = $1 AND (is_active = true OR active = true) LIMIT 1',
                  [item.materialId]
                );
                if (materialResult.rows.length > 0) {
                  if (materialResult.rows[0].profit_center && !profitCenterFromMaterial) {
                    profitCenterFromMaterial = materialResult.rows[0].profit_center;
                  }
                  if (materialResult.rows[0].cost_center && !costCenterFromMaterial) {
                    costCenterFromMaterial = materialResult.rows[0].cost_center;
                  }
                }
              } catch (e) {
                // Ignore errors, continue
              }
            }
          }
        }

        const itemsForSplitting = [
          {
            glAccount: expenseGlAccountNum,
            debitAmount: parseFloat(totalNetAmount.toFixed(2)),
            creditAmount: 0,
            description: `Invoice ${invoiceData.invoiceNumber} - Expense`,
            accountType: 'S',
            profitCenter: profitCenterFromMaterial,
            costCenter: costCenterFromMaterial,
            materialId: invoiceData.items && invoiceData.items.length > 0 ? invoiceData.items[0].materialId : undefined
          },
          {
            glAccount: vendorGlAccountNum,
            debitAmount: 0,
            creditAmount: parseFloat(totalAmount.toFixed(2)),
            description: `Invoice ${invoiceData.invoiceNumber} - Accounts Payable`,
            accountType: 'K',
            partnerId: invoiceData.vendorId,
            profitCenter: profitCenterFromMaterial,
            costCenter: costCenterFromMaterial
          }
        ];

        // Apply document splitting if enabled
        let itemsToInsert = itemsForSplitting;
        let splitResult: any = null;
        try {
          splitResult = await documentSplittingService.splitDocument(
            itemsForSplitting,
            'KR', // Vendor Invoice document type
            companyCodeString,
            undefined // Ledger ID will be determined by service
          );

          if (splitResult.success && splitResult.splitItems.length > 0) {
            itemsToInsert = splitResult.splitItems.map(item => ({
              glAccount: item.glAccount,
              debitAmount: item.debitAmount,
              creditAmount: item.creditAmount,
              description: item.description || '',
              accountType: item.accountType || 'S',
              partnerId: (item as any).partnerId
            }));
            console.log('Document splitting applied:', splitResult.splitItems.length, 'items');
          }
        } catch (splitError: any) {
          console.warn('Document splitting failed, proceeding without splitting:', splitError.message);
          // Continue with original items
        }

        // Insert accounting document items (split or original)
        let lineItemNumber = 1;
        for (const item of itemsToInsert) {
          // Get characteristic values from split result if available
          const splitItem = splitResult?.splitItems?.find((si: any) =>
            si.glAccount === item.glAccount &&
            Math.abs(si.debitAmount - item.debitAmount) < 0.01 &&
            Math.abs(si.creditAmount - item.creditAmount) < 0.01
          );
          const profitCenter = splitItem?.profitCenter || null;
          const businessArea = splitItem?.businessArea || null;
          const segment = splitItem?.segment || null;
          const costCenter = splitItem?.costCenter || null;

          await client.query(`
            INSERT INTO accounting_document_items (
              document_id, line_item, gl_account, account_type, partner_id,
              debit_amount, credit_amount, currency, item_text,
              profit_center, business_area, segment, cost_center
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            accountingDocumentId,
            lineItemNumber,
            item.glAccount,
            item.accountType || 'S',
            (item as any).partnerId || null,
            item.debitAmount.toFixed(2),
            item.creditAmount.toFixed(2),
            currencyCode,
            item.description || null,
            profitCenter,
            businessArea,
            segment,
            costCenter
          ]);

          lineItemNumber++;
        }

        console.log(`All accounting document items created successfully (${itemsToInsert.length} items)`);
      } catch (glError: any) {
        await client.query('ROLLBACK');
        throw new Error(`GL posting failed: ${glError.message}`);
      }

      // Create AP open item
      try {
        const apOpenItemsCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'ap_open_items'
          )
        `);

        if (apOpenItemsCheck.rows[0]?.exists) {
          const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ap_open_items'
            AND column_name IN ('invoice_id', 'document_number', 'invoice_number', 'vendor_id')
          `);

          const hasDocumentNumber = columnCheck.rows.some((r: any) => r.column_name === 'document_number');
          const hasInvoiceNumber = columnCheck.rows.some((r: any) => r.column_name === 'invoice_number');
          const hasVendorId = columnCheck.rows.some((r: any) => r.column_name === 'vendor_id');

          if (hasDocumentNumber && hasVendorId) {
            await client.query(`
              INSERT INTO ap_open_items (
                vendor_id, document_number, invoice_number, document_type,
                posting_date, due_date, original_amount, outstanding_amount,
                currency_id, gl_account_id, status, active, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
            `, [
              invoiceData.vendorId,
              accountingDocNumber,
              invoiceData.invoiceNumber,
              'Invoice',
              invoiceData.invoiceDate,
              invoiceData.dueDate,
              totalAmount.toFixed(2),
              totalAmount.toFixed(2),
              currencyId,
              vendorGlAccount,
              'Open'
            ]);
            console.log('AP open item created successfully');
          }
        }
      } catch (apError: any) {
        console.log('Could not create AP open item:', apError.message);
      }

      // Update PO invoiced quantities (if PO exists)
      if (invoiceData.purchaseOrderId) {
        // Check if purchase_order_items table exists and has invoiced_quantity column
        const poiColumnsCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'purchase_order_items'
          AND column_name IN ('invoiced_quantity', 'updated_at', 'material_id', 'material_code')
        `);

        const poiColumns = poiColumnsCheck.rows.map((r: any) => r.column_name);
        const hasInvoicedQuantity = poiColumns.includes('invoiced_quantity');
        const hasUpdatedAt = poiColumns.includes('updated_at');
        const hasMaterialId = poiColumns.includes('material_id');
        const hasMaterialCode = poiColumns.includes('material_code');

        if (hasInvoicedQuantity) {
          for (const item of invoiceData.items) {
            // Build WHERE condition based on available columns
            let whereCondition = 'purchase_order_id = $2';
            const params: any[] = [item.quantity, invoiceData.purchaseOrderId];
            let paramIndex = 3;

            if (hasMaterialId && item.materialId) {
              whereCondition += ` AND material_id = $${paramIndex}`;
              params.push(item.materialId);
              paramIndex++;
            }
            if (hasMaterialCode && item.materialCode) {
              whereCondition += ` AND material_code = $${paramIndex}`;
              params.push(item.materialCode);
              paramIndex++;
            }

            // Build SET clause
            const setClause = hasUpdatedAt
              ? 'invoiced_quantity = COALESCE(invoiced_quantity, 0) + $1, updated_at = NOW()'
              : 'invoiced_quantity = COALESCE(invoiced_quantity, 0) + $1';

            await client.query(`
            UPDATE purchase_order_items
              SET ${setClause}
              WHERE ${whereCondition}
            `, params);
          }
          console.log('PO invoiced quantities updated');
        } else {
          console.log('purchase_order_items table does not have invoiced_quantity column, skipping update');
        }

        // Check if PO is fully invoiced and close it
        if (hasInvoicedQuantity) {
          const poCompletion = await client.query(`
          SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN COALESCE(invoiced_quantity, 0) >= quantity THEN 1 END) as invoiced_items
          FROM purchase_order_items
            WHERE purchase_order_id = $1 AND (active = true OR active IS NULL)
        `, [invoiceData.purchaseOrderId]);

          if (poCompletion.rows.length > 0 &&
            parseInt(poCompletion.rows[0].total_items) > 0 &&
            parseInt(poCompletion.rows[0].invoiced_items) === parseInt(poCompletion.rows[0].total_items)) {
            // Check if purchase_orders table has updated_at column
            const poColumnsCheck = await client.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'purchase_orders'
              AND column_name = 'updated_at'
            `);
            const hasPoUpdatedAt = poColumnsCheck.rows.length > 0;

            const updateClause = hasPoUpdatedAt
              ? "status = 'CLOSED', updated_at = NOW()"
              : "status = 'CLOSED'";

            await client.query(`
            UPDATE purchase_orders 
              SET ${updateClause}
            WHERE id = $1
          `, [invoiceData.purchaseOrderId]);
            console.log('Purchase Order closed - all items fully invoiced');
          }
        }
      }

      // Update Goods Receipt invoiced status (if Goods Receipt exists)
      if (invoiceData.goodsReceiptId) {
        // Check which status columns exist
        const grStatusColumnsCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'goods_receipts'
          AND column_name IN ('status', 'gr_status', 'updated_at')
        `);

        const grStatusColumns = grStatusColumnsCheck.rows.map((r: any) => r.column_name);
        const hasStatus = grStatusColumns.includes('status');
        const hasGrStatus = grStatusColumns.includes('gr_status');
        const hasUpdatedAt = grStatusColumns.includes('updated_at');

        // Build update statement based on available columns
        const updateFields: string[] = [];
        if (hasStatus) {
          updateFields.push("status = 'INVOICED'");
        } else if (hasGrStatus) {
          updateFields.push("gr_status = 'INVOICED'");
        }
        if (hasUpdatedAt) {
          updateFields.push('updated_at = NOW()');
        }

        if (updateFields.length > 0) {
          await client.query(`
          UPDATE goods_receipts
            SET ${updateFields.join(', ')}
          WHERE id = $1
        `, [invoiceData.goodsReceiptId]);
          console.log('Goods Receipt status updated to INVOICED');
        } else {
          console.log('Goods Receipt table does not have status column, skipping status update');
        }
      }

      // Update stock only if NO Goods Receipt exists
      // If Goods Receipt exists, stock was already updated during Goods Receipt posting
      if (!goodsReceiptExists && invoiceData.purchaseOrderId) {
        // This is a direct invoice (no Goods Receipt), update stock
        for (const item of invoiceData.items) {
          // Get material and plant info from PO
          const materialInfo = await client.query(`
            SELECT 
              poi.material_id,
              poi.plant_id,
              m.code as material_code,
              p.code as plant_code,
              m.base_uom as unit
            FROM purchase_order_items poi
            LEFT JOIN materials m ON poi.material_id = m.id
            LEFT JOIN plants p ON poi.plant_id = p.id
            WHERE poi.purchase_order_id = $1 
              AND (poi.material_id = $2 OR m.code = $3)
            LIMIT 1
          `, [invoiceData.purchaseOrderId, item.materialId, item.materialCode]);

          if (materialInfo.rows.length > 0) {
            const info = materialInfo.rows[0];
            if (info.material_code && info.plant_code) {
              // Increase stock and decrease ordered quantity
              await this.inventoryTrackingService.decreaseOrderedAndIncreaseStock(
                info.material_id,
                info.material_code,
                info.plant_id,
                info.plant_code,
                '0001', // default storage location
                item.quantity,
                item.unitPrice
              );
            }
          }
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        invoiceId,
        validationResult
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating A/P invoice:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Post A/P Invoice (lock it and create journal entries)
   */
  async postAPInvoice(invoiceId: number): Promise<{
    success: boolean;
    errors?: string[];
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if invoice exists and is not already posted
      const invoiceCheck = await client.query(`
        SELECT id, posted, status, amount, vendor_id, grpo_id as goods_receipt_id
        FROM ap_invoices
        WHERE id = $1
      `, [invoiceId]);

      if (invoiceCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, errors: ['Invoice not found'] };
      }

      const invoice = invoiceCheck.rows[0];

      if (invoice.posted) {
        await client.query('ROLLBACK');
        return { success: false, errors: ['Invoice already posted'] };
      }

      // Create journal entry
      // If Goods Receipt exists: Dr. Receiving/Invoicing Clearing Account, Cr. Accounts Payable
      // If no Goods Receipt: Dr. Inventory, Cr. Accounts Payable (if stock was updated) or Dr. Expense, Cr. Accounts Payable

      const settingsResult = await client.query(`
        SELECT setting_value 
        FROM document_settings 
        WHERE setting_key = 'perpetual_inventory_enabled'
      `);
      const perpetualInventoryEnabled = settingsResult.rows[0]?.setting_value !== 'false';

      let accountingDocNumber: string | null = null;

      if (perpetualInventoryEnabled) {
        // CreateInvoiceJournalEntry now returns accounting document number
        accountingDocNumber = await this.createInvoiceJournalEntry(client, invoice);
      }

      // Mark invoice as posted
      await client.query(`
        UPDATE ap_invoices
        SET posted = true, posted_date = NOW(), status = 'posted'
        WHERE id = $1
      `, [invoiceId]);

      // Update vendor balance
      await client.query(`
        UPDATE erp_vendors
        SET balance = COALESCE(balance, 0) + $1,
            updated_at = NOW()
        WHERE id = $2
      `, [invoice.amount, invoice.vendor_id]);

      // Create AP open item after successful GL posting
      try {
        const { apOpenItemsService } = await import('./apOpenItemsService');

        // Get full invoice details
        const invoiceDetails = await client.query(`
          SELECT 
            ai.id,
            ai.invoice_number,
            ai.invoice_date,
            ai.due_date,
            ai.amount,
            ai.vendor_id,
            ai.purchase_order_id,
            v.currency,
            v.payment_terms
          FROM ap_invoices ai
          LEFT JOIN erp_vendors v ON ai.vendor_id = v.id
          WHERE ai.id = $1
        `, [invoiceId]);

        if (invoiceDetails.rows.length > 0) {
          const invoiceData = invoiceDetails.rows[0];

          // Get currency ID
          const currency = invoiceData.currency || 'USD';
          const currencyResult = await client.query(`
            SELECT id FROM currencies 
            WHERE (code = $1 OR currency_code = $1) 
              AND is_active = true 
            LIMIT 1
          `, [currency]);

          if (currencyResult.rows.length === 0) {
            console.warn(`Currency ${currency} not found, skipping AP open item creation`);
          } else {
            const currencyId = parseInt(currencyResult.rows[0].id);

            // Get AP GL account ID
            const apAccountResult = await client.query(`
              SELECT id FROM gl_accounts
              WHERE account_type = 'LIABILITIES'
                AND (account_name ILIKE '%payable%' OR account_name ILIKE '%AP%')
                AND reconciliation_account = true
                AND is_active = true
              ORDER BY account_number
              LIMIT 1
            `);

            if (apAccountResult.rows.length === 0) {
              throw new Error('AP GL account not found. Please configure GL accounts.');
            }

            const glAccountId = parseInt(apAccountResult.rows[0].id);

            // Calculate due date if not set
            let dueDate: Date;
            if (invoiceData.due_date) {
              dueDate = new Date(invoiceData.due_date);
            } else {
              dueDate = new Date(invoiceData.invoice_date || new Date());

              // Add payment terms days
              if (invoiceData.payment_terms) {
                const paymentTermsResult = await client.query(`
                  SELECT number_of_days, payment_days 
                  FROM payment_terms 
                  WHERE code = $1 AND is_active = true LIMIT 1
                `, [invoiceData.payment_terms]);

                if (paymentTermsResult.rows.length > 0) {
                  const days = parseInt(paymentTermsResult.rows[0].number_of_days || paymentTermsResult.rows[0].payment_days || '30');
                  dueDate.setDate(dueDate.getDate() + days);
                } else {
                  // Try to extract days from payment terms code (e.g., "NET30" = 30 days)
                  const daysMatch = String(invoiceData.payment_terms).match(/\d+/);
                  if (daysMatch) {
                    dueDate.setDate(dueDate.getDate() + parseInt(daysMatch[0]));
                  } else {
                    // Get default from system configuration
                    const defaultDaysResult = await client.query(`
                      SELECT config_value FROM system_configuration 
                      WHERE config_key = 'default_payment_terms_days' AND active = true LIMIT 1
                    `);
                    const defaultDays = defaultDaysResult.rows.length > 0
                      ? parseInt(defaultDaysResult.rows[0].config_value || '30')
                      : 30;
                    dueDate.setDate(dueDate.getDate() + defaultDays);
                  }
                }
              } else {
                // Get default payment terms from system configuration
                const defaultDaysResult = await client.query(`
                  SELECT config_value FROM system_configuration 
                  WHERE config_key = 'default_payment_terms_days' AND active = true LIMIT 1
                `);
                const defaultDays = defaultDaysResult.rows.length > 0
                  ? parseInt(defaultDaysResult.rows[0].config_value || '30')
                  : 30;
                dueDate.setDate(dueDate.getDate() + defaultDays);
              }
            }

            // Get initial status from system configuration
            const initialStatusResult = await client.query(`
              SELECT config_value FROM system_configuration 
              WHERE config_key = 'ap_open_item_initial_status' AND active = true LIMIT 1
            `);
            const initialStatus = initialStatusResult.rows.length > 0
              ? String(initialStatusResult.rows[0].config_value)
              : 'Open';

            // Generate document number if not available
            const documentNumber = accountingDocNumber || `AP${invoiceId}-${Date.now()}`;

            // Create AP open item
            await apOpenItemsService.createAPOpenItem({
              vendorId: parseInt(invoiceData.vendor_id),
              documentNumber: documentNumber,
              invoiceNumber: String(invoiceData.invoice_number),
              documentType: 'Invoice',
              postingDate: new Date(invoiceData.invoice_date || new Date()),
              dueDate: dueDate,
              originalAmount: parseFloat(invoiceData.amount),
              outstandingAmount: parseFloat(invoiceData.amount),
              currencyId: currencyId,
              paymentTerms: invoiceData.payment_terms || null,
              status: initialStatus,
              glAccountId: glAccountId,
              purchaseOrderId: invoiceData.purchase_order_id ? parseInt(invoiceData.purchase_order_id) : undefined,
              active: true,
            });

            console.log(`✅ Created AP open item for invoice ${invoiceData.invoice_number}`);
          }
        }
      } catch (apOpenItemError: any) {
        // Log error but don't fail the posting
        console.error('Error creating AP open item:', apOpenItemError);
        console.warn('GL posting succeeded but AP open item creation failed');
      }

      await client.query('COMMIT');

      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error posting A/P invoice:', error);
      return { success: false, errors: [error.message] };
    } finally {
      client.release();
    }
  }

  /**
   * Create GL entries for A/P Invoice (no hardcoded values)
   * Posts to gl_entries table with proper balance validation
   * Returns accounting document number for AP open items creation
   */
  private async createInvoiceJournalEntry(client: any, invoice: any): Promise<string> {
    try {
      // Get vendor details to determine company code and currency
      const vendorResult = await client.query(`
        SELECT v.id, v.company_code_id, v.currency, cc.code as company_code, cc.currency as company_currency
        FROM ap_invoices ai
        LEFT JOIN erp_vendors v ON ai.vendor_id = v.id
        LEFT JOIN company_codes cc ON v.company_code_id = cc.id
        WHERE ai.id = $1
        LIMIT 1
      `, [invoice.id]);

      if (vendorResult.rows.length === 0) {
        throw new Error(`Vendor not found for invoice ${invoice.id}`);
      }

      const vendor = vendorResult.rows[0];
      const companyCode = vendor.company_code || vendor.companyCodeId || null;
      const currency = vendor.currency || vendor.company_currency || 'USD';

      if (!companyCode) {
        throw new Error(`Company code not configured for vendor ${vendor.id}`);
      }

      // Get invoice items to determine GL accounts (if table exists)
      let itemsResult;
      try {
        itemsResult = await client.query(`
          SELECT 
            aii.material_id,
            aii.material_code,
            aii.quantity,
            aii.unit_price,
            aii.total_price,
            m.gl_account,
            m.material_group
          FROM ap_invoice_items aii
          LEFT JOIN materials m ON aii.material_id = m.id
          WHERE aii.invoice_id = $1
        `, [invoice.id]);
      } catch (error) {
        // If ap_invoice_items doesn't exist, use invoice total
        itemsResult = {
          rows: [{
            material_id: null,
            material_code: null,
            quantity: 0,
            unit_price: 0,
            total_price: invoice.amount,
            gl_account: null,
            material_group: null
          }]
        };
      }

      // Get AP Account from database (no hardcoded values)
      const apAccountResult = await client.query(`
        SELECT id, account_number
        FROM gl_accounts
        WHERE account_type = 'LIABILITIES'
          AND (account_name ILIKE '%payable%' OR account_name ILIKE '%AP%')
          AND reconciliation_account = true
          AND is_active = true
        ORDER BY account_number
        LIMIT 1
      `);

      if (apAccountResult.rows.length === 0) {
        throw new Error('No accounts payable GL account found in database. Please configure GL accounts.');
      }

      const apAccount = apAccountResult.rows[0];
      const postingDate = new Date().toISOString().split('T')[0];

      // Generate accounting document number (no hardcoded values)
      const fiscalYear = new Date().getFullYear().toString();
      const docCountResult = await client.query(`
        SELECT COUNT(*)::integer as count 
        FROM accounting_documents
        WHERE company_code = $1
          AND document_type = 'AP_INVOICE'
          AND fiscal_year = $2
      `, [companyCode, parseInt(fiscalYear)]);

      const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
      const accountingDocNumber = `${String(companyCode).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}${fiscalYear.slice(-2)}${docCount.toString().padStart(8, '0')}`;

      // Create accounting document
      const accountingDocResult = await client.query(`
        INSERT INTO accounting_documents (
          document_number,
          document_type,
          company_code,
          fiscal_year,
          document_date,
          posting_date,
          period,
          reference,
          header_text,
          currency,
          total_amount,
          source_module,
          source_document_id,
          source_document_type,
          created_at
        ) VALUES ($1, 'AP_INVOICE', $2, $3, $4, $4, $5, $6, $7, $8, $9, 'PURCHASE', $10, 'AP_INVOICE', NOW())
        RETURNING id, document_number
      `, [
        accountingDocNumber,
        companyCode,
        parseInt(fiscalYear),
        postingDate,
        String(new Date().getMonth() + 1).padStart(2, '0'),
        invoice.invoice_number,
        `AP Invoice posting for ${invoice.invoice_number}`,
        currency,
        invoice.amount,
        invoice.id
      ]);

      const accountingDocId = accountingDocResult.rows[0].id;
      const finalAccountingDocNumber = accountingDocResult.rows[0].document_number;

      // Prepare GL entries array
      const glEntries: Array<{
        gl_account_id: number;
        amount: number;
        debit_credit_indicator: string;
      }> = [];

      let totalDebitAmount = 0;
      let totalCreditAmount = 0;

      // Determine debit accounts based on goods receipt and materials
      if (invoice.goods_receipt_id) {
        // If Goods Receipt exists: Debit Receiving/Invoicing Clearing Account
        const clearingAccountResult = await client.query(`
          SELECT id, account_number
          FROM gl_accounts
          WHERE account_type = 'ASSETS'
            AND (account_name ILIKE '%clearing%' OR account_name ILIKE '%receiving%')
            AND is_active = true
          ORDER BY account_number
          LIMIT 1
        `);

        if (clearingAccountResult.rows.length > 0) {
          glEntries.push({
            gl_account_id: clearingAccountResult.rows[0].id,
            amount: invoice.amount,
            debit_credit_indicator: 'D'
          });
          totalDebitAmount += parseFloat(invoice.amount);
        } else {
          // Fallback to inventory account if clearing account not found
          const inventoryAccountResult = await client.query(`
            SELECT id, account_number
            FROM gl_accounts
            WHERE account_type = 'ASSETS'
              AND (account_name ILIKE '%inventory%' OR account_name ILIKE '%stock%')
              AND is_active = true
            ORDER BY account_number
            LIMIT 1
          `);

          if (inventoryAccountResult.rows.length > 0) {
            glEntries.push({
              gl_account_id: inventoryAccountResult.rows[0].id,
              amount: invoice.amount,
              debit_credit_indicator: 'D'
            });
            totalDebitAmount += parseFloat(invoice.amount);
          } else {
            throw new Error('No inventory or clearing GL account found. Please configure GL accounts.');
          }
        }
      } else {
        // No Goods Receipt - determine debit accounts from invoice items
        for (const item of itemsResult.rows) {
          let debitAccountId: number | null = null;
          const itemAmount = parseFloat(item.total_price || invoice.amount);

          // Try to get GL account from material
          if (item.gl_account) {
            const materialAccountResult = await client.query(`
              SELECT id FROM gl_accounts 
              WHERE account_number = $1 AND is_active = true
              LIMIT 1
            `, [item.gl_account]);

            if (materialAccountResult.rows.length > 0) {
              debitAccountId = materialAccountResult.rows[0].id;
            }
          }

          // If no material account, determine based on material type
          if (!debitAccountId) {
            const accountTypeResult = await client.query(`
              SELECT id, account_number
              FROM gl_accounts
              WHERE account_type = 'ASSETS'
                AND (account_name ILIKE '%inventory%' OR account_name ILIKE '%stock%')
                AND is_active = true
              ORDER BY account_number
              LIMIT 1
            `);

            if (accountTypeResult.rows.length > 0) {
              debitAccountId = accountTypeResult.rows[0].id;
            } else {
              // Final fallback: expense account
              const expenseAccountResult = await client.query(`
                SELECT id, account_number
                FROM gl_accounts
                WHERE account_type = 'EXPENSES'
                  AND is_active = true
                ORDER BY account_number
                LIMIT 1
              `);

              if (expenseAccountResult.rows.length > 0) {
                debitAccountId = expenseAccountResult.rows[0].id;
              }
            }
          }

          if (!debitAccountId) {
            throw new Error('No suitable debit GL account found. Please configure GL accounts.');
          }

          glEntries.push({
            gl_account_id: debitAccountId,
            amount: itemAmount,
            debit_credit_indicator: 'D'
          });
          totalDebitAmount += itemAmount;
        }
      }

      // Credit Accounts Payable
      glEntries.push({
        gl_account_id: apAccount.id,
        amount: invoice.amount,
        debit_credit_indicator: 'C'
      });
      totalCreditAmount += parseFloat(invoice.amount);

      // Validate balance before posting
      const balanceDifference = Math.abs(totalDebitAmount - totalCreditAmount);
      if (balanceDifference > 0.01) {
        throw new Error(`GL entries are not balanced. Debits: ${totalDebitAmount.toFixed(2)}, Credits: ${totalCreditAmount.toFixed(2)}, Difference: ${balanceDifference.toFixed(2)}`);
      }

      // Post GL entries
      for (const entry of glEntries) {
        await client.query(`
          INSERT INTO gl_entries (
            document_number,
            gl_account_id,
            amount,
            debit_credit_indicator,
            posting_date,
            posting_status
          ) VALUES ($1, $2, $3, $4, $5, 'posted')
        `, [
          finalAccountingDocNumber,
          entry.gl_account_id,
          entry.amount,
          entry.debit_credit_indicator,
          postingDate
        ]);
      }

      console.log(`✅ Posted AP Invoice ${invoice.invoice_number} to GL with document ${finalAccountingDocNumber}`);
      console.log(`   Debits: ${totalDebitAmount.toFixed(2)}, Credits: ${totalCreditAmount.toFixed(2)}`);

      // Return accounting document number for AP open item creation
      return finalAccountingDocNumber;

    } catch (error: any) {
      console.error('Error creating AP invoice GL entries:', error);
      throw new Error(`Failed to create AP invoice GL entries: ${error.message}`);
    }
  }
}

