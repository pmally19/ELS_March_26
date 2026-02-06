/**
 * Holiday Calendar Backend API Routes
 * Provides CRUD operations for holiday calendars and public holidays
 */

import { Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// GET /api/holiday-calendars - List all holiday calendars
router.get('/holiday-calendars', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        hc.holiday_calendar_id,
        hc.calendar_code,
        hc.description,
        hc.country_code,
        hc.region,
        hc.country_id,
        hc.region_id,
        c.name as country_name,
        c.code as country_actual_code,
        r.name as region_name,
        hc.valid_from,
        hc.valid_to,
        hc.status,
        hc.created_at,
        hc.updated_at
      FROM holiday_calendars hc
      LEFT JOIN countries c ON hc.country_id = c.id
      LEFT JOIN regions r ON hc.region_id = r.id
      WHERE hc.status = 'ACTIVE'
      ORDER BY hc.calendar_code
    `);

        res.json(result.rows.map(row => ({
            id: row.holiday_calendar_id,
            holidayCalendarId: row.holiday_calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            region: row.region,
            countryId: row.country_id,
            regionId: row.region_id,
            countryName: row.country_name,
            regionName: row.region_name,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        })));
    } catch (error) {
        console.error('Error fetching holiday calendars:', error);
        res.status(500).json({ error: 'Failed to fetch holiday calendars' });
    }
});

// GET /api/holiday-calendars/:id - Get single holiday calendar
router.get('/holiday-calendars/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        holiday_calendar_id,
        calendar_code,
        description,
        country_code,
        region,
        valid_from,
        valid_to,
        status,
        created_at,
        updated_at
      FROM holiday_calendars
      WHERE holiday_calendar_id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Holiday calendar not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.holiday_calendar_id,
            holidayCalendarId: row.holiday_calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            region: row.region,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    } catch (error) {
        console.error('Error fetching holiday calendar:', error);
        res.status(500).json({ error: 'Failed to fetch holiday calendar' });
    }
});

// POST /api/holiday-calendars - Create new holiday calendar
router.post('/holiday-calendars', async (req, res) => {
    try {
        const {
            holidayCalendarId,
            calendarCode,
            description,
            countryCode,
            region,
            countryId,
            regionId,
            validFrom,
            validTo,
        } = req.body;

        // Validation
        if (!holidayCalendarId || !calendarCode || !description) {
            return res.status(400).json({
                error: 'Holiday calendar ID, code, and description are required'
            });
        }

        const result = await pool.query(`
      INSERT INTO holiday_calendars (
        holiday_calendar_id,
        calendar_code,
        description,
        country_code,
        region,
        country_id,
        region_id,
        valid_from,
        valid_to,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
      RETURNING *
    `, [
            holidayCalendarId,
            calendarCode,
            description,
            countryCode || null,
            region || null,
            countryId ? parseInt(countryId) : null,
            regionId ? parseInt(regionId) : null,
            validFrom || null,
            validTo || null,
        ]);

        const row = result.rows[0];
        res.status(201).json({
            id: row.holiday_calendar_id,
            holidayCalendarId: row.holiday_calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            region: row.region,
            countryId: row.country_id,
            regionId: row.region_id,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    } catch (error) {
        console.error('Error creating holiday calendar:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Holiday calendar ID or code already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create holiday calendar' });
        }
    }
});

// PUT /api/holiday-calendars/:id - Update holiday calendar
router.put('/holiday-calendars/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            calendarCode,
            description,
            countryCode,
            region,
            countryId,
            regionId,
            validFrom,
            validTo,
            status,
        } = req.body;

        const result = await pool.query(`
      UPDATE holiday_calendars
      SET 
        calendar_code = COALESCE($1, calendar_code),
        description = COALESCE($2, description),
        country_code = $3,
        region = $4,
        country_id = $5,
        region_id = $6,
        valid_from = $7,
        valid_to = $8,
        status = COALESCE($9, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE holiday_calendar_id = $10
      RETURNING *
    `, [
            calendarCode,
            description,
            countryCode,
            region,
            countryId ? parseInt(countryId) : null,
            regionId ? parseInt(regionId) : null,
            validFrom,
            validTo,
            status,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Holiday calendar not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.holiday_calendar_id,
            holidayCalendarId: row.holiday_calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            region: row.region,
            countryId: row.country_id,
            regionId: row.region_id,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    } catch (error) {
        console.error('Error updating holiday calendar:', error);
        res.status(500).json({ error: 'Failed to update holiday calendar' });
    }
});

// DELETE /api/holiday-calendars/:id - Soft delete holiday calendar
router.delete('/holiday-calendars/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      UPDATE holiday_calendars
      SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE holiday_calendar_id = $1
      RETURNING holiday_calendar_id
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Holiday calendar not found' });
        }

        res.json({ message: 'Holiday calendar deactivated successfully' });
    } catch (error) {
        console.error('Error deleting holiday calendar:', error);
        res.status(500).json({ error: 'Failed to delete holiday calendar' });
    }
});

// GET /api/holiday-calendars/:id/holidays - Get holidays for a calendar
router.get('/holiday-calendars/:id/holidays', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        id,
        holiday_calendar_id,
        holiday_date,
        holiday_name,
        holiday_type,
        is_working_day,
        description,
        created_at
      FROM public_holidays
      WHERE holiday_calendar_id = $1
      ORDER BY holiday_date
    `, [id]);

        res.json(result.rows.map(row => ({
            id: row.id,
            holidayCalendarId: row.holiday_calendar_id,
            holidayDate: row.holiday_date,
            holidayName: row.holiday_name,
            holidayType: row.holiday_type,
            isWorkingDay: row.is_working_day,
            description: row.description,
            createdAt: row.created_at,
        })));
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

// POST /api/holiday-calendars/:id/holidays - Add holiday
router.post('/holiday-calendars/:id/holidays', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            holidayDate,
            holidayName,
            holidayType,
            isWorkingDay,
            description,
        } = req.body;

        // Validation
        if (!holidayDate || !holidayName) {
            return res.status(400).json({
                error: 'Holiday date and name are required'
            });
        }

        const result = await pool.query(`
      INSERT INTO public_holidays (
        holiday_calendar_id,
        holiday_date,
        holiday_name,
        holiday_type,
        is_working_day,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
            id,
            holidayDate,
            holidayName,
            holidayType || 'PUBLIC',
            isWorkingDay || false,
            description || null,
        ]);

        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            holidayCalendarId: row.holiday_calendar_id,
            holidayDate: row.holiday_date,
            holidayName: row.holiday_name,
            holidayType: row.holiday_type,
            isWorkingDay: row.is_working_day,
            description: row.description,
            createdAt: row.created_at,
        });
    } catch (error) {
        console.error('Error creating holiday:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Holiday already exists for this date' });
        } else if (error.code === '23503') { // Foreign key violation
            res.status(404).json({ error: 'Holiday calendar not found' });
        } else {
            res.status(500).json({ error: 'Failed to create holiday' });
        }
    }
});

// PUT /api/public-holidays/:id - Update a holiday
router.put('/public-holidays/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            holidayDate,
            holidayName,
            holidayType,
            isWorkingDay,
            description,
        } = req.body;

        const result = await pool.query(`
      UPDATE public_holidays
      SET 
        holiday_date = COALESCE($1, holiday_date),
        holiday_name = COALESCE($2, holiday_name),
        holiday_type = COALESCE($3, holiday_type),
        is_working_day = COALESCE($4, is_working_day),
        description = $5
      WHERE id = $6
      RETURNING *
    `, [
            holidayDate,
            holidayName,
            holidayType,
            isWorkingDay,
            description,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Holiday not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.id,
            holidayCalendarId: row.holiday_calendar_id,
            holidayDate: row.holiday_date,
            holidayName: row.holiday_name,
            holidayType: row.holiday_type,
            isWorkingDay: row.is_working_day,
            description: row.description,
            createdAt: row.created_at,
        });
    } catch (error) {
        console.error('Error updating holiday:', error);
        res.status(500).json({ error: 'Failed to update holiday' });
    }
});

// DELETE /api/public-holidays/:id - Delete a holiday
router.delete('/public-holidays/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      DELETE FROM public_holidays
      WHERE id = $1
      RETURNING id
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Holiday not found' });
        }

        res.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
});

export default router;
