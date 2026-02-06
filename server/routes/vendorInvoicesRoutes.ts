import express from 'express';
import { ensureActivePool } from '../database';

const router = express.Router();

// GET vendor invoices - with optional purchase order filter
router.get('/', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const { purchase_order, vendor_id } = req.query;

        // Check which columns exist in vendor_invoices table/view
        const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vendor_invoices'
      AND column_name IN (
        'id', 'invoice_number', 'invoice_date', 'posting_date', 'vendor_id',
        'purchase_order', 'purchase_order_id', 'invoice_reference', 'payment_reference',
        'net_amount', 'amount', 'tax_amount', 'gross_amount', 'discount_amount',
        'currency', 'currency_id', 'payment_terms', 'due_date', 'payment_method', 'payment_date',
        'invoice_status', 'payment_status', 'status',
        'company_code_id', 'plant_id', 'created_by', 'notes',
        'created_at', 'updated_at', 'active'
      )
    `);

        const availableColumns = columnCheck.rows.map(r => r.column_name);

        // Build SELECT clause with only available columns
        const selectColumns = [
            'vi.id',
            'vi.invoice_number',
            'vi.invoice_date',
            availableColumns.includes('posting_date') ? 'vi.posting_date' : 'NULL as posting_date',
            'vi.vendor_id',
            availableColumns.includes('purchase_order') ? 'vi.purchase_order' : (availableColumns.includes('purchase_order_id') ? 'vi.purchase_order_id as purchase_order' : 'NULL as purchase_order'),
            availableColumns.includes('invoice_reference') ? 'vi.invoice_reference' : (availableColumns.includes('payment_reference') ? 'vi.payment_reference as invoice_reference' : 'NULL as invoice_reference'),
            availableColumns.includes('net_amount') ? 'vi.net_amount' : (availableColumns.includes('amount') ? 'vi.amount as net_amount' : '0 as net_amount'),
            availableColumns.includes('tax_amount') ? 'vi.tax_amount' : '0 as tax_amount',
            availableColumns.includes('gross_amount') ? 'vi.gross_amount' : 'COALESCE(vi.net_amount, vi.amount, 0) + COALESCE(vi.tax_amount, 0) as gross_amount',
            availableColumns.includes('currency') ? 'vi.currency' : (availableColumns.includes('currency_id') ? 'vi.currency_id as currency' : '\'USD\' as currency'),
            availableColumns.includes('payment_terms') ? 'vi.payment_terms' : 'NULL as payment_terms',
            availableColumns.includes('due_date') ? 'vi.due_date' : 'NULL as due_date',
            availableColumns.includes('payment_method') ? 'vi.payment_method' : 'NULL as payment_method',
            // Use 'status' column for both invoice_status and payment_status
            availableColumns.includes('invoice_status') ? 'vi.invoice_status' : (availableColumns.includes('status') ? 'vi.status as invoice_status' : '\'PARKED\' as invoice_status'),
            availableColumns.includes('payment_status') ? 'vi.payment_status' : (availableColumns.includes('status') ? 'vi.status as payment_status' : '\'OPEN\' as payment_status'),
            availableColumns.includes('company_code_id') ? 'vi.company_code_id' : 'NULL as company_code_id',
            availableColumns.includes('created_by') ? 'vi.created_by' : 'NULL as created_by',
            'vi.created_at',
            'vi.updated_at',
            availableColumns.includes('active') ? 'vi.active' : 'true as active',
            'v.code as vendor_code',
            'v.name as vendor_name'
        ];

        // Check which column to use for filtering
        const hasPurchaseOrderColumn = availableColumns.includes('purchase_order');
        const hasPurchaseOrderIdColumn = availableColumns.includes('purchase_order_id');

        console.log('📋 Vendor Invoice Query Debug:', {
            purchase_order_param: purchase_order,
            vendor_id_param: vendor_id,
            has_purchase_order_column: hasPurchaseOrderColumn,
            has_purchase_order_id_column: hasPurchaseOrderIdColumn,
            available_columns: availableColumns
        });

        let query = `
      SELECT ${selectColumns.join(',\n        ')}
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      ${hasPurchaseOrderIdColumn ? 'LEFT JOIN purchase_orders po ON vi.purchase_order_id = po.id' : ''}
      WHERE ${availableColumns.includes('active') ? 'vi.active = true' : '1=1'}
    `;

        const params: any[] = [];
        let paramIndex = 1;

        // Filter by purchase order if provided
        if (purchase_order) {
            if (hasPurchaseOrderColumn) {
                // Direct string column exists
                query += ` AND vi.purchase_order = $${paramIndex}`;
                params.push(purchase_order);
                paramIndex++;
                console.log('✅ Filtering by vi.purchase_order =', purchase_order);
            } else if (hasPurchaseOrderIdColumn) {
                // Integer FK exists, need to join and filter by order_number
                query += ` AND po.order_number = $${paramIndex}`;
                params.push(purchase_order);
                paramIndex++;
                console.log('✅ Filtering by po.order_number =', purchase_order);
            } else {
                console.warn('⚠️ No purchase_order column found - cannot filter!');
            }
        }

        // Filter by vendor_id if provided
        if (vendor_id) {
            query += ` AND vi.vendor_id = $${paramIndex}`;
            params.push(vendor_id);
            paramIndex++;
            console.log('✅ Filtering by vi.vendor_id =', vendor_id);
        }

        query += ` ORDER BY vi.invoice_date DESC, vi.id DESC`;

        console.log('🔍 Final Query:', query);
        console.log('🔍 Query Params:', params);

        const result = await pool.query(query, params);

        console.log(`✅ Vendor invoices fetched: ${result.rows.length} records` +
            (purchase_order ? ` for PO: ${purchase_order}` : ''));

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching vendor invoices:', error);
        res.status(500).json({
            message: 'Failed to fetch vendor invoices',
            error: error.message
        });
    }
});

// GET vendor invoice by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        vi.*,
        v.code as vendor_code,
        v.name as vendor_name,
        v.address as vendor_address,
        v.email as vendor_email,
        cc.code as company_code,
        cc.name as company_name
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      LEFT JOIN company_codes cc ON vi.company_code_id = cc.id
      WHERE vi.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor invoice not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching vendor invoice:', error);
        res.status(500).json({
            message: 'Failed to fetch vendor invoice',
            error: error.message
        });
    }
});

// POST create new vendor invoice
router.post('/', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const {
            vendor_id,
            purchase_order,
            invoice_reference,
            invoice_date,
            posting_date,
            net_amount,
            tax_amount,
            gross_amount,
            currency,
            payment_terms,
            due_date,
            payment_method,
            invoice_status,
            payment_status,
            company_code_id,
            created_by
        } = req.body;

        // Validation
        if (!vendor_id || !net_amount) {
            return res.status(400).json({
                message: 'Vendor ID and net amount are required'
            });
        }

        // Generate invoice number
        const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
        const countResult = await pool.query(
            `SELECT COUNT(*) + 1 as next_number FROM vendor_invoices 
       WHERE invoice_number LIKE $1`,
            [`VI-${yearMonth}%`]
        );
        const invoiceNumber = `VI-${yearMonth}-${String(countResult.rows[0].next_number).padStart(6, '0')}`;

        // Check which column exists for purchase order
        const poColumnCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'vendor_invoices'
            AND column_name IN ('purchase_order', 'purchase_order_id')
        `);
        const poColumn = poColumnCheck.rows.length > 0 ? poColumnCheck.rows[0].column_name : 'purchase_order';

        const result = await pool.query(`
      INSERT INTO vendor_invoices (
        invoice_number, vendor_id, ${poColumn}, invoice_reference,
        invoice_date, posting_date, net_amount, tax_amount, gross_amount,
        currency, payment_terms, due_date, payment_method,
        invoice_status, payment_status, company_code_id, created_by,
        created_at, updated_at, active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        NOW(), NOW(), true
      ) RETURNING *
    `, [
            invoiceNumber, vendor_id, purchase_order, invoice_reference,
            invoice_date || new Date().toISOString().split('T')[0],
            posting_date || new Date().toISOString().split('T')[0],
            net_amount, tax_amount || 0, gross_amount || net_amount,
            currency || 'USD', payment_terms, due_date, payment_method,
            invoice_status || 'PARKED', payment_status || 'OPEN',
            company_code_id || 1, created_by || 'SYSTEM'
        ]);

        console.log(`✅ Vendor invoice created: ${invoiceNumber}`);
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating vendor invoice:', error);
        res.status(500).json({
            message: 'Failed to create vendor invoice',
            error: error.message
        });
    }
});

