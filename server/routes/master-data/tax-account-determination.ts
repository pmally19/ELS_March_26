import { Router } from 'express';
import { getPool } from '../../database';

const router = Router();

// ─── DROPDOWN DATA ENDPOINTS (must be before /:id) ────────────────────────

// Get Chart of Accounts for dropdown
router.get('/chart-of-accounts', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT id, chart_id as code, description as name
      FROM chart_of_accounts
      ORDER BY chart_id
    `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch chart of accounts', details: e?.message });
    }
});

// Get GL Accounts, optionally filtered by chart_of_accounts_id
router.get('/gl-accounts', async (req, res) => {
    try {
        const { chart_of_accounts_id } = req.query;
        let query = `
      SELECT ga.id, ga.account_number, ga.account_name, ga.account_type,
             coa.chart_id as chart_of_accounts_code
      FROM gl_accounts ga
      LEFT JOIN chart_of_accounts coa ON ga.chart_of_accounts_id = coa.id
      WHERE ga.is_active = true
    `;
        const params: any[] = [];
        if (chart_of_accounts_id) {
            params.push(Number(chart_of_accounts_id));
            query += ` AND ga.chart_of_accounts_id = $${params.length}`;
        }
        query += ' ORDER BY ga.account_number';
        const result = await getPool().query(query, params);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch GL accounts', details: e?.message });
    }
});

// Get Account Keys for dropdown
router.get('/account-keys', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT id, code, name, account_type
      FROM account_keys
      WHERE is_active = true
      ORDER BY code
    `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch account keys', details: e?.message });
    }
});

// Get Tax Rules for dropdown
router.get('/tax-rules', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT tr.id, tr.rule_code, tr.title, tr.rate_percent,
             tp.profile_code, tp.name as profile_name
      FROM tax_rules tr
      JOIN tax_profiles tp ON tr.profile_id = tp.id
      WHERE tr.is_active = true
      ORDER BY tp.profile_code, tr.rule_code
    `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch tax rules', details: e?.message });
    }
});

// ─── CRUD ENDPOINTS ────────────────────────────────────────────────────────

// GET all mappings (with joins for display)
router.get('/', async (req, res) => {
    try {
        const { chart_of_accounts_id } = req.query;
        let query = `
      SELECT
        tad.id,
        tad.chart_of_accounts_id,
        coa.chart_id          AS coa_code,
        coa.description       AS coa_name,
        tad.account_key,
        ak.name               AS account_key_name,
        ak.account_type       AS account_key_type,
        tad.tax_rule_id,
        tr.rule_code          AS tax_rule_code,
        tr.title              AS tax_rule_title,
        tr.rate_percent       AS tax_rule_rate,
        tad.gl_account_id,
        ga.account_number     AS gl_account_number,
        ga.account_name       AS gl_account_name,
        tad.description,
        tad.is_active,
        tad.created_at,
        tad.updated_at
      FROM tax_account_determination tad
      JOIN chart_of_accounts coa ON tad.chart_of_accounts_id = coa.id
      JOIN account_keys ak        ON tad.account_key = ak.code
      JOIN gl_accounts ga         ON tad.gl_account_id = ga.id
      LEFT JOIN tax_rules tr      ON tad.tax_rule_id = tr.id
      WHERE 1=1
    `;
        const params: any[] = [];
        if (chart_of_accounts_id) {
            params.push(Number(chart_of_accounts_id));
            query += ` AND tad.chart_of_accounts_id = $${params.length}`;
        }
        query += ' ORDER BY coa.chart_id, tad.account_key, tr.rule_code NULLS FIRST';
        const result = await getPool().query(query, params);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch tax account determinations', details: e?.message });
    }
});

// GET single mapping
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await getPool().query(
            'SELECT * FROM tax_account_determination WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch mapping', details: e?.message });
    }
});

// POST create mapping
router.post('/', async (req, res) => {
    try {
        const { chart_of_accounts_id, account_key, tax_rule_id, gl_account_id, description, is_active = true } = req.body;
        if (!chart_of_accounts_id || !account_key || !gl_account_id) {
            return res.status(400).json({ error: 'chart_of_accounts_id, account_key and gl_account_id are required' });
        }
        const result = await getPool().query(`
      INSERT INTO tax_account_determination
        (chart_of_accounts_id, account_key, tax_rule_id, gl_account_id, description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [chart_of_accounts_id, account_key, tax_rule_id || null, gl_account_id, description || null, is_active]);
        res.status(201).json(result.rows[0]);
    } catch (e: any) {
        const msg = e?.message || '';
        const status = /unique|duplicate|constraint/i.test(msg) ? 409 : 400;
        res.status(status).json({ error: 'Failed to create mapping', details: msg });
    }
});

// PUT update mapping
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { account_key, tax_rule_id, gl_account_id, description, is_active } = req.body;
        const result = await getPool().query(`
      UPDATE tax_account_determination
      SET account_key      = COALESCE($1, account_key),
          tax_rule_id      = $2,
          gl_account_id    = COALESCE($3, gl_account_id),
          description      = $4,
          is_active        = COALESCE($5, is_active),
          updated_at       = NOW()
      WHERE id = $6
      RETURNING *
    `, [account_key, tax_rule_id ?? null, gl_account_id, description ?? null, is_active, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to update mapping', details: e?.message });
    }
});

// DELETE mapping
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await getPool().query(
            'DELETE FROM tax_account_determination WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Mapping deleted', id });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to delete mapping', details: e?.message });
    }
});

export default router;
