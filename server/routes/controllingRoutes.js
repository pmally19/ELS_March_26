import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// =====================================================================
// COST CENTERS
// =====================================================================

// Get cost centers with aggregated data
router.get('/cost-centers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cc.id,
        cc.cost_center,
        cc.description,
        cc.cost_center_category,
        cc.hierarchy_area,
        COALESCE(SUM(ccp.planned_amount), 0) as total_planned,
        COALESCE(SUM(cca.actual_amount), 0) as total_actual,
        COUNT(DISTINCT ccp.id) as planning_entries,
        COUNT(DISTINCT cca.id) as actual_entries
      FROM cost_centers cc
      LEFT JOIN cost_center_planning ccp ON cc.cost_center = ccp.cost_center
      LEFT JOIN cost_center_actuals cca ON cc.cost_center = cca.cost_center
      WHERE cc.active = true
      GROUP BY cc.id, cc.cost_center, cc.description, cc.cost_center_category, cc.hierarchy_area
      ORDER BY cc.cost_center
    `);

    res.json({ cost_centers: result.rows });
  } catch (error) {
    console.error('Error fetching cost centers:', error);
    res.status(500).json({ error: 'Failed to fetch cost centers' });
  }
});

// =====================================================================
// CONTROLLING AREAS
// =====================================================================

// Get all controlling areas with company code information
router.get('/controlling-areas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        mca.id,
        mca.area_code as code,
        mca.area_name as name,
        mca.company_code_id,
        cc.code as company_code,
        cc.name as company_name
      FROM management_control_areas mca
      LEFT JOIN company_codes cc ON mca.company_code_id = cc.id
      WHERE mca.is_active = true
      ORDER BY mca.area_code
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching controlling areas:', error);
    res.status(500).json({ error: 'Failed to fetch controlling areas' });
  }
});


// =====================================================================
// VARIANCE ANALYSIS
// =====================================================================

// Generate variance analysis
router.post('/variance-analysis/:year/:period', async (req, res) => {
  try {
    const { year, period } = req.params;

    const result = await pool.query(`
      SELECT 
        cc.cost_center,
        cc.description,
        cc.cost_center_category,
        COALESCE(SUM(ccp.planned_amount), 0) as planned_amount,
        COALESCE(SUM(cca.actual_amount), 0) as actual_amount,
        COALESCE(SUM(cca.actual_amount), 0) - COALESCE(SUM(ccp.planned_amount), 0) as variance_amount,
        CASE 
          WHEN COALESCE(SUM(ccp.planned_amount), 0) = 0 THEN 0
          ELSE ROUND(((COALESCE(SUM(cca.actual_amount), 0) - COALESCE(SUM(ccp.planned_amount), 0)) / COALESCE(SUM(ccp.planned_amount), 0) * 100)::numeric, 2)
        END as variance_percentage
      FROM cost_centers cc
      LEFT JOIN cost_center_planning ccp ON cc.cost_center = ccp.cost_center 
        AND ccp.fiscal_year = $1 AND ccp.period = $2
      LEFT JOIN cost_center_actuals cca ON cc.cost_center = cca.cost_center 
        AND cca.fiscal_year = $1 AND cca.period = $2
      WHERE cc.active = true
      GROUP BY cc.cost_center, cc.description, cc.cost_center_category
      HAVING COALESCE(SUM(ccp.planned_amount), 0) > 0 OR COALESCE(SUM(cca.actual_amount), 0) > 0
      ORDER BY ABS(COALESCE(SUM(cca.actual_amount), 0) - COALESCE(SUM(ccp.planned_amount), 0)) DESC
    `, [parseInt(year), parseInt(period)]);

    res.json({ variance_analysis: result.rows });
  } catch (error) {
    console.error('Error generating variance analysis:', error);
    res.status(500).json({ error: 'Failed to generate variance analysis' });
  }
});

// =====================================================================
// CO-PA (PROFITABILITY ANALYSIS) - NOW WITH REAL DATA
// =====================================================================

// Get CO-PA (profitability analysis) data from profit_center_actuals
router.get('/copa/:year/:period', async (req, res) => {
  try {
    const { year, period } = req.params;

    const result = await pool.query(`
      SELECT 
        pc.profit_center,
        pc.description as profit_center_description,
        pca.customer_group,
        pca.product_group,
        pca.sales_organization,
        SUM(pca.revenue) as revenue,
        SUM(pca.cogs) as cogs,
        SUM(pca.revenue - pca.cogs) as gross_margin,
        SUM(pca.operating_expenses) as operating_expenses,
        SUM(pca.revenue - pca.cogs - pca.operating_expenses) as operating_profit,
        COUNT(*) as transactions
      FROM profit_centers pc
      LEFT JOIN profit_center_actuals pca ON pc.profit_center = pca.profit_center
        AND pca.fiscal_year = $1 AND pca.period = $2
      WHERE pc.active = true
      GROUP BY pc.profit_center, pc.description, pca.customer_group, pca.product_group, pca.sales_organization
      HAVING SUM(pca.revenue) > 0 OR SUM(pca.cogs) > 0
      ORDER BY SUM(pca.revenue - pca.cogs - pca.operating_expenses) DESC
    `, [parseInt(year), parseInt(period)]);

    res.json({ profitability_analysis: result.rows });
  } catch (error) {
    console.error('Error fetching CO-PA data:', error);
    res.status(500).json({ error: 'Failed to fetch CO-PA data' });
  }
});

// =====================================================================
// COST CENTER PLANNING
// =====================================================================

// Create cost center planning
router.post('/cost-center-planning', async (req, res) => {
  try {
    const { cost_center, fiscal_year, period, planning_data } = req.body;

    if (!cost_center || !fiscal_year || !period || !planning_data || !Array.isArray(planning_data)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    for (const data of planning_data) {
      await pool.query(`
        INSERT INTO cost_center_planning 
        (cost_center, fiscal_year, period, account, activity_type, planned_amount, planned_quantity, currency)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (cost_center, fiscal_year, period, account, activity_type)
        DO UPDATE SET 
          planned_amount = EXCLUDED.planned_amount,
          planned_quantity = EXCLUDED.planned_quantity,
          updated_at = CURRENT_TIMESTAMP
      `, [
        cost_center,
        fiscal_year,
        period,
        data.account,
        data.activity_type || null,
        data.planned_amount,
        data.planned_quantity || 0,
        data.currency || 'USD'
      ]);
    }

    res.json({ message: 'Cost center planning created successfully' });
  } catch (error) {
    console.error('Error creating cost center planning:', error);
    res.status(500).json({ error: 'Failed to create cost center planning' });
  }
});

// =====================================================================
// COST CENTER ACTUALS - NEW ENDPOINT
// =====================================================================

// Post actual costs to cost center
router.post('/post-actual', async (req, res) => {
  try {
    const {
      cost_center,
      fiscal_year,
      period,
      posting_date,
      account,
      activity_type,
      actual_amount,
      actual_quantity,
      currency,
      document_number,
      reference,
      cost_element,
      posted_by
    } = req.body;

    // Validation
    if (!cost_center || !fiscal_year || !period || !posting_date || !account || actual_amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if cost center exists
    const costCenterCheck = await pool.query(
      'SELECT cost_center FROM cost_centers WHERE cost_center = $1 AND active = true',
      [cost_center]
    );

    if (costCenterCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cost center not found or inactive' });
    }

    // Insert actual posting
    const result = await pool.query(`
      INSERT INTO cost_center_actuals 
      (cost_center, fiscal_year, period, posting_date, account, activity_type, 
       actual_amount, actual_quantity, currency, document_number, reference, 
       cost_element, posted_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      cost_center,
      fiscal_year,
      period,
      posting_date,
      account,
      activity_type || null,
      actual_amount,
      actual_quantity || 0,
      currency || 'USD',
      document_number || null,
      reference || null,
      cost_element || 'PRIMARY',
      posted_by || 'SYSTEM'
    ]);

    res.json({
      message: 'Actual cost posted successfully',
      actual: result.rows[0]
    });
  } catch (error) {
    console.error('Error posting actual cost:', error);
    res.status(500).json({ error: 'Failed to post actual cost' });
  }
});

