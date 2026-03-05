import express, { Request, Response } from "express";
import { getPool } from "../../database";

const router = express.Router();
const pool = getPool();

async function ensureTable() {
    await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'account_determination_mapping'
      ) THEN
        CREATE TABLE account_determination_mapping (
          id SERIAL PRIMARY KEY,
          account_key_code VARCHAR(10) NOT NULL,
          business_scenario VARCHAR(100) NOT NULL,
          sales_area_id INTEGER,
          customer_assignment_group_id INTEGER,
          material_assignment_group_id INTEGER,
          condition_type_id INTEGER,
          gl_account_id INTEGER NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          
          CONSTRAINT uq_account_determination UNIQUE (account_key_code, business_scenario, sales_area_id, customer_assignment_group_id, material_assignment_group_id, condition_type_id)
        );
        
        CREATE INDEX idx_account_det_mapping_key ON account_determination_mapping(account_key_code);
        CREATE INDEX idx_account_det_mapping_scenario ON account_determination_mapping(business_scenario);
        CREATE INDEX idx_account_det_mapping_sales_area ON account_determination_mapping(sales_area_id);
        CREATE INDEX idx_account_det_mapping_cust_grp ON account_determination_mapping(customer_assignment_group_id);
        CREATE INDEX idx_account_det_mapping_mat_grp ON account_determination_mapping(material_assignment_group_id);
        CREATE INDEX idx_account_det_mapping_gl_account ON account_determination_mapping(gl_account_id);
        CREATE INDEX idx_account_det_mapping_active ON account_determination_mapping(is_active);
      ELSE
        -- Add sales_area_id column if it doesn't exist (migration)
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'account_determination_mapping' 
          AND column_name = 'sales_area_id'
        ) THEN
          ALTER TABLE account_determination_mapping ADD COLUMN sales_area_id INTEGER;
          CREATE INDEX IF NOT EXISTS idx_account_det_mapping_sales_area ON account_determination_mapping(sales_area_id);
        END IF;

        -- Add customer_assignment_group_id column (migration)
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'account_determination_mapping' 
          AND column_name = 'customer_assignment_group_id'
        ) THEN
          ALTER TABLE account_determination_mapping ADD COLUMN customer_assignment_group_id INTEGER;
          CREATE INDEX IF NOT EXISTS idx_account_det_mapping_cust_grp ON account_determination_mapping(customer_assignment_group_id);
        END IF;

        -- Add material_assignment_group_id column (migration)
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'account_determination_mapping' 
          AND column_name = 'material_assignment_group_id'
        ) THEN
          ALTER TABLE account_determination_mapping ADD COLUMN material_assignment_group_id INTEGER;
          CREATE INDEX IF NOT EXISTS idx_account_det_mapping_mat_grp ON account_determination_mapping(material_assignment_group_id);
        END IF;

        -- Add condition_type_id column (migration)
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'account_determination_mapping' 
          AND column_name = 'condition_type_id'
        ) THEN
          ALTER TABLE account_determination_mapping ADD COLUMN condition_type_id INTEGER;
          CREATE INDEX IF NOT EXISTS idx_account_det_mapping_condition_type ON account_determination_mapping(condition_type_id);
        END IF;
      END IF;
    END $$;
  `);
}

// GET all account determination mappings with details
router.get("/", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { is_active, account_key_code, sales_area_id, business_scenario } = req.query;

        let query = `
      SELECT 
        adm.id,
        adm.account_key_code,
        ak.name as account_key_name,
        ak.account_type,
        adm.business_scenario,
        adm.sales_area_id,
        sa.sales_org_code,
        sa.distribution_channel_code,
        sa.division_code,
        adm.customer_assignment_group_id,
        cag.code as customer_assignment_group_code,
        cag.name as customer_assignment_group_name,
        adm.material_assignment_group_id,
        mag.code as material_assignment_group_code,
        mag.name as material_assignment_group_name,
        adm.condition_type_id,
        ct.code as condition_type_code,
        ct.name as condition_type_name,
        adm.gl_account_id,
        gl.account_number,
        gl.account_name,
        adm.description,
        adm.is_active,
        adm.created_at,
        adm.updated_at
      FROM account_determination_mapping adm
      LEFT JOIN account_keys ak ON adm.account_key_code = ak.code
      LEFT JOIN sd_sales_areas sa ON adm.sales_area_id = sa.id
      LEFT JOIN sd_Customer_account_assignment_groups cag ON adm.customer_assignment_group_id = cag.id
      LEFT JOIN sd_material_account_assignment_groups mag ON adm.material_assignment_group_id = mag.id
      LEFT JOIN sd_condition_types ct ON adm.condition_type_id = ct.id
      LEFT JOIN gl_accounts gl ON adm.gl_account_id = gl.id
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (is_active !== undefined) {
            const isActiveValue = typeof is_active === 'string'
                ? (is_active === 'true')
                : Boolean(is_active);
            query += ` AND adm.is_active = $${paramIndex++}`;
            params.push(isActiveValue);
        }

        if (account_key_code) {
            query += ` AND adm.account_key_code = $${paramIndex++}`;
            params.push(account_key_code);
        }

        if (sales_area_id) {
            query += ` AND adm.sales_area_id = $${paramIndex++}`;
            params.push(sales_area_id);
        }

        if (business_scenario) {
            query += ` AND adm.business_scenario ILIKE $${paramIndex++}`;
            params.push(`%${business_scenario}%`);
        }

        query += ` ORDER BY adm.sales_area_id, adm.account_key_code, adm.business_scenario`;

        const result = await pool.query(query, params);

        return res.json(result.rows);
    } catch (error: any) {
        console.error("Error fetching account determination mappings:", error);
        return res.status(500).json({ message: "Failed to fetch account determination mappings", error: error.message });
    }
});

