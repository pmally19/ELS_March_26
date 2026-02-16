import { Router, type Request, type Response } from "express";
import { getPool } from "../../database";

const router = Router();
const pool = getPool();

// GET all valuation grouping codes
router.get("/", async (req: Request, res: Response) => {
    try {
        const { is_active } = req.query;

        let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active as active,
        created_at,
        updated_at
      FROM valuation_grouping_codes
    `;

        const conditions: string[] = [];
        const values: any[] = [];

        if (is_active !== undefined) {
            conditions.push(`is_active = $${values.length + 1}`);
            values.push(is_active === 'true');
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY code ASC`;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error: any) {
        console.error("Error fetching valuation grouping codes:", error);
        res.status(500).json({ error: "Failed to fetch valuation grouping codes" });
    }
});

// GET single valuation grouping code by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
        id,
        code,
        name,
        description,
        is_active as active,
        created_at,
        updated_at
      FROM valuation_grouping_codes 
      WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Valuation grouping code not found" });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error fetching valuation grouping code:", error);
        res.status(500).json({ error: "Failed to fetch valuation grouping code" });
    }
});

// POST create new valuation grouping code
router.post("/", async (req: Request, res: Response) => {
    try {
        const { code, name, description, active = true } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({ error: "Code and name are required" });
        }

        // Check for duplicate code
        const existingCode = await pool.query(
            "SELECT id FROM valuation_grouping_codes WHERE code = $1",
            [code.toUpperCase()]
        );

        if (existingCode.rows.length > 0) {
            return res.status(400).json({ error: "Valuation grouping code already exists" });
        }

        const result = await pool.query(
            `INSERT INTO valuation_grouping_codes (code, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING 
        id,
        code,
        name,
        description,
        is_active as active,
        created_at,
        updated_at`,
            [code.toUpperCase(), name, description || null, active]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error("Error creating valuation grouping code:", error);
        res.status(500).json({ error: "Failed to create valuation grouping code" });
    }
});

// PUT update valuation grouping code
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, name, description, active } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({ error: "Code and name are required" });
        }

        // Check for duplicate code (excluding current record)
        const existingCode = await pool.query(
            "SELECT id FROM valuation_grouping_codes WHERE code = $1 AND id != $2",
            [code.toUpperCase(), id]
        );

        if (existingCode.rows.length > 0) {
            return res.status(400).json({ error: "Valuation grouping code already exists" });
        }

        const result = await pool.query(
            `UPDATE valuation_grouping_codes
       SET code = $1, name = $2, description = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING 
        id,
        code,
        name,
        description,
        is_active as active,
        created_at,
        updated_at`,
            [code.toUpperCase(), name, description || null, active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Valuation grouping code not found" });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error updating valuation grouping code:", error);
        res.status(500).json({ error: "Failed to update valuation grouping code" });
    }
});

// DELETE valuation grouping code
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM valuation_grouping_codes WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Valuation grouping code not found" });
        }

        res.json({ message: "Valuation grouping code deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting valuation grouping code:", error);
        res.status(500).json({ error: "Failed to delete valuation grouping code" });
    }
});

export default router;
