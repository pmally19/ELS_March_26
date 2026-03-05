import express, { Request, Response } from "express";
import { pool } from "../../db";
import { ensureActivePool } from "../../database";

const router = express.Router();

async function ensureAssetsTable(): Promise<void> {
  await pool.query(`
    -- Ensure required columns exist on asset_master table
    CREATE TABLE IF NOT EXISTS asset_master (
      id SERIAL PRIMARY KEY,
      asset_number VARCHAR(50) UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      asset_class VARCHAR(255),
      acquisition_date DATE,
      acquisition_cost NUMERIC(18,2),
      depreciation_start_date DATE,
      current_value NUMERIC(18,2),
      depreciation_method VARCHAR(50),
      useful_life_years INTEGER,
      company_code_id INTEGER,
      cost_center_id INTEGER,
      location VARCHAR(255),
      status VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      created_by INTEGER,
      plant_id INTEGER,
      parent_asset_id INTEGER,
      is_auc BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    -- Make asset_number nullable if not already
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'asset_master' 
        AND column_name = 'asset_number' 
        AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE asset_master ALTER COLUMN asset_number DROP NOT NULL;
      END IF;
    END $$;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS asset_number VARCHAR(50);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS description VARCHAR(1000);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS asset_class VARCHAR(255);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS acquisition_date DATE;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC(18,2);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS depreciation_start_date DATE;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS current_value NUMERIC(18,2);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(50);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS useful_life_years INTEGER;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS company_code_id INTEGER;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS cost_center_id INTEGER;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS location VARCHAR(255);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS status VARCHAR(50);
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS created_by INTEGER;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS plant_id INTEGER;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS parent_asset_id INTEGER;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS is_auc BOOLEAN DEFAULT false;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS "_tenantId" CHAR(3) DEFAULT '001';
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS updated_by INTEGER;
    ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMPTZ;
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'asset_master' AND indexname = 'asset_master_asset_number_key'
      ) THEN
        CREATE UNIQUE INDEX asset_master_asset_number_key ON asset_master(asset_number) WHERE asset_number IS NOT NULL;
      END IF;
    END $$;
    -- Ensure sequence is synced with table to prevent duplicate key errors
    DO $$ 
    DECLARE
      max_id INTEGER;
      seq_val INTEGER;
    BEGIN
      SELECT COALESCE(MAX(id), 0) INTO max_id FROM asset_master;
      SELECT last_value INTO seq_val FROM asset_master_id_seq;
      IF seq_val <= max_id THEN
        PERFORM setval('asset_master_id_seq', max_id + 1, false);
      END IF;
    END $$;
  `);
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    ensureActivePool();
    await ensureAssetsTable();
    const result = await pool.query(`
      SELECT 
        am.id,
        am.asset_number,
        am.name,
        am.description,
        am.asset_class,
        am.asset_class_id,
        ac.code as asset_class_code,
        ac.name as asset_class_name,
        am.acquisition_date,
        am.acquisition_cost,
        am.current_value,
        am.depreciation_method,
        am.useful_life_years,
        am.status,
        am.location,
        am.is_active,
        am.created_at,
        am.updated_at,
        am.created_by,
        am.updated_by,
        am."_tenantId" as tenant_id,
        am."_deletedAt" as deleted_at,
        am.company_code_id,
        am.cost_center_id,
        cc.code as company_code,
        cc.name as company_name,
        co.cost_center as cost_center_code,
        co.description as cost_center_description
      FROM asset_master am
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN cost_centers co ON am.cost_center_id = co.id
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE COALESCE(am.is_active, true) = true AND am."_deletedAt" IS NULL
      ORDER BY am.id
    `);
    const rows = result.rows.map((r: any) => ({
      id: r.id,
      asset_code: r.asset_number || null,
      name: r.name || null,
      description: r.description || null,
      asset_class_id: r.asset_class_id || null,
      asset_class_code: r.asset_class_code || null,
      asset_class_name: r.asset_class_name || null,
      asset_class: r.asset_class_name || r.asset_class_code || r.asset_class || null,
      category: r.asset_class_name || r.asset_class_code || r.asset_class || null,
      acquisition_date: r.acquisition_date || null,
      acquisition_value: r.acquisition_cost || null,
      current_value: r.current_value || null,
      depreciation_method: r.depreciation_method || null,
      useful_life_years: r.useful_life_years || null,
      status: r.status ? r.status.toLowerCase() : null,
      location: r.location || null,
      company_code_id: r.company_code_id || null,
      cost_center_id: r.cost_center_id || null,
      company_code: r.company_code || null,
      company_name: r.company_name || null,
      cost_center_code: r.cost_center_code || null,
      cost_center_description: r.cost_center_description || null,
      active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: r.created_by,
      updated_by: r.updated_by,
      tenant_id: r.tenant_id,
      deleted_at: r.deleted_at
    }));
    return res.json(rows);
  } catch (error: any) {
    console.error("Error fetching assets:", error);
    return res.status(500).json({ message: "Failed to fetch assets", error: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        am.id, am.asset_number, am.name, am.description, am.asset_class, am.asset_class_id,
        am.acquisition_date, am.acquisition_cost, am.current_value, 
        am.depreciation_method, am.useful_life_years, am.status, am.location, 
        am.is_active, am.created_at, am.updated_at, am.created_by, am.updated_by, am."_tenantId" as tenant_id, am."_deletedAt" as deleted_at,
        am.company_code_id, am.cost_center_id,
        cc.code as company_code, cc.name as company_name,
        co.cost_center as cost_center_code, co.description as cost_center_description,
        ac.code as asset_class_code, ac.name as asset_class_name
      FROM asset_master am
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN cost_centers co ON am.cost_center_id = co.id
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE am.id = $1 AND am."_deletedAt" IS NULL`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const r = result.rows[0];
    return res.json({
      id: r.id,
      asset_code: r.asset_number || null,
      name: r.name || null,
      description: r.description || null,
      asset_class: r.asset_class || null,
      category: r.asset_class || null,
      acquisition_date: r.acquisition_date || null,
      acquisition_value: r.acquisition_cost || null,
      current_value: r.current_value || null,
      depreciation_method: r.depreciation_method || null,
      useful_life_years: r.useful_life_years || null,
      status: r.status ? r.status.toLowerCase() : null,
      location: r.location || null,
      company_code_id: r.company_code_id || null,
      cost_center_id: r.cost_center_id || null,
      company_code: r.company_code || null,
      company_name: r.company_name || null,
      cost_center_code: r.cost_center_code || null,
      cost_center_description: r.cost_center_description || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: r.created_by,
      updated_by: r.updated_by,
      tenant_id: r.tenant_id,
      deleted_at: r.deleted_at
    });
  } catch (error: any) {
    console.error("Error fetching asset:", error);
    return res.status(500).json({ message: "Failed to fetch asset", error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    await ensureAssetsTable();

    // Ensure sequence is synced before insert to prevent duplicate key errors
    const maxIdResult = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM asset_master');
    const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
    const seqResult = await pool.query("SELECT last_value FROM asset_master_id_seq");
    const seqValue = parseInt(seqResult.rows[0]?.last_value || '0');
    if (seqValue <= maxId) {
      await pool.query(`SELECT setval('asset_master_id_seq', ${maxId + 1}, false)`);
    }
    const body = req.body || {};
    const asset_code = body.asset_code ?? body.assetNumber ?? body.asset_number ?? body.code ?? null;
    const name = body.name ?? body.asset_name ?? body.assetName ?? null;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    const description = body.description ?? body.asset_description ?? null;
    const asset_class_id_param = body.asset_class_id ?? null;
    const category = body.category ?? body.asset_class ?? body.assetClass ?? null;
    const acquisition_date = body.acquisition_date ?? body.capitalization_date ?? body.capitalizationDate ?? null;
    const acquisition_value = body.acquisition_value ?? body.acquisition_cost ?? body.acquisitionValue ?? null;
    const current_value = body.current_value ?? body.currentValue ?? null;
    const depreciation_method = body.depreciation_method ?? body.depreciationKey ?? null;
    const useful_life_years = body.useful_life_years ?? body.usefulLifeYears ?? null;
    const status = body.status ?? null;
    const location = body.location ?? null;
    const company_code_id = body.company_code_id ?? body.companyCodeId ?? null;
    const cost_center_id = body.cost_center_id ?? body.costCenterId ?? null;

    // Normalize fields to match database constraints (trim and max lengths)
    const normalize = (val: any, max: number): string | null => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      if (s === '') return null;
      return s.length > max ? s.slice(0, max) : s;
    };

    const normalizedAssetNumber = normalize(asset_code, 50);
    const normalizedName = normalize(name, 255);
    const normalizedDescription = normalize(description, 1000);
    const normalizedClass = normalize(category, 255);
    const normalizedDepMethod = normalize(depreciation_method, 50);
    const normalizedStatus = normalize(status, 50);
    const normalizedLocation = normalize(location, 255);

    // Sanitize inputs
    const acqDateParam = (typeof acquisition_date === 'string' && acquisition_date.trim() !== '') ? acquisition_date.trim() : null;
    const toNumericOrNull = (val: any) => {
      if (val === '' || val === undefined || val === null) return null;
      const num = typeof val === 'number' ? val : parseFloat(String(val).trim());
      return Number.isFinite(num) ? num : null;
    };
    const acqValueParam = toNumericOrNull(acquisition_value);
    const currValueParam = toNumericOrNull(current_value);

    // If explicit asset number provided, ensure uniqueness
    if (normalizedAssetNumber) {
      const exists = await pool.query(`SELECT id FROM asset_master WHERE asset_number = $1`, [normalizedAssetNumber]);
      if (exists.rows.length > 0) {
        return res.status(409).json({ message: 'Asset code already exists', code: 'asset_code_conflict' });
      }
    }

    // Handle asset_class_id - use provided ID or try to find by text
    let finalAssetClassId = asset_class_id_param ? parseInt(String(asset_class_id_param)) : null;
    if (!finalAssetClassId && category) {
      const classResult = await pool.query(
        `SELECT id FROM asset_classes WHERE code = $1 OR name = $1 LIMIT 1`,
        [category]
      );
      if (classResult.rows.length > 0) {
        finalAssetClassId = classResult.rows[0].id;
      }
    }

    // Insert asset - all fields come from request body, no defaults
    const insertResult = await pool.query(
      `INSERT INTO asset_master (
        asset_number, name, description, asset_class_id, asset_class, acquisition_date, acquisition_cost, current_value, depreciation_method, useful_life_years, status, location, company_code_id, cost_center_id, is_active, active, created_at, updated_at, created_by, updated_by, "_tenantId"
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        NULLIF($6::text, '')::date,
        NULLIF($7::text, '')::numeric,
        NULLIF($8::text, '')::numeric,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        true,
        true,
        NOW(),
        NOW(),
        $15,
        $16,
        $17
      )
      RETURNING *`,
      [
        normalizedAssetNumber,
        normalizedName,
        normalizedDescription,
        finalAssetClassId,
        normalizedClass,
        acqDateParam,
        acqValueParam,
        currValueParam,
        normalizedDepMethod,
        useful_life_years ? parseInt(String(useful_life_years)) : null,
        normalizedStatus,
        normalizedLocation,
        company_code_id ? parseInt(String(company_code_id)) : null,
        cost_center_id ? parseInt(String(cost_center_id)) : null,
        (req as any).user?.id || 1,
        (req as any).user?.id || 1,
        (req as any).user?.tenantId || '001'
      ]
    );

    const r = insertResult.rows[0];

    // Fetch the created asset with joins to get company code, cost center, and asset class details
    const createdAsset = await pool.query(
      `SELECT 
        am.*,
        cc.code as company_code, cc.name as company_name,
        co.cost_center as cost_center_code, co.description as cost_center_description,
        ac.code as asset_class_code, ac.name as asset_class_name
      FROM asset_master am
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN cost_centers co ON am.cost_center_id = co.id
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE am.id = $1`,
      [r.id]
    );

    const asset = createdAsset.rows[0];
    return res.status(201).json({
      id: asset.id,
      asset_code: asset.asset_number || null,
      name: asset.name || null,
      description: asset.description || null,
      asset_class_id: asset.asset_class_id || null,
      asset_class_code: asset.asset_class_code || null,
      asset_class_name: asset.asset_class_name || null,
      asset_class: asset.asset_class_name || asset.asset_class_code || asset.asset_class || null,
      category: asset.asset_class_name || asset.asset_class_code || asset.asset_class || null,
      acquisition_date: asset.acquisition_date || null,
      acquisition_value: asset.acquisition_cost || null,
      current_value: asset.current_value || null,
      depreciation_method: asset.depreciation_method || null,
      useful_life_years: asset.useful_life_years || null,
      status: asset.status ? asset.status.toLowerCase() : null,
      location: asset.location || null,
      company_code_id: asset.company_code_id || null,
      cost_center_id: asset.cost_center_id || null,
      company_code: asset.company_code || null,
      company_name: asset.company_name || null,
      cost_center_code: asset.cost_center_code || null,
      cost_center_description: asset.cost_center_description || null
    });
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return res.status(500).json({ message: "Failed to create asset", error: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const { id: idParam } = req.params;
    const id = Number.parseInt(String(idParam), 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid id parameter' });
    }

    const body = req.body || {};
    const asset_code = body.asset_code ?? body.assetNumber ?? body.asset_number ?? body.code ?? null;
    const name = body.name ?? body.asset_name ?? body.assetName ?? null;
    const description = body.description ?? body.asset_description ?? null;
    const asset_class_id_param = body.asset_class_id ?? null;
    const category = body.category ?? body.asset_class ?? body.assetClass ?? null;
    const acquisition_date = body.acquisition_date ?? body.capitalization_date ?? body.capitalizationDate ?? null;
    const acquisition_value = body.acquisition_value ?? body.acquisition_cost ?? body.acquisitionValue ?? null;
    const current_value = body.current_value ?? body.currentValue ?? null;
    const depreciation_method = body.depreciation_method ?? body.depreciationKey ?? null;
    const useful_life_years = body.useful_life_years ?? body.usefulLifeYears ?? null;
    const status = body.status ?? null;
    const location = body.location ?? null;
    const company_code_id = body.company_code_id ?? body.companyCodeId ?? null;
    const cost_center_id = body.cost_center_id ?? body.costCenterId ?? null;
    const active = body.active ?? body.is_active ?? null;

    const normalize = (val: any, max: number): string | null => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      if (s === '') return null;
      return s.length > max ? s.slice(0, max) : s;
    };

    const normalizedAssetNumber = normalize(asset_code, 50);
    const normalizedName = normalize(name, 255);
    const normalizedDescription = normalize(description, 1000);
    const normalizedClass = normalize(category, 255);
    const normalizedDepMethod = normalize(depreciation_method, 50);
    const normalizedStatus = normalize(status, 50);
    const normalizedLocation = normalize(location, 255);

    const toNumericOrNullUpd = (v: any) => {
      if (v === '' || v === undefined || v === null) return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v).trim());
      return Number.isFinite(n) ? n : null;
    };

    // Enforce unique asset_number if attempting to update it
    if (normalizedAssetNumber) {
      const conflict = await pool.query(
        `SELECT id FROM asset_master WHERE asset_number = $1 AND id <> $2`,
        [normalizedAssetNumber, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ message: 'Asset code already exists', code: 'asset_code_conflict' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    const add = (col: string, val: any) => { if (val !== null && val !== undefined) { params.push(val); updates.push(`${col} = $${params.length}`); } };
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    // Handle asset_class_id - use provided ID or try to find by text
    let finalAssetClassId = asset_class_id_param ? parseInt(String(asset_class_id_param)) : null;
    if (!finalAssetClassId && category && (has('category') || has('asset_class') || has('assetClass'))) {
      const classResult = await pool.query(
        `SELECT id FROM asset_classes WHERE code = $1 OR name = $1 LIMIT 1`,
        [category]
      );
      if (classResult.rows.length > 0) {
        finalAssetClassId = classResult.rows[0].id;
      }
    }

    // only update when provided in body
    if (has('asset_code') || has('assetNumber') || has('asset_number') || has('code')) add('asset_number', normalizedAssetNumber);
    if (has('name') || has('asset_name') || has('assetName') || has('description') || has('asset_description')) add('name', normalizedName);
    if (has('description') || has('asset_description')) add('description', normalizedDescription);
    // Handle asset_class_id - only add once, prioritize explicit ID over category text
    if (has('asset_class_id') || has('category') || has('asset_class') || has('assetClass')) {
      // If asset_class_id was explicitly provided, use it; otherwise use the resolved ID from category
      if (finalAssetClassId !== null) {
        add('asset_class_id', finalAssetClassId);
      }
      // Always update asset_class text field if category/asset_class is provided
      if (has('category') || has('asset_class') || has('assetClass')) {
        add('asset_class', normalizedClass);
      }
    }
    if (has('acquisition_date') || has('capitalization_date') || has('capitalizationDate')) add('acquisition_date', (typeof acquisition_date === 'string' && acquisition_date.trim() !== '') ? acquisition_date.trim() : null);
    if (has('acquisition_value') || has('acquisition_cost') || has('acquisitionValue')) add('acquisition_cost', toNumericOrNullUpd(acquisition_value));
    if (has('current_value') || has('currentValue')) add('current_value', toNumericOrNullUpd(current_value));
    if (has('depreciation_method') || has('depreciationKey')) add('depreciation_method', normalizedDepMethod);
    if (has('useful_life_years') || has('usefulLifeYears')) add('useful_life_years', useful_life_years ? parseInt(String(useful_life_years)) : null);
    if (has('status')) add('status', normalizedStatus);
    if (has('location')) add('location', normalizedLocation);
    if (has('company_code_id') || has('companyCodeId')) add('company_code_id', company_code_id ? parseInt(String(company_code_id)) : null);
    if (has('cost_center_id') || has('costCenterId')) add('cost_center_id', cost_center_id ? parseInt(String(cost_center_id)) : null);
    if (has('active') || has('is_active')) {
      if (active !== null && active !== undefined) {
        add('is_active', active);
      }
    }

    // Add audit trail explicitly
    params.push((req as any).user?.id || 1);
    updates.push(`updated_by = $${params.length}`);
    updates.push('updated_at = NOW()');

    // If no fields to update (only updated_at), just return current record
    if (updates.length === 1) {
      const cur = await pool.query(`
        SELECT 
          am.*,
          cc.code as company_code, cc.name as company_name,
          co.cost_center as cost_center_code, co.description as cost_center_description,
          ac.code as asset_class_code, ac.name as asset_class_name
        FROM asset_master am
        LEFT JOIN company_codes cc ON am.company_code_id = cc.id
        LEFT JOIN cost_centers co ON am.cost_center_id = co.id
        LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
        WHERE am.id = $1
      `, [id]);
      if (cur.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      const r = cur.rows[0];
      return res.json({
        id: r.id,
        asset_code: r.asset_number || null,
        name: r.name || null,
        description: r.description || null,
        asset_class_id: r.asset_class_id || null,
        asset_class_code: r.asset_class_code || null,
        asset_class_name: r.asset_class_name || null,
        asset_class: r.asset_class_name || r.asset_class_code || r.asset_class || null,
        category: r.asset_class_name || r.asset_class_code || r.asset_class || null,
        acquisition_date: r.acquisition_date || null,
        acquisition_value: r.acquisition_cost || null,
        current_value: r.current_value || null,
        depreciation_method: r.depreciation_method || null,
        useful_life_years: r.useful_life_years || null,
        status: r.status ? r.status.toLowerCase() : null,
        location: r.location || null,
        company_code_id: r.company_code_id || null,
        cost_center_id: r.cost_center_id || null,
        company_code: r.company_code || null,
        company_name: r.company_name || null,
        cost_center_code: r.cost_center_code || null,
        cost_center_description: r.cost_center_description || null
      });
    }

    params.push(id);
    const result = await pool.query(`UPDATE asset_master SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });

    // Fetch the updated asset with joins to get company code, cost center, and asset class details
    const updatedAsset = await pool.query(
      `SELECT 
        am.*,
        cc.code as company_code, cc.name as company_name,
        co.cost_center as cost_center_code, co.description as cost_center_description,
        ac.code as asset_class_code, ac.name as asset_class_name
      FROM asset_master am
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN cost_centers co ON am.cost_center_id = co.id
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE am.id = $1`,
      [id]
    );

    const r = updatedAsset.rows[0];
    return res.json({
      id: r.id,
      asset_code: r.asset_number || null,
      name: r.name || null,
      description: r.description || null,
      asset_class_id: r.asset_class_id || null,
      asset_class_code: r.asset_class_code || null,
      asset_class_name: r.asset_class_name || null,
      asset_class: r.asset_class_name || r.asset_class_code || r.asset_class || null,
      category: r.asset_class_name || r.asset_class_code || r.asset_class || null,
      acquisition_date: r.acquisition_date || null,
      acquisition_value: r.acquisition_cost || null,
      current_value: r.current_value || null,
      depreciation_method: r.depreciation_method || null,
      useful_life_years: r.useful_life_years || null,
      status: r.status ? r.status.toLowerCase() : null,
      location: r.location || null,
      company_code_id: r.company_code_id || null,
      cost_center_id: r.cost_center_id || null,
      company_code: r.company_code || null,
      company_name: r.company_name || null,
      cost_center_code: r.cost_center_code || null,
      cost_center_description: r.cost_center_description || null
    });
  } catch (error: any) {
    console.error("Error updating asset:", error);
    return res.status(500).json({
      message: "Failed to update asset",
      error: error?.message || String(error),
      code: error?.code,
      detail: error?.detail
    });
  }
});

