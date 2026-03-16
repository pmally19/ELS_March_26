import express, { Request, Response } from "express";
import { getPool } from "../../database";

const router = express.Router();
const pool = getPool();

async function ensureTable() {
  // Table already created by script, just verify it exists
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'asset_classes'
      ) THEN
        CREATE TABLE asset_classes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          depreciation_method_id INTEGER REFERENCES depreciation_methods(id) ON DELETE RESTRICT,
          account_determination_key VARCHAR(50) NOT NULL,
          default_useful_life_years INTEGER,
          number_range_code VARCHAR(50),
          screen_layout_code VARCHAR(50),
          is_active BOOLEAN NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        );
        
        CREATE INDEX idx_asset_classes_code ON asset_classes(code);
        CREATE INDEX idx_asset_classes_depreciation_method ON asset_classes(depreciation_method_id);
      END IF;
      
      -- Create junction table for company code assignment
      IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'asset_class_company_codes'
      ) THEN
        CREATE TABLE asset_class_company_codes (
          id SERIAL PRIMARY KEY,
          asset_class_id INTEGER NOT NULL REFERENCES asset_classes(id) ON DELETE CASCADE,
          company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          UNIQUE(asset_class_id, company_code_id)
        );
        
        CREATE INDEX idx_asset_class_company_codes_asset_class ON asset_class_company_codes(asset_class_id);
        CREATE INDEX idx_asset_class_company_codes_company_code ON asset_class_company_codes(company_code_id);
      END IF;
    END $$;
  `);
}

// GET all asset classes
router.get("/", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    
    const { is_active } = req.query;
    
    let query = `
      SELECT 
        ac.id,
        ac.code,
        ac.name,
        ac.description,
        ac.depreciation_method_id,
        dm.code as depreciation_method_code,
        dm.name as depreciation_method_name,
        ac.account_determination_key,
        ac.default_useful_life_years,
        ac.number_range_code,
        ac.screen_layout_code,
        ac.chart_of_depreciation_id,
        ac.is_active,
        ac.created_at,
        ac.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cc.id,
              'code', cc.code,
              'name', cc.name
            )
          ) FILTER (WHERE cc.id IS NOT NULL),
          '[]'::json
        ) as company_codes
      FROM asset_classes ac
      LEFT JOIN depreciation_methods dm ON ac.depreciation_method_id = dm.id
      LEFT JOIN asset_class_company_codes accc ON ac.id = accc.asset_class_id
      LEFT JOIN company_codes cc ON accc.company_code_id = cc.id
    `;
    
    const params: any[] = [];
    
    if (is_active !== undefined) {
      const isActiveValue = typeof is_active === 'string' 
        ? (is_active === 'true') 
        : Boolean(is_active);
      query += ` WHERE ac.is_active = $1`;
      params.push(isActiveValue);
    } else {
      query += ` WHERE ac.is_active = true`;
    }
    
    query += ` GROUP BY ac.id, dm.code, dm.name, ac.chart_of_depreciation_id ORDER BY ac.code`;
    
    const result = await pool.query(query, params);
    
    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching asset classes:", error);
    return res.status(500).json({ message: "Failed to fetch asset classes", error: error.message });
  }
});

// GET single asset class by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ac.id,
        ac.code,
        ac.name,
        ac.description,
        ac.depreciation_method_id,
        dm.code as depreciation_method_code,
        dm.name as depreciation_method_name,
        ac.account_determination_key,
        ac.default_useful_life_years,
        ac.number_range_code,
        ac.screen_layout_code,
        ac.chart_of_depreciation_id,
        ac.is_active,
        ac.created_at,
        ac.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cc.id,
              'code', cc.code,
              'name', cc.name
            )
          ) FILTER (WHERE cc.id IS NOT NULL),
          '[]'::json
        ) as company_codes
      FROM asset_classes ac
      LEFT JOIN depreciation_methods dm ON ac.depreciation_method_id = dm.id
      LEFT JOIN asset_class_company_codes accc ON ac.id = accc.asset_class_id
      LEFT JOIN company_codes cc ON accc.company_code_id = cc.id
      WHERE ac.id = $1
      GROUP BY ac.id, dm.code, dm.name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Asset class not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching asset class:", error);
    return res.status(500).json({ message: "Failed to fetch asset class", error: error.message });
  }
});

// POST create new asset class
router.post("/", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    
    const {
      code,
      name,
      description,
      depreciation_method_id,
      account_determination_key,
      default_useful_life_years,
      number_range_code,
      screen_layout_code,
      chart_of_depreciation_id,
      company_code_ids,
      is_active
    } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required" });
    }
    
    if (!depreciation_method_id) {
      return res.status(400).json({ message: "Depreciation method is required" });
    }
    
    if (!account_determination_key) {
      return res.status(400).json({ message: "Account determination key is required" });
    }
    
    if (!company_code_ids || !Array.isArray(company_code_ids) || company_code_ids.length === 0) {
      return res.status(400).json({ message: "At least one company code must be assigned" });
    }
    
    if (is_active === undefined || is_active === null) {
      return res.status(400).json({ message: "is_active field is required" });
    }
    
    // Validate depreciation method exists and is active
    const depreciationMethodCheck = await pool.query(
      `SELECT id, is_active FROM depreciation_methods WHERE id = $1`,
      [depreciation_method_id]
    );
    
    if (depreciationMethodCheck.rows.length === 0) {
      return res.status(400).json({ message: "Depreciation method not found" });
    }
    
    if (!depreciationMethodCheck.rows[0].is_active) {
      return res.status(400).json({ message: "Depreciation method is not active" });
    }
    
    // Validate chart of depreciation if provided
    if (chart_of_depreciation_id) {
      const chartCheck = await pool.query(
        `SELECT id, is_active FROM chart_of_depreciation WHERE id = $1`,
        [chart_of_depreciation_id]
      );
      
      if (chartCheck.rows.length === 0) {
        return res.status(400).json({ message: "Chart of depreciation not found" });
      }
      
      if (!chartCheck.rows[0].is_active) {
        return res.status(400).json({ message: "Chart of depreciation is not active" });
      }
    }
    
    // Validate company codes exist
    const companyCodePlaceholders = company_code_ids.map((_, index) => `$${index + 1}`).join(',');
    const companyCodeCheck = await pool.query(
      `SELECT id FROM company_codes WHERE id IN (${companyCodePlaceholders})`,
      company_code_ids
    );
    
    if (companyCodeCheck.rows.length !== company_code_ids.length) {
      return res.status(400).json({ message: "One or more company codes not found" });
    }
    
    // Check if code already exists
    const existing = await pool.query(
      `SELECT id FROM asset_classes WHERE code = $1`,
      [code]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Asset class code already exists" });
    }
    
    const result = await pool.query(`
      INSERT INTO asset_classes (
        code, name, description, depreciation_method_id,
        account_determination_key, default_useful_life_years,
        number_range_code, screen_layout_code, chart_of_depreciation_id, is_active,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      code,
      name,
      description || null,
      depreciation_method_id,
      account_determination_key,
      default_useful_life_years ? parseInt(String(default_useful_life_years)) : null,
      number_range_code || null,
      screen_layout_code || null,
      chart_of_depreciation_id || null,
      is_active
    ]);
    
    const newAssetClass = result.rows[0];
    
    // Assign company codes
    for (const companyCodeId of company_code_ids) {
      await pool.query(`
        INSERT INTO asset_class_company_codes (asset_class_id, company_code_id, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (asset_class_id, company_code_id) DO NOTHING
      `, [newAssetClass.id, companyCodeId]);
    }
    
    
    return res.status(201).json(newAssetClass);
  } catch (error: any) {
    console.error("Error creating asset class:", error);
    return res.status(500).json({ message: "Failed to create asset class", error: error.message });
  }
});

