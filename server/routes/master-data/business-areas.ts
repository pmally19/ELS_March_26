import express, { Request, Response } from "express";
import { pool } from "../../db";

// Column typing sets for safe coercion
const INT_COLUMNS = new Set(['company_code_id']);
const BOOL_COLUMNS = new Set(['is_active', 'active']);
const DATE_COLUMNS = new Set(['created_at', 'updated_at']);

const router = express.Router();

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.business_areas (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) NOT NULL UNIQUE,
      description VARCHAR(100) NOT NULL,
      company_code_id INTEGER REFERENCES company_codes(id) ON DELETE SET NULL,
      parent_business_area_code VARCHAR(10),
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "_tenantId" CHAR(3) DEFAULT '001',
      created_by INTEGER,
      updated_by INTEGER
    )
  `);

  // Add foreign key constraint if it doesn't exist
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'business_areas_company_code_id_fkey'
      ) THEN
        ALTER TABLE public.business_areas 
        ADD CONSTRAINT business_areas_company_code_id_fkey 
        FOREIGN KEY (company_code_id) 
        REFERENCES company_codes(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // Rename consolidation_business_area to parent_business_area_code if it exists
  await pool.query(`
    DO $$ 
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'business_areas' 
        AND column_name = 'consolidation_business_area'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'business_areas' 
        AND column_name = 'parent_business_area_code'
      ) THEN
        ALTER TABLE public.business_areas 
        RENAME COLUMN consolidation_business_area TO parent_business_area_code;
      END IF;
    END $$;
  `);
}

async function getColumnSet(): Promise<Set<string>> {
  const cols = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'business_areas' AND table_schema = 'public'
  `);
  return new Set(cols.rows.map((r: any) => r.column_name));
}

