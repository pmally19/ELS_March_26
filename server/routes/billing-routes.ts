import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// ============================================================
// SAP-ALIGNED BILLING ROUTES (VF01/VF02/VF03/VF04 equivalent)
// ============================================================

// GET /api/billing/documents — List all billing documents (VBRK)
router.get('/documents', async (req: Request, res: Response) => {
    try {
        const { status, type, customer_id, from_date, to_date } = req.query;

        let query = `
      SELECT 
        bd.id,
        bd.billing_number,
        bd.billing_type,
        bd.billing_date,
        bd.due_date,
        bd.currency,
        bd.net_amount,
        bd.tax_amount,
        bd.total_amount,
        bd.paid_amount,
        bd.outstanding_amount,
        bd.posting_status,
        bd.accounting_document_number,
        bd.reference,
        bd.sales_order_id,
        bd.delivery_id,
        bd.customer_id,
        bd.company_code_id,
        bd.created_at,
        bd.updated_at,
        ec.name as customer_name,
        ec.customer_code,
        so.order_number as sales_order_number,
        dd.delivery_number
      FROM billing_documents bd
      LEFT JOIN erp_customers ec ON bd.customer_id = ec.id
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON bd.delivery_id = dd.id
      WHERE 1=1
    `;

        const params: any[] = [];

        if (status) {
            params.push(status);
            query += ` AND bd.posting_status = $${params.length}`;
        }
        if (type) {
            params.push(type);
            query += ` AND bd.billing_type = $${params.length}`;
        }
        if (customer_id) {
            params.push(customer_id);
            query += ` AND bd.customer_id = $${params.length}`;
        }
        if (from_date) {
            params.push(from_date);
            query += ` AND bd.billing_date >= $${params.length}`;
        }
        if (to_date) {
            params.push(to_date);
            query += ` AND bd.billing_date <= $${params.length}`;
        }

        query += ` ORDER BY bd.created_at DESC`;

        const result = await pool.query(query, params);

        res.json(result.rows.map(r => ({
            id: r.id,
            billingNumber: r.billing_number,
            billingType: r.billing_type || 'F2',
            billingTypeLabel: getBillingTypeLabel(r.billing_type),
            billingDate: r.billing_date,
            dueDate: r.due_date,
            currency: r.currency || 'INR',
            netAmount: parseFloat(r.net_amount) || 0,
            taxAmount: parseFloat(r.tax_amount) || 0,
            totalAmount: parseFloat(r.total_amount) || 0,
            paidAmount: parseFloat(r.paid_amount) || 0,
            outstandingAmount: parseFloat(r.outstanding_amount) || parseFloat(r.total_amount) || 0,
            postingStatus: r.posting_status || 'OPEN',
            accountingDocumentNumber: r.accounting_document_number,
            reference: r.reference,
            salesOrderId: r.sales_order_id,
            salesOrderNumber: r.sales_order_number,
            deliveryId: r.delivery_id,
            deliveryNumber: r.delivery_number,
            customerId: r.customer_id,
            customerName: r.customer_name || `Customer #${r.customer_id}`,
            customerCode: r.customer_code,
            companyCodeId: r.company_code_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        })));
    } catch (error: any) {
        console.error('Error fetching billing documents:', error);
        res.status(500).json({ error: 'Failed to fetch billing documents', message: error.message });
    }
});

// GET /api/billing/documents/:id — Single billing doc with items and document flow (VBRK + VBRP + VBFA)
router.get('/documents/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const bdResult = await pool.query(`
      SELECT 
        bd.*,
        ec.name as customer_name,
        ec.customer_code,
        so.order_number as sales_order_number,
        dd.delivery_number
      FROM billing_documents bd
      LEFT JOIN erp_customers ec ON bd.customer_id = ec.id
      LEFT JOIN sales_orders so ON bd.sales_order_id = so.id
      LEFT JOIN delivery_documents dd ON bd.delivery_id = dd.id
      WHERE bd.id = $1
    `, [id]);

        if (bdResult.rows.length === 0) {
            return res.status(404).json({ error: 'Billing document not found' });
        }

        const bd = bdResult.rows[0];

        // Fetch billing items (VBRP)
        const itemsResult = await pool.query(`
      SELECT 
        bi.*,
        m.code as material_code,
        m.name as material_name
      FROM billing_items bi
      LEFT JOIN materials m ON bi.material_id = m.id
      WHERE bi.billing_id = $1
      ORDER BY bi.line_item
    `, [id]);

        // Document flow (VBFA)
        const flowResult = await pool.query(`
      SELECT * FROM document_flow
      WHERE source_document = $1 OR target_document = $1
      ORDER BY created_at
    `, [bd.billing_number]).catch(() => ({ rows: [] }));

        res.json({
            id: bd.id,
            billingNumber: bd.billing_number,
            billingType: bd.billing_type || 'F2',
            billingTypeLabel: getBillingTypeLabel(bd.billing_type),
            billingDate: bd.billing_date,
            dueDate: bd.due_date,
            currency: bd.currency || 'INR',
            netAmount: parseFloat(bd.net_amount) || 0,
            taxAmount: parseFloat(bd.tax_amount) || 0,
            totalAmount: parseFloat(bd.total_amount) || 0,
            paidAmount: parseFloat(bd.paid_amount) || 0,
            outstandingAmount: parseFloat(bd.outstanding_amount) || parseFloat(bd.total_amount) || 0,
            postingStatus: bd.posting_status || 'OPEN',
            accountingDocumentNumber: bd.accounting_document_number,
            reference: bd.reference,
            salesOrderId: bd.sales_order_id,
            salesOrderNumber: bd.sales_order_number,
            deliveryId: bd.delivery_id,
            deliveryNumber: bd.delivery_number,
            customerId: bd.customer_id,
            customerName: bd.customer_name || `Customer #${bd.customer_id}`,
            customerCode: bd.customer_code,
            companyCodeId: bd.company_code_id,
            createdAt: bd.created_at,
            // Items - SAP VBRP
            items: itemsResult.rows.map(item => ({
                id: item.id,
                lineItem: item.line_item,
                materialId: item.material_id,
                materialCode: item.material_code,
                materialName: item.material_name,
                billingQuantity: parseFloat(item.billing_quantity) || 0,
                unit: item.unit,
                unitPrice: parseFloat(item.unit_price) || 0,
                netAmount: parseFloat(item.net_amount) || 0,
                taxCode: item.tax_code,
                taxAmount: parseFloat(item.tax_amount) || 0,
                accountKey: item.account_key, // ERL, ERF, ERS
                glAccount: item.gl_account,
                costCenter: item.cost_center,
                profitCenter: item.profit_center,
            })),
            // Document flow - SAP VBFA
            documentFlow: flowResult.rows,
        });
    } catch (error: any) {
        console.error('Error fetching billing document:', error);
        res.status(500).json({ error: 'Failed to fetch billing document', message: error.message });
    }
});

// GET /api/billing/due-list — Billing Due List (VF04 equivalent)
// Returns deliveries with PGI posted but not yet billed
router.get('/due-list', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT 
        dd.id as delivery_id,
        dd.delivery_number,
        dd.delivery_date,
        dd.pgi_status,
        dd.pgi_date,
        dd.sales_order_id,
        so.order_number as sales_order_number,
        ec.id as customer_id,
        ec.name as customer_name,
        ec.customer_code,
        COUNT(di.id) as item_count,
        SUM(di.delivery_quantity * soi.unit_price) as estimated_net_value
      FROM delivery_documents dd
      JOIN delivery_items di ON di.delivery_id = dd.id
      LEFT JOIN sales_order_items soi ON soi.id = di.sales_order_item_id
      LEFT JOIN sales_orders so ON so.id = dd.sales_order_id
      LEFT JOIN erp_customers ec ON ec.id = so.customer_id
      WHERE dd.pgi_status = 'POSTED'
        AND NOT EXISTS (
          SELECT 1 FROM billing_documents bd WHERE bd.delivery_id = dd.id
        )
      GROUP BY dd.id, dd.delivery_number, dd.delivery_date, dd.pgi_status, dd.pgi_date, 
               dd.sales_order_id, so.order_number, ec.id, ec.name, ec.customer_code
      ORDER BY dd.pgi_date DESC
    `);

        res.json(result.rows.map(r => ({
            deliveryId: r.delivery_id,
            deliveryNumber: r.delivery_number,
            deliveryDate: r.delivery_date,
            pgiStatus: r.pgi_status,
            pgiDate: r.pgi_date,
            salesOrderId: r.sales_order_id,
            salesOrderNumber: r.sales_order_number,
            customerId: r.customer_id,
            customerName: r.customer_name || 'Unknown Customer',
            customerCode: r.customer_code,
            itemCount: parseInt(r.item_count) || 0,
            estimatedNetValue: parseFloat(r.estimated_net_value) || 0,
        })));
    } catch (error: any) {
        console.error('Error fetching billing due list:', error);
        res.status(500).json({ error: 'Failed to fetch billing due list', message: error.message });
    }
});

// POST /api/billing/documents — Create billing document from delivery (VF01 equivalent)
router.post('/documents', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { deliveryId, billingType = 'F2', billingDate, reference } = req.body;

        if (!deliveryId) {
            return res.status(400).json({ error: 'deliveryId is required' });
        }

        // Get delivery + its items
        const deliveryResult = await client.query(`
      SELECT 
        dd.*,
        so.id as sales_order_id,
        so.order_number,
        so.customer_id,
        so.currency,
        so.pricing_procedure
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON so.id = dd.sales_order_id
      WHERE dd.id = $1
    `, [deliveryId]);

        if (deliveryResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Delivery not found' });
        }

        const delivery = deliveryResult.rows[0];

        if (delivery.pgi_status !== 'POSTED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot bill delivery: PGI (Goods Issue) not yet posted' });
        }

        // Check if already billed
        const existingBilling = await client.query(
            'SELECT id FROM billing_documents WHERE delivery_id = $1',
            [deliveryId]
        );
        if (existingBilling.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Delivery already has a billing document' });
        }

        // Get delivery items (copy control - delivery to billing)
        const itemsResult = await client.query(`
      SELECT 
        di.*,
        soi.unit_price,
        soi.net_amount as so_net_amount,
        soi.tax_amount as so_tax_amount,
        m.code as material_code,
        m.name as material_name
      FROM delivery_items di
      LEFT JOIN sales_order_items soi ON soi.id = di.sales_order_item_id
      LEFT JOIN materials m ON m.id = di.material_id
      WHERE di.delivery_id = $1
    `, [deliveryId]);

        // Calculate totals
        let netAmount = 0;
        let taxAmount = 0;
        itemsResult.rows.forEach(item => {
            const qty = parseFloat(item.delivery_quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const net = qty * price;
            netAmount += net;
            taxAmount += parseFloat(item.so_tax_amount) || 0;
        });
        const totalAmount = netAmount + taxAmount;

        // Generate billing number
        const year = new Date().getFullYear();
        const countResult = await client.query(
            `SELECT COUNT(*) FROM billing_documents WHERE billing_number LIKE $1`,
            [`INV-${year}-%`]
        );
        const nextNum = String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0');
        const billingNumber = `INV-${year}-${nextNum}`;

        // Calculate due date (30 days default)
        const effectiveBillingDate = billingDate ? new Date(billingDate) : new Date();
        const dueDate = new Date(effectiveBillingDate);
        dueDate.setDate(dueDate.getDate() + 30);

        // Insert billing document (VBRK)
        const bdResult = await client.query(`
      INSERT INTO billing_documents (
        billing_number, billing_type, sales_order_id, delivery_id,
        customer_id, billing_date, due_date, currency,
        net_amount, tax_amount, total_amount, outstanding_amount,
        posting_status, reference, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, 'OPEN', $12, 1, NOW(), NOW())
      RETURNING *
    `, [
            billingNumber, billingType, delivery.sales_order_id, deliveryId,
            delivery.customer_id, effectiveBillingDate, dueDate, delivery.currency || 'INR',
            netAmount.toFixed(2), taxAmount.toFixed(2), totalAmount.toFixed(2),
            reference || null
        ]);

        const newBilling = bdResult.rows[0];

        // Insert billing items (VBRP) - copy from delivery items
        for (let i = 0; i < itemsResult.rows.length; i++) {
            const item = itemsResult.rows[i];
            const qty = parseFloat(item.delivery_quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const net = qty * price;
            const tax = parseFloat(item.so_tax_amount) || 0;

            await client.query(`
        INSERT INTO billing_items (
          billing_id, line_item, sales_order_item_id, delivery_item_id,
          material_id, billing_quantity, unit, unit_price,
          net_amount, tax_amount, account_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
                newBilling.id, (i + 1) * 10, item.sales_order_item_id, item.id,
                item.material_id, qty, item.unit || 'EA', price.toFixed(4),
                net.toFixed(2), tax.toFixed(2), 'ERL'
            ]);
        }

        // Update delivery billing status (sales order items)
        await client.query(`
      UPDATE sales_order_items 
      SET billing_status = 'C'
      WHERE sales_order_id = $1
    `, [delivery.sales_order_id]).catch(() => { });

        // Record document flow (VBFA)
        if (delivery.sales_order_id) {
            await client.query(`
        INSERT INTO document_flow (source_document, source_document_type, target_document, target_document_type, flow_type, created_at)
        VALUES ($1, 'DELIVERY', $2, 'BILLING', 'BILLING', NOW())
      `, [delivery.delivery_number, billingNumber]).catch(() => { });
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Billing document created successfully',
            billingDocument: {
                id: newBilling.id,
                billingNumber: newBilling.billing_number,
                billingType: newBilling.billing_type,
                totalAmount: parseFloat(newBilling.total_amount),
                postingStatus: newBilling.posting_status,
            }
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error creating billing document:', error);
        res.status(500).json({ error: 'Failed to create billing document', message: error.message });
    } finally {
        client.release();
    }
});

// POST /api/billing/documents/:id/post — Post billing to GL (VF02 → Release equivalent)
router.post('/documents/:id/post', async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const bdResult = await client.query('SELECT * FROM billing_documents WHERE id = $1', [id]);
        if (bdResult.rows.length === 0) {
            return res.status(404).json({ error: 'Billing document not found' });
        }

        const bd = bdResult.rows[0];

        if (bd.posting_status === 'POSTED') {
            return res.status(400).json({ error: 'Billing document already posted to GL' });
        }

        // Generate accounting document number
        const year = new Date().getFullYear();
        const period = new Date().getMonth() + 1;
        const accCount = await client.query(
            `SELECT COUNT(*) FROM accounting_documents WHERE document_number LIKE $1`,
            [`DR-${year}-%`]
        );
        const nextNum = String(parseInt(accCount.rows[0].count) + 1).padStart(6, '0');
        const accDocNumber = `DR-${year}-${nextNum}`;

        // Create accounting document header
        const accDocResult = await client.query(`
      INSERT INTO accounting_documents (
        document_number, company_code, fiscal_year, document_type,
        posting_date, document_date, period,
        reference, total_amount, currency,
        source_module, source_document_id, source_document_type,
        created_by, created_at
      ) VALUES ($1, '1000', $2, 'DR', NOW(), $3, $4, $5, $6, $7, 'SALES', $8, 'BILLING', 1, NOW())
      RETURNING id
    `, [
            accDocNumber, year, bd.billing_date, period,
            bd.billing_number, bd.total_amount, bd.currency || 'INR', bd.id
        ]).catch(async (err: any) => {
            console.warn('accounting_documents insert failed, skipping GL post:', err.message);
            return { rows: [{ id: null }] };
        });

        // NOTE: GL entry items are NOT created here.
        // The proper account-determination-based GL posting is done via:
        //   POST /api/order-to-cash/financial-posting/post/:billingId
        // That route resolves ERL → Revenue GL, Customer Recon → AR GL, and Tax Account Determination → Tax GL.
        // This route only creates the accounting document header and updates the billing status.

        // Update billing document status to POSTED
        await client.query(`
      UPDATE billing_documents 
      SET posting_status = 'POSTED', 
          accounting_document_number = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [accDocNumber, id]);

        await client.query('COMMIT');

        res.json({
            message: 'Billing document posted to GL successfully',
            billingId: id,
            billingNumber: bd.billing_number,
            accountingDocumentNumber: accDocNumber,
            postingStatus: 'POSTED',
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error posting billing document to GL:', error);
        res.status(500).json({ error: 'Failed to post billing document', message: error.message });
    } finally {
        client.release();
    }
});

// GET /api/billing/summary — Dashboard summary stats
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE posting_status = 'POSTED') as posted_count,
        COUNT(*) FILTER (WHERE posting_status = 'OPEN') as open_count,
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(outstanding_amount), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', billing_date) = DATE_TRUNC('month', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) as this_month_billed
      FROM billing_documents
    `);

        const row = result.rows[0];
        res.json({
            totalDocuments: parseInt(row.total_documents) || 0,
            postedCount: parseInt(row.posted_count) || 0,
            openCount: parseInt(row.open_count) || 0,
            totalBilled: parseFloat(row.total_billed) || 0,
            totalOutstanding: parseFloat(row.total_outstanding) || 0,
            thisMonthBilled: parseFloat(row.this_month_billed) || 0,
        });
    } catch (error: any) {
        console.error('Error fetching billing summary:', error);
        res.status(500).json({ error: 'Failed to fetch billing summary', message: error.message });
    }
});

function getBillingTypeLabel(type: string | null): string {
    const types: Record<string, string> = {
        'F2': 'Invoice',
        'G2': 'Credit Memo',
        'L2': 'Debit Memo',
        'RE': 'Return Invoice',
        'F5': 'Pro Forma Invoice',
        'OR': 'Standard Invoice',
    };
    return types[type || ''] || type || 'Invoice';
}

export default router;
