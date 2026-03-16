import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET all payment terms
router.get('/', async (req, res) => {
    try {
        console.log('Fetching payment terms from database...');

        const result = await pool.query(`
      SELECT 
        id,
        "payment_term_key",
        "description",
        "cash_discount_days",
        "payment_due_days",
        "cash_discount_percent",
        "created_at",
        "created_by",
        "updated_by",
        "_tenantId",
        "_deletedAt"
      FROM payment_terms
      WHERE "_deletedAt" IS NULL
      ORDER BY payment_term_key
    `);

        console.log(`Found ${result.rows.length} payment terms`);

        // Transform to camelCase for frontend
        const paymentTerms = result.rows.map(row => ({
            id: row.id,
            paymentTermKey: row.payment_term_key,
            description: row.description,
            cashDiscountDays: row.cash_discount_days,
            paymentDueDays: row.payment_due_days,
            cashDiscountPercent: row.cash_discount_percent,
            isActive: true,
            createdAt: row.created_at,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            tenantId: row._tenantId,
            deletedAt: row._deletedAt
        }));

        res.json(paymentTerms);
    } catch (error: any) {
        console.error('Error fetching payment terms:', error);
        res.status(500).json({ message: 'Failed to fetch payment terms', error: error.message });
    }
});

export default router;
