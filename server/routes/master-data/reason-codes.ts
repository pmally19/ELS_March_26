import { Router } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { ensureActivePool } from '../../database';

const router = Router();

// GET all reason codes
router.get('/', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const result = await pool.query(`
            SELECT * FROM reason_codes 
            WHERE is_active = true 
            ORDER BY code ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reason codes:', error);
        res.status(500).json({ message: 'Failed to fetch reason codes' });
    }
});

// GET single reason code
router.get('/:id', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const id = parseInt(req.params.id);
        const result = await pool.query('SELECT * FROM reason_codes WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reason code not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching reason code:', error);
        res.status(500).json({ message: 'Failed to fetch reason code' });
    }
});

// POST create reason code
router.post('/', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const { code, name, description, is_active } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: 'Code and Name are required' });
        }

        const result = await pool.query(`
            INSERT INTO reason_codes (code, name, description, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING *
        `, [code.toUpperCase(), name, description || null, is_active !== undefined ? is_active : true]);

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating reason code:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Reason code already exists' });
        }
        res.status(500).json({ message: 'Failed to create reason code' });
    }
});

// PUT update reason code
router.put('/:id', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const id = parseInt(req.params.id);
        const { code, name, description, is_active } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: 'Code and Name are required' });
        }

        const result = await pool.query(`
            UPDATE reason_codes 
            SET code = $1, name = $2, description = $3, is_active = $4, updated_at = NOW()
            WHERE id = $5
            RETURNING *
        `, [code.toUpperCase(), name, description || null, is_active, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reason code not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating reason code:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Reason code already exists' });
        }
        res.status(500).json({ message: 'Failed to update reason code' });
    }
});

// DELETE reason code
router.delete('/:id', async (req, res) => {
    try {
        const pool = ensureActivePool();
        const id = parseInt(req.params.id);

        const result = await pool.query('DELETE FROM reason_codes WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reason code not found' });
        }

        res.json({ message: 'Reason code deleted successfully' });
    } catch (error) {
        console.error('Error deleting reason code:', error);
        res.status(500).json({ message: 'Failed to delete reason code' });
    }
});

export default router;
