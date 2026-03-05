import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../db';

const router = Router();

// Validation schema
const industrySectorSchema = z.object({
    code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    description: z.string().optional(),
    active: z.boolean().default(true),
});

// GET all industry sectors
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT *, "_tenantId", "_deletedAt", created_by as "createdBy", updated_by as "updatedBy" FROM industry_sectors WHERE active = true AND "_deletedAt" IS NULL ORDER BY code ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching industry sectors:', error);
        res.status(500).json({ error: 'Failed to fetch industry sectors' });
    }
});

// GET single industry sector by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT *, "_tenantId", "_deletedAt", created_by as "createdBy", updated_by as "updatedBy" FROM industry_sectors WHERE id = $1 AND active = true AND "_deletedAt" IS NULL',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Industry sector not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching industry sector:', error);
        res.status(500).json({ error: 'Failed to fetch industry sector' });
    }
});

// POST create new industry sector
router.post('/', async (req: Request, res: Response) => {
    try {
        const validatedData = industrySectorSchema.parse(req.body);

        // Convert code to uppercase
        const code = validatedData.code.toUpperCase();

        const userId = (req as any).user?.id || 1;
        const tenantId = (req as any).user?.tenantId || '001';

        const result = await pool.query(
            `INSERT INTO industry_sectors (code, name, description, active, "_tenantId", created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [code, validatedData.name, validatedData.description || '', validatedData.active !== false, tenantId, userId, userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating industry sector:', error);

        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Industry sector code already exists' });
        }

        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }

        res.status(500).json({ error: 'Failed to create industry sector' });
    }
});

// PUT update industry sector
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = industrySectorSchema.parse(req.body);

        // Convert code to uppercase
        const code = validatedData.code.toUpperCase();

        const userId = (req as any).user?.id || 1;

        const result = await pool.query(
            `UPDATE industry_sectors
       SET code = $1, name = $2, description = $3, active = $4, updated_at = CURRENT_TIMESTAMP, updated_by = $5
       WHERE id = $6
       RETURNING *`,
            [code, validatedData.name, validatedData.description || '', validatedData.active !== false, userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Industry sector not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating industry sector:', error);

        if (error.code === '23505') {
            return res.status(400).json({ error: 'Industry sector code already exists' });
        }

        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }

        res.status(500).json({ error: 'Failed to update industry sector' });
    }
});

// DELETE industry sector
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id || 1;

        const result = await pool.query(
            `UPDATE industry_sectors 
             SET active = false, "_deletedAt" = CURRENT_TIMESTAMP, updated_by = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 RETURNING *`,
            [userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Industry sector not found' });
        }

        res.json({ message: 'Industry sector deleted successfully' });
    } catch (error) {
        console.error('Error deleting industry sector:', error);
        res.status(500).json({ error: 'Failed to delete industry sector' });
    }
});

// PUT deactivate industry sector
router.put('/:id/deactivate', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id || 1;

        const result = await pool.query(
            `UPDATE industry_sectors
       SET active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1
       WHERE id = $2
       RETURNING *`,
            [userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Industry sector not found' });
        }

        res.json({
            message: 'Industry sector deactivated successfully',
            sector: result.rows[0]
        });
    } catch (error) {
        console.error('Error deactivating industry sector:', error);
        res.status(500).json({ error: 'Failed to deactivate industry sector' });
    }
});

export default router;