// GET single account determination mapping by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        adm.id,
        adm.account_key_code,
        ak.name as account_key_name,
        ak.account_type,
        adm.business_scenario,
        adm.sales_area_id,
        sa.sales_org_code,
        sa.distribution_channel_code,
        sa.division_code,
        adm.customer_assignment_group_id,
        cag.code as customer_assignment_group_code,
        cag.name as customer_assignment_group_name,
        adm.material_assignment_group_id,
        mag.code as material_assignment_group_code,
        mag.name as material_assignment_group_name,
        adm.condition_type_id,
        ct.code as condition_type_code,
        ct.name as condition_type_name,
        adm.gl_account_id,
        gl.account_number,
        gl.account_name,
        adm.description,
        adm.is_active,
        adm.created_at,
        adm.updated_at
      FROM account_determination_mapping adm
      LEFT JOIN account_keys ak ON adm.account_key_code = ak.code
      LEFT JOIN sd_sales_areas sa ON adm.sales_area_id = sa.id
      LEFT JOIN sd_Customer_account_assignment_groups cag ON adm.customer_assignment_group_id = cag.id
      LEFT JOIN sd_material_account_assignment_groups mag ON adm.material_assignment_group_id = mag.id
      LEFT JOIN sd_condition_types ct ON adm.condition_type_id = ct.id
      LEFT JOIN gl_accounts gl ON adm.gl_account_id = gl.id
      WHERE adm.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Account determination mapping not found" });
        }

        return res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error fetching account determination mapping:", error);
        return res.status(500).json({ message: "Failed to fetch account determination mapping", error: error.message });
    }
});

// POST create new account determination mapping
router.post("/", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error('Failed to parse request body:', e);
            }
        }

        const {
            account_key_code,
            business_scenario,
            sales_area_id,
            customer_assignment_group_id,
            material_assignment_group_id,
            condition_type_id,
            gl_account_id,
            description,
            is_active
        } = body;

        // Upsert: insert or update if same combination already exists
        const result = await pool.query(`
      INSERT INTO account_determination_mapping (
        account_key_code, business_scenario, sales_area_id,
        customer_assignment_group_id, material_assignment_group_id,
        condition_type_id, gl_account_id, description, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT ON CONSTRAINT uq_account_determination
      DO UPDATE SET
        gl_account_id = EXCLUDED.gl_account_id,
        description   = EXCLUDED.description,
        is_active     = EXCLUDED.is_active,
        updated_at    = NOW()
      RETURNING *
    `, [
            account_key_code,
            business_scenario,
            sales_area_id || null,
            customer_assignment_group_id || null,
            material_assignment_group_id || null,
            condition_type_id || null,
            gl_account_id,
            description || null,
            is_active ?? true
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error("Error creating account determination mapping:", error);
        return res.status(500).json({ message: "Failed to create account determination mapping", error: error.message });
    }
});