// =====================================================================
// ACTIVITY TYPES
// =====================================================================

// Get all activity types
router.get('/activity-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT activity_type, description, unit_of_measure, category
      FROM activity_types
      WHERE active = true
      ORDER BY category, activity_type
    `);

    res.json({ activity_types: result.rows });
  } catch (error) {
    console.error('Error fetching activity types:', error);
    res.status(500).json({ error: 'Failed to fetch activity types' });
  }
});

// =====================================================================
// PROFIT CENTERS
// =====================================================================

// Get all profit centers
router.get('/profit-centers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT profit_center, description, profit_center_group, segment
      FROM profit_centers
      WHERE active = true
      ORDER BY profit_center
    `);

    res.json({ profit_centers: result.rows });
  } catch (error) {
    console.error('Error fetching profit centers:', error);
    res.status(500).json({ error: 'Failed to fetch profit centers' });
  }
});

// Post profit center actuals
router.post('/post-profit-center-actual', async (req, res) => {
  try {
    const {
      profit_center,
      fiscal_year,
      period,
      posting_date,
      revenue,
      cogs,
      operating_expenses,
      other_income,
      other_expenses,
      customer_group,
      product_group,
      sales_organization,
      document_number,
      currency
    } = req.body;

    // Validation
    if (!profit_center || !fiscal_year || !period || !posting_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert profit center actual
    const result = await pool.query(`
      INSERT INTO profit_center_actuals
      (profit_center, fiscal_year, period, posting_date, revenue, cogs, 
       operating_expenses, other_income, other_expenses, customer_group, 
       product_group, sales_organization, document_number, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      profit_center,
      fiscal_year,
      period,
      posting_date,
      revenue || 0,
      cogs || 0,
      operating_expenses || 0,
      other_income || 0,
      other_expenses || 0,
      customer_group || null,
      product_group || null,
      sales_organization || null,
      document_number || null,
      currency || 'USD'
    ]);

    res.json({
      message: 'Profit center actual posted successfully',
      actual: result.rows[0]
    });
  } catch (error) {
    console.error('Error posting profit center actual:', error);
    res.status(500).json({ error: 'Failed to post profit center actual' });
  }
});

export default router;