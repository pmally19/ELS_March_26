import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET all cost centers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        cost_center,
        description,
        active,
        created_at,
        updated_at
      FROM cost_centers
      WHERE active = true
      ORDER BY cost_center
    `);

    console.log(`✅ Cost Centers fetched: ${result.rows.length} records`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cost centers:', error);
    res.status(500).json({ message: 'Failed to fetch cost centers', error: error.message });
  }
});

// GET cost center by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cost_centers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cost center not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching cost center:', error);
    res.status(500).json({ message: 'Failed to fetch cost center', error: error.message });
  }
});

// POST create new cost center
router.post('/', async (req, res) => {
  try {
    const {
      cost_center, description, cost_center_category, company_code,
      responsible_person
    } = req.body;

    // Validate required fields
    if (!cost_center || !description) {
      return res.status(400).json({ message: 'Cost center code and description are required' });
    }

    const result = await pool.query(`
      INSERT INTO cost_centers (
        cost_center, description, cost_center_category, company_code,
        responsible_person, valid_from, active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, true, NOW(), NOW())
      RETURNING *
    `, [
      cost_center, description, cost_center_category || 'STD',
      company_code || '1000', responsible_person
    ]);

    console.log('✅ Cost Center created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cost center:', error);
    res.status(500).json({ message: 'Failed to create cost center', error: error.message });
  }
});

// PUT update cost center
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cost_center_code, name, description, company_code_id,
      responsible_person, budget_amount, actual_amount, status
    } = req.body;

    // Calculate variance if both budget and actual are provided
    const variance = budget_amount && actual_amount ? actual_amount - budget_amount : 0;

    const result = await pool.query(`
      UPDATE cost_centers SET 
        cost_center_code = $1, name = $2, description = $3, 
        company_code_id = $4, responsible_person = $5, 
        budget_amount = $6, actual_amount = $7, variance_amount = $8,
        status = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      cost_center_code, name, description, company_code_id,
      responsible_person, budget_amount, actual_amount, variance, status, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cost center not found' });
    }

    console.log('✅ Cost Center updated successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cost center:', error);
    res.status(500).json({ message: 'Failed to update cost center', error: error.message });
  }
});

// DELETE cost center (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE cost_centers SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cost center not found' });
    }

    console.log('✅ Cost Center deactivated successfully:', result.rows[0]);
    res.json({ message: 'Cost center deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating cost center:', error);
    res.status(500).json({ message: 'Failed to deactivate cost center', error: error.message });
  }
});

// GET cost center budget analysis
router.get('/:id/budget-analysis', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cost_center_code, name, budget_amount, actual_amount, variance_amount,
        CASE 
          WHEN budget_amount > 0 THEN (actual_amount / budget_amount * 100)
          ELSE 0 
        END as utilization_percentage,
        CASE
          WHEN variance_amount > 0 THEN 'Over Budget'
          WHEN variance_amount < 0 THEN 'Under Budget' 
          ELSE 'On Budget'
        END as budget_status
      FROM cost_centers 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cost center not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching budget analysis:', error);
    res.status(500).json({ message: 'Failed to fetch budget analysis', error: error.message });
  }
});

export default router;