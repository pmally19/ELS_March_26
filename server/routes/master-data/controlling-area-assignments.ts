import { Router, Request, Response } from 'express';
import { ensureActivePool } from '../../database';
import { z } from 'zod';

const router = Router();
const pool = ensureActivePool();

// Schema for assignment creation
const assignmentSchema = z.object({
    controlling_area_id: z.number().int().positive(),
    company_code_id: z.number().int().positive(),
});

// GET /api/master-data/controlling-area-assignments/:id
// Get all company codes assigned to a specific controlling area
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const controllingAreaId = parseInt(req.params.id);
        if (isNaN(controllingAreaId)) {
            return res.status(400).json({ error: "Invalid controlling area ID" });
        }

        const result = await pool.query(`
      SELECT 
        caca.id as assignment_id,
        cc.id as company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        cc.city,
        cc.currency,
        caca.created_at
      FROM controlling_area_company_assignments caca
      JOIN company_codes cc ON caca.company_code_id = cc.id
      WHERE caca.controlling_area_id = $1
      ORDER BY cc.code ASC
    `, [controllingAreaId]);

        return res.status(200).json(result.rows);
    } catch (error: any) {
        console.error("Error fetching controlling area assignments:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/master-data/controlling-area-assignments
// Assign a company code to a controlling area with validation
router.post('/', async (req: Request, res: Response) => {
    try {
        const validation = assignmentSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({ error: "Validation error", details: validation.error.format() });
        }

        const { controlling_area_id, company_code_id } = validation.data;

        // 1. Fetch Controlling Area details
        const caResult = await pool.query(`
      SELECT area_code, chart_of_accounts_id, fiscal_year_variant_id 
      FROM management_control_areas 
      WHERE id = $1
    `, [controlling_area_id]);

        if (caResult.rows.length === 0) {
            return res.status(404).json({ error: "Controlling Area not found" });
        }
        const ca = caResult.rows[0];

        // 2. Fetch Company Code details
        const ccResult = await pool.query(`
      SELECT code, chart_of_accounts_id, fiscal_year_variant_id 
      FROM company_codes 
      WHERE id = $1
    `, [company_code_id]);

        if (ccResult.rows.length === 0) {
            return res.status(404).json({ error: "Company Code not found" });
        }
        const cc = ccResult.rows[0];

        // 3. VALIDATION: Check for Chart of Accounts match
        if (ca.chart_of_accounts_id !== cc.chart_of_accounts_id) {
            return res.status(400).json({
                error: "Configuration Mismatch",
                message: `Chart of Accounts mismatch. Controlling Area uses ID ${ca.chart_of_accounts_id}, but Company Code uses ID ${cc.chart_of_accounts_id}. They must be identical.`
            });
        }

        // 4. VALIDATION: Check for Fiscal Year Variant match
        if (ca.fiscal_year_variant_id !== cc.fiscal_year_variant_id) {
            return res.status(400).json({
                error: "Configuration Mismatch",
                message: `Fiscal Year Variant mismatch. Controlling Area uses ID ${ca.fiscal_year_variant_id}, but Company Code uses ID ${cc.fiscal_year_variant_id}. They must be identical.`
            });
        }

        // 5. Check if company code is already assigned anywhere (Unique constraint handles this but nice error message is better)
        const existingAssignment = await pool.query(`
      SELECT mca.area_code 
      FROM controlling_area_company_assignments caca
      JOIN management_control_areas mca ON caca.controlling_area_id = mca.id
      WHERE caca.company_code_id = $1
    `, [company_code_id]);

        if (existingAssignment.rows.length > 0) {
            return res.status(409).json({
                error: "Already Assigned",
                message: `Company Code ${cc.code} is already assigned to Controlling Area ${existingAssignment.rows[0].area_code}.`
            });
        }

        // 6. Create Assignment
        const insertResult = await pool.query(`
      INSERT INTO controlling_area_company_assignments (controlling_area_id, company_code_id)
      VALUES ($1, $2)
      RETURNING *
    `, [controlling_area_id, company_code_id]);

        return res.status(201).json(insertResult.rows[0]);

    } catch (error: any) {
        console.error("Error creating assignment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/master-data/controlling-area-assignments/:id
// Remove an assignment
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        await pool.query(`DELETE FROM controlling_area_company_assignments WHERE id = $1`, [id]);

        return res.status(200).json({ message: "Assignment removed successfully" });
    } catch (error: any) {
        console.error("Error deleting assignment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
