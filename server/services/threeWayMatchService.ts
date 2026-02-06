import { pool } from '../db.js';

/**
 * Three-way match service for invoice verification
 * Compares PO, GR, and Invoice data with tolerance checking
 */

export interface ThreeWayMatchInput {
    purchaseOrderId: number;
    goodsReceiptId?: number;
    invoiceItems: Array<{
        materialId: number;
        quantity: number;
        unitPrice: number;
    }>;
    toleranceGroupId?: number;
}

export interface ThreeWayMatchResult {
    success: boolean;
    toleranceExceeded: boolean;
    varianceReasons: string[];
    matches: Array<{
        materialId: number;
        poQuantity: number;
        grQuantity?: number;
        invoiceQuantity: number;
        poPrice: number;
        grPrice?: number;
        invoicePrice: number;
        priceVariance: number;
        priceVariancePercent: number;
        quantityVariance: number;
        priceToleranceExceeded: boolean;
        quantityToleranceExceeded: boolean;
    }>;
}

/**
 * Perform three-way match between PO, GR, and Invoice
 */
export async function performThreeWayMatch(
    input: ThreeWayMatchInput
): Promise<ThreeWayMatchResult> {
    const client = await pool.connect();

    try {
        // Get tolerance group settings
        const toleranceQuery = input.toleranceGroupId
            ? `SELECT * FROM tolerance_groups WHERE id = $1 AND is_active = true`
            : `SELECT * FROM tolerance_groups WHERE user_type = 'Vendor' AND is_active = true LIMIT 1`;

        const toleranceResult = await client.query(
            toleranceQuery,
            input.toleranceGroupId ? [input.toleranceGroupId] : []
        );

        const tolerance = toleranceResult.rows[0] || {
            percentage_limit: 5, // Default 5% if no tolerance group found
            absolute_amount_limit: 100,
            payment_difference_tolerance: 50
        };

        // Get PO items
        const poItems = await client.query(
            `SELECT 
        poi.id,
        poi.material_id,
        poi.quantity,
        poi.unit_price,
        m.material_code,
        m.description
      FROM purchase_order_items poi
      LEFT JOIN materials m ON poi.material_id = m.id
      WHERE poi.purchase_order_id = $1`,
            [input.purchaseOrderId]
        );

        // Get GR items if GR provided
        let grItems: any[] = [];
        if (input.goodsReceiptId) {
            const grResult = await client.query(
                `SELECT 
          gri.material_id,
          gri.quantity,
          gri.unit_price
        FROM goods_receipt_items gri
        WHERE gri.receipt_id = (
          SELECT id FROM goods_receipts 
          WHERE id = $1 AND purchase_order_id = $2
        )`,
                [input.goodsReceiptId, input.purchaseOrderId]
            );
            grItems = grResult.rows;
        }

        const matches: ThreeWayMatchResult['matches'] = [];
        const varianceReasons: string[] = [];
        let toleranceExceeded = false;

        // Process each invoice item
        for (const invoiceItem of input.invoiceItems) {
            const poItem = poItems.rows.find(po => po.material_id === invoiceItem.materialId);
            const grItem = grItems.find(gr => gr.material_id === invoiceItem.materialId);

            if (!poItem) {
                varianceReasons.push(`Material ${invoiceItem.materialId} not found in PO`);
                continue;
            }

            const poPrice = parseFloat(poItem.unit_price);
            const invoicePrice = invoiceItem.unitPrice;
            const grPrice = grItem ? parseFloat(grItem.unit_price) : poPrice;

            // Calculate price variance
            const priceVariance = invoicePrice - poPrice;
            const priceVariancePercent = (priceVariance / poPrice) * 100;

            // Calculate quantity variance (against GR if available, otherwise PO)
            const compareQuantity = grItem ? parseFloat(grItem.quantity) : parseFloat(poItem.quantity);
            const quantityVariance = invoiceItem.quantity - compareQuantity;

            // Check tolerances
            const percentLimit = parseFloat(tolerance.percentage_limit || '5');
            const absoluteLimit = parseFloat(tolerance.absolute_amount_limit || '100');

            const priceToleranceExceeded =
                Math.abs(priceVariancePercent) > percentLimit ||
                Math.abs(priceVariance) > absoluteLimit;

            const quantityToleranceExceeded = grItem && Math.abs(quantityVariance) > 0;

            if (priceToleranceExceeded) {
                toleranceExceeded = true;
                varianceReasons.push(
                    `Material ${poItem.material_code}: Price variance ${priceVariancePercent.toFixed(2)}% ` +
                    `exceeds tolerance ${percentLimit}% (PO: $${poPrice}, Invoice: $${invoicePrice})`
                );
            }

            if (quantityToleranceExceeded) {
                toleranceExceeded = true;
                varianceReasons.push(
                    `Material ${poItem.material_code}: Quantity variance ${quantityVariance} ` +
                    `(GR: ${compareQuantity}, Invoice: ${invoiceItem.quantity})`
                );
            }

            matches.push({
                materialId: invoiceItem.materialId,
                poQuantity: parseFloat(poItem.quantity),
                grQuantity: grItem ? parseFloat(grItem.quantity) : undefined,
                invoiceQuantity: invoiceItem.quantity,
                poPrice,
                grPrice: grItem ? grPrice : undefined,
                invoicePrice,
                priceVariance,
                priceVariancePercent,
                quantityVariance,
                priceToleranceExceeded,
                quantityToleranceExceeded
            });
        }

        return {
            success: true,
            toleranceExceeded,
            varianceReasons,
            matches
        };

    } catch (error) {
        console.error('Three-way match error:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Create three-way match records in database
 */
export async function createThreeWayMatchRecords(
    invoiceId: number,
    purchaseOrderId: number,
    goodsReceiptId: number | null,
    matchResult: ThreeWayMatchResult
): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const match of matchResult.matches) {
            await client.query(
                `INSERT INTO three_way_matches (
          purchase_order_id, goods_receipt_id, invoice_id, material_id,
          po_quantity, gr_quantity, invoice_quantity,
          po_price, gr_price, invoice_price,
          price_variance, quantity_variance, tolerance_exceeded, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT DO NOTHING`,
                [
                    purchaseOrderId,
                    goodsReceiptId,
                    invoiceId,
                    match.materialId,
                    match.poQuantity,
                    match.grQuantity,
                    match.invoiceQuantity,
                    match.poPrice,
                    match.grPrice,
                    match.invoicePrice,
                    match.priceVariance,
                    match.quantityVariance,
                    match.priceToleranceExceeded || match.quantityToleranceExceeded,
                    matchResult.toleranceExceeded ? 'blocked' : 'approved'
                ]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Block invoice for payment due to tolerance violations
 */
export async function blockInvoice(
    invoiceId: number,
    blockingReasons: string[],
    priceVariance?: number,
    quantityVariance?: number
): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query(
            `UPDATE vendor_invoices 
       SET payment_blocked = true,
           blocking_reason = $2,
           price_variance = $3,
           quantity_variance = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
            [
                invoiceId,
                blockingReasons.join('; '),
                priceVariance || 0,
                quantityVariance || 0
            ]
        );
    } finally {
        client.release();
    }
}

/**
 * Unblock invoice after approval
 */
export async function unblockInvoice(invoiceId: number, approvedBy: number): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query(
            `UPDATE vendor_invoices 
       SET payment_blocked = false,
           blocking_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
            [invoiceId]
        );

        // Update three-way match status
        await client.query(
            `UPDATE three_way_matches 
       SET status = 'approved',
           approved_by = $2,
           approved_at = CURRENT_TIMESTAMP
       WHERE invoice_id = $1`,
            [invoiceId, approvedBy]
        );
    } finally {
        client.release();
    }
}
