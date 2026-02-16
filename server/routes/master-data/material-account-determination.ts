import express from 'express';
import { pool } from '../../db';

const router = express.Router();

// GET all material account determinations with joined data
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        mad.id,
        mad.chart_of_accounts_id,
        coa.code as chart_of_accounts_code,
        coa.name as chart_of_accounts_name,
        mad.valuation_grouping_code_id,
        vgc.code as valuation_grouping_code,
        vgc.name as valuation_grouping_name,
        mad.valuation_class_id,
        vc.class_code as valuation_class_code,
        vc.class_name as valuation_class_name,
        mad.transaction_key_id,
        tk.code as transaction_key_code,
        tk.description as transaction_key_description,
        mad.gl_account_id,
        gl.account_number,
        gl.account_name,
        mad.description,
        mad.is_active,
        mad.created_at,
        mad.updated_at
      FROM material_account_determination mad
      LEFT JOIN chart_of_accounts coa ON mad.chart_of_accounts_id = coa.id
      LEFT JOIN valuation_grouping_codes vgc ON mad.valuation_grouping_code_id = vgc.id
      LEFT JOIN valuation_classes vc ON mad.valuation_class_id = vc.id
      LEFT JOIN transaction_keys tk ON mad.transaction_key_id = tk.id
      LEFT JOIN gl_accounts gl ON mad.gl_account_id = gl.id
      ORDER BY mad.id DESC
    `);

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching material account determinations:', error);
        res.status(500).json({ error: 'Failed to fetch material account determinations' });
    }
});

// GET single material account determination by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
      SELECT 
        mad.*,
        coa.code as chart_of_accounts_code,
        coa.name as chart_of_accounts_name,
        vgc.code as valuation_grouping_code,
        vgc.name as valuation_grouping_name,
        vc.class_code as valuation_class_code,
        vc.class_name as valuation_class_name,
        tk.code as transaction_key_code,
        tk.description as transaction_key_description,
        gl.account_number,
        gl.account_name
      FROM material_account_determination mad
      LEFT JOIN chart_of_accounts coa ON mad.chart_of_accounts_id = coa.id
      LEFT JOIN valuation_grouping_codes vgc ON mad.valuation_grouping_code_id = vgc.id
      LEFT JOIN valuation_classes vc ON mad.valuation_class_id = vc.id
      LEFT JOIN transaction_keys tk ON mad.transaction_key_id = tk.id
      LEFT JOIN gl_accounts gl ON mad.gl_account_id = gl.id
      WHERE mad.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material account determination not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching material account determination:', error);
        res.status(500).json({ error: 'Failed to fetch material account determination' });
    }
});

// GET dropdown data for all filters
router.get('/dropdowns/all', async (req, res) => {
    try {
        const { chart_of_accounts_id } = req.query;

        const [coaResult, vgcResult, vcResult, tkResult, glResult] = await Promise.all([
            // Chart of Accounts
            pool.query('SELECT id, code, name FROM chart_of_accounts WHERE active = true ORDER BY code'),

            // Valuation Grouping Codes
            pool.query('SELECT id, code, name FROM valuation_grouping_codes WHERE is_active = true ORDER BY code'),

            // Valuation Classes
            pool.query('SELECT id, class_code, class_name FROM valuation_classes WHERE active = true ORDER BY class_code'),

            // Transaction Keys (all active keys)
            pool.query(`
        SELECT id, code, description, business_context 
        FROM transaction_keys 
        WHERE is_active = true 
        ORDER BY code
      `),

            // GL Accounts - filtered by Chart of Accounts if provided
            chart_of_accounts_id
                ? pool.query(`
            SELECT id, account_number, account_name, chart_of_accounts_id
            FROM gl_accounts 
            WHERE chart_of_accounts_id = $1 AND is_active = true 
            ORDER BY account_number
          `, [chart_of_accounts_id])
                : pool.query(`
            SELECT id, account_number, account_name, chart_of_accounts_id 
            FROM gl_accounts 
            WHERE is_active = true 
            ORDER BY account_number 
            LIMIT 100
          `)
        ]);

        res.json({
            chartOfAccounts: coaResult.rows,
            valuationGroupingCodes: vgcResult.rows,
            valuationClasses: vcResult.rows,
            transactionKeys: tkResult.rows,
            glAccounts: glResult.rows
        });
    } catch (error: any) {
        console.error('Error fetching dropdown data:', error);
        res.status(500).json({ error: 'Failed to fetch dropdown data' });
    }
});

// GET GL Accounts filtered by Chart of Accounts
router.get('/gl-accounts/:chart_of_accounts_id', async (req, res) => {
    try {
        const { chart_of_accounts_id } = req.params;
        const result = await pool.query(`
      SELECT id, account_number, account_name, account_type, chart_of_accounts_id
      FROM gl_accounts
      WHERE chart_of_accounts_id = $1 AND is_active = true
      ORDER BY account_number
    `, [chart_of_accounts_id]);

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching GL accounts:', error);
        res.status(500).json({ error: 'Failed to fetch GL accounts' });
    }
});

// CREATE new material account determination
router.post('/', async (req, res) => {
    try {
        const {
            chart_of_accounts_id,
            valuation_grouping_code_id,
            valuation_class_id,
            transaction_key_id,
            gl_account_id,
            description
        } = req.body;

        // Validate required fields
        if (!chart_of_accounts_id || !valuation_grouping_code_id || !valuation_class_id ||
            !transaction_key_id || !gl_account_id) {
            return res.status(400).json({
                error: 'Missing required fields: chart_of_accounts_id, valuation_grouping_code_id, valuation_class_id, transaction_key_id, gl_account_id'
            });
        }

        const result = await pool.query(`
      INSERT INTO material_account_determination (
        chart_of_accounts_id,
        valuation_grouping_code_id,
        valuation_class_id,
        transaction_key_id,
        gl_account_id,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
            chart_of_accounts_id,
            valuation_grouping_code_id,
            valuation_class_id,
            transaction_key_id,
            gl_account_id,
            description || null
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating material account determination:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'This combination already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create material account determination' });
        }
    }
});

// UPDATE material account determination
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            chart_of_accounts_id,
            valuation_grouping_code_id,
            valuation_class_id,
            transaction_key_id,
            gl_account_id,
            description,
            is_active
        } = req.body;

        const result = await pool.query(`
      UPDATE material_account_determination
      SET 
        chart_of_accounts_id = COALESCE($1, chart_of_accounts_id),
        valuation_grouping_code_id = COALESCE($2, valuation_grouping_code_id),
        valuation_class_id = COALESCE($3, valuation_class_id),
        transaction_key_id = COALESCE($4, transaction_key_id),
        gl_account_id = COALESCE($5, gl_account_id),
        description = $6,
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [
            chart_of_accounts_id,
            valuation_grouping_code_id,
            valuation_class_id,
            transaction_key_id,
            gl_account_id,
            description,
            is_active,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material account determination not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating material account determination:', error);
        res.status(500).json({ error: 'Failed to update material account determination' });
    }
});

// DELETE material account determination
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM material_account_determination WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material account determination not found' });
        }

        res.json({ message: 'Material account determination deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting material account determination:', error);
        res.status(500).json({ error: 'Failed to delete material account determination' });
    }
});

export default router;
