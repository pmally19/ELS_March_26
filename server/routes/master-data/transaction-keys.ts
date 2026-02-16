import { Router } from 'express';
import { db, pool } from '../../db';
import { transactionKeys } from '@shared/transaction-keys-schema';
import { insertTransactionKeySchema, updateTransactionKeySchema } from '@shared/transaction-keys-schema';
import { eq, ilike, or, and, desc } from 'drizzle-orm';

const router = Router();

// GET all transaction keys with search and filter
router.get('/', async (req, res) => {
    try {
        const {
            search,
            is_active,
            business_context,
            limit = '100',
            offset = '0'
        } = req.query;

        let query = db.select().from(transactionKeys);
        const conditions = [];

        // Search filter
        if (search && typeof search === 'string') {
            conditions.push(
                or(
                    ilike(transactionKeys.code, `%${search}%`),
                    ilike(transactionKeys.name, `%${search}%`),
                    ilike(transactionKeys.description, `%${search}%`)
                )
            );
        }

        // Active status filter
        if (is_active !== undefined) {
            conditions.push(eq(transactionKeys.isActive, is_active === 'true'));
        }

        // Business context filter
        if (business_context && typeof business_context === 'string') {
            conditions.push(ilike(transactionKeys.businessContext, `%${business_context}%`));
        }

        // Apply filters
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // Pagination and sorting
        const results = await query
            .orderBy(desc(transactionKeys.createdAt))
            .limit(parseInt(limit as string, 10))
            .offset(parseInt(offset as string, 10));

        // Get total count
        const countQuery = db.select({ count: transactionKeys.id }).from(transactionKeys);
        const countWithFilters = conditions.length > 0
            ? countQuery.where(and(...conditions))
            : countQuery;

        const countResults = await countWithFilters;
        const total = countResults.length;

        res.json({
            data: results,
            total,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10)
        });
    } catch (error: any) {
        console.error('Error fetching transaction keys:', error);
        res.status(500).json({ error: 'Failed to fetch transaction keys', details: error.message });
    }
});

// GET single transaction key by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db
            .select()
            .from(transactionKeys)
            .where(eq(transactionKeys.id, parseInt(id, 10)))
            .limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Posting key not found' });
        }

        res.json(result[0]);
    } catch (error: any) {
        console.error('Error fetching transaction key:', error);
        res.status(500).json({ error: 'Failed to fetch posting key', details: error.message });
    }
});

// POST create new transaction key
router.post('/', async (req, res) => {
    try {
        // Validate request body
        const validatedData = insertTransactionKeySchema.parse(req.body);

        // Check if code already exists
        const existing = await db
            .select()
            .from(transactionKeys)
            .where(eq(transactionKeys.code, validatedData.code))
            .limit(1);

        if (existing.length > 0) {
            return res.status(400).json({
                error: 'Posting key code already exists',
                details: `Code "${validatedData.code}" is already in use`
            });
        }

        // Insert new record
        const result = await db
            .insert(transactionKeys)
            .values({
                ...validatedData,
                createdBy: (req as any).user?.id || null,
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning();

        res.status(201).json(result[0]);
    } catch (error: any) {
        console.error('Error creating transaction key:', error);

        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }

        res.status(500).json({ error: 'Failed to create posting key', details: error.message });
    }
});

// PUT update transaction key
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate request body
        const validatedData = updateTransactionKeySchema.parse(req.body);

        // Check if record exists
        const existing = await db
            .select()
            .from(transactionKeys)
            .where(eq(transactionKeys.id, parseInt(id, 10)))
            .limit(1);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Posting key not found' });
        }

        // If updating code, check uniqueness
        if (validatedData.code && validatedData.code !== existing[0].code) {
            const codeExists = await db
                .select()
                .from(transactionKeys)
                .where(eq(transactionKeys.code, validatedData.code))
                .limit(1);

            if (codeExists.length > 0) {
                return res.status(400).json({
                    error: 'Posting key code already exists',
                    details: `Code "${validatedData.code}" is already in use`
                });
            }
        }

        // Update record
        const result = await db
            .update(transactionKeys)
            .set({
                ...validatedData,
                updatedAt: new Date()
            })
            .where(eq(transactionKeys.id, parseInt(id, 10)))
            .returning();

        res.json(result[0]);
    } catch (error: any) {
        console.error('Error updating transaction key:', error);

        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }

        res.status(500).json({ error: 'Failed to update posting key', details: error.message });
    }
});

// DELETE transaction key
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if record exists
        const existing = await db
            .select()
            .from(transactionKeys)
            .where(eq(transactionKeys.id, parseInt(id, 10)))
            .limit(1);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Posting key not found' });
        }

        // Check if transaction key is in use (optional - add this check if you have related tables)
        // const inUse = await pool.query(`
        //   SELECT COUNT(*) as count 
        //   FROM account_determination_config 
        //   WHERE transaction_key = $1
        // `, [existing[0].code]);

        // if (parseInt(inUse.rows[0].count, 10) > 0) {
        //   return res.status(400).json({ 
        //     error: 'Cannot delete posting key',
        //     details: 'This posting key is currently in use in account determination configuration'
        //   });
        // }

        // Delete record
        await db
            .delete(transactionKeys)
            .where(eq(transactionKeys.id, parseInt(id, 10)));

        res.json({ message: 'Posting key deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting transaction key:', error);
        res.status(500).json({ error: 'Failed to delete posting key', details: error.message });
    }
});

export default router;
