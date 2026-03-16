import { Router, Request, Response } from "express";
import { pool } from "../../db";

const router = Router();

// Get all source lists
router.get("/", async (req: Request, res: Response) => {
    try {
        const query = `
      SELECT 
        sl.id,
        sl.material_id,
        m.code as material_code,
        m.name as material_name,
        sl.plant_id,
        p.code as plant_code,
        p.name as plant_name,
        sl.vendor_id,
        v.code as vendor_code,
        v.name as vendor_name,
        sl.valid_from,
        sl.valid_to,
        sl.is_fixed,
        sl.is_blocked,
        sl.is_active,
        sl.notes
      FROM source_lists sl
      JOIN materials m ON sl.material_id = m.id
      JOIN vendors v ON sl.vendor_id = v.id
      LEFT JOIN plants p ON sl.plant_id = p.id
      WHERE sl.is_active = true
      ORDER BY m.code ASC, sl.valid_from DESC
    `;
        const result = await pool.query(query);

        // Map response to camelCase
        const mapped = result.rows.map(row => ({
            id: row.id,
            materialId: row.material_id,
            materialCode: row.material_code,
            materialName: row.material_name,
            plantId: row.plant_id,
            plantCode: row.plant_code,
            plantName: row.plant_name,
            vendorId: row.vendor_id,
            vendorCode: row.vendor_code,
            vendorName: row.vendor_name,
            validFrom: row.valid_from ? new Date(row.valid_from).toISOString().split('T')[0] : null,
            validTo: row.valid_to ? new Date(row.valid_to).toISOString().split('T')[0] : null,
            isFixed: row.is_fixed,
            isBlocked: row.is_blocked,
            isActive: row.is_active,
            notes: row.notes
        }));

        res.json(mapped);
    } catch (error: any) {
        console.error("Error fetching source lists:", error);
        res.status(500).json({ error: "Failed to fetch source lists", message: error.message });
    }
});

// Create a source list
router.post("/", async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { materialId, plantId, vendorId, validFrom, validTo, isFixed, isBlocked, notes } = req.body;

        if (!materialId || !vendorId || !validFrom || !validTo) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const query = `
      INSERT INTO source_lists 
        (material_id, plant_id, vendor_id, valid_from, valid_to, is_fixed, is_blocked, notes, is_active)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `;

        const values = [
            materialId,
            plantId || null,
            vendorId,
            validFrom,
            validTo,
            isFixed || false,
            isBlocked || false,
            notes || null
        ];

        const result = await client.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error("Error creating source list:", error);
        res.status(500).json({ error: "Failed to create source list", message: error.message });
    } finally {
        client.release();
    }
});

// Update a source list
router.put("/:id", async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { materialId, plantId, vendorId, validFrom, validTo, isFixed, isBlocked, notes, isActive } = req.body;

        const query = `
      UPDATE source_lists
      SET 
        material_id = COALESCE($1, material_id),
        plant_id = $2,
        vendor_id = COALESCE($3, vendor_id),
        valid_from = COALESCE($4, valid_from),
        valid_to = COALESCE($5, valid_to),
        is_fixed = COALESCE($6, is_fixed),
        is_blocked = COALESCE($7, is_blocked),
        notes = $8,
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;

        const values = [
            materialId,
            plantId || null,
            vendorId,
            validFrom,
            validTo,
            isFixed,
            isBlocked,
            notes || null,
            isActive,
            id
        ];

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Source list not found" });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error updating source list:", error);
        res.status(500).json({ error: "Failed to update source list", message: error.message });
    } finally {
        client.release();
    }
});

// Delete a source list
router.delete("/:id", async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        const query = `
      UPDATE source_lists
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Source list not found" });
        }

        res.json({ message: "Source list deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting source list:", error);
        res.status(500).json({ error: "Failed to delete source list", message: error.message });
    } finally {
        client.release();
    }
});

export default router;