router.get("/", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const set = await getColumnSet();

    // Check which column name exists for parent business area
    const hasConsolidation = set.has('consolidation_business_area');
    const hasParent = set.has('parent_business_area_code');
    const parentColumn = hasParent ? 'parent_business_area_code' : (hasConsolidation ? 'consolidation_business_area' : null);

    const selId = set.has('id') ? 'ba.id' : 'ROW_NUMBER() OVER ()';
    const selCode = set.has('code') ? 'ba.code' : `''`;
    const selDesc = set.has('description') ? 'ba.description' : `''`;
    const selCompany = set.has('company_code_id') ? 'ba.company_code_id' : 'NULL';
    const selParent = parentColumn ? `ba.${parentColumn}` : 'NULL';
    const selActive = set.has('is_active') ? 'ba.is_active' : (set.has('active') ? 'ba.active' : 'true');
    const selCreated = set.has('created_at') ? 'ba.created_at' : 'NOW()';
    const selUpdated = set.has('updated_at') ? 'ba.updated_at' : (set.has('created_at') ? 'ba.created_at' : 'NOW()');
    const selCreatedBy = set.has('created_by') ? 'ba.created_by' : 'NULL';
    const selUpdatedBy = set.has('updated_by') ? 'ba.updated_by' : 'NULL';
    const selTenantId = set.has('_tenantId') ? 'ba."_tenantId"' : 'NULL';

    const sql = `
      SELECT ${selId} AS id,
             ${selCode} AS code,
             ${selDesc} AS description,
             ${selCompany} AS company_code_id,
             ${selParent} AS parent_business_area_code,
             cc.code AS company_code,
             cc.name AS company_name,
             ${selActive} AS is_active,
             ${selCreated} AS created_at,
             ${selUpdated} AS updated_at,
             ${selCreatedBy} AS created_by,
             ${selUpdatedBy} AS updated_by,
             ${selTenantId} AS tenant_id
      FROM public.business_areas ba
      LEFT JOIN company_codes cc ON ba.company_code_id = cc.id
      ORDER BY ba.code`;
    const result = await pool.query(sql);
    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching business areas:", error);
    return res.status(500).json({ message: "Failed to fetch business areas", error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const {
      code,
      description,
      company_code_id,
      parent_business_area_code,
      consolidation_business_area, // Support old field name for backward compatibility
      is_active = true,
      active
    } = req.body || {};

    // Validate required fields
    const finalCode = (code || '').toString().trim();
    const finalDescription = (description || '').toString().trim();

    if (!finalCode || !finalDescription) {
      return res.status(400).json({ message: 'Code and description are required' });
    }

    // Validate company_code_id if provided
    if (company_code_id !== undefined && company_code_id !== null && company_code_id !== '') {
      const companyCheck = await pool.query('SELECT id FROM company_codes WHERE id = $1', [company_code_id]);
      if (companyCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid company code ID' });
      }
    }

    const set = await getColumnSet();
    const fields: string[] = [];
    const values: string[] = [];
    const params: any[] = [];

    const pushField = (col: string | null, val: any) => {
      if (!col) return;
      // Only include columns that exist in the table to avoid 500s
      if (!set.has(col)) return;
      if (val === undefined || val === null || val === '') return;
      let outVal = val;
      if (INT_COLUMNS.has(col)) {
        const n = Number(val);
        if (!Number.isFinite(n)) return; // skip invalid ints
        outVal = n;
      } else if (BOOL_COLUMNS.has(col)) {
        outVal = Boolean(val);
      } else if (DATE_COLUMNS.has(col)) {
        const d = new Date(val);
        if (isNaN(d.getTime())) return; // skip invalid dates
        outVal = d;
      }
      fields.push(col);
      params.push(outVal);
      values.push(`$${params.length}`);
    };

    // Core fields
    pushField('code', finalCode);
    pushField('description', finalDescription);
    pushField('company_code_id', company_code_id);

    // Handle parent business area code (support both old and new field names)
    const parentCode = parent_business_area_code || consolidation_business_area;
    if (set.has('parent_business_area_code')) {
      pushField('parent_business_area_code', parentCode);
    } else if (set.has('consolidation_business_area')) {
      pushField('consolidation_business_area', parentCode);
    }

    // Handle both is_active and active for compatibility
    if (set.has('is_active')) {
      pushField('is_active', is_active !== undefined ? is_active : active);
    } else if (set.has('active')) {
      pushField('active', active !== undefined ? active : is_active);
    }

    // Add timestamps and audit fields
    if (set.has('created_at')) { fields.push('created_at'); values.push('NOW()'); }
    if (set.has('updated_at')) { fields.push('updated_at'); values.push('NOW()'); }

    // Inject audit fields directly bypassing pushField which checks for actual existence slightly differently
    if (set.has('created_by')) { fields.push('created_by'); values.push(`'${(req as any).user?.id || 1}'`); }
    if (set.has('updated_by')) { fields.push('updated_by'); values.push(`'${(req as any).user?.id || 1}'`); }
    if (set.has('_tenantId')) { fields.push('\"_tenantId\"'); values.push(`'${(req as any).user?.tenantId || '001'}'`); }

    if (fields.length === 0) return res.status(500).json({ message: 'No insertable columns' });

    const sql = `INSERT INTO business_areas (${fields.join(',')}) VALUES (${values.join(',')}) RETURNING *`;
    const result = await pool.query(sql, params);

    // Fetch with company code details
    const fullResult = await pool.query(`
      SELECT ba.*, cc.code AS company_code, cc.name AS company_name
      FROM business_areas ba
      LEFT JOIN company_codes cc ON ba.company_code_id = cc.id
      WHERE ba.id = $1
    `, [result.rows[0].id]);

    return res.status(201).json(fullResult.rows[0]);
  } catch (error: any) {
    console.error('Error creating business area:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Business area code already exists', error: error.message });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ message: 'Invalid company code reference', error: error.message });
    }
    return res.status(500).json({ message: 'Failed to create business area', error: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    // Ensure table exists before attempting update
    await ensureTable();
    const { id } = req.params;
    const {
      code,
      description,
      company_code_id,
      parent_business_area_code,
      consolidation_business_area, // Support old field name for backward compatibility
      is_active,
      active
    } = req.body || {};

    // Validate company_code_id if provided
    if (company_code_id !== undefined && company_code_id !== null && company_code_id !== '') {
      const companyCheck = await pool.query('SELECT id FROM company_codes WHERE id = $1', [company_code_id]);
      if (companyCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid company code ID' });
      }
    }

    const set = await getColumnSet();
    const updates: string[] = [];
    const params: any[] = [];

    const add = (col: string | null, val: any) => {
      if (!col) return;
      // Only update columns that exist; ignore unknown columns to prevent errors
      if (!set.has(col)) return;
      if (val === undefined || val === null || val === '') return;
      let outVal = val;
      if (INT_COLUMNS.has(col)) {
        const n = Number(val);
        if (!Number.isFinite(n)) return;
        outVal = n;
      } else if (BOOL_COLUMNS.has(col)) {
        outVal = Boolean(val);
      } else if (DATE_COLUMNS.has(col)) {
        const d = new Date(val);
        if (isNaN(d.getTime())) return;
        outVal = d;
      }
      params.push(outVal);
      updates.push(`${col} = $${params.length}`);
    };

    // Core fields
    add('code', code);
    add('description', description);
    add('company_code_id', company_code_id);

    // Handle parent business area code (support both old and new field names)
    const parentCode = parent_business_area_code || consolidation_business_area;
    if (set.has('parent_business_area_code')) {
      add('parent_business_area_code', parentCode);
    } else if (set.has('consolidation_business_area')) {
      add('consolidation_business_area', parentCode);
    }

    // Handle both is_active and active for compatibility
    if (set.has('is_active')) {
      if (is_active !== undefined) add('is_active', is_active);
      else if (active !== undefined) add('is_active', active);
    } else if (set.has('active')) {
      if (active !== undefined) add('active', active);
      else if (is_active !== undefined) add('active', is_active);
    }

    // Add timestamp and audit fields
    if (set.has('updated_at')) updates.push('updated_at = NOW()');
    if (set.has('updated_by')) updates.push(`updated_by = '${(req as any).user?.id || 1}'`);

    if (updates.length === 0) return res.status(200).json({ message: 'No changes to apply' });

    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    params.push(numericId);
    const result = await pool.query(`UPDATE business_areas SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });

    // Fetch with company code details
    const fullResult = await pool.query(`
      SELECT ba.*, cc.code AS company_code, cc.name AS company_name
      FROM business_areas ba
      LEFT JOIN company_codes cc ON ba.company_code_id = cc.id
      WHERE ba.id = $1
    `, [numericId]);

    return res.json(fullResult.rows[0]);
  } catch (error: any) {
    console.error('Error updating business area:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Business area code already exists', error: error.message });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ message: 'Invalid company code reference', error: error.message });
    }
    return res.status(500).json({ message: 'Failed to update business area', error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    // Ensure table exists before attempting delete
    await ensureTable();
    const { id } = req.params;

    // First check if the record exists
    const checkResult = await pool.query(`SELECT id FROM business_areas WHERE id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Business area not found' });
    }

    // Perform hard delete
    const result = await pool.query(`DELETE FROM business_areas WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json({ message: 'Business area deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting business area:', error);
    return res.status(500).json({ message: 'Failed to delete business area', error: error.message });
  }
});

export default router;