// PUT update asset class
router.put("/:id", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    
    const { id } = req.params;
    const {
      code,
      name,
      description,
      depreciation_method_id,
      account_determination_key,
      default_useful_life_years,
      number_range_code,
      screen_layout_code,
      chart_of_depreciation_id,
      company_code_ids,
      is_active
    } = req.body;
    
    // Check if asset class exists
    const existing = await pool.query(
      `SELECT id FROM asset_classes WHERE id = $1`,
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Asset class not found" });
    }
    
    // Check if code is being changed and if new code already exists
    if (code) {
      const codeCheck = await pool.query(
        `SELECT id FROM asset_classes WHERE code = $1 AND id != $2`,
        [code, id]
      );
      
      if (codeCheck.rows.length > 0) {
        return res.status(409).json({ message: "Asset class code already exists" });
      }
    }
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (code !== undefined) {
      updateFields.push(`code = $${paramIndex++}`);
      values.push(code);
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (depreciation_method_id !== undefined) {
      // Validate depreciation method exists and is active
      const depreciationMethodCheck = await pool.query(
        `SELECT id, is_active FROM depreciation_methods WHERE id = $1`,
        [depreciation_method_id]
      );
      
      if (depreciationMethodCheck.rows.length === 0) {
        return res.status(400).json({ message: "Depreciation method not found" });
      }
      
      if (!depreciationMethodCheck.rows[0].is_active) {
        return res.status(400).json({ message: "Depreciation method is not active" });
      }
      
      updateFields.push(`depreciation_method_id = $${paramIndex++}`);
      values.push(depreciation_method_id);
    }
    if (account_determination_key !== undefined) {
      updateFields.push(`account_determination_key = $${paramIndex++}`);
      values.push(account_determination_key);
    }
    if (default_useful_life_years !== undefined) {
      updateFields.push(`default_useful_life_years = $${paramIndex++}`);
      values.push(default_useful_life_years ? parseInt(String(default_useful_life_years)) : null);
    }
    if (number_range_code !== undefined) {
      updateFields.push(`number_range_code = $${paramIndex++}`);
      values.push(number_range_code);
    }
    if (screen_layout_code !== undefined) {
      updateFields.push(`screen_layout_code = $${paramIndex++}`);
      values.push(screen_layout_code);
    }
    if (chart_of_depreciation_id !== undefined) {
      // Validate chart of depreciation if provided
      if (chart_of_depreciation_id) {
        const chartCheck = await pool.query(
          `SELECT id, is_active FROM chart_of_depreciation WHERE id = $1`,
          [chart_of_depreciation_id]
        );
        
        if (chartCheck.rows.length === 0) {
          return res.status(400).json({ message: "Chart of depreciation not found" });
        }
        
        if (!chartCheck.rows[0].is_active) {
          return res.status(400).json({ message: "Chart of depreciation is not active" });
        }
      }
      updateFields.push(`chart_of_depreciation_id = $${paramIndex++}`);
      values.push(chart_of_depreciation_id || null);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    
    // Update company code assignments if provided
    if (company_code_ids !== undefined && Array.isArray(company_code_ids)) {
      if (company_code_ids.length === 0) {
        return res.status(400).json({ message: "At least one company code must be assigned" });
      }
      
      // Validate company codes exist
      const companyCodePlaceholders = company_code_ids.map((_, index) => `$${index + 1}`).join(',');
      const companyCodeCheck = await pool.query(
        `SELECT id FROM company_codes WHERE id IN (${companyCodePlaceholders})`,
        company_code_ids
      );
      
      if (companyCodeCheck.rows.length !== company_code_ids.length) {
        return res.status(400).json({ message: "One or more company codes not found" });
      }
      
      // Delete existing assignments
      await pool.query(
        `DELETE FROM asset_class_company_codes WHERE asset_class_id = $1`,
        [id]
      );
      
      // Insert new assignments
      for (const companyCodeId of company_code_ids) {
        await pool.query(`
          INSERT INTO asset_class_company_codes (asset_class_id, company_code_id, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (asset_class_id, company_code_id) DO NOTHING
        `, [id, companyCodeId]);
      }
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE asset_classes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating asset class:", error);
    return res.status(500).json({ message: "Failed to update asset class", error: error.message });
  }
});

// DELETE asset class
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await ensureTable();
    
    const { id } = req.params;
    
    // Check if asset class is used by any assets
    const assetsUsingClass = await pool.query(
      `SELECT COUNT(*) as count FROM asset_master WHERE asset_class_id = $1`,
      [id]
    );
    
    if (parseInt(assetsUsingClass.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: "Cannot delete asset class. It is being used by one or more assets.",
        assets_count: parseInt(assetsUsingClass.rows[0].count)
      });
    }
    
    const result = await pool.query(
      `DELETE FROM asset_classes WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Asset class not found" });
    }
    
    return res.json({ message: "Asset class deleted successfully", data: result.rows[0] });
  } catch (error: any) {
    console.error("Error deleting asset class:", error);
    return res.status(500).json({ message: "Failed to delete asset class", error: error.message });
  }
});

export default router;

