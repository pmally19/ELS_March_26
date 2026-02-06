import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const router = Router();

// GET all fiscal calendars
router.get('/', async (req: Request, res: Response) => {
    try {
        const { active, search } = req.query;
        let query = sql`SELECT * FROM fiscal_calendars WHERE 1=1`;
        const conditions: any[] = [];

        if (active !== undefined) {
            conditions.push(sql`AND active = ${active === 'true'}`);
        }
        if (search) {
            conditions.push(sql`AND calendar_id ILIKE ${'%' + search + '%'}`);
        }
        if (conditions.length > 0) {
            query = sql`${query} ${sql.join(conditions, sql` `)}`;
        }
        query = sql`${query} ORDER BY created_at DESC`;

        const result = await db.execute(query);
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error: any) {
        console.error('Error fetching fiscal calendars:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fiscal calendars', message: error.message });
    }
});

// GET single fiscal calendar
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.execute(sql`SELECT * FROM fiscal_calendars WHERE id = ${parseInt(id)}`);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fiscal calendar not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error fetching fiscal calendar:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fiscal calendar', message: error.message });
    }
});

// POST create fiscal calendar
router.post('/', async (req: Request, res: Response) => {
    try {
        const { calendar_id, start_date, end_date, number_of_periods, active } = req.body;

        if (!calendar_id || !start_date || !end_date) {
            return res.status(400).json({ success: false, error: 'calendar_id, start_date, and end_date are required' });
        }

        // Check duplicate
        const existing = await db.execute(sql`SELECT id FROM fiscal_calendars WHERE calendar_id = ${calendar_id}`);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Fiscal calendar with this ID already exists' });
        }

        // Validate dates
        if (new Date(start_date) >= new Date(end_date)) {
            return res.status(400).json({ success: false, error: 'Start date must be before end date' });
        }

        const periods = number_of_periods || 12;
        if (periods < 1 || periods > 52) {
            return res.status(400).json({ success: false, error: 'Number of periods must be between 1 and 52' });
        }

        const result = await db.execute(sql`
      INSERT INTO fiscal_calendars (calendar_id, start_date, end_date, number_of_periods, active)
      VALUES (${calendar_id}, ${start_date}, ${end_date}, ${periods}, ${active !== false})
      RETURNING *
    `);

        res.status(201).json({ success: true, message: 'Fiscal calendar created successfully', data: result.rows[0] });
    } catch (error: any) {
        console.error('Error creating fiscal calendar:', error);
        res.status(500).json({ success: false, error: 'Failed to create fiscal calendar', message: error.message });
    }
});

// PUT update fiscal calendar
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { calendar_id, start_date, end_date, number_of_periods, active } = req.body;

        const existing = await db.execute(sql`SELECT id FROM fiscal_calendars WHERE id = ${parseInt(id)}`);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fiscal calendar not found' });
        }

        if (calendar_id) {
            const duplicate = await db.execute(sql`SELECT id FROM fiscal_calendars WHERE calendar_id = ${calendar_id} AND id != ${parseInt(id)}`);
            if (duplicate.rows.length > 0) {
                return res.status(400).json({ success: false, error: 'Fiscal calendar with this ID already exists' });
            }
        }

        if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
            return res.status(400).json({ success: false, error: 'Start date must be before end date' });
        }

        if (number_of_periods !== undefined && (number_of_periods < 1 || number_of_periods > 52)) {
            return res.status(400).json({ success: false, error: 'Number of periods must be between 1 and 52' });
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (calendar_id !== undefined) { updates.push(`calendar_id = $${paramCount++}`); values.push(calendar_id); }
        if (start_date !== undefined) { updates.push(`start_date = $${paramCount++}`); values.push(start_date); }
        if (end_date !== undefined) { updates.push(`end_date = $${paramCount++}`); values.push(end_date); }
        if (number_of_periods !== undefined) { updates.push(`number_of_periods = $${paramCount++}`); values.push(number_of_periods); }
        if (active !== undefined) { updates.push(`active = $${paramCount++}`); values.push(active); }

        updates.push(`updated_at = NOW()`);
        values.push(parseInt(id));

        const updateQuery = `UPDATE fiscal_calendars SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await db.execute(sql.raw(updateQuery, values));

        res.json({ success: true, message: 'Fiscal calendar updated successfully', data: result.rows[0] });
    } catch (error: any) {
        console.error('Error updating fiscal calendar:', error);
        res.status(500).json({ success: false, error: 'Failed to update fiscal calendar', message: error.message });
    }
});

// PUT toggle active
router.put('/:id/toggle-active', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.execute(sql`UPDATE fiscal_calendars SET active = NOT active, updated_at = NOW() WHERE id = ${parseInt(id)} RETURNING *`);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fiscal calendar not found' });
        }
        res.json({ success: true, message: 'Fiscal calendar status toggled successfully', data: result.rows[0] });
    } catch (error: any) {
        console.error('Error toggling fiscal calendar status:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle fiscal calendar status', message: error.message });
    }
});

// DELETE fiscal calendar
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.execute(sql`DELETE FROM fiscal_calendars WHERE id = ${parseInt(id)} RETURNING *`);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fiscal calendar not found' });
        }
        res.json({ success: true, message: 'Fiscal calendar deleted successfully', data: result.rows[0] });
    } catch (error: any) {
        console.error('Error deleting fiscal calendar:', error);
        res.status(500).json({ success: false, error: 'Failed to delete fiscal calendar', message: error.message });
    }
});

export default router;