// PUT update vendor invoice
router.put('/:id', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const { id } = req.params;
        const {
            invoice_reference,
            invoice_date,
            posting_date,
            net_amount,
            tax_amount,
            gross_amount,
            currency,
            payment_terms,
            due_date,
            payment_method,
            invoice_status,
            payment_status
        } = req.body;

        const result = await pool.query(`
      UPDATE vendor_invoices SET
        invoice_reference = COALESCE($1, invoice_reference),
        invoice_date = COALESCE($2, invoice_date),
        posting_date = COALESCE($3, posting_date),
        net_amount = COALESCE($4, net_amount),
        tax_amount = COALESCE($5, tax_amount),
        gross_amount = COALESCE($6, gross_amount),
        currency = COALESCE($7, currency),
        payment_terms = COALESCE($8, payment_terms),
        due_date = COALESCE($9, due_date),
        payment_method = COALESCE($10, payment_method),
        invoice_status = COALESCE($11, invoice_status),
        payment_status = COALESCE($12, payment_status),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
            invoice_reference, invoice_date, posting_date, net_amount,
            tax_amount, gross_amount, currency, payment_terms, due_date,
            payment_method, invoice_status, payment_status, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor invoice not found' });
        }

        console.log(`✅ Vendor invoice updated: ${result.rows[0].invoice_number}`);
        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating vendor invoice:', error);
        res.status(500).json({
            message: 'Failed to update vendor invoice',
            error: error.message
        });
    }
});

// DELETE vendor invoice (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const { id } = req.params;

        const result = await pool.query(`
      UPDATE vendor_invoices SET
        active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING invoice_number
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor invoice not found' });
        }

        console.log(`✅ Vendor invoice deleted: ${result.rows[0].invoice_number}`);
        res.json({
            message: 'Vendor invoice deleted successfully',
            invoice_number: result.rows[0].invoice_number
        });
    } catch (error: any) {
        console.error('Error deleting vendor invoice:', error);
        res.status(500).json({
            message: 'Failed to delete vendor invoice',
            error: error.message
        });
    }
});

export default router;
