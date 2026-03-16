import express from 'express';
import { ensureActivePool } from '../../database.js';

const router = express.Router();

// ────────────────────────────────────────────────────────────────────────────
// GET /api/master-data-crud/movement-types
// Returns full movement_types with SAP T156 context fields + posting rules
// ────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { is_active, movement_class } = req.query;

        let where = `mt."_deletedAt" IS NULL`;
        const params: any[] = [];
        let p = 1;

        if (is_active !== undefined) {
            where += ` AND mt.is_active = $${p++}`;
            params.push(is_active === 'true');
        }
        if (movement_class) {
            where += ` AND mt.movement_class = $${p++}`;
            params.push(movement_class);
        }

        const result = await pool.query(`
      SELECT
        mt.*,
        -- Aggregate posting rules
        (SELECT json_agg(pr ORDER BY pr.special_stock_ind, pr.movement_ind)
         FROM movement_posting_rules pr WHERE pr.movement_type_id = mt.id AND pr.is_active = true
        ) AS posting_rules,
        -- Aggregate allowed transactions
        (SELECT json_agg(at2.transaction_code ORDER BY at2.transaction_code)
         FROM movement_type_allowed_transactions at2
         WHERE at2.movement_type_id = mt.id AND at2.is_active = true
        ) AS allowed_transactions
      FROM movement_types mt
      WHERE ${where}
      ORDER BY mt.movement_type_code
    `, params);

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching movement types:', error);
        res.status(500).json({ message: 'Failed to fetch movement types', error: error.message });
    }
});

