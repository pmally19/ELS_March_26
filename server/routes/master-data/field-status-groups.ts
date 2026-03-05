import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET all groups (optional ?variant_id= filter)
router.get('/', async (req, res) => {
    try {
        const { variant_id, active } = req.query;
        let where = 'WHERE 1=1';
        const params: any[] = [];
        let idx = 1;

        if (variant_id) { where += ` AND g.variant_id = $${idx++}`; params.push(parseInt(variant_id as string)); }
        if (active !== undefined) { where += ` AND g.active = $${idx++}`; params.push(active === 'true'); }

        const result = await pool.query(
            `SELECT g.*, v.code as variant_code, v.description as variant_description,
              COUNT(r.id)::int as rule_count
       FROM field_status_groups g
       JOIN field_status_variants v ON v.id = g.variant_id
       LEFT JOIN field_status_rules r ON r.group_id = g.id
       ${where}
       GROUP BY g.id, v.code, v.description
       ORDER BY g.code`,
            params
        );
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET single group with its rules
router.get('/:id', async (req, res) => {
    try {
        const group = await pool.query(
            `SELECT g.*, v.code as variant_code, v.description as variant_description
       FROM field_status_groups g
       JOIN field_status_variants v ON v.id = g.variant_id
       WHERE g.id = $1`,
            [req.params.id]
        );
        if (!group.rows.length) return res.status(404).json({ success: false, error: 'Not found' });

        const rules = await pool.query(
            `SELECT * FROM field_status_rules WHERE group_id = $1
       ORDER BY field_section, field_name`,
            [req.params.id]
        );

        res.json({ success: true, data: { ...group.rows[0], rules: rules.rows } });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Standard field definitions auto-seeded for every new group
const STANDARD_FIELDS = [
    { section: 'General', name: 'text', label: 'Text / Description', def: 'optional' },
    { section: 'General', name: 'reference', label: 'Reference', def: 'optional' },
    { section: 'General', name: 'business_area', label: 'Business Area', def: 'optional' },
    { section: 'General', name: 'trading_partner', label: 'Trading Partner', def: 'suppress' },
    { section: 'Account Assignment', name: 'cost_center', label: 'Cost Center', def: 'optional' },
    { section: 'Account Assignment', name: 'profit_center', label: 'Profit Center', def: 'optional' },
    { section: 'Account Assignment', name: 'wbs_element', label: 'WBS Element', def: 'suppress' },
    { section: 'Account Assignment', name: 'order_number', label: 'Internal Order', def: 'suppress' },
    { section: 'Tax', name: 'tax_code', label: 'Tax Code', def: 'optional' },
    { section: 'Tax', name: 'tax_amount', label: 'Tax Amount', def: 'optional' },
    { section: 'Payment', name: 'payment_terms', label: 'Payment Terms', def: 'optional' },
    { section: 'Payment', name: 'baseline_date', label: 'Baseline Date', def: 'optional' },
    { section: 'Payment', name: 'payment_method', label: 'Payment Method', def: 'optional' },
    { section: 'Payment', name: 'due_date', label: 'Due Date', def: 'suppress' },
    { section: 'Bank', name: 'value_date', label: 'Value Date', def: 'suppress' },
    { section: 'Bank', name: 'bank_details', label: 'Bank Details', def: 'suppress' },
    { section: 'Asset', name: 'asset', label: 'Asset Number', def: 'suppress' },
    { section: 'Asset', name: 'asset_sub', label: 'Asset Sub-number', def: 'suppress' },
    { section: 'Materials', name: 'material', label: 'Material', def: 'suppress' },
    { section: 'Materials', name: 'purchase_order', label: 'Purchase Order', def: 'suppress' },
];

// POST create group (auto-seeds 20 standard field rules)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { variant_id, code, description, active = true } = req.body;
        if (!variant_id || !code || !description) {
            return res.status(400).json({ success: false, error: 'variant_id, code and description are required' });
        }

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO field_status_groups (variant_id, code, description, active)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [variant_id, code.toUpperCase(), description, active]
        );
        const groupId = result.rows[0].id;

        // Auto-seed all standard field rules with default statuses
        for (const f of STANDARD_FIELDS) {
            await client.query(
                `INSERT INTO field_status_rules (group_id, field_section, field_name, field_label, status)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (group_id, field_name) DO NOTHING`,
                [groupId, f.section, f.name, f.label, f.def]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ success: false, error: 'Group code already exists in this variant' });
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});


// PUT update group + its rules (batch radio button save)
router.put('/:id', async (req, res) => {
    try {
        const { code, description, active, rules } = req.body;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const updated = await client.query(
                `UPDATE field_status_groups
         SET code = COALESCE($1, code),
             description = COALESCE($2, description),
             active = COALESCE($3, active),
             updated_at = NOW()
         WHERE id = $4 RETURNING *`,
                [code || null, description || null, active !== undefined ? active : null, req.params.id]
            );

            if (!updated.rows.length) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'Not found' });
            }

            // Batch update field rules from radio buttons
            if (Array.isArray(rules) && rules.length > 0) {
                for (const rule of rules) {
                    const { field_name, status } = rule;
                    if (!field_name || !['suppress', 'required', 'optional', 'display'].includes(status)) continue;
                    await client.query(
                        `UPDATE field_status_rules SET status = $1 WHERE group_id = $2 AND field_name = $3`,
                        [status, req.params.id, field_name]
                    );
                }
            }

            await client.query('COMMIT');

            // Return group with updated rules
            const rules_result = await pool.query(
                `SELECT * FROM field_status_rules WHERE group_id = $1 ORDER BY field_section, field_name`,
                [req.params.id]
            );

            res.json({ success: true, data: { ...updated.rows[0], rules: rules_result.rows } });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE group
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM field_status_groups WHERE id = $1 RETURNING id', [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET all rules for a group
router.get('/:id/rules', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM field_status_rules WHERE group_id = $1 ORDER BY field_section, field_name`,
            [req.params.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
