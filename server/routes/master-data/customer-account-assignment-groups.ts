import { Request, Response } from "express";
import { pool } from "../../db";

// Get all Customer Account Assignment Groups
export async function getCustomerAccountAssignmentGroups(req: Request, res: Response) {
    try {
        const { active_only, active } = req.query;

        let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM sd_Customer_account_assignment_groups
      WHERE 1=1
    `;
        const params: any[] = [];
        let paramIndex = 1;

        // Filter by active status
        if (active_only === 'true' || active === 'true') {
            query += ` AND is_active = $${paramIndex}`;
            params.push(true);
            paramIndex++;
        } else if (active === 'false') {
            query += ` AND is_active = $${paramIndex}`;
            params.push(false);
            paramIndex++;
        }

        query += " ORDER BY code";

        const result = await pool.query(query, params);

        const transformedRows = result.rows.map(row => ({
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || row.name,
            isActive: row.is_active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        return res.status(200).json(transformedRows);
    } catch (error: any) {
        console.error("Error fetching Customer account assignment groups:", error);
        return res.status(500).json({
            message: "Failed to fetch Customer account assignment groups",
            error: error.message || "Unknown error"
        });
    }
}

// Get Customer Account Assignment Group by ID
export async function getCustomerAccountAssignmentGroupById(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const result = await pool.query("SELECT * FROM sd_Customer_account_assignment_groups WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Customer account assignment group not found" });
        }

        const row = result.rows[0];
        const transformed = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || row.name,
            isActive: row.is_active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };

        return res.status(200).json(transformed);
    } catch (error: any) {
        console.error("Error fetching Customer account assignment group:", error);
        return res.status(500).json({
            message: "Failed to fetch Customer account assignment group",
            error: error.message || "Unknown error"
        });
    }
}

// Create Customer Account Assignment Group
export async function createCustomerAccountAssignmentGroup(req: Request, res: Response) {
    try {
        const { code, name, description, isActive } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: "Code and name are required" });
        }

        const existingCode = await pool.query("SELECT id FROM sd_Customer_account_assignment_groups WHERE code = $1", [code]);
        if (existingCode.rows.length > 0) {
            return res.status(409).json({
                message: `Code "${code}" already exists`,
                details: `A Customer account assignment group with code "${code}" already exists.`
            });
        }

        const result = await pool.query(`
      INSERT INTO sd_Customer_account_assignment_groups (code, name, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, isActive !== false]);

        const row = result.rows[0];
        const transformed = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || row.name,
            isActive: row.is_active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };

        return res.status(201).json(transformed);
    } catch (error: any) {
        console.error("Error creating Customer account assignment group:", error);
        return res.status(500).json({
            message: "Failed to create Customer account assignment group",
            error: error.message || "Unknown error"
        });
    }
}

// Update Customer Account Assignment Group
export async function updateCustomerAccountAssignmentGroup(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const { code, name, description, isActive } = req.body;

        const existing = await pool.query("SELECT * FROM sd_Customer_account_assignment_groups WHERE id = $1", [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Customer account assignment group not found" });
        }

        if (code && code !== existing.rows[0].code) {
            const codeConflict = await pool.query("SELECT id FROM sd_Customer_account_assignment_groups WHERE code = $1 AND id != $2", [code, id]);
            if (codeConflict.rows.length > 0) {
                return res.status(409).json({ message: "Code already exists" });
            }
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (code !== undefined) {
            updates.push(`code = $${paramCount++}`);
            values.push(code);
        }
        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description || null);
        }
        if (isActive !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(isActive);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE sd_Customer_account_assignment_groups 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        const row = result.rows[0];
        const transformed = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || row.name,
            isActive: row.is_active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };

        return res.status(200).json(transformed);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ message: "Code already exists" });
        }
        console.error("Error updating Customer account assignment group:", error);
        return res.status(500).json({
            message: "Failed to update Customer account assignment group",
            error: error.message || "Unknown error"
        });
    }
}

// Delete Customer Account Assignment Group
export async function deleteCustomerAccountAssignmentGroup(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        // TODO: Check references in other tables before deleting if necessary

        const result = await pool.query("DELETE FROM sd_Customer_account_assignment_groups WHERE id = $1 RETURNING id", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Customer account assignment group not found" });
        }

        return res.status(200).json({ message: "Deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting Customer account assignment group:", error);
        return res.status(500).json({
            message: "Failed to delete Customer account assignment group",
            error: error.message || "Unknown error"
        });
    }
}
