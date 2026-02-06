import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get all opportunities with optional filtering
router.get('/api/sales/opportunities', async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    
    let query = `
      SELECT 
        o.id,
        o.name,
        o.lead_id,
        o.status,
        o.stage,
        o.amount as value,
        o.probability,
        o.close_date as expected_close_date,
        o.next_step,
        o.type,
        o.source,
        o.is_closed,
        o.is_won,
        o.description,
        o.created_at,
        o.updated_at,
        l.company_name as customer,
        CONCAT(l.first_name, ' ', l.last_name) as contact_person
      FROM opportunities o
      LEFT JOIN leads l ON o.lead_id = l.id
    `;
    
    // Apply filtering based on the stage parameter
    if (filter !== 'all') {
      query += ` WHERE o.stage = '${filter.replace(/_/g, ' ')}'`;
    }
    
    query += ` ORDER BY o.updated_at DESC`;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ message: 'Error fetching opportunities', error: error.message });
  }
});

// Get a single opportunity by ID
router.get('/api/sales/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Special routes for pipeline, open opportunities, and export
    if (id === 'pipeline' || id === 'open' || id === 'export') {
      // These are handled by special routes
      return res.json([]);
    }
    
    const result = await pool.query(`
      SELECT 
        o.*,
        l.company_name as customer_name,
        CONCAT(l.first_name, ' ', l.last_name) as contact_person
      FROM opportunities o
      LEFT JOIN leads l ON o.lead_id = l.id
      WHERE o.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({ message: 'Error fetching opportunity', error: error.message });
  }
});

// Create a new opportunity
router.post('/api/sales/opportunities', async (req, res) => {
  try {
    const {
      name,
      lead_id,
      status,
      stage,
      amount,
      expected_revenue,
      probability,
      close_date,
      next_step,
      type,
      source,
      description
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO opportunities (
        name,
        lead_id,
        status,
        stage,
        amount,
        expected_revenue,
        probability,
        close_date,
        next_step,
        type,
        source,
        description,
        is_closed,
        is_won,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING *
    `, [
      name,
      lead_id,
      status || 'Open',
      stage || 'Prospecting',
      amount || 0,
      expected_revenue || 0,
      probability || 0,
      close_date || null,
      next_step || '',
      type || 'New Business',
      source || 'Manual Entry',
      description || '',
      (stage === 'Closed Won' || stage === 'Closed Lost'),
      stage === 'Closed Won'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating opportunity:', error);
    res.status(500).json({ message: 'Error creating opportunity', error: error.message });
  }
});

// Update an opportunity
router.put('/api/sales/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      lead_id,
      status,
      stage,
      amount,
      expected_revenue,
      probability,
      close_date,
      next_step,
      type,
      source,
      description
    } = req.body;
    
    const result = await pool.query(`
      UPDATE opportunities SET
        name = $1,
        lead_id = $2,
        status = $3,
        stage = $4,
        amount = $5,
        expected_revenue = $6,
        probability = $7,
        close_date = $8,
        next_step = $9,
        type = $10,
        source = $11,
        description = $12,
        is_closed = $13,
        is_won = $14,
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `, [
      name,
      lead_id,
      status || 'Open',
      stage,
      amount || 0,
      expected_revenue || 0,
      probability || 0,
      close_date,
      next_step,
      type,
      source,
      description,
      (stage === 'Closed Won' || stage === 'Closed Lost'),
      stage === 'Closed Won',
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    res.status(500).json({ message: 'Error updating opportunity', error: error.message });
  }
});

// Delete an opportunity
router.delete('/api/sales/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM opportunities WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    
    res.json({ message: 'Opportunity deleted successfully', id });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    res.status(500).json({ message: 'Error deleting opportunity', error: error.message });
  }
});

// Get all leads for opportunity creation/editing
router.get('/api/sales/leads-for-opportunities', async (req, res) => {
  try {
    // Check if leads table exists
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'leads'
      );
    `);
    
    if (!checkTableResult.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }
    
    const result = await pool.query(`
      SELECT 
        id, 
        CONCAT(first_name, ' ', last_name) as contact_name,
        company_name,
        email,
        status
      FROM leads
      WHERE status IN ('New', 'Contacted', 'Qualified')
      ORDER BY company_name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leads for opportunities:', error);
    res.status(500).json({ message: 'Error fetching leads', error: error.message });
  }
});