// PATCH alias for partial updates (some UIs use PATCH instead of PUT)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const { id: idParam } = req.params;
    const id = Number.parseInt(String(idParam), 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid id parameter' });
    }

    const body = req.body || {};
    const asset_code = body.asset_code ?? body.assetNumber ?? body.asset_number ?? body.code ?? null;
    const name = body.name ?? body.asset_name ?? body.assetName ?? null;
    const description = body.description ?? body.asset_description ?? null;
    const category = body.category ?? body.asset_class ?? body.assetClass ?? null;
    const acquisition_date = body.acquisition_date ?? body.capitalization_date ?? body.capitalizationDate ?? null;
    const acquisition_value = body.acquisition_value ?? body.acquisition_cost ?? body.acquisitionValue ?? null;
    const current_value = body.current_value ?? body.currentValue ?? null;
    const depreciation_method = body.depreciation_method ?? body.depreciationKey ?? null;
    const status = body.status ?? null;
    const location = body.location ?? null;
    const active = body.active ?? body.is_active ?? null;

    const normalize = (val: any, max: number): string | null => {
      if (val === undefined || val === null) return null;
      const s = String(val).trim();
      if (s === '') return null;
      return s.length > max ? s.slice(0, max) : s;
    };

    const normalizedAssetNumber = normalize(asset_code, 50);
    const normalizedName = normalize(name, 255);
    const normalizedDescription = normalize(description, 1000);
    const normalizedClass = normalize(category, 255);
    const normalizedDepMethod = normalize(depreciation_method, 50);
    const normalizedStatus = normalize(status, 50);
    const normalizedLocation = normalize(location, 255);

    const toNumericOrNullUpd = (v: any) => {
      if (v === '' || v === undefined || v === null) return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v).trim());
      return Number.isFinite(n) ? n : null;
    };

    if (normalizedAssetNumber) {
      const conflict = await pool.query(
        `SELECT id FROM asset_master WHERE asset_number = $1 AND id <> $2`,
        [normalizedAssetNumber, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ message: 'Asset code already exists', code: 'asset_code_conflict' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    const add = (col: string, val: any) => { if (val !== null && val !== undefined) { params.push(val); updates.push(`${col} = $${params.length}`); } };
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    if (has('asset_code') || has('assetNumber') || has('asset_number') || has('code')) add('asset_number', normalizedAssetNumber);
    if (has('name') || has('asset_name') || has('assetName') || has('description') || has('asset_description')) add('name', normalizedName);
    if (has('description') || has('asset_description')) add('description', normalizedDescription);
    if (has('category') || has('asset_class') || has('assetClass')) add('asset_class', normalizedClass);
    if (has('acquisition_date') || has('capitalization_date') || has('capitalizationDate')) add('acquisition_date', (typeof acquisition_date === 'string' && acquisition_date.trim() !== '') ? acquisition_date.trim() : null);
    if (has('acquisition_value') || has('acquisition_cost') || has('acquisitionValue')) add('acquisition_cost', toNumericOrNullUpd(acquisition_value));
    if (has('current_value') || has('currentValue')) add('current_value', toNumericOrNullUpd(current_value));
    if (has('depreciation_method') || has('depreciationKey')) add('depreciation_method', normalizedDepMethod);
    if (has('status')) add('status', normalizedStatus);
    if (has('location')) add('location', normalizedLocation);
    if (has('active') || has('is_active')) {
      if (active !== null && active !== undefined) {
        add('is_active', active);
      }
    }
    // Add audit trail explicitly
    params.push((req as any).user?.id || 1);
    updates.push(`updated_by = $${params.length}`);
    updates.push('updated_at = NOW()');

    // If no fields to update (only updated_at), just return current record
    if (updates.length === 1) {
      const cur = await pool.query(`SELECT * FROM asset_master WHERE id = $1`, [id]);
      if (cur.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      const r = cur.rows[0];
      return res.json({
        id: r.id,
        asset_code: r.asset_number || null,
        name: r.name || null,
        description: r.description || null,
        category: r.asset_class || null,
        acquisition_date: r.acquisition_date || null,
        acquisition_value: r.acquisition_cost || null,
        current_value: r.current_value || null,
        depreciation_method: r.depreciation_method || null,
        status: r.status ? r.status.toLowerCase() : null,
        location: r.location || null
      });
    }

    params.push(id);
    const result = await pool.query(`UPDATE asset_master SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const r = result.rows[0];
    return res.json({
      id: r.id,
      asset_code: r.asset_number || null,
      name: r.name || null,
      description: r.description || null,
      category: r.asset_class || null,
      acquisition_date: r.acquisition_date || null,
      acquisition_value: r.acquisition_cost || null,
      current_value: r.current_value || null,
      depreciation_method: r.depreciation_method || null,
      status: r.status ? r.status.toLowerCase() : null,
      location: r.location || null
    });
  } catch (error: any) {
    console.error("Error updating asset (patch):", error);
    return res.status(500).json({
      message: "Failed to update asset",
      error: error?.message || String(error),
      code: error?.code,
      detail: error?.detail
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const { id } = req.params;
    const result = await pool.query(`UPDATE asset_master SET "_deletedAt" = NOW(), updated_by = $2 WHERE id = $1 AND "_deletedAt" IS NULL RETURNING id`, [id, (req as any).user?.id || 1]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Asset deactivated' });
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    return res.status(500).json({ message: "Failed to delete asset", error: error.message });
  }
});

export default router;


