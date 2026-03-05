import { Request, Response } from "express";
import { pool } from "../../db";

// Helper to get user context
const getUserContext = (req: Request) => {
    return {
        userId: (req as any).user?.id || 1,
        tenantId: (req as any).user?.tenantId || '001'
    };
};

// Get all Material Account Assignment Groups
export async function getMaterialAccountAssignmentGroups(req: Request, res: Response) {
    try {
        const { active_only, active } = req.query;
        const { tenantId } = getUserContext(req);

        let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId",
        "_deletedAt"
      FROM sd_material_account_assignment_groups
      WHERE "_deletedAt" IS NULL AND "_tenantId" = $1
    `;
        const params: any[] = [tenantId];
        let paramIndex = 2;

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
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt
        }));

        return res.status(200).json(transformedRows);
    } catch (error: any) {
        console.error("Error fetching material account assignment groups:", error);
        return res.status(500).json({
            message: "Failed to fetch material account assignment groups",
            error: error.message || "Unknown error"
        });
    }
}

// Get Material Account Assignment Group by ID
export async function getMaterialAccountAssignmentGroupById(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        const { tenantId } = getUserContext(req);

        const result = await pool.query("SELECT * FROM sd_material_account_assignment_groups WHERE id = $1 AND \"_deletedAt\" IS NULL AND \"_tenantId\" = $2", [id, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Material account assignment group not found" });
        }

        const row = result.rows[0];
        const transformed = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || row.name,
            isActive: row.is_active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt
        };

        return res.status(200).json(transformed);
    } catch (error: any) {
        console.error("Error fetching material account assignment group:", error);
        return res.status(500).json({
            message: "Failed to fetch material account assignment group",
            error: error.message || "Unknown error"
        });
    }
}

// Create Material Account Assignment Group
export async function createMaterialAccountAssignmentGroup(req: Request, res: Response) {
    try {
        const { code, name, description, isActive } = req.body;
        const { userId, tenantId } = getUserContext(req);

        if (!code || !name) {
            return res.status(400).json({ message: "Code and name are required" });
        }

        const existingCode = await pool.query(`
            SELECT id FROM sd_material_account_assignment_groups 
            WHERE code = $1 AND "_deletedAt" IS NULL AND "_tenantId" = $2
        `, [code, tenantId]);
        
        if (existingCode.rows.length > 0) {
            return res.status(409).json({
                message: `Code "${code}" already exists`,
                details: `A material account assignment group with code "${code}" already exists.`
            });
        }

        const result = await pool.query(`
      INSERT INTO sd_material_account_assignment_groups (
          code, name, description, is_active, 
          created_at, updated_at, created_by, updated_by, "_tenantId"
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7)
      RETURNING *
    `, [code, name, description || null, isActive !== false, userId, userId, tenantId]);

        const row = result.rows[0];
        const transformed = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || row.name,
            isActive: row.is_active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt
        };

        return res.status(201).json(transformed);
    } catch (error: any) {
        console.error("Error creating material account assignment group:", error);
        return res.status(500).json({
            message: "Failed to create material account assignment group",
            error: error.message || "Unknown error"
        });
    }
}

// Update Material Account Assignment Group
export async function updateMaterialAccountAssignmentGroup(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const { code, name, description, isActive } = req.body;
        const { userId, tenantId } = getUserContext(req);

        const existing = await pool.query("SELECT * FROM sd_material_account_assignment_groups WHERE id = $1 AND \"_deletedAt\" IS NULL AND \"_tenantId\" = $2", [id, tenantId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Material account assignment group not found" });
        }

        if (code && code !== existing.rows[0].code) {
            const codeConflict = await pool.query(`
                SELECT id FROM sd_material_account_assignment_groups 
                WHERE code = $1 AND id != $2 AND "_deletedAt" IS NULL AND "_tenantId" = $3
            `, [code, id, tenantId]);
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
        updates.push(`updated_by = $${paramCount++}`);
        values.push(userId);
        
        values.push(id);
        values.push(tenantId);

        const query = `
      UPDATE sd_material_account_assignment_groups 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND "_tenantId" = $${paramCount + 1} AND "_deletedAt" IS NULL
      RETURNING *
    `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Material account assignment group not found" });
        }

        const row = result.rows[0];
        const transformed = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || row.name,
            isActive: row.is_active !== false,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt
        };

        return res.status(200).json(transformed);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ message: "Code already exists" });
        }
        console.error("Error updating material account assignment group:", error);
        return res.status(500).json({
            message: "Failed to update material account assignment group",
            error: error.message || "Unknown error"
        });
    }
}

// Soft Delete Material Account Assignment Group
export async function deleteMaterialAccountAssignmentGroup(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        const { userId, tenantId } = getUserContext(req);

        // Soft delete instead of hard delete
        const result = await pool.query(`
            UPDATE sd_material_account_assignment_groups 
            SET "_deletedAt" = NOW(), updated_by = $1, is_active = false
            WHERE id = $2 AND "_tenantId" = $3 AND "_deletedAt" IS NULL 
            RETURNING id
        `, [userId, id, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Material account assignment group not found" });
        }

        return res.status(200).json({ message: "Deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting material account assignment group:", error);
        return res.status(500).json({
            message: "Failed to delete material account assignment group",
            error: error.message || "Unknown error"
        });
    }
}