// Export opportunities
router.get('/api/sales/opportunities/export', async (req, res) => {
  try {
    // Check if opportunities table exists
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'opportunities'
      );
    `);
    
    if (!checkTableResult.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }
    
    // Get the actual column names from the table
    const columnInfoResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'opportunities';
    `);
    
    const columnNames = columnInfoResult.rows.map(row => row.column_name);
    
    // Build a simpler query that only uses standard columns
    const query = `
      SELECT 
        o.id,
        o.name,
        l.company_name as customer,
        CONCAT(l.first_name, ' ', l.last_name) as contact_person,
        o.amount as value,
        o.probability,
        o.stage,
        o.status,
        o.type,
        o.source,
        o.description,
        o.created_at,
        o.updated_at
      FROM opportunities o
      LEFT JOIN leads l ON o.lead_id = l.id
      ORDER BY o.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error exporting opportunities:', error);
    res.status(500).json({ message: 'Error exporting opportunities', error: error.message });
  }
});

// NOTE: This is a duplicate route that was causing issues
// The route '/api/sales/leads-for-opportunities' is already defined above
// Removing this duplicate to ensure proper API functionality

// Get opportunity pipeline data by stage (for visualization)
// Using persistent endpoint to ensure data consistency across navigation
router.get('/api/sales-module/pipeline-by-stage', async (req, res) => {
  try {
    // Check if opportunities table exists
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'opportunities'
      );
    `);
    
    if (!checkTableResult.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }
    
    const query = `
      SELECT 
        stage, 
        COUNT(*) as count, 
        SUM(amount) as value
      FROM opportunities
      WHERE stage IS NOT NULL
      GROUP BY stage
      ORDER BY 
        CASE 
          WHEN stage = 'Prospecting' THEN 1
          WHEN stage = 'Qualification' THEN 2
          WHEN stage = 'Needs Analysis' THEN 3
          WHEN stage = 'Value Proposition' THEN 4
          WHEN stage = 'Identify Decision Makers' THEN 5
          WHEN stage = 'Proposal/Price Quote' THEN 6
          WHEN stage = 'Negotiation/Review' THEN 7
          WHEN stage = 'Closed Won' THEN 8
          WHEN stage = 'Closed Lost' THEN 9
          ELSE 10
        END
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching opportunity pipeline data:', error);
    res.status(500).json({ message: 'Error fetching pipeline data', error: error.message });
  }
});

// Keep the original API for backward compatibility
router.get('/api/sales/opportunities-pipeline', async (req, res) => {
  try {
    // Check if opportunities table exists
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'opportunities'
      );
    `);
    
    if (!checkTableResult.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }
    
    const query = `
      SELECT 
        stage, 
        COUNT(*) as count, 
        SUM(amount) as value
      FROM opportunities
      WHERE stage IS NOT NULL
      GROUP BY stage
      ORDER BY 
        CASE 
          WHEN stage = 'Prospecting' THEN 1
          WHEN stage = 'Qualification' THEN 2
          WHEN stage = 'Needs Analysis' THEN 3
          WHEN stage = 'Value Proposition' THEN 4
          WHEN stage = 'Identify Decision Makers' THEN 5
          WHEN stage = 'Proposal/Price Quote' THEN 6
          WHEN stage = 'Negotiation/Review' THEN 7
          WHEN stage = 'Closed Won' THEN 8
          WHEN stage = 'Closed Lost' THEN 9
          ELSE 10
        END
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching opportunity pipeline data:', error);
    res.status(500).json({ message: 'Error fetching pipeline data', error: error.message });
  }
});

// Get open opportunities with a persistent url (for quick viewing)
router.get('/api/sales-module/open-opportunities', async (req, res) => {
  try {
    // Check if opportunities table exists
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'opportunities'
      );
    `);
    
    if (!checkTableResult.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }
    
    const query = `
      SELECT 
        o.id,
        o.name,
        o.stage,
        o.amount as value,
        o.probability,
        o.close_date as expected_close_date,
        l.company_name as customer
      FROM opportunities o
      LEFT JOIN leads l ON o.lead_id = l.id
      WHERE o.stage NOT IN ('Closed Won', 'Closed Lost')
      ORDER BY o.updated_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching open opportunities:', error);
    res.status(500).json({ message: 'Error fetching open opportunities', error: error.message });
  }
});

// Keep original endpoint for backwards compatibility
router.get('/api/sales/opportunities-open', async (req, res) => {
  try {
    // Check if opportunities table exists
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'opportunities'
      );
    `);
    
    if (!checkTableResult.rows[0].exists) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }
    
    const query = `
      SELECT 
        o.id,
        o.name,
        o.stage,
        o.amount as value,
        o.probability,
        o.close_date as expected_close_date,
        l.company_name as customer
      FROM opportunities o
      LEFT JOIN leads l ON o.lead_id = l.id
      WHERE o.stage NOT IN ('Closed Won', 'Closed Lost')
      ORDER BY o.updated_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching open opportunities:', error);
    res.status(500).json({ message: 'Error fetching open opportunities', error: error.message });
  }
});

export default router;