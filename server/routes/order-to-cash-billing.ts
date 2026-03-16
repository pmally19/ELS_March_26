/**
 * Order-to-Cash Billing Integration Routes
 * SAP equivalent: VF01 (Create Billing), VF02 (Change), VF11 (Cancel), VBFA (Document Flow)
 *
 * These routes complete the O2C chain:
 *   Sales Order → Delivery → PGI → BILLING → GL Posting → Payment
 *
 * Mounted at: /api/order-to-cash (alongside main OTC routes)
 */
import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// ────────────────────────────────────────────────────────────────────────────
// GET /order-to-cash/billing/status/:salesOrderId
// Returns full billing status for a sales order — like checking VBFA in SAP
// Shows: SO → Deliveries → Billing Documents → GL chain
// ────────────────────────────────────────────────────────────────────────────
router.get('/billing/status/:salesOrderId', async (req, res) => {
    try {
        const { salesOrderId } = req.params;

        const soResult = await pool.query(
            `SELECT id, order_number, status, total_amount, customer_id, payment_status
       FROM sales_orders WHERE id = $1`,
            [salesOrderId]
        );
        if (soResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sales order not found' });
        }
        const so = soResult.rows[0];

        const deliveries = await pool.query(
            `SELECT id, delivery_number, pgi_status, delivery_date, pgi_date
       FROM delivery_documents WHERE sales_order_id = $1 ORDER BY delivery_date`,
            [salesOrderId]
        );

        const billingDocs = await pool.query(`
      SELECT 
        bd.id, bd.billing_number, bd.billing_type, bd.billing_date,
        bd.posting_status, bd.cancellation_status,
        bd.total_amount, bd.outstanding_amount,
        bd.accounting_document_number, bd.delivery_id
      FROM billing_documents bd
      WHERE bd.sales_order_id = $1
      ORDER BY bd.created_at
    `, [salesOrderId]);

        // Determine overall billing status (SAP VBSTA)
        const totalDeliveries = deliveries.rows.length;
        const billedDeliveries = billingDocs.rows.filter(
            (b: any) => b.delivery_id && b.cancellation_status !== 'C'
        ).length;

        let overallBillingStatus = 'A'; // Not started
        if (billedDeliveries > 0 && billedDeliveries < totalDeliveries) overallBillingStatus = 'B'; // Partial
        if (billedDeliveries >= totalDeliveries && totalDeliveries > 0) overallBillingStatus = 'C'; // Fully billed

        res.json({
            salesOrderId: so.id,
            orderNumber: so.order_number,
            orderStatus: so.status,
            paymentStatus: so.payment_status,
            orderAmount: parseFloat(so.total_amount),
            billingStatus: overallBillingStatus,
            billingStatusText: { A: 'Not Billed', B: 'Partially Billed', C: 'Fully Billed' }[overallBillingStatus],
            totals: {
                billed: billingDocs.rows.reduce((s: number, b: any) => s + parseFloat(b.total_amount || 0), 0),
                outstanding: billingDocs.rows.reduce((s: number, b: any) => s + parseFloat(b.outstanding_amount || b.total_amount || 0), 0),
            },
            deliveries: deliveries.rows.map((d: any) => ({
                deliveryId: d.id,
                deliveryNumber: d.delivery_number,
                pgiStatus: d.pgi_status,
                pgiDate: d.pgi_date,
                deliveryDate: d.delivery_date,
                billed: billingDocs.rows.some((b: any) => b.delivery_id === d.id && b.cancellation_status !== 'C'),
                canBill: d.pgi_status === 'POSTED' && !billingDocs.rows.some((b: any) => b.delivery_id === d.id && b.cancellation_status !== 'C'),
            })),
            billingDocuments: billingDocs.rows.map((b: any) => ({
                id: b.id,
                billingNumber: b.billing_number,
                billingType: b.billing_type,
                billingDate: b.billing_date,
                postingStatus: b.posting_status,
                cancellationStatus: b.cancellation_status,
                totalAmount: parseFloat(b.total_amount),
                outstandingAmount: parseFloat(b.outstanding_amount || b.total_amount),
                accountingDocumentNumber: b.accounting_document_number,
            })),
        });
    } catch (error: any) {
        console.error('Error fetching billing status for SO:', error);
        res.status(500).json({ error: 'Failed to fetch billing status', message: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /order-to-cash/billing/create-from-delivery
// Create billing from a PGI-posted delivery (VF01 in O2C)
// Copy control: Delivery → Billing (quantities + prices from SO items)
// ────────────────────────────────────────────────────────────────────────────
router.post('/billing/create-from-delivery', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { deliveryId, billingType = 'F2', billingDate, headerText, paymentTerms } = req.body;

        if (!deliveryId) {
            return res.status(400).json({ error: 'deliveryId is required (O2C billing create)' });
        }

        // Fetch delivery with SO + customer + company
        const deliveryResult = await client.query(`
      SELECT 
        dd.id, dd.delivery_number, dd.pgi_status, dd.sales_order_id,
        so.order_number, so.customer_id, so.currency,
        ec.name as customer_name, ec.customer_code,
        cc.code as company_code_val
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON so.id = dd.sales_order_id
      LEFT JOIN erp_customers ec ON ec.id = so.customer_id
      LEFT JOIN global_company_codes cc ON cc.id = so.company_code_id
      WHERE dd.id = $1
    `, [deliveryId]);

        if (deliveryResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Delivery not found' });
        }

        const delivery = deliveryResult.rows[0];

        if (delivery.pgi_status !== 'POSTED') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'PGI (Post Goods Issue) not yet posted for this delivery',
                deliveryNumber: delivery.delivery_number,
                pgiStatus: delivery.pgi_status,
            });
        }

        // Check already billed (non-cancelled)
        const existBilling = await client.query(
            `SELECT id, billing_number FROM billing_documents 
       WHERE delivery_id = $1 AND COALESCE(cancellation_status, '') != 'C'`,
            [deliveryId]
        );
        if (existBilling.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Delivery already has an active billing document',
                existingBillingNumber: existBilling.rows[0].billing_number,
            });
        }

        // Fetch delivery items with SO prices (copy control)
        const itemsResult = await client.query(`
      SELECT 
        di.id, di.line_item, di.material_id, di.delivery_quantity, di.unit,
        di.sales_order_item_id,
        soi.unit_price, soi.tax_amount as so_item_tax,
        m.code as mat_code, m.description as mat_name
      FROM delivery_items di
      LEFT JOIN sales_order_items soi ON soi.id = di.sales_order_item_id
      LEFT JOIN materials m ON m.id = di.material_id
      WHERE di.delivery_id = $1
      ORDER BY di.line_item
    `, [deliveryId]);

        if (itemsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Delivery has no line items' });
        }

        // Calculate billing amounts using delivery quantities × SO prices
        let netAmount = 0;
        let taxAmount = 0;
        itemsResult.rows.forEach((item: any) => {
            const qty = parseFloat(item.delivery_quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            netAmount += qty * price;
            taxAmount += parseFloat(item.so_item_tax) || 0;
        });
        const totalAmount = netAmount + taxAmount;

        // Generate billing number (INV-YYYY-NNNNNN)
        const year = new Date().getFullYear();
        const cntRes = await client.query(
            `SELECT COUNT(*) FROM billing_documents WHERE billing_number LIKE $1`,
            [`INV-${year}-%`]
        );
        const nextNum = String(parseInt(cntRes.rows[0].count) + 1).padStart(6, '0');
        const billNum = `INV-${year}-${nextNum}`;

        const effectiveDate = billingDate ? new Date(billingDate) : new Date();
        const dueDate = new Date(effectiveDate);
        dueDate.setDate(dueDate.getDate() + 30);

        // Insert billing document header (SAP: VBRK)
        const bdRec = await client.query(`
      INSERT INTO billing_documents (
        billing_number, billing_type,
        sales_order_id, delivery_id, customer_id,
        billing_date, posting_date, due_date, currency,
        net_amount, tax_amount, total_amount, outstanding_amount,
        posting_status, cancellation_status,
        payment_terms, header_text, company_code,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $6, $7, $8,
        $9, $10, $11, $11,
        'OPEN', '',
        $12, $13, $14,
        1, NOW(), NOW()
      ) RETURNING *
    `, [
            billNum, billingType,
            delivery.sales_order_id, deliveryId, delivery.customer_id,
            effectiveDate, dueDate, delivery.currency || 'INR',
            netAmount.toFixed(2), taxAmount.toFixed(2), totalAmount.toFixed(2),
            paymentTerms || 'NT30', headerText || null,
            delivery.company_code_val || null,
        ]);
        const newBilling = bdRec.rows[0];

        // Insert billing items (SAP: VBRP)
        for (let i = 0; i < itemsResult.rows.length; i++) {
            const item = itemsResult.rows[i];
            const qty = parseFloat(item.delivery_quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const net = qty * price;
            const tax = parseFloat(item.so_item_tax) || 0;
            await client.query(`
        INSERT INTO billing_items (
          billing_id, line_item, item_category,
          sales_order_item_id, delivery_item_id,
          material_id, material_code, material_description,
          billing_quantity, unit, unit_price,
          net_amount, gross_amount, tax_amount,
          account_key, created_at
        ) VALUES ($1,$2,$3, $4,$5, $6,$7,$8, $9,$10,$11, $12,$13,$14, $15, NOW())
      `, [
                newBilling.id, (i + 1) * 10, 'TAN',
                item.sales_order_item_id, item.id,
                item.material_id, item.mat_code || null, item.mat_name || null,
                qty, item.unit || 'EA', price.toFixed(4),
                net.toFixed(2), (net + tax).toFixed(2), tax.toFixed(2),
                'ERL',
            ]);
        }

        // Mark SO items as billed (billing_status = 'C')
        await client.query(
            `UPDATE sales_order_items SET billing_status = 'C' WHERE sales_order_id = $1`,
            [delivery.sales_order_id]
        ).catch(() => { });

        // Document Flow: Delivery → Billing (VBFA)
        await client.query(`
      INSERT INTO document_flow (source_document, source_document_type, target_document, target_document_type, flow_type, created_at)
      VALUES ($1,'DELIVERY', $2,'BILLING', 'BILLING_FROM_DELIVERY', NOW())
    `, [delivery.delivery_number, billNum]).catch(() => { });

        // Document Flow: SO → Billing
        if (delivery.order_number) {
            await client.query(`
        INSERT INTO document_flow (source_document, source_document_type, target_document, target_document_type, flow_type, created_at)
        VALUES ($1,'SALES_ORDER', $2,'BILLING', 'SO_TO_BILLING', NOW())
      `, [delivery.order_number, billNum]).catch(() => { });
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Billing document created from delivery (O2C VF01)',
            billingDocument: {
                id: newBilling.id,
                billingNumber: newBilling.billing_number,
                billingType: newBilling.billing_type,
                netAmount: parseFloat(newBilling.net_amount),
                taxAmount: parseFloat(newBilling.tax_amount),
                totalAmount: parseFloat(newBilling.total_amount),
                postingStatus: newBilling.posting_status,
                reference: {
                    salesOrderId: delivery.sales_order_id,
                    orderNumber: delivery.order_number,
                    deliveryId,
                    deliveryNumber: delivery.delivery_number,
                    customerName: delivery.customer_name,
                },
            },
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('O2C billing create error:', error);
        res.status(500).json({ error: 'Failed to create billing document in O2C flow', message: error.message });
    } finally {
        client.release();
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /order-to-cash/billing/cancel/:billingId
// Cancel a billing document (VF11 equivalent) — creates G2 Credit Memo + reverses billing status
// ────────────────────────────────────────────────────────────────────────────
router.post('/billing/cancel/:billingId', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { billingId } = req.params;
        const { cancellationReason } = req.body;

        const bdResult = await client.query(
            `SELECT bd.*, ec.name as customer_name
       FROM billing_documents bd
       LEFT JOIN erp_customers ec ON bd.customer_id = ec.id
       WHERE bd.id = $1`,
            [billingId]
        );

        if (bdResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Billing document not found' });
        }
        const bd = bdResult.rows[0];

        if (bd.cancellation_status === 'C') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Billing document is already cancelled' });
        }

        // Credit memo number (CRD-YYYY-NNNNNN)
        const year = new Date().getFullYear();
        const cntRes = await client.query(
            `SELECT COUNT(*) FROM billing_documents WHERE billing_number LIKE $1`,
            [`CRD-${year}-%`]
        );
        const nextNum = String(parseInt(cntRes.rows[0].count) + 1).padStart(6, '0');
        const crdNum = `CRD-${year}-${nextNum}`;

        // Create G2 Credit Memo (negative of original amounts)
        await client.query(`
      INSERT INTO billing_documents (
        billing_number, billing_type,
        sales_order_id, delivery_id, customer_id,
        billing_date, posting_date, due_date, currency,
        net_amount, tax_amount, total_amount, outstanding_amount,
        posting_status, cancellation_status,
        header_text, reference,
        created_by, created_at, updated_at
      ) VALUES (
        $1,'G2', $2,$3,$4,
        CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, $5,
        $6, $7, $8, 0,
        'OPEN','',
        $9, $10,
        1, NOW(), NOW()
      )
    `, [
            crdNum, bd.sales_order_id, bd.delivery_id, bd.customer_id,
            bd.currency,
            (-parseFloat(bd.net_amount)).toFixed(2),
            (-parseFloat(bd.tax_amount || 0)).toFixed(2),
            (-parseFloat(bd.total_amount)).toFixed(2),
            `VF11 Cancellation of ${bd.billing_number}: ${cancellationReason || 'Cancelled'}`,
            bd.billing_number,
        ]);

        // Mark original as cancelled
        await client.query(`
      UPDATE billing_documents
      SET cancellation_status = 'C',
          cancelled_by = 1,
          cancellation_date = CURRENT_DATE,
          cancellation_reason = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [cancellationReason || 'Cancelled (VF11)', billingId]);

        // Reset SO item billing status to open (can re-bill)
        if (bd.sales_order_id) {
            await client.query(
                `UPDATE sales_order_items SET billing_status = 'A' WHERE sales_order_id = $1`,
                [bd.sales_order_id]
            ).catch(() => { });
        }

        // Document flow: Billing → Cancellation (VBFA)
        await client.query(`
      INSERT INTO document_flow (source_document, source_document_type, target_document, target_document_type, flow_type, created_at)
      VALUES ($1,'BILLING', $2,'BILLING_CANCEL', 'VF11_CANCEL', NOW())
    `, [bd.billing_number, crdNum]).catch(() => { });

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Billing document cancelled (VF11). Credit memo created.',
            originalBillingNumber: bd.billing_number,
            creditMemoNumber: crdNum,
            billingType: 'G2',
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('O2C billing cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel billing document', message: error.message });
    } finally {
        client.release();
    }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /order-to-cash/billing/document-flow/:billingNumber
// Full VBFA document chain: SO → Delivery → Billing → GL
// ────────────────────────────────────────────────────────────────────────────
router.get('/billing/document-flow/:billingNumber', async (req, res) => {
    try {
        const { billingNumber } = req.params;

        const bdResult = await pool.query(`
      SELECT bd.*, ec.name as customer_name
      FROM billing_documents bd
      LEFT JOIN erp_customers ec ON bd.customer_id = ec.id
      WHERE bd.billing_number = $1
    `, [billingNumber]);

        if (bdResult.rows.length === 0) {
            return res.status(404).json({ error: 'Billing document not found' });
        }
        const bd = bdResult.rows[0];

        // Build document chain
        const chain: any[] = [];

        if (bd.sales_order_id) {
            const soRes = await pool.query(
                'SELECT id, order_number, status, total_amount FROM sales_orders WHERE id = $1',
                [bd.sales_order_id]
            ).catch(() => ({ rows: [] }));
            if (soRes.rows.length > 0) {
                const so = soRes.rows[0];
                chain.push({ step: 1, type: 'SALES_ORDER', document: so.order_number, status: so.status, amount: so.total_amount, icon: 'SO' });
            }
        }

        if (bd.delivery_id) {
            const delRes = await pool.query(
                'SELECT id, delivery_number, pgi_status, pgi_date FROM delivery_documents WHERE id = $1',
                [bd.delivery_id]
            ).catch(() => ({ rows: [] }));
            if (delRes.rows.length > 0) {
                const del = delRes.rows[0];
                chain.push({ step: 2, type: 'DELIVERY', document: del.delivery_number, status: del.pgi_status, pgiDate: del.pgi_date, icon: 'DEL' });
            }
        }

        chain.push({
            step: 3, type: 'BILLING',
            document: bd.billing_number, billingType: bd.billing_type,
            status: bd.posting_status, amount: bd.total_amount, icon: 'BILL',
            cancelled: bd.cancellation_status === 'C',
        });

        if (bd.accounting_document_number) {
            chain.push({ step: 4, type: 'ACCOUNTING', document: bd.accounting_document_number, status: 'POSTED', icon: 'GL' });
        }

        // VBFA flow records
        const flowRecords = await pool.query(
            `SELECT * FROM document_flow WHERE source_document = $1 OR target_document = $1 ORDER BY created_at`,
            [billingNumber]
        ).catch(() => ({ rows: [] }));

        res.json({
            billingNumber: bd.billing_number,
            billingType: bd.billing_type,
            customerName: bd.customer_name,
            totalAmount: bd.total_amount,
            chain,
            vbfaFlow: flowRecords.rows,
        });
    } catch (error: any) {
        console.error('Error fetching billing doc flow:', error);
        res.status(500).json({ error: 'Failed to fetch document flow', message: error.message });
    }
});

export default router;
