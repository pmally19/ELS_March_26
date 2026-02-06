/**
 * Factory Calendar Backend API Routes
 * Provides CRUD operations for factory calendars and working times
 */

import { Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// GET /api/factory-calendars - List all factory calendars
router.get('/factory-calendars', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        calendar_id,
        calendar_code,
        description,
        country_code,
        holiday_calendar,
        working_days,
        shifts_per_day,
        annual_hours,
        weekly_hours,
        daily_hours,
        saturday_working,
        sunday_working,
        created_date,
        status
      FROM factory_calendars
      WHERE status = 'ACTIVE'
      ORDER BY calendar_code
    `);

        res.json(result.rows.map(row => ({
            id: row.calendar_id,
            calendarId: row.calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            holidayCalendar: row.holiday_calendar,
            workingDays: row.working_days,
            shiftsPerDay: row.shifts_per_day,
            annualHours: row.annual_hours,
            weeklyHours: row.weekly_hours,
            dailyHours: row.daily_hours,
            saturdayWorking: row.saturday_working === 'Y',
            sundayWorking: row.sunday_working === 'Y',
            createdDate: row.created_date,
            status: row.status,
        })));
    } catch (error) {
        console.error('Error fetching factory calendars:', error);
        res.status(500).json({ error: 'Failed to fetch factory calendars' });
    }
});

// GET /api/factory-calendars/:id - Get single factory calendar
router.get('/factory-calendars/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        calendar_id,
        calendar_code,
        description,
        country_code,
        holiday_calendar,
        working_days,
        shifts_per_day,
        annual_hours,
        weekly_hours,
        daily_hours,
        saturday_working,
        sunday_working,
        created_date,
        status
      FROM factory_calendars
      WHERE calendar_id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factory calendar not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.calendar_id,
            calendarId: row.calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            holidayCalendar: row.holiday_calendar,
            workingDays: row.working_days,
            shiftsPerDay: row.shifts_per_day,
            annualHours: row.annual_hours,
            weeklyHours: row.weekly_hours,
            dailyHours: row.daily_hours,
            saturdayWorking: row.saturday_working === 'Y',
            sundayWorking: row.sunday_working === 'Y',
            createdDate: row.created_date,
            status: row.status,
        });
    } catch (error) {
        console.error('Error fetching factory calendar:', error);
        res.status(500).json({ error: 'Failed to fetch factory calendar' });
    }
});

// POST /api/factory-calendars - Create new factory calendar
router.post('/factory-calendars', async (req, res) => {
    try {
        const {
            calendarId,
            calendarCode,
            description,
            countryCode,
            holidayCalendar,
            workingDays,
            shiftsPerDay,
            annualHours,
            weeklyHours,
            dailyHours,
            saturdayWorking,
            sundayWorking,
        } = req.body;

        // Validation
        if (!calendarId || !calendarCode || !description) {
            return res.status(400).json({
                error: 'Calendar ID, code, and description are required'
            });
        }

        const result = await pool.query(`
      INSERT INTO factory_calendars (
        calendar_id,
        calendar_code,
        description,
        country_code,
        holiday_calendar,
        working_days,
        shifts_per_day,
        annual_hours,
        weekly_hours,
        daily_hours,
        saturday_working,
        sunday_working,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE')
      RETURNING *
    `, [
            calendarId,
            calendarCode,
            description,
            countryCode || null,
            holidayCalendar || null,
            workingDays || null,
            shiftsPerDay || 1,
            annualHours || null,
            weeklyHours || null,
            dailyHours || null,
            saturdayWorking ? 'Y' : 'N',
            sundayWorking ? 'Y' : 'N',
        ]);

        const row = result.rows[0];
        res.status(201).json({
            id: row.calendar_id,
            calendarId: row.calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            holidayCalendar: row.holiday_calendar,
            workingDays: row.working_days,
            shiftsPerDay: row.shifts_per_day,
            annualHours: row.annual_hours,
            weeklyHours: row.weekly_hours,
            dailyHours: row.daily_hours,
            saturdayWorking: row.saturday_working === 'Y',
            sundayWorking: row.sunday_working === 'Y',
            createdDate: row.created_date,
            status: row.status,
        });
    } catch (error) {
        console.error('Error creating factory calendar:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Calendar ID or code already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create factory calendar' });
        }
    }
});

// PUT /api/factory-calendars/:id - Update factory calendar
router.put('/factory-calendars/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            calendarCode,
            description,
            countryCode,
            holidayCalendar,
            workingDays,
            shiftsPerDay,
            annualHours,
            weeklyHours,
            dailyHours,
            saturdayWorking,
            sundayWorking,
            status,
        } = req.body;

        const result = await pool.query(`
      UPDATE factory_calendars
      SET 
        calendar_code = COALESCE($1, calendar_code),
        description = COALESCE($2, description),
        country_code = $3,
        holiday_calendar = $4,
        working_days = $5,
        shifts_per_day = COALESCE($6, shifts_per_day),
        annual_hours = $7,
        weekly_hours = $8,
        daily_hours = $9,
        saturday_working = $10,
        sunday_working = $11,
        status = COALESCE($12, status)
      WHERE calendar_id = $13
      RETURNING *
    `, [
            calendarCode,
            description,
            countryCode,
            holidayCalendar,
            workingDays,
            shiftsPerDay,
            annualHours,
            weeklyHours,
            dailyHours,
            saturdayWorking ? 'Y' : 'N',
            sundayWorking ? 'Y' : 'N',
            status,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factory calendar not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.calendar_id,
            calendarId: row.calendar_id,
            calendarCode: row.calendar_code,
            description: row.description,
            countryCode: row.country_code,
            holidayCalendar: row.holiday_calendar,
            workingDays: row.working_days,
            shiftsPerDay: row.shifts_per_day,
            annualHours: row.annual_hours,
            weeklyHours: row.weekly_hours,
            dailyHours: row.daily_hours,
            saturdayWorking: row.saturday_working === 'Y',
            sundayWorking: row.sunday_working === 'Y',
            createdDate: row.created_date,
            status: row.status,
        });
    } catch (error) {
        console.error('Error updating factory calendar:', error);
        res.status(500).json({ error: 'Failed to update factory calendar' });
    }
});

// DELETE /api/factory-calendars/:id - Delete factory calendar (soft delete)
router.delete('/factory-calendars/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      UPDATE factory_calendars
      SET status = 'INACTIVE'
      WHERE calendar_id = $1
      RETURNING calendar_id
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factory calendar not found' });
        }

        res.json({ message: 'Factory calendar deleted successfully' });
    } catch (error) {
        console.error('Error deleting factory calendar:', error);
        res.status(500).json({ error: 'Failed to delete factory calendar' });
    }
});

// GET /api/factory-calendars/:id/working-times - Get working times for a calendar
router.get('/factory-calendars/:id/working-times', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        calendar_id,
        day_of_week,
        shift_number,
        start_time,
        end_time,
        break_start_time,
        break_end_time,
        working_hours,
        capacity_utilization,
        valid_from,
        valid_to
      FROM calendar_working_times
      WHERE calendar_id = $1
      AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
      ORDER BY day_of_week, shift_number
    `, [id]);

        res.json(result.rows.map(row => ({
            calendarId: row.calendar_id,
            dayOfWeek: row.day_of_week,
            shiftNumber: row.shift_number,
            startTime: row.start_time,
            endTime: row.end_time,
            breakStartTime: row.break_start_time,
            breakEndTime: row.break_end_time,
            workingHours: row.working_hours,
            capacityUtilization: row.capacity_utilization,
            validFrom: row.valid_from,
            validTo: row.valid_to,
        })));
    } catch (error) {
        console.error('Error fetching working times:', error);
        res.status(500).json({ error: 'Failed to fetch working times' });
    }
});

