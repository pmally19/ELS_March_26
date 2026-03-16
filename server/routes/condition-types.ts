import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Get all condition types (client-level — no company code filter per SAP standard)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ct.*,
        ccl.class_code as condition_class_code,
        ccl.class_name as condition_class_name,
        seq.sequence_code as access_sequence_code,
        seq.sequence_name as access_sequence_name,
        ct."_tenantId" as tenant_id
      FROM condition_types ct
      LEFT JOIN condition_classes ccl ON ct.condition_class_id = ccl.id
      LEFT JOIN access_sequences seq ON ct.access_sequence_id = seq.id
      ORDER BY ct.sequence_number, ct.condition_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching condition types:', error);
    res.status(500).json({ error: 'Failed to fetch condition types' });
  }
});

// Get calculation methods for dropdown
router.get('/calculation-methods', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, method_code, method_name, calculation_type, description
      FROM calculation_methods
      WHERE is_active = true
      ORDER BY method_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calculation methods:', error);
    res.status(500).json({ error: 'Failed to fetch calculation methods' });
  }
});

// Get condition categories for dropdown
router.get('/condition-categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, category_code, category_name, category_type, description, sort_order
      FROM condition_categories
      WHERE is_active = true
      ORDER BY sort_order, category_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching condition categories:', error);
    res.status(500).json({ error: 'Failed to fetch condition categories' });
  }
});

// Get condition classes for dropdown
router.get('/condition-classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, class_code, class_name, description
      FROM condition_classes
      WHERE is_active = true
      ORDER BY class_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching condition classes:', error);
    res.status(500).json({ error: 'Failed to fetch condition classes' });
  }
});

// Get access sequences for dropdown
router.get('/access-sequences', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, sequence_code, sequence_name, description
      FROM access_sequences
      WHERE is_active = true
      ORDER BY sequence_code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching access sequences:', error);
    res.status(500).json({ error: 'Failed to fetch access sequences' });
  }
});

// Create new condition type (client-level — no company code per SAP standard)
router.post('/', async (req, res) => {
  try {
    const {
      condition_code,
      condition_name,
      condition_category,
      calculation_type,
      description,
      default_value,
      min_value,
      max_value,
      sequence_number,
      is_mandatory,
      is_active,
      account_key,
      condition_class_id,
      access_sequence_id,
      plus_minus,
      manual_entries,
      is_group_condition,
      is_header_condition,
      is_item_condition,
      rounding_rule,
      rounding_precision
    } = req.body;

    // Check if condition code already exists (globally unique, client-level)
    const existingResult = await pool.query(
      `SELECT id FROM condition_types WHERE condition_code = $1`,
      [condition_code]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Condition code already exists' });
    }

    const insertResult = await pool.query(`
      INSERT INTO condition_types (
        condition_code, condition_name, condition_category, calculation_type,
        description, default_value, min_value, max_value, sequence_number,
        is_mandatory, is_active, account_key, condition_class_id,
        access_sequence_id, plus_minus, manual_entries, is_group_condition,
        is_header_condition, is_item_condition, rounding_rule, rounding_precision,
        created_by, updated_by, "_tenantId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `, [
      condition_code, condition_name, condition_category, calculation_type,
      description, default_value, min_value, max_value, sequence_number,
      is_mandatory ?? false, is_active ?? true, account_key,
      condition_class_id || null,
      access_sequence_id || null, plus_minus || null, manual_entries || null,
      is_group_condition ?? false, is_header_condition ?? false, is_item_condition ?? true,
      rounding_rule || null, rounding_precision || null,
      (req as any).user?.id || 1,
      (req as any).user?.id || 1,
      (req as any).user?.tenantId || '001'
    ]);

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('Error creating condition type:', error);
    res.status(500).json({ error: 'Failed to create condition type' });
  }
});