// PUT update account determination mapping
router.put("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;

        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error('Failed to parse request body:', e);
            }
        }

        const {
            account_key_code,
            business_scenario,
            sales_area_id,
            customer_assignment_group_id,
            material_assignment_group_id,
            condition_type_id,
            gl_account_id,
            description,
            is_active
        } = body;

        // Check if mapping exists
        const existing = await pool.query(
            `SELECT * FROM account_determination_mapping WHERE id = $1`,
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Account determination mapping not found" });
        }

        // Check for duplicate if key fields are being changed
        if (account_key_code || business_scenario || sales_area_id !== undefined || customer_assignment_group_id !== undefined || material_assignment_group_id !== undefined || condition_type_id !== undefined) {
            const newKeyCode = account_key_code || existing.rows[0].account_key_code;
            const newScenario = business_scenario || existing.rows[0].business_scenario;
            const newSalesAreaId = sales_area_id !== undefined ? sales_area_id : existing.rows[0].sales_area_id;
            const newCustGrpId = customer_assignment_group_id !== undefined ? customer_assignment_group_id : existing.rows[0].customer_assignment_group_id;
            const newMatGrpId = material_assignment_group_id !== undefined ? material_assignment_group_id : existing.rows[0].material_assignment_group_id;
            const newCondTypeId = condition_type_id !== undefined ? condition_type_id : existing.rows[0].condition_type_id;

            const duplicateCheck = await pool.query(
                `SELECT id FROM account_determination_mapping 
                 WHERE account_key_code = $1 
                   AND business_scenario = $2 
                   AND (sales_area_id = $3 OR (sales_area_id IS NULL AND $3 IS NULL))
                   AND (customer_assignment_group_id = $4 OR (customer_assignment_group_id IS NULL AND $4 IS NULL))
                   AND (material_assignment_group_id = $5 OR (material_assignment_group_id IS NULL AND $5 IS NULL))
                   AND (condition_type_id = $6 OR (condition_type_id IS NULL AND $6 IS NULL))
                   AND id != $7`,
                [
                    newKeyCode,
                    newScenario,
                    newSalesAreaId,
                    newCustGrpId,
                    newMatGrpId,
                    newCondTypeId,
                    id
                ]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(409).json({
                    message: "Mapping already exists for this combination"
                });
            }
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (account_key_code !== undefined) {
            updateFields.push(`account_key_code = $${paramIndex++}`);
            values.push(account_key_code);
        }
        if (business_scenario !== undefined) {
            updateFields.push(`business_scenario = $${paramIndex++}`);
            values.push(business_scenario);
        }
        if (sales_area_id !== undefined) {
            updateFields.push(`sales_area_id = $${paramIndex++}`);
            values.push(sales_area_id);
        }
        if (customer_assignment_group_id !== undefined) {
            updateFields.push(`customer_assignment_group_id = $${paramIndex++}`);
            values.push(customer_assignment_group_id);
        }
        if (material_assignment_group_id !== undefined) {
            updateFields.push(`material_assignment_group_id = $${paramIndex++}`);
            values.push(material_assignment_group_id);
        }
        if (condition_type_id !== undefined) {
            updateFields.push(`condition_type_id = $${paramIndex++}`);
            values.push(condition_type_id);
        }
        if (gl_account_id !== undefined) {
            updateFields.push(`gl_account_id = $${paramIndex++}`);
            values.push(gl_account_id);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE account_determination_mapping 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        return res.json(result.rows[0]);
    } catch (error: any) {
        console.error("Error updating account determination mapping:", error);
        return res.status(500).json({ message: "Failed to update account determination mapping", error: error.message });
    }
});

// DELETE account determination mapping
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await ensureTable();

        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM account_determination_mapping WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Account determination mapping not found" });
        }

        return res.json({ message: "Account determination mapping deleted successfully", data: result.rows[0] });
    } catch (error: any) {
        console.error("Error deleting account determination mapping:", error);
        return res.status(500).json({ message: "Failed to delete account determination mapping", error: error.message });
    }
});


export async function getGLAccountsBySalesArea(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Sales Area ID" });
        }

        const result = await pool.query(`
      SELECT DISTINCT
        ga.id,
        ga.account_number,
        ga.account_name,
        ga.is_active
      FROM gl_accounts ga
      JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      JOIN company_codes cc ON cc.chart_of_accounts_id = coa.id
      JOIN sd_sales_organizations so ON so.company_code_id = cc.id
      JOIN sd_sales_areas sa ON sa.sales_org_code = so.code
      WHERE sa.id = $1 AND ga.is_active = true
      ORDER BY ga.account_number
    `, [id]);

        return res.json(result.rows);
    } catch (error: any) {
        console.error("Error fetching GL accounts by sales area:", error);
        return res.status(500).json({ message: `Failed to fetch GL accounts: ${error.message}` });
    }
}

export async function getConditionTypesBySalesArea(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Sales Area ID" });
        }

        const result = await pool.query(`
      SELECT
        ct.id,
        ct.condition_code as code,
        ct.condition_name as name,
        ct.is_active
      FROM condition_types ct
      WHERE ct.is_active = true
      ORDER BY ct.condition_code
    `, []);

        return res.json(result.rows);
    } catch (error: any) {
        console.error("Error fetching condition types by sales area:", error);
        return res.status(500).json({ message: `Failed to fetch condition types: ${error.message}` });
    }
}

export default router;