// POST /api/factory-calendars/:id/working-times - Add working time
router.post('/factory-calendars/:id/working-times', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            dayOfWeek,
            shiftNumber,
            startTime,
            endTime,
            breakStartTime,
            breakEndTime,
            workingHours,
            capacityUtilization,
            validFrom,
            validTo,
        } = req.body;

        // Validation
        if (!dayOfWeek || !shiftNumber || !startTime || !endTime || !workingHours) {
            return res.status(400).json({
                error: 'Day of week, shift number, start time, end time, and working hours are required'
            });
        }

        const result = await pool.query(`
      INSERT INTO calendar_working_times (
        calendar_id,
        day_of_week,
        shift_number,
        start_time,
        end_time,
        break_start_time,
        break_end_time,
        working_hours,
        capacity_utilization,
        valid_from,
        valid_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
            id,
            dayOfWeek,
            shiftNumber,
            startTime,
            endTime,
            breakStartTime || null,
            breakEndTime || null,
            workingHours,
            capacityUtilization || 100.00,
            validFrom || new Date().toISOString().split('T')[0],
            validTo || null,
        ]);

        const row = result.rows[0];
        res.status(201).json({
            calendarId: row.calendar_id,
            dayOfWeek: row.day_of_week,
            shiftNumber: row.shift_number,
            startTime: row.start_time,
            endTime: row.end_time,
            breakStartTime: row.break_start_time,
            breakEndTime: row.break_end_time,
            workingHours: row.working_hours,
            capacityUtilization: row.capacity_utilization,
            validFrom: row.valid_from,
            validTo: row.valid_to,
        });
    } catch (error) {
        console.error('Error creating working time:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Working time entry already exists for this day/shift/date combination' });
        } else if (error.code === '23503') { // Foreign key violation
            res.status(404).json({ error: 'Factory calendar not found' });
        } else {
            res.status(500).json({ error: 'Failed to create working time' });
        }
    }
});

export default router;
