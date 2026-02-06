import { Request, Response } from 'express';
import { pool } from '../../db';
import { z } from 'zod';

// Validation schema for shipping point
const shippingPointSchema = z.object({
    code: z.string().min(1, "Code is required").max(20, "Code must be at most 20 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    plantCode: z.string().min(1, "Plant Code is required"),
    factoryCalendar: z.string().optional().nullable(),
});

// GET /api/master-data/shipping-point - Get all shipping points
export async function getShippingPoints(req: Request, res: Response) {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        plant_code as "plantCode",
        factory_calendar as "factoryCalendar",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sd_shipping_points
      ORDER BY code
    `);
        return res.status(200).json(result.rows);
    } catch (error: any) {
        console.error("Error fetching shipping points:", error);
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
}

// GET /api/master-data/shipping-point/:id - Get shipping point by ID
export async function getShippingPointById(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        plant_code as "plantCode",
        factory_calendar as "factoryCalendar",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sd_shipping_points
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Shipping point not found" });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error("Error fetching shipping point:", error);
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
}

// POST /api/master-data/shipping-point - Create a new shipping point
export async function createShippingPoint(req: Request, res: Response) {
    try {
        const validation = shippingPointSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: "Validation error",
                message: validation.error.errors.map(e => e.message).join(", ")
            });
        }

        const data = validation.data;

        // Check if code already exists
        const existingResult = await pool.query(`
      SELECT id FROM sd_shipping_points WHERE code = $1
    `, [data.code]);

        if (existingResult.rows.length > 0) {
            return res.status(409).json({ error: "Conflict", message: "Shipping point code already exists" });
        }

        // Create shipping point
        const result = await pool.query(`
      INSERT INTO sd_shipping_points (code, name, plant_code, factory_calendar, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, code, name, plant_code as "plantCode", factory_calendar as "factoryCalendar", 
                created_at as "createdAt", updated_at as "updatedAt"
    `, [data.code, data.name, data.plantCode, data.factoryCalendar || null]);

        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error("Error creating shipping point:", error);
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
}

// PUT /api/master-data/shipping-point/:id - Update a shipping point
export async function updateShippingPoint(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const validation = shippingPointSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: "Validation error",
                message: validation.error.errors.map(e => e.message).join(", ")
            });
        }

        const data = validation.data;

        // Check if shipping point exists
        const existingResult = await pool.query(`
      SELECT * FROM sd_shipping_points WHERE id = $1
    `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: "Shipping point not found" });
        }

        const existingShippingPoint = existingResult.rows[0];

        // If code is being changed, check it doesn't conflict
        if (data.code !== existingShippingPoint.code) {
            const duplicateResult = await pool.query(`
        SELECT id FROM sd_shipping_points WHERE code = $1 AND id != $2
      `, [data.code, id]);

            if (duplicateResult.rows.length > 0) {
                return res.status(409).json({ error: "Conflict", message: "Shipping point code already exists" });
            }
        }

        // Update shipping point
        const updateResult = await pool.query(`
      UPDATE sd_shipping_points
      SET code = $1, name = $2, plant_code = $3, factory_calendar = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, code, name, plant_code as "plantCode", factory_calendar as "factoryCalendar",
                created_at as "createdAt", updated_at as "updatedAt"
    `, [data.code, data.name, data.plantCode, data.factoryCalendar || null, id]);

        return res.status(200).json(updateResult.rows[0]);
    } catch (error: any) {
        console.error("Error updating shipping point:", error);
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
}

// DELETE /api/master-data/shipping-point/:id - Delete a shipping point
export async function deleteShippingPoint(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        // Check if shipping point exists
        const existingResult = await pool.query(`
      SELECT * FROM sd_shipping_points WHERE id = $1
    `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: "Shipping point not found" });
        }

        // Delete shipping point
        await pool.query(`
      DELETE FROM sd_shipping_points WHERE id = $1
    `, [id]);

        return res.status(200).json({ message: "Shipping point deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting shipping point:", error);
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
}
