import { Router } from 'express';
import { getPool } from '../../database';

const router = Router();

// Get all tax procedures with step count
router.get('/', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT tp.*,
        (SELECT COUNT(*) FROM tax_procedure_steps tps WHERE tps.procedure_id = tp.id) as step_count
      FROM tax_procedures tp
      ORDER BY tp.procedure_code
    `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch tax procedures', details: e?.message });
    }
});

// Get condition types for dropdown (must be before /:id)
router.get('/condition-types', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT DISTINCT ON(condition_code) condition_code, condition_name
      FROM condition_types
      ORDER BY condition_code
    `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch condition types', details: e?.message });
    }
});

// Get tax rules for dropdown (must be before /:id)
router.get('/tax-rules', async (req, res) => {
    try {
        const result = await getPool().query(`
      SELECT tr.id, tr.rule_code, tr.title, tr.rate_percent,
        tp.profile_code, tp.name as profile_name
      FROM tax_rules tr
      JOIN tax_profiles tp ON tr.profile_id = tp.id
      WHERE tr.is_active = true
      ORDER BY tr.rule_code
    `);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch tax rules', details: e?.message });
    }
});

// Get account keys for dropdown (must be before /:id)
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

// Get single procedure
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await getPool().query('SELECT * FROM tax_procedures WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch tax procedure', details: e?.message });
    }
});

// Create procedure
router.post('/', async (req, res) => {
    try {
        const { procedure_code, procedure_name, description, is_active = true } = req.body;

        const result = await getPool().query(`
      INSERT INTO tax_procedures (procedure_code, procedure_name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [procedure_code?.toUpperCase(), procedure_name, description || null, is_active]);

        res.status(201).json(result.rows[0]);
    } catch (e: any) {
        const msg = e?.message || '';
        const code = /unique|constraint|duplicate/i.test(msg) ? 409 : 400;
        res.status(code).json({ error: 'Failed to create tax procedure', details: msg });
    }
});

// Update procedure
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { procedure_name, description, is_active } = req.body;

        const result = await getPool().query(`
      UPDATE tax_procedures
      SET procedure_name = COALESCE($1, procedure_name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [procedure_name, description, is_active, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to update tax procedure', details: e?.message });
    }
});

// Delete procedure (steps cascade via FK)
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await getPool().query('DELETE FROM tax_procedures WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted', id });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to delete tax procedure', details: e?.message });
    }
});

// ===== STEPS =====

// Get steps for a procedure
router.get('/:id/steps', async (req, res) => {
    try {
        const procedureId = Number(req.params.id);
        const result = await getPool().query(`
      SELECT tps.*,
        ct.condition_name,
        tr.rule_code as tax_rule_code,
        tr.title as tax_rule_title,
        tr.rate_percent as tax_rule_rate
      FROM tax_procedure_steps tps
      LEFT JOIN (
        SELECT DISTINCT ON(condition_code) condition_code, condition_name
        FROM condition_types
      ) ct ON tps.condition_type_code = ct.condition_code
      LEFT JOIN tax_rules tr ON tps.tax_rule_id = tr.id
      WHERE tps.procedure_id = $1
      ORDER BY tps.step_number
    `, [procedureId]);
        res.json(result.rows);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch procedure steps', details: e?.message });
    }
});

// Add step to procedure
router.post('/:id/steps', async (req, res) => {
    try {
        const procedureId = Number(req.params.id);
        const { step_number, condition_type_code, tax_rule_id, description, from_step, to_step, account_key, is_statistical = false } = req.body;

        const result = await getPool().query(`
      INSERT INTO tax_procedure_steps (procedure_id, step_number, condition_type_code, tax_rule_id, description, from_step, to_step, account_key, is_statistical)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [procedureId, step_number, condition_type_code || null, tax_rule_id || null, description || null, from_step || null, to_step || null, account_key || null, is_statistical]);

        res.status(201).json(result.rows[0]);
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to create step', details: e?.message });
    }
});

// Update step
router.put('/steps/:stepId', async (req, res) => {
    try {
        const stepId = Number(req.params.stepId);
        const { step_number, condition_type_code, tax_rule_id, description, from_step, to_step, account_key, is_statistical } = req.body;

        const result = await getPool().query(`
      UPDATE tax_procedure_steps
      SET step_number = COALESCE($1, step_number),
          condition_type_code = $2,
          tax_rule_id = $3,
          description = $4,
          from_step = $5,
          to_step = $6,
          account_key = $7,
          is_statistical = COALESCE($8, is_statistical),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [step_number, condition_type_code || null, tax_rule_id || null, description || null, from_step || null, to_step || null, account_key || null, is_statistical, stepId]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Step not found' });
        res.json(result.rows[0]);
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to update step', details: e?.message });
    }
});

// Delete step
router.delete('/steps/:stepId', async (req, res) => {
    try {
        const stepId = Number(req.params.stepId);
        const result = await getPool().query('DELETE FROM tax_procedure_steps WHERE id = $1 RETURNING *', [stepId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Step not found' });
        res.json({ message: 'Step deleted', id: stepId });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to delete step', details: e?.message });
    }
});

export default router;
