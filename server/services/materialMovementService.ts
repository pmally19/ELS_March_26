import { pool } from '../db';

interface MaterialMovementData {
    movementType: 'Goods Receipt' | 'Goods Issue' | 'Transfer' | 'Return' | 'Adjustment' | 'Scrap' | 'Production Receipt' | 'Production Issue';
    materialId: number;
    materialCode?: string;
    materialName: string;
    quantity: number;
    unitOfMeasure: string;
    fromLocation?: string;
    toLocation?: string;
    plantId: number;
    productionOrderId?: number;
    salesOrderId?: number;
    deliveryOrderId?: number;
    referenceDocument?: string;
    referenceType?: string;
    batchNumber?: string;
    notes?: string;
    userId: number;
}

export class MaterialMovementService {
    /**
     * Create a new material movement (Inventory Transaction)
     * This is the central function for ALL stock updates to ensure consistency.
     */
    async createMovement(data: MaterialMovementData) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Generate Movement Number (e.g., MV-20250101-0001)
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const seqResult = await client.query("SELECT nextval('movement_number_seq')");
            const seq = seqResult.rows[0].nextval;
            const movementNumber = `MV-${dateStr}-${String(seq).padStart(4, '0')}`;

            // 2. Insert Movement Record
            const result = await client.query(`
        INSERT INTO stock_movements (
          movement_number, movement_type, material_id, material_code, material_name,
          quantity, unit_of_measure, from_location, to_location, plant_id,
          production_order_id, sales_order_id, delivery_order_id,
          reference_document, reference_type, batch_number,
          movement_date, posted_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17, $18)
        RETURNING *
      `, [
                movementNumber, data.movementType, data.materialId, data.materialCode, data.materialName,
                data.quantity, data.unitOfMeasure, data.fromLocation, data.toLocation, data.plantId,
                data.productionOrderId, data.salesOrderId, data.deliveryOrderId,
                data.referenceDocument, data.referenceType, data.batchNumber,
                data.userId, data.notes
            ]);

            // 3. Update Material Stock (If creating logic existed, we would update stock tables here)
            // For now, we are tracking the movement history which is critical for audit.
            // Future: Update 'material_stocks' table if/when implemented.

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get movement history with filters
     */
    async getHistory(filters: any) {
        let query = `
      SELECT mm.*, 
             u.username as posted_by_name,
             p.name as plant_name
      FROM stock_movements mm
      LEFT JOIN users u ON mm.posted_by = u.id
      LEFT JOIN plants p ON mm.plant_id = p.id
      WHERE 1=1
    `;
        const params: any[] = [];
        let pIdx = 1;

        if (filters.materialId) {
            query += ` AND mm.material_id = $${pIdx++}`;
            params.push(filters.materialId);
        }
        if (filters.movementType) {
            query += ` AND mm.movement_type = $${pIdx++}`;
            params.push(filters.movementType);
        }
        if (filters.productionOrderId) {
            query += ` AND mm.production_order_id = $${pIdx++}`;
            params.push(filters.productionOrderId);
        }
        if (filters.startDate && filters.endDate) {
            query += ` AND mm.movement_date BETWEEN $${pIdx++} AND $${pIdx++}`;
            params.push(filters.startDate, filters.endDate);
        }

        query += ` ORDER BY mm.movement_date DESC LIMIT 100`;

        const result = await pool.query(query, params);
        return result.rows;
    }
}

export const materialMovementService = new MaterialMovementService();
