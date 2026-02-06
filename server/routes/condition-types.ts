import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Get all condition types (optionally filtered by company)
router.get('/', async (req, res) => {
  try {
    const { company_code } = req.query;

    let result;
    if (company_code) {
      result = await pool.query(`
        SELECT ct.*, cc.code as company_code, cc.name as company_name, ct.account_key
        FROM condition_types ct
        JOIN company_codes cc ON ct.company_code_id = cc.id
        WHERE cc.code = $1
        ORDER BY ct.sequence_number, ct.condition_code
      `, [company_code]);
    } else {
      // Global context: fetch distinct codes and names for the dropdown
      // We pick one name (arbitrarily the first one found) for the code
      result = await pool.query(`
        SELECT DISTINCT ON(condition_code) 
          condition_code,
        condition_name,
        'GLOBAL' as company_code
        FROM condition_types
        ORDER BY condition_code, condition_name
        `);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching condition types:', error);
    res.status(500).json({ error: 'Failed to fetch condition types' });
  }
});

// Get companies for dropdown
router.get('/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, name
      FROM company_codes
      WHERE active = true
      ORDER BY code
        `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
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

// Create new condition type
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
      company_code,
      account_key
    } = req.body;

    // Get company_code_id
    const companyResult = await pool.query(`
      SELECT id FROM company_codes WHERE code = $1
        `, [company_code]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company_code_id = companyResult.rows[0].id;

    // Check if condition code already exists for this company
    const existingResult = await pool.query(`
      SELECT id FROM condition_types 
      WHERE condition_code = $1 AND company_code_id = $2
        `, [condition_code, company_code_id]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Condition code already exists for this company' });
    }

    // Insert new condition type
    const insertResult = await pool.query(`
      INSERT INTO condition_types(
          condition_code, condition_name, condition_category, calculation_type,
          description, default_value, min_value, max_value, sequence_number,
          is_mandatory, is_active, company_code_id, account_key
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
        `, [
      condition_code, condition_name, condition_category, calculation_type,
      description, default_value, min_value, max_value, sequence_number,
      is_mandatory, is_active, company_code_id, account_key
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

    // Parse body if it's a string (body parser issue)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log('=== UPDATE DEBUG ===');
    console.log('Body type:', typeof req.body);
    console.log('Parsed body:', body);
    console.log('account_key value:', body.account_key);

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
      account_key
    } = body;

    console.log('After destructure account_key:', account_key);
    console.log('===================');

    // Build dynamic UPDATE query with only provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (condition_code !== undefined) {
      updates.push(`condition_code = $${paramIndex++}`);
      values.push(condition_code);
    }
    if (condition_name !== undefined) {
      updates.push(`condition_name = $${paramIndex++}`);
      values.push(condition_name);
    }
    if (condition_category !== undefined) {
      updates.push(`condition_category = $${paramIndex++}`);
      values.push(condition_category);
    }
    if (calculation_type !== undefined) {
      updates.push(`calculation_type = $${paramIndex++}`);
      values.push(calculation_type);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (default_value !== undefined) {
      updates.push(`default_value = $${paramIndex++}`);
      values.push(default_value);
    }
    if (min_value !== undefined) {
      updates.push(`min_value = $${paramIndex++}`);
      values.push(min_value);
    }
    if (max_value !== undefined) {
      updates.push(`max_value = $${paramIndex++}`);
      values.push(max_value);
    }
    if (sequence_number !== undefined) {
      updates.push(`sequence_number = $${paramIndex++}`);
      values.push(sequence_number);
    }
    if (is_mandatory !== undefined) {
      updates.push(`is_mandatory = $${paramIndex++}`);
      values.push(is_mandatory);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (account_key !== undefined) {
      updates.push(`account_key = $${paramIndex++}`);
      values.push(account_key);
    }

    // Always update the timestamp
    updates.push(`updated_at = now()`);

    // Add id for WHERE clause
    values.push(id);

    const updateResult = await pool.query(`
      UPDATE condition_types SET
        ${updates.join(', ')}
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

    // Check if condition type is used in any sales orders
    const usageResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM sales_order_conditions soc
      JOIN condition_types ct ON soc.condition_type_id = ct.id
      WHERE ct.id = $1
        `, [id]);

    const usageCount = parseInt(usageResult.rows[0].count);
    if (usageCount > 0) {
      return res.status(400).json({
        error: `Cannot delete condition type.It is used in ${usageCount} sales order(s)`
      });
    }

    const deleteResult = await pool.query(`
      DELETE FROM condition_types WHERE id = $1 RETURNING *
      `, [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Condition type not found' });
    }

    res.json({ message: 'Condition type deleted successfully' });
  } catch (error) {
    console.error('Error deleting condition type:', error);
    res.status(500).json({ error: 'Failed to delete condition type' });
  }
});

// Apply business template
router.post('/apply-template', async (req, res) => {
  try {
    const { template_type, company_code } = req.body;

    // Get company_code_id
    const companyResult = await pool.query(`
      SELECT id FROM company_codes WHERE code = $1
        `, [company_code]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company_code_id = companyResult.rows[0].id;

    let templateConditions = [];

    switch (template_type) {
      case 'standard_erp':
        templateConditions = [
          // Revenue Conditions
          { code: 'STD1', name: 'Standard Base Price', category: 'Revenue', type: 'fixed_amount', seq: 10 },
          { code: 'STD2', name: 'List Price', category: 'Revenue', type: 'fixed_amount', seq: 12 },
          { code: 'STD3', name: 'Net Price', category: 'Revenue', type: 'fixed_amount', seq: 14 },

          // Customer Discounts  
          { code: 'CDIS01', name: 'Customer Group Discount', category: 'Discount', type: 'percentage', seq: 20 },
          { code: 'CDIS02', name: 'Volume Discount', category: 'Discount', type: 'percentage', seq: 22 },
          { code: 'CDIS03', name: 'Early Payment Discount', category: 'Discount', type: 'percentage', seq: 24 },
          { code: 'CDIS04', name: 'Loyalty Discount', category: 'Discount', type: 'percentage', seq: 26 },

          // Material Discounts
          { code: 'MDIS01', name: 'Material Group Discount', category: 'Discount', type: 'percentage', seq: 30 },
          { code: 'MDIS02', name: 'Seasonal Discount', category: 'Discount', type: 'percentage', seq: 32 },

          // Surcharges
          { code: 'SURCH01', name: 'Express Delivery', category: 'Surcharge', type: 'fixed_amount', seq: 40 },
          { code: 'SURCH02', name: 'Handling Fee', category: 'Surcharge', type: 'percentage', seq: 42 },

          // Fees
          { code: 'FEE01', name: 'Freight Charges', category: 'Fee', type: 'fixed_amount', seq: 50 },
          { code: 'FEE02', name: 'Packaging Fee', category: 'Fee', type: 'fixed_amount', seq: 52 },
          { code: 'FEE03', name: 'Setup Fee', category: 'Fee', type: 'fixed_amount', seq: 54 },

          // Tax Conditions
          { code: 'TAX01', name: 'Sales Tax', category: 'Tax', type: 'percentage', seq: 90 },
          { code: 'TAX02', name: 'VAT Standard Rate', category: 'Tax', type: 'percentage', seq: 92 },
          { code: 'TAX03', name: 'VAT Reduced Rate', category: 'Tax', type: 'percentage', seq: 94 },
          { code: 'TAX04', name: 'Excise Tax', category: 'Tax', type: 'percentage', seq: 96 }
        ];
        break;
      case 'restaurant':
        templateConditions = [
          { code: 'STD1', name: 'Base Food Price', category: 'Revenue', type: 'fixed_amount', seq: 10 },
          { code: 'CDIS01', name: 'Volume Discount', category: 'Discount', type: 'percentage', seq: 20 },
          { code: 'FEE01', name: 'Delivery Charge', category: 'Fee', type: 'fixed_amount', seq: 50 },
          { code: 'TAX01', name: 'Sales Tax', category: 'Tax', type: 'percentage', seq: 90 }
        ];
        break;
      case 'retail':
        templateConditions = [
          { code: 'STD1', name: 'Product Price', category: 'Revenue', type: 'fixed_amount', seq: 10 },
          { code: 'CDIS01', name: 'Loyalty Discount', category: 'Discount', type: 'percentage', seq: 20 },
          { code: 'FEE01', name: 'Shipping Cost', category: 'Fee', type: 'tiered', seq: 50 },
          { code: 'TAX01', name: 'Sales Tax', category: 'Tax', type: 'percentage', seq: 90 }
        ];
        break;
      case 'manufacturing':
        templateConditions = [
          { code: 'COST01', name: 'Material Cost', category: 'Cost', type: 'fixed', seq: 10 },
          { code: 'COST02', name: 'Labor Cost', category: 'Cost', type: 'fixed', seq: 20 },
          { code: 'COST03', name: 'Overhead Allocation', category: 'Cost', type: 'percentage', seq: 30 },
          { code: 'FE10', name: 'Freight', category: 'Fee', type: 'percentage', seq: 40 },
          { code: 'CDIS04', name: 'Profit Margin', category: 'Revenue', type: 'percentage', seq: 50 },
          { code: 'TAX01', name: 'Sales Tax', category: 'Tax', type: 'percentage', seq: 90 }
        ];
        break;
      case 'healthcare':
        templateConditions = [
          { code: 'STD1', name: 'Service Fee', category: 'Revenue', type: 'fixed', seq: 10 },
          { code: 'CDIS01', name: 'Insurance Co-pay', category: 'Discount', type: 'fixed', seq: 20 },
          { code: 'COST01', name: 'Medical Supplies', category: 'Cost', type: 'fixed', seq: 30 },
          { code: 'FEE01', name: 'Facility Charge', category: 'Fee', type: 'fixed', seq: 40 },
          { code: 'TAX02', name: 'Healthcare Tax', category: 'Tax', type: 'percentage', seq: 90 }
        ];
        break;
      case 'professional':
        templateConditions = [
          { code: 'STD1', name: 'Hourly Rate', category: 'Revenue', type: 'fixed', seq: 10 },
          { code: 'FEE01', name: 'Project Fee', category: 'Revenue', type: 'fixed', seq: 20 },
          { code: 'COST01', name: 'Expense Reimbursement', category: 'Cost', type: 'fixed', seq: 30 },
          { code: 'TAX01', name: 'Professional Tax', category: 'Tax', type: 'percentage', seq: 40 },
          { code: 'CDIS01', name: 'Client Discount', category: 'Discount', type: 'percentage', seq: 50 }
        ];
        break;
      case 'construction':
        templateConditions = [
          { code: 'COST01', name: 'Labor Cost', category: 'Cost', type: 'fixed', seq: 10 },
          { code: 'COST02', name: 'Materials Cost', category: 'Cost', type: 'fixed', seq: 20 },
          { code: 'FEE01', name: 'Equipment Rental', category: 'Fee', type: 'fixed', seq: 30 },
          { code: 'COST03', name: 'Project Overhead', category: 'Cost', type: 'percentage', seq: 40 },
          { code: 'TAX02', name: 'Permits & Fees', category: 'Tax', type: 'fixed', seq: 90 }
        ];
        break;
      default:
        return res.status(400).json({ error: 'Invalid template type' });
    }

    // Insert template conditions
    const insertPromises = templateConditions.map(async (condition) => {
      return pool.query(`
        INSERT INTO condition_types(
          condition_code, condition_name, condition_category, calculation_type,
          sequence_number, company_code_id, is_active
        ) VALUES($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT(condition_code, company_code_id) DO NOTHING
        `, [
        condition.code, condition.name, condition.category,
        condition.type, condition.seq, company_code_id
      ]);
    });

    await Promise.all(insertPromises);

    res.json({
      message: `${template_type} template applied successfully`,
      conditions_added: templateConditions.length
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

export default router;