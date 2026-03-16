import express, { Request, Response } from "express";
import { getPool } from "../../database";

const router = express.Router();
const pool = getPool();

async function ensureTable() {
    await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'asset_account_profiles'
      ) THEN
        CREATE TABLE asset_account_profiles (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        );
        
        CREATE INDEX idx_asset_account_profiles_code ON asset_account_profiles(code);
        CREATE INDEX idx_asset_account_profiles_active ON asset_account_profiles(is_active);
      END IF;
    END $$;
  `);
}

// GET all asset account profiles
router.get("/", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { is_active } = req.query;

        let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM asset_account_profiles
    `;

        const params: any[] = [];

        if (is_active !== undefined) {
            const isActiveValue = typeof is_active === 'string'
                ? (is_active === 'true')
                : Boolean(is_active);
            query += ` WHERE is_active = $1`;
            params.push(isActiveValue);
        } else {
            query += ` WHERE is_active = true`;
        }

        query += ` ORDER BY code`;

        const result = await pool.query(query, params);

        return res.json(result.rows);
    } catch (error: any) {
        console.error("Error fetching asset account profiles:", error);
        return res.status(500).json({ message: "Failed to fetch asset account profiles", error: error.message });
    }
});

// GET single asset account profile by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM asset_account_profiles
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Asset account profile not found" });
        }

        return res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error fetching asset account profile:", error);
        return res.status(500).json({ message: "Failed to fetch asset account profile", error: error.message });
    }
});

// POST create new asset account profile
router.post("/", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const {
            code,
            name,
            description,
            is_active
        } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: "Code and name are required" });
        }

        if (is_active === undefined || is_active === null) {
            return res.status(400).json({ message: "is_active field is required" });
        }

        // Check if code already exists
        const existing = await pool.query(
            `SELECT id FROM asset_account_profiles WHERE code = $1`,
            [code]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: "Asset account profile code already exists" });
        }

        const result = await pool.query(`
      INSERT INTO asset_account_profiles (
        code, name, description, is_active,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [
            code,
            name,
            description || null,
            is_active
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error("Error creating asset account profile:", error);
        return res.status(500).json({ message: "Failed to create asset account profile", error: error.message });
    }
});

// PUT update asset account profile
router.put("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;
        const {
            code,
            name,
            description,
            is_active
        } = req.body;

        // Check if asset account profile exists
        const existing = await pool.query(
            `SELECT id FROM asset_account_profiles WHERE id = $1`,
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Asset account profile not found" });
        }

        // Check if code is being changed and if new code already exists
        if (code) {
            const codeCheck = await pool.query(
                `SELECT id FROM asset_account_profiles WHERE code = $1 AND id != $2`,
                [code, id]
            );

            if (codeCheck.rows.length > 0) {
                return res.status(409).json({ message: "Asset account profile code already exists" });
            }
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (code !== undefined) {
            updateFields.push(`code = $${paramIndex++}`);
            values.push(code);
        }
        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE asset_account_profiles 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        return res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error updating asset account profile:", error);
        return res.status(500).json({ message: "Failed to update asset account profile", error: error.message });
    }
});

// DELETE asset account profile
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;

        // Check if asset account profile is used by any asset classes
        const assetClassesUsingProfile = await pool.query(
            `SELECT COUNT(*) as count FROM asset_classes WHERE account_determination_key = (SELECT code FROM asset_account_profiles WHERE id = $1)`,
            [id]
        );

        if (parseInt(assetClassesUsingProfile.rows[0].count) > 0) {
            return res.status(400).json({
                message: "Cannot delete asset account profile. It is being used by one or more asset classes.",
                asset_classes_count: parseInt(assetClassesUsingProfile.rows[0].count)
            });
        }

        const result = await pool.query(
            `DELETE FROM asset_account_profiles WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Asset account profile not found" });
        }

        return res.json({ message: "Asset account profile deleted successfully", data: result.rows[0] });
    } catch (error: any) {
        console.error("Error deleting asset account profile:", error);
        return res.status(500).json({ message: "Failed to delete asset account profile", error: error.message });
    }
});

export default router;
