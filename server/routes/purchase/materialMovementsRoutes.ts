
import { Router, Request, Response } from "express";
import { pool } from "../../db"; // Assuming standard db export

const router = Router();

// GET /api/purchase/material-movements/:orderId
router.get("/:orderId", async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        console.log(`Fetching material movements for PO ID: ${orderId}`);

        // 1. Get PO details to find order number
        const poResult = await pool.query(
            "SELECT order_number FROM purchase_orders WHERE id = $1",
            [orderId]
        );

        if (poResult.rows.length === 0) {
            return res.status(404).json({ message: "Purchase order not found" });
        }

        const orderNumber = poResult.rows[0].order_number;

        // 2. Find Goods Receipts linked to this PO
        // We get the GRN numbers to look up in stock_movements
        const grResult = await pool.query(
            "SELECT grn_number, receipt_number FROM goods_receipts WHERE purchase_order_id = $1",
            [orderId]
        );

        const grnNumbers = grResult.rows.map(row => row.grn_number).filter(Boolean);
        const receiptNumbers = grResult.rows.map(row => row.receipt_number).filter(Boolean);

        // Combine references to search for
        const references = [orderNumber, ...grnNumbers, ...receiptNumbers];

        if (references.length === 0) {
            return res.json([]);
        }

        // 3. Query Stock Movements
        // We search for movements where reference_document matches PO number OR GRN numbers
        // We also join with materials to get names if possible
        // Note: stock_movements uses material_code, materials table has code

        const placeholders = references.map((_, i) => `$${i + 1}`).join(', ');

        const movementQuery = `
        SELECT
            sm.id,
            sm.document_number as movement_number,
            sm.movement_type,
            sm.posting_date as movement_date,
            sm.material_code,
            m.name as material_name,
            m.description as material_description,
            sm.quantity,
            sm.unit as unit_of_measure,
            sm.storage_location as from_location,
            sm.plant_code as plant_name,
            sm.reference_document
      FROM stock_movements sm
      LEFT JOIN materials m ON sm.material_code = m.code
      WHERE sm.reference_document = ANY($1) 
         OR sm.reference_document ILIKE ANY(SELECT '%' || unnest($1::text[]) || '%')
      ORDER BY sm.posting_date DESC, sm.created_at DESC
    `;

        const movementsResult = await pool.query(movementQuery, [references]);

        // Map to frontend expected format if needed, but the query aliases should handle most
        const movements = movementsResult.rows.map(row => ({
            id: row.id,
            movement_number: row.movement_number || `MOV - ${row.id} `,
            movement_type: mapMovementType(row.movement_type),
            movement_date: row.movement_date,
            material_code: row.material_code,
            material_name: row.material_name,
            material_description: row.material_description,
            quantity: row.quantity,
            unit_of_measure: row.unit_of_measure,
            from_location: row.from_location,
            to_location: 'Stock', // destination
            plant_name: row.plant_name,
            reference_document: row.reference_document
        }));

        res.json(movements);

    } catch (error: any) {
        console.error("Error fetching material movements:", error);
        res.status(500).json({ message: "Failed to fetch material movements", error: error.message });
    }
});

function mapMovementType(type: string): string {
    // Map SAP-style codes or DB values to readable strings
    const map: Record<string, string> = {
        '101': 'Goods Receipt',
        '102': 'GR Reversal',
        '122': 'Return to Vendor',
        'GR': 'Goods Receipt',
        'GI': 'Goods Issue'
    };
    return map[type] || type || 'Movement';
}

export default router;
