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
        AND table_name = 'account_keys'
      ) THEN
        CREATE TABLE account_keys (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          account_type VARCHAR(50) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          
          CONSTRAINT chk_account_type CHECK (account_type IN (
            'Revenue', 'Expense', 'Tax', 'Liability', 'Asset', 'Discount'
          ))
        );
        
        CREATE INDEX idx_account_keys_code ON account_keys(code);
        CREATE INDEX idx_account_keys_type ON account_keys(account_type);
        CREATE INDEX idx_account_keys_active ON account_keys(is_active);
      END IF;
    END $$;
  `);
}

// GET valid account types
router.get("/account-types", async (req: Request, res: Response) => {
    try {
        const accountTypes = ['Revenue', 'Expense', 'Tax', 'Liability', 'Asset', 'Discount'];
        return res.json(accountTypes);
    } catch (error: any) {
        console.error("Error fetching account types:", error);
        return res.status(500).json({ message: "Failed to fetch account types", error: error.message });
    }
});

// GET all account keys
router.get("/", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { is_active, account_type } = req.query;

        let query = `
      SELECT 
        id,
        code,
        name,
        description,
        account_type,
        is_active,
        created_at,
        updated_at
      FROM account_keys
    `;

        const params: any[] = [];
        const conditions: string[] = [];

        if (is_active !== undefined) {
            const isActiveValue = typeof is_active === 'string'
                ? (is_active === 'true')
                : Boolean(is_active);
            conditions.push(`is_active = $${params.length + 1}`);
            params.push(isActiveValue);
        }

        if (account_type) {
            conditions.push(`account_type = $${params.length + 1}`);
            params.push(account_type);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY code`;

        const result = await pool.query(query, params);

        return res.json(result.rows);
    } catch (error: any) {
        console.error("Error fetching account keys:", error);
        return res.status(500).json({ message: "Failed to fetch account keys", error: error.message });
    }
});

// GET single account key by ID
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
        account_type,
        is_active,
        created_at,
        updated_at
      FROM account_keys
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Account key not found" });
        }

        return res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error fetching account key:", error);
        return res.status(500).json({ message: "Failed to fetch account key", error: error.message });
    }
});

// POST create new account key
router.post("/", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const {
            code,
            name,
            description,
            account_type,
            is_active
        } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: "Code and name are required" });
        }

        if (!account_type) {
            return res.status(400).json({ message: "Account type is required" });
        }

        const validAccountTypes = ['Revenue', 'Expense', 'Tax', 'Liability', 'Asset', 'Discount'];
        if (!validAccountTypes.includes(account_type)) {
            return res.status(400).json({
                message: `Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`
            });
        }

        if (is_active === undefined || is_active === null) {
            return res.status(400).json({ message: "is_active field is required" });
        }

        // Check if code already exists
        const existing = await pool.query(
            `SELECT id FROM account_keys WHERE code = $1`,
            [code.toUpperCase()]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: "Account key code already exists" });
        }

        const result = await pool.query(`
      INSERT INTO account_keys (
        code, name, description, account_type, is_active,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [
            code.toUpperCase(),
            name,
            description || null,
            account_type,
            is_active
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error("Error creating account key:", error);
        return res.status(500).json({ message: "Failed to create account key", error: error.message });
    }
});

// PUT update account key
router.put("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;
        const {
            code,
            name,
            description,
            account_type,
            is_active
        } = req.body;

        // Check if account key exists
        const existing = await pool.query(
            `SELECT id FROM account_keys WHERE id = $1`,
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Account key not found" });
        }

        // Validate account type if provided
        if (account_type) {
            const validAccountTypes = ['Revenue', 'Expense', 'Tax', 'Liability', 'Asset', 'Discount'];
            if (!validAccountTypes.includes(account_type)) {
                return res.status(400).json({
                    message: `Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`
                });
            }
        }

        // Check if code is being changed and if new code already exists
        if (code) {
            const codeCheck = await pool.query(
                `SELECT id FROM account_keys WHERE code = $1 AND id != $2`,
                [code.toUpperCase(), id]
            );

            if (codeCheck.rows.length > 0) {
                return res.status(409).json({ message: "Account key code already exists" });
            }
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (code !== undefined) {
            updateFields.push(`code = $${paramIndex++}`);
            values.push(code.toUpperCase());
        }
        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (account_type !== undefined) {
            updateFields.push(`account_type = $${paramIndex++}`);
            values.push(account_type);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE account_keys 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        return res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error updating account key:", error);
        return res.status(500).json({ message: "Failed to update account key", error: error.message });
    }
});

// DELETE account key
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;

        // Check if account key is used in pricing procedure steps
        const usageCheck = await pool.query(
            `SELECT COUNT(*) as count FROM pricing_procedure_steps 
       WHERE account_key = (SELECT code FROM account_keys WHERE id = $1)`,
            [id]
        );

        if (parseInt(usageCheck.rows[0].count) > 0) {
            return res.status(400).json({
                message: "Cannot delete account key. It is being used in pricing procedure steps.",
                usage_count: parseInt(usageCheck.rows[0].count)
            });
        }

        const result = await pool.query(
            `DELETE FROM account_keys WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Account key not found" });
        }

        return res.json({ message: "Account key deleted successfully", data: result.rows[0] });
    } catch (error: any) {
        console.error("Error deleting account key:", error);
        return res.status(500).json({ message: "Failed to delete account key", error: error.message });
    }
});

export default router;
