import { Router, Request, Response } from 'express';
import { getPool } from '../../database';

const router = Router();

// Ensure table exists
async function ensureTable() {
    await getPool().query(`
    CREATE TABLE IF NOT EXISTS tax_condition_records (
      id SERIAL PRIMARY KEY,
      condition_type_code VARCHAR(10) NOT NULL,
      departure_country VARCHAR(3),
      departure_state VARCHAR(50),
      destination_country VARCHAR(3),
      destination_state VARCHAR(50),
      customer_tax_class VARCHAR(5),
      material_tax_class VARCHAR(5),
      tax_profile_id INTEGER REFERENCES tax_profiles(id),
      tax_rule_id INTEGER REFERENCES tax_rules(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

ensureTable().catch(console.error);

// GET / - list all condition records
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await getPool().query(`
      SELECT 
        tcr.*,
        tp.profile_code,
        tp.name AS tax_profile_name,
        tr.rule_code AS tax_rule_code,
        tr.title AS tax_rule_title,
        tr.rate_percent AS tax_rule_rate
      FROM tax_condition_records tcr
      LEFT JOIN tax_profiles tp ON tcr.tax_profile_id = tp.id
      LEFT JOIN tax_rules tr ON tcr.tax_rule_id = tr.id
      WHERE tcr.is_active = true
      ORDER BY tcr.condition_type_code, tcr.departure_country, tcr.departure_state
    `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch condition records', details: e?.message });
    }
});

// GET /dropdowns - all data for dropdowns
router.get('/dropdowns', async (req: Request, res: Response) => {
    try {
        const [conditionTypes, profiles, rules, countries, states, customerClasses, materialClasses] = await Promise.all([
            getPool().query(`SELECT DISTINCT condition_code, condition_name FROM condition_types ORDER BY condition_code`),
            getPool().query(`SELECT id, profile_code, name, country FROM tax_profiles WHERE is_active = true ORDER BY profile_code`),
            getPool().query(`SELECT id, profile_id, rule_code, title, rate_percent FROM tax_rules WHERE is_active = true ORDER BY rule_code`),
            getPool().query(`SELECT id, code, name FROM countries WHERE is_active = true ORDER BY name`),
            getPool().query(`SELECT s.id, s.code AS state_code, s.name AS state_name, c.code AS country_code FROM states s LEFT JOIN countries c ON s.country_id = c.id ORDER BY s.name`).catch(() => ({ rows: [] })),
            getPool().query(`SELECT id, code, description FROM tax_classifications WHERE applies_to IN ('CUSTOMER','BOTH') AND is_active = true ORDER BY code`),
            getPool().query(`SELECT id, code, description FROM tax_classifications WHERE applies_to IN ('MATERIAL','BOTH') AND is_active = true ORDER BY code`),
        ]);

        res.json({
            conditionTypes: conditionTypes.rows,
            taxProfiles: profiles.rows,
            taxRules: rules.rows,
            countries: countries.rows,
            states: states.rows,
            customerTaxClasses: customerClasses.rows,
            materialTaxClasses: materialClasses.rows,
        });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch dropdowns', details: e?.message });
    }
});

// POST / - create
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            condition_type_code, departure_country, departure_state,
            destination_country, destination_state,
            customer_tax_class, material_tax_class,
            tax_profile_id, tax_rule_id
        } = req.body;

        if (!condition_type_code || !tax_rule_id) {
            return res.status(400).json({ error: 'condition_type_code and tax_rule_id are required' });
        }

        const result = await getPool().query(`
      INSERT INTO tax_condition_records (
        condition_type_code, departure_country, departure_state,
        destination_country, destination_state,
        customer_tax_class, material_tax_class,
        tax_profile_id, tax_rule_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
            condition_type_code, departure_country || null, departure_state || null,
            destination_country || null, destination_state || null,
            customer_tax_class || null, material_tax_class || null,
            tax_profile_id || null, tax_rule_id
        ]);
        res.status(201).json(result.rows[0]);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to create condition record', details: e?.message });
    }
});

// PUT /:id - update
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            condition_type_code, departure_country, departure_state,
            destination_country, destination_state,
            customer_tax_class, material_tax_class,
            tax_profile_id, tax_rule_id, is_active
        } = req.body;

        const result = await getPool().query(`
      UPDATE tax_condition_records SET
        condition_type_code = $1,
        departure_country = $2,
        departure_state = $3,
        destination_country = $4,
        destination_state = $5,
        customer_tax_class = $6,
        material_tax_class = $7,
        tax_profile_id = $8,
        tax_rule_id = $9,
        is_active = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
            condition_type_code, departure_country || null, departure_state || null,
            destination_country || null, destination_state || null,
            customer_tax_class || null, material_tax_class || null,
            tax_profile_id || null, tax_rule_id,
            is_active !== false,
            id
        ]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to update condition record', details: e?.message });
    }
});

// DELETE /:id - soft delete
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await getPool().query(`
      UPDATE tax_condition_records SET is_active = false, updated_at = NOW()
      WHERE id = $1 RETURNING id
    `, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted', id });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to delete condition record', details: e?.message });
    }
});

export default router;