// GET single movement type by ID (with posting rules + allowed transactions)
router.get('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const result = await pool.query(`
      SELECT
        mt.*,
        (SELECT json_agg(pr ORDER BY pr.special_stock_ind, pr.movement_ind)
         FROM movement_posting_rules pr WHERE pr.movement_type_id = mt.id AND pr.is_active = true
        ) AS posting_rules,
        (SELECT json_agg(at2.transaction_code ORDER BY at2.transaction_code)
         FROM movement_type_allowed_transactions at2
         WHERE at2.movement_type_id = mt.id AND at2.is_active = true
        ) AS allowed_transactions
      FROM movement_types mt
      WHERE mt.id = $1 AND mt."_deletedAt" IS NULL
    `, [req.params.id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Movement type not found' });
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch movement type', error: error.message });
    }
});

// PATCH update movement type (including new SAP T156 fields)
router.patch('/:id', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const userId = (req as any).user?.id || 1;
        const {
            movement_type_code, description, movement_class, transaction_type,
            inventory_direction, valuation_impact, quantity_impact, is_active,
            // New SAP T156 context fields
            reversal_movement_type,
            reference_document_required, account_assignment_mandatory,
            print_control, reason_code_required, screen_layout_variant,
            create_fi_document, create_material_document, document_type_id
        } = req.body;

        const result = await pool.query(`
      UPDATE movement_types SET
        movement_type_code           = COALESCE($1, movement_type_code),
        description                  = COALESCE($2, description),
        movement_class               = COALESCE($3, movement_class),
        transaction_type             = COALESCE($4, transaction_type),
        inventory_direction          = COALESCE($5, inventory_direction),
        valuation_impact             = COALESCE($6, valuation_impact),
        quantity_impact              = COALESCE($7, quantity_impact),
        is_active                    = COALESCE($8, is_active),
        reversal_movement_type       = COALESCE($9, reversal_movement_type),
        reference_document_required  = COALESCE($10, reference_document_required),
        account_assignment_mandatory = COALESCE($11, account_assignment_mandatory),
        print_control                = COALESCE($12, print_control),
        reason_code_required         = COALESCE($13, reason_code_required),
        screen_layout_variant        = COALESCE($14, screen_layout_variant),
        create_fi_document           = COALESCE($15, create_fi_document),
        create_material_document     = COALESCE($16, create_material_document),
        document_type_id             = COALESCE($17, document_type_id),
        updated_by = $18, updated_at = NOW()
      WHERE id = $19 AND "_deletedAt" IS NULL
      RETURNING *
    `, [
            movement_type_code, description, movement_class, transaction_type,
            inventory_direction, valuation_impact, quantity_impact, is_active,
            reversal_movement_type,
            reference_document_required, account_assignment_mandatory,
            print_control, reason_code_required, screen_layout_variant,
            create_fi_document, create_material_document, document_type_id,
            userId, req.params.id
        ]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Movement type not found' });
        res.json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to update movement type', error: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POSTING RULES (T156S equivalent)
// ────────────────────────────────────────────────────────────────────────────

// GET posting rules for a movement type (or use query param for determination)
router.get('/:id/posting-rules', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { special_stock_ind = '', movement_ind = '' } = req.query;
        const result = await pool.query(`
      SELECT * FROM movement_posting_rules
      WHERE movement_type_id = $1 AND is_active = true
      ORDER BY special_stock_ind, movement_ind
    `, [req.params.id]);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch posting rules', error: error.message });
    }
});

// POST create / update a posting rule
router.post('/:id/posting-rules', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { special_stock_ind = '', movement_ind = '', value_string, quantity_update = true, value_update = true, consumption_posting = '' } = req.body;

        if (!value_string) return res.status(400).json({ message: 'value_string is required' });

        const result = await pool.query(`
      INSERT INTO movement_posting_rules (movement_type_id, special_stock_ind, movement_ind, value_string, quantity_update, value_update, consumption_posting)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (movement_type_id, special_stock_ind, movement_ind) DO UPDATE
        SET value_string=$4, quantity_update=$5, value_update=$6, consumption_posting=$7, updated_at=NOW()
      RETURNING *
    `, [req.params.id, special_stock_ind, movement_ind, value_string, quantity_update, value_update, consumption_posting]);

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to save posting rule', error: error.message });
    }
});

// DELETE posting rule
router.delete('/:id/posting-rules/:ruleId', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        await pool.query(`DELETE FROM movement_posting_rules WHERE id=$1 AND movement_type_id=$2`, [req.params.ruleId, req.params.id]);
        res.json({ message: 'Posting rule deleted' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to delete posting rule', error: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// ALLOWED TRANSACTIONS
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id/allowed-transactions', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const result = await pool.query(
            `SELECT * FROM movement_type_allowed_transactions WHERE movement_type_id=$1 AND is_active=true ORDER BY transaction_code`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch allowed transactions', error: error.message });
    }
});

router.post('/:id/allowed-transactions', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { transaction_code, description } = req.body;
        if (!transaction_code) return res.status(400).json({ message: 'transaction_code is required' });
        const result = await pool.query(
            `INSERT INTO movement_type_allowed_transactions (movement_type_id, transaction_code, description) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`,
            [req.params.id, transaction_code, description || null]
        );
        res.status(201).json(result.rows[0] || { message: 'already exists' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to add allowed transaction', error: error.message });
    }
});

router.delete('/:id/allowed-transactions/:txnId', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        await pool.query(`DELETE FROM movement_type_allowed_transactions WHERE id=$1 AND movement_type_id=$2`, [req.params.txnId, req.params.id]);
        res.json({ message: 'Allowed transaction removed' });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to remove allowed transaction', error: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// VALUE STRINGS (OBYC determination) - global lookup
// ────────────────────────────────────────────────────────────────────────────
router.get('/value-strings/all', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { value_string } = req.query;
        let query = `SELECT * FROM movement_type_value_strings WHERE is_active=true`;
        const params: any[] = [];
        if (value_string) { query += ` AND value_string=$1`; params.push(value_string); }
        query += ` ORDER BY value_string, sort_order`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch value strings', error: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// DETERMINATION ENDPOINT (the engine)
// POST /api/master-data-crud/movement-types/determine
// Body: { movement_type_code, special_stock_ind?, movement_ind? }
// Returns: value_string + transaction_keys (for GR/GI posting logic)
// ────────────────────────────────────────────────────────────────────────────
router.post('/determine', async (req, res) => {
    try {
        const pool = await ensureActivePool();
        const { movement_type_code, special_stock_ind = '', movement_ind = '' } = req.body;

        if (!movement_type_code) return res.status(400).json({ message: 'movement_type_code is required' });

        // Find movement type
        const mtResult = await pool.query(
            `SELECT id, movement_type_code, movement_class FROM movement_types WHERE movement_type_code=$1 AND is_active=true LIMIT 1`,
            [movement_type_code]
        );
        if (mtResult.rows.length === 0) return res.status(404).json({ message: `Movement type ${movement_type_code} not found` });
        const mt = mtResult.rows[0];

        // Find posting rule: exact match first, then fallback to '' wildcard
        const ruleResult = await pool.query(`
      SELECT * FROM movement_posting_rules
      WHERE movement_type_id = $1
        AND (
          (special_stock_ind = $2 AND movement_ind = $3)  -- exact match
          OR (special_stock_ind = ''  AND movement_ind = $3)   -- wildcard stock
          OR (special_stock_ind = $2  AND movement_ind = '')   -- wildcard mvt
          OR (special_stock_ind = ''  AND movement_ind = '')   -- full wildcard
        )
        AND is_active = true
      ORDER BY
        CASE WHEN special_stock_ind=$2 AND movement_ind=$3 THEN 0
             WHEN special_stock_ind=$2 AND movement_ind='' THEN 1
             WHEN special_stock_ind='' AND movement_ind=$3 THEN 2
             ELSE 3 END
      LIMIT 1
    `, [mt.id, special_stock_ind, movement_ind]);

        if (ruleResult.rows.length === 0) {
            return res.status(404).json({ message: `No posting rule found for ${movement_type_code} (stock='${special_stock_ind}', ind='${movement_ind}')` });
        }

        const rule = ruleResult.rows[0];

        // Get transaction keys for the determined value string
        const keysResult = await pool.query(`
      SELECT * FROM movement_type_value_strings
      WHERE value_string = $1 AND is_active = true
      ORDER BY sort_order, debit_credit
    `, [rule.value_string]);

        res.json({
            movement_type_code,
            movement_class: mt.movement_class,
            posting_rule: rule,
            value_string: rule.value_string,
            transaction_keys: keysResult.rows,
        });
    } catch (error: any) {
        console.error('Determination engine error:', error);
        res.status(500).json({ message: 'Determination failed', error: error.message });
    }
});

export default router;