// Update condition type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const {
      condition_code,
      condition_name,
      condition_category,
      calculation_type,
      description,
      default_value,
      min_value,
      max_value,
      sequence_number,
      is_mandatory,
      is_active,
      account_key,
      condition_class_id,
      access_sequence_id,
      plus_minus,
      manual_entries,
      is_group_condition,
      is_header_condition,
      is_item_condition,
      rounding_rule,
      rounding_precision
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (condition_code !== undefined) { updates.push(`condition_code = $${paramIndex++}`); values.push(condition_code); }
    if (condition_name !== undefined) { updates.push(`condition_name = $${paramIndex++}`); values.push(condition_name); }
    if (condition_category !== undefined) { updates.push(`condition_category = $${paramIndex++}`); values.push(condition_category); }
    if (calculation_type !== undefined) { updates.push(`calculation_type = $${paramIndex++}`); values.push(calculation_type); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (default_value !== undefined) { updates.push(`default_value = $${paramIndex++}`); values.push(default_value); }
    if (min_value !== undefined) { updates.push(`min_value = $${paramIndex++}`); values.push(min_value); }
    if (max_value !== undefined) { updates.push(`max_value = $${paramIndex++}`); values.push(max_value); }
    if (sequence_number !== undefined) { updates.push(`sequence_number = $${paramIndex++}`); values.push(sequence_number); }
    if (is_mandatory !== undefined) { updates.push(`is_mandatory = $${paramIndex++}`); values.push(is_mandatory); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }
    if (account_key !== undefined) { updates.push(`account_key = $${paramIndex++}`); values.push(account_key); }
    if (condition_class_id !== undefined) { updates.push(`condition_class_id = $${paramIndex++}`); values.push(condition_class_id || null); }
    if (access_sequence_id !== undefined) { updates.push(`access_sequence_id = $${paramIndex++}`); values.push(access_sequence_id || null); }
    if (plus_minus !== undefined) { updates.push(`plus_minus = $${paramIndex++}`); values.push(plus_minus); }
    if (manual_entries !== undefined) { updates.push(`manual_entries = $${paramIndex++}`); values.push(manual_entries); }
    if (is_group_condition !== undefined) { updates.push(`is_group_condition = $${paramIndex++}`); values.push(is_group_condition); }
    if (is_header_condition !== undefined) { updates.push(`is_header_condition = $${paramIndex++}`); values.push(is_header_condition); }
    if (is_item_condition !== undefined) { updates.push(`is_item_condition = $${paramIndex++}`); values.push(is_item_condition); }
    if (rounding_rule !== undefined) { updates.push(`rounding_rule = $${paramIndex++}`); values.push(rounding_rule); }
    if (rounding_precision !== undefined) { updates.push(`rounding_precision = $${paramIndex++}`); values.push(rounding_precision); }

    updates.push(`updated_at = now()`);
    updates.push(`updated_by = $${paramIndex++}`);
    values.push((req as any).user?.id || 1);

    values.push(id);

    const updateResult = await pool.query(`
      UPDATE condition_types SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Condition type not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error updating condition type:', error);
    res.status(500).json({ error: 'Failed to update condition type' });
  }
});

// Delete condition type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const usageResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM sales_order_conditions soc
      JOIN condition_types ct ON soc.condition_type_id = ct.id
      WHERE ct.id = $1
    `, [id]);

    const usageCount = parseInt(usageResult.rows[0].count);
    if (usageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete condition type. It is used in ${usageCount} sales order(s)`
      });
    }

    const deleteResult = await pool.query(
      `DELETE FROM condition_types WHERE id = $1 RETURNING *`,
      [id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Condition type not found' });
    }

    res.json({ message: 'Condition type deleted successfully' });
  } catch (error) {
    console.error('Error deleting condition type:', error);
    res.status(500).json({ error: 'Failed to delete condition type' });
  }
});

// Apply business template (no company code — templates are client-level)
router.post('/apply-template', async (req, res) => {
  try {
    const { template_type } = req.body;

    const templates: Record<string, any[]> = {
      standard_erp: [
        { code: 'PR00', name: 'Base Price', category: 'Revenue', type: 'fixed_amount', seq: 10 },
        { code: 'K004', name: 'Material Discount', category: 'Discount', type: 'percentage', seq: 20 },
        { code: 'K007', name: 'Customer Discount', category: 'Discount', type: 'percentage', seq: 22 },
        { code: 'K029', name: 'Volume Discount', category: 'Discount', type: 'percentage', seq: 24 },
        { code: 'KF00', name: 'Freight Charges', category: 'Fee', type: 'fixed_amount', seq: 50 },
        { code: 'MWST', name: 'Output Tax', category: 'Tax', type: 'percentage', seq: 90 },
      ],
      restaurant: [
        { code: 'STD1', name: 'Base Menu Price', category: 'Revenue', type: 'fixed_amount', seq: 10 },
        { code: 'FEE01', name: 'Delivery Fee', category: 'Fee', type: 'fixed_amount', seq: 50 },
        { code: 'TAX01', name: 'Sales Tax', category: 'Tax', type: 'percentage', seq: 90 },
        { code: 'COST01', name: 'Food Cost', category: 'Cost', type: 'percentage', seq: 100 },
      ],
      retail: [
        { code: 'STD1', name: 'Product Price', category: 'Revenue', type: 'fixed_amount', seq: 10 },
        { code: 'CDIS01', name: 'Customer Discount', category: 'Discount', type: 'percentage', seq: 20 },
        { code: 'CDIS02', name: 'Volume Discount', category: 'Discount', type: 'percentage', seq: 22 },
        { code: 'FEE01', name: 'Shipping Fee', category: 'Fee', type: 'fixed_amount', seq: 50 },
        { code: 'TAX01', name: 'Sales Tax', category: 'Tax', type: 'percentage', seq: 90 },
      ],
      manufacturing: [
        { code: 'COST01', name: 'Material Cost', category: 'Cost', type: 'fixed_amount', seq: 10 },
        { code: 'COST02', name: 'Labor Cost', category: 'Cost', type: 'fixed_amount', seq: 20 },
        { code: 'COST03', name: 'Overhead', category: 'Cost', type: 'percentage', seq: 30 },
        { code: 'FEE01', name: 'Freight', category: 'Fee', type: 'fixed_amount', seq: 50 },
        { code: 'TAX01', name: 'Sales Tax', category: 'Tax', type: 'percentage', seq: 90 },
      ],
    };

    const template = templates[template_type];
    if (!template) {
      return res.status(400).json({ error: 'Invalid template type' });
    }

    const insertPromises = template.map(c =>
      pool.query(`
        INSERT INTO condition_types (condition_code, condition_name, condition_category, calculation_type, sequence_number, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (condition_code) DO NOTHING
      `, [c.code, c.name, c.category, c.type, c.seq])
    );

    await Promise.all(insertPromises);

    res.json({
      message: `${template_type} template applied successfully`,
      conditions_count: template.length
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

export default router;