import express, { Request, Response } from "express";
import { pool } from "../../db";

const router = express.Router();

// Ensure the profit_centers table exists with the correct schema matching the actual database
async function ensureTable() {
  // Table already exists in database, just verify structure
  // The actual table has these columns:
  // id, profit_center, description, profit_center_group, company_code, controlling_area,
  // segment, hierarchy_area, responsible_person, valid_from, valid_to, created_at,
  // company_code_id, plant_id, responsible_person_id, active, updated_at
  // We don't need to create it as it already exists
}

// GET all profit centers
router.get("/", async (req: Request, res: Response) => {
  try {
    await ensureTable();

    const result = await pool.query(`
      SELECT 
        pc.id,
        pc.profit_center,
        pc.description,
        pc.profit_center_group,
        pc.company_code_id,
        comp.code AS company_code,
        pc.controlling_area,
        pc.segment,
        pc.hierarchy_area,
        pc.responsible_person,
        pc.valid_from,
        pc.valid_to,
        pc.cost_center_id,
        COALESCE(pc.active, true) AS active,
        pc.created_at,
        pc.updated_at,
        -- Map for frontend compatibility (frontend expects code and name)
        pc.profit_center AS code,
        pc.description AS name,
        pc.responsible_person AS person_responsible,
        -- Include cost center details for auto-fill
        cc.cost_center AS cost_center_code,
        cc.description AS cost_center_description
      FROM public.profit_centers pc
      LEFT JOIN public.cost_centers cc ON pc.cost_center_id = cc.id
      LEFT JOIN public.company_codes comp ON pc.company_code_id = comp.id
      WHERE (pc.active IS NULL OR pc.active = true)
      ORDER BY pc.id
    `);

    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching profit centers:", error);
    return res.status(500).json({ message: "Failed to fetch profit centers", error: error.message });
  }
});

// GET single profit center by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        pc.id,
        pc.profit_center,
        pc.description,
        pc.profit_center_group,
        pc.company_code_id,
        comp.code AS company_code,
        pc.controlling_area,
        pc.segment,
        pc.hierarchy_area,
        pc.responsible_person,
        pc.valid_from,
        pc.valid_to,
        COALESCE(pc.active, true) AS active,
        pc.created_at,
        pc.updated_at,
        -- Map for frontend compatibility
        pc.profit_center AS code,
        pc.description AS name,
        pc.responsible_person AS person_responsible
      FROM public.profit_centers pc
      LEFT JOIN public.company_codes comp ON pc.company_code_id = comp.id
      WHERE pc.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Profit center not found" });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching profit center:", error);
    return res.status(500).json({ message: "Failed to fetch profit center", error: error.message });
  }
});

// POST create new profit center
router.post("/", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const {
      code,
      name,
      description,
      profit_center,
      profit_center_group,
      controlling_area,
      segment,
      hierarchy_area,
      responsible_person,
      person_responsible,
      valid_from,
      valid_to,
      company_code_id,
      active = true
    } = req.body || {};

    // Validate required fields - map frontend fields to database fields
    const finalProfitCenter = (profit_center || code || '').toString().trim();
    const finalDescription = (description || name || '').toString().trim();
    const finalControllingArea = (controlling_area || 'A000').toString().trim();

    if (!finalProfitCenter || !finalDescription) {
      return res.status(400).json({
        message: 'Profit center and description are required'
      });
    }

    // Use valid_from or default to today
    const finalValidFrom = valid_from || new Date().toISOString().split('T')[0];
    const finalResponsiblePerson = responsible_person || person_responsible || null;

    const result = await pool.query(`
      INSERT INTO public.profit_centers (
        profit_center,
        description,
        profit_center_group,
        company_code_id,
        controlling_area,
        segment,
        hierarchy_area,
        responsible_person,
        valid_from,
        valid_to,
        active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      finalProfitCenter,
      finalDescription,
      profit_center_group || null,
      company_code_id || null,
      finalControllingArea,
      segment || null,
      hierarchy_area || null,
      finalResponsiblePerson,
      finalValidFrom,
      valid_to || null,
      active !== undefined ? active : true
    ]);

    // Map response for frontend compatibility
    const row = result.rows[0];
    return res.status(201).json({
      ...row,
      code: row.profit_center,
      name: row.description,
      person_responsible: row.responsible_person
    });
  } catch (error: any) {
    console.error('Error creating profit center:', error);
    return res.status(500).json({ message: 'Failed to create profit center', error: error.message });
  }
});

// PUT update profit center
router.put("/:id", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const {
      code,
      name,
      description,
      profit_center,
      profit_center_group,
      controlling_area,
      segment,
      hierarchy_area,
      responsible_person,
      person_responsible,
      valid_from,
      valid_to,
      company_code_id,
      active
    } = req.body || {};

    // Build update fields dynamically - map frontend fields to database fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const addUpdate = (field: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        updates.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    };

    // Map frontend fields to actual database columns
    const finalProfitCenter = profit_center || code;
    const finalDescription = description || name;
    const finalResponsiblePerson = responsible_person || person_responsible;

    addUpdate('profit_center', finalProfitCenter);
    addUpdate('description', finalDescription);
    addUpdate('profit_center_group', profit_center_group);
    addUpdate('controlling_area', controlling_area);
    addUpdate('segment', segment);
    addUpdate('hierarchy_area', hierarchy_area);
    addUpdate('responsible_person', finalResponsiblePerson);
    addUpdate('valid_from', valid_from);
    addUpdate('valid_to', valid_to);
    addUpdate('company_code_id', company_code_id);
    addUpdate('active', active);

    // Always update updated_at
    updates.push('updated_at = NOW()');

    if (updates.length === 0) {
      return res.status(200).json({ message: 'No changes to apply' });
    }

    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    values.push(numericId);
    const sql = `UPDATE public.profit_centers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profit center not found' });
    }

    // Map response for frontend compatibility
    const row = result.rows[0];
    return res.json({
      ...row,
      code: row.profit_center,
      name: row.description,
      person_responsible: row.responsible_person
    });
  } catch (error: any) {
    console.error('Error updating profit center:', error);
    return res.status(500).json({ message: 'Failed to update profit center', error: error.message });
  }
});

// DELETE profit center
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const { id } = req.params;

    // Check if the record exists
    const checkResult = await pool.query(`SELECT id FROM public.profit_centers WHERE id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profit center not found' });
    }

    // Perform hard delete
    const result = await pool.query(`DELETE FROM public.profit_centers WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json({ message: 'Profit center deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting profit center:', error);
    return res.status(500).json({ message: 'Failed to delete profit center', error: error.message });
  }
});

export default router;
