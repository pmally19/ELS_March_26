import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

export const router = Router();

// GET all account category references
export async function getAccountCategoryReferences(req: Request, res: Response) {
    try {
        const { is_active } = req.query;

        let query = sql`
      SELECT 
        id,
        code,
        name,
        description,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "createdBy",
        updated_by as "updatedBy"
      FROM account_category_references
    `;

        // Filter by active status if provided
        if (is_active !== undefined) {
            const isActiveValue = is_active === 'true' || is_active === '1';
            query = sql`${query} WHERE is_active = ${isActiveValue}`;
        }

        query = sql`${query} ORDER BY code`;

        const result = await db.execute(query);
        return res.status(200).json(result.rows);
    } catch (error: any) {
        console.error('Error fetching account category references:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// GET single account category reference by ID
export async function getAccountCategoryReferenceById(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const result = await db.execute(sql`
      SELECT 
        id,
        code,
        name,
        description,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "createdBy",
        updated_by as "updatedBy"
      FROM account_category_references
      WHERE id = ${id}
    `);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Account category reference not found'
            });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching account category reference:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// POST create new account category reference
export async function createAccountCategoryReference(req: Request, res: Response) {
    try {
        const { code, name, description, isActive } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Code and name are required'
            });
        }

        // Check if code already exists
        const existing = await db.execute(sql`
      SELECT id FROM account_category_references WHERE code = ${code}
    `);

        if (existing.rows.length > 0) {
            return res.status(409).json({
                error: 'Conflict',
                message: `Account category reference with code '${code}' already exists`
            });
        }

        // Insert new record
        const result = await db.execute(sql`
      INSERT INTO account_category_references (
        code, 
        name, 
        description, 
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        ${code}, 
        ${name}, 
        ${description || null}, 
        ${isActive !== undefined ? isActive : true},
        NOW(),
        NOW()
      )
      RETURNING 
        id,
        code,
        name,
        description,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `);

        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating account category reference:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// PUT update account category reference
export async function updateAccountCategoryReference(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { code, name, description, isActive } = req.body;

        // Validation
        if (!code || !name) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Code and name are required'
            });
        }

        // Check if record exists
        const existing = await db.execute(sql`
      SELECT id FROM account_category_references WHERE id = ${id}
    `);

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Account category reference not found'
            });
        }

        // Check if code is being changed and if new code already exists
        const codeCheck = await db.execute(sql`
      SELECT id FROM account_category_references 
      WHERE code = ${code} AND id != ${id}
    `);

        if (codeCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Conflict',
                message: `Account category reference with code '${code}' already exists`
            });
        }

        // Update record
        const result = await db.execute(sql`
      UPDATE account_category_references
      SET 
        code = ${code},
        name = ${name},
        description = ${description || null},
        is_active = ${isActive !== undefined ? isActive : true},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id,
        code,
        name,
        description,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `);

        return res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating account category reference:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// DELETE account category reference
export async function deleteAccountCategoryReference(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Check if record exists
        const existing = await db.execute(sql`
      SELECT id FROM account_category_references WHERE id = ${id}
    `);

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Account category reference not found'
            });
        }

        // Delete record
        await db.execute(sql`
      DELETE FROM account_category_references WHERE id = ${id}
    `);

        return res.status(200).json({
            message: 'Account category reference deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting account category reference:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// Register routes
router.get('/', getAccountCategoryReferences);
router.get('/:id', getAccountCategoryReferenceById);
router.post('/', createAccountCategoryReference);
router.put('/:id', updateAccountCategoryReference);
router.delete('/:id', deleteAccountCategoryReference);
