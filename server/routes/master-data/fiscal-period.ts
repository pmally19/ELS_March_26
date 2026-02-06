/**
 * API Route for fiscal periods
 */

import { Request, Response } from "express";
import { db } from "../../db";
import { fiscalPeriods } from "@shared/financial-schema";
import { eq } from "drizzle-orm";

export async function getFiscalPeriod(req: Request, res: Response) {
  try {
    const periods = await db.select().from(fiscalPeriods).orderBy(fiscalPeriods.year, fiscalPeriods.period);
    return res.json(periods);
  } catch (error: any) {
    console.error("Error fetching fiscal period data:", error);
    return res.status(500).json({ message: `Failed to fetch fiscal period data: ${error.message}` });
  }
}

export async function createFiscalPeriod(req: Request, res: Response) {
  try {
    const { year, period, name, startDate, endDate, status, active, postingAllowed, fiscalYearVariantId } = req.body;

    // Validate required fields
    if (!year || !period || !name || !startDate || !endDate || !status) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Insert into database
    const periodData: any = {
      year: parseInt(year),
      period: parseInt(period),
      name,
      startDate,
      endDate,
      status,
      active: active !== undefined ? active : true,
      postingAllowed: postingAllowed !== undefined ? postingAllowed : true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add fiscalYearVariantId if provided
    if (fiscalYearVariantId !== undefined && fiscalYearVariantId !== null) {
      periodData.fiscalYearVariantId = fiscalYearVariantId;
    }

    const [newPeriod] = await db.insert(fiscalPeriods).values(periodData as any).returning();

    console.log(`Created new fiscal period: ${JSON.stringify(newPeriod)}`);

    return res.status(201).json(newPeriod);
  } catch (error: any) {
    console.error("Error creating fiscal period:", error);
    return res.status(500).json({ message: `Failed to create fiscal period: ${error.message}` });
  }
}

export async function updateFiscalPeriod(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const periodId = parseInt(id);

    // Check if period exists
    const existing = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, periodId));
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Fiscal period not found' });
    }

    const { year, period, name, startDate, endDate, status, active, postingAllowed } = req.body || {};

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (year !== undefined) updateData.year = parseInt(year);
    if (period !== undefined) updateData.period = parseInt(period);
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (status !== undefined) updateData.status = status;
    if (active !== undefined) updateData.active = active;
    if (postingAllowed !== undefined) updateData.postingAllowed = postingAllowed;

    // Update in database
    const [updated] = await db.update(fiscalPeriods)
      .set(updateData)
      .where(eq(fiscalPeriods.id, periodId))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating fiscal period:', error);
    return res.status(500).json({ message: `Failed to update fiscal period: ${error.message}` });
  }
}

export async function deleteFiscalPeriod(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const periodId = parseInt(id);

    // Check if period exists
    const existing = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.id, periodId));
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Fiscal period not found' });
    }

    // Delete from database
    await db.delete(fiscalPeriods).where(eq(fiscalPeriods.id, periodId));

    return res.json({ message: 'Fiscal period deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting fiscal period:', error);
    return res.status(500).json({ message: `Failed to delete fiscal period: ${error.message}` });
  }
}

export async function generateFiscalPeriods(req: Request, res: Response) {
  try {
    const { fiscal_calendar_id, fiscal_year_variant_id, fiscal_year } = req.body;

    if (!fiscal_calendar_id || !fiscal_year_variant_id || !fiscal_year) {
      return res.status(400).json({ message: "fiscal_calendar_id, fiscal_year_variant_id, and fiscal_year are required" });
    }

    // Fetch fiscal calendar
    const calendarResult = await db.execute(
      `SELECT * FROM fiscal_calendars WHERE id = ${fiscal_calendar_id}`
    );
    if (calendarResult.rows.length === 0) {
      return res.status(404).json({ message: 'Fiscal calendar not found' });
    }
    const calendar = calendarResult.rows[0] as any;

    // Fetch fiscal year variant
    const variantResult = await db.execute(
      `SELECT * FROM fiscal_year_variants WHERE id = ${fiscal_year_variant_id}`
    );
    if (variantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Fiscal year variant not found' });
    }
    const variant = variantResult.rows[0] as any;

    const startDate = new Date(calendar.start_date);
    const endDate = new Date(calendar.end_date);
    const postingPeriods = variant.posting_periods || calendar.number_of_periods;
    const specialPeriods = variant.special_periods || 0;

    // Calculate period duration in days
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPerPeriod = Math.floor(totalDays / postingPeriods);

    const generatedPeriods = [];

    // Generate regular posting periods
    for (let i = 0; i < postingPeriods; i++) {
      const periodStart = new Date(startDate);
      periodStart.setDate(periodStart.getDate() + (i * daysPerPeriod));

      const periodEnd = new Date(startDate);
      if (i === postingPeriods - 1) {
        // Last period should end exactly on the calendar end date
        periodEnd.setTime(endDate.getTime());
      } else {
        periodEnd.setDate(periodEnd.getDate() + ((i + 1) * daysPerPeriod) - 1);
      }

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const periodName = `${monthNames[periodStart.getMonth()]} ${fiscal_year}` || `Period ${i + 1}`;

      generatedPeriods.push({
        fiscalYearVariantId: fiscal_year_variant_id,
        year: fiscal_year,
        period: i + 1,
        name: periodName,
        startDate: periodStart.toISOString().split('T')[0],
        endDate: periodEnd.toISOString().split('T')[0],
        status: 'Open',
        active: true,
        postingAllowed: true,
        version: 1
      });
    }

    // Generate special periods if any
    for (let i = 0; i < specialPeriods; i++) {
      generatedPeriods.push({
        fiscalYearVariantId: fiscal_year_variant_id,
        year: fiscal_year,
        period: postingPeriods + i + 1,
        name: `Special Period ${i + 1}`,
        startDate: null, // Special periods don't have dates in SAP
        endDate: null,   // Special periods don't have dates in SAP
        status: 'Open',
        active: true,
        postingAllowed: true,
        version: 1
      });
    }

    // Insert all generated periods
    const insertedPeriods = await db.insert(fiscalPeriods).values(generatedPeriods as any).returning();

    return res.status(201).json({
      message: `Generated ${insertedPeriods.length} fiscal periods successfully`,
      data: insertedPeriods
    });
  } catch (error: any) {
    console.error('Error generating fiscal periods:', error);
    return res.status(500).json({ message: `Failed to generate fiscal periods: ${error.message}` });
  }
}

export default getFiscalPeriod;