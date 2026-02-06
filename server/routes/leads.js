import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

// Create direct connection instead of importing
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

const router = express.Router();

// Get all leads with optional filtering
router.get('/api/sales/leads', async (req, res) => {
  try {
    // Check if leads table exists first
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
    
    const { filter, search, status } = req.query;
    
    console.log('Received query params:', { filter, search, status });
    
    let query = `
      SELECT 
        id, 
        COALESCE(company_name, 'Unknown Company') as name,
        CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as contact_person,
        email,
        COALESCE(phone, 'N/A') as phone,
        COALESCE(source, 'Unknown') as source,
        COALESCE(status, 'New') as status,
        COALESCE(industry, 'Unknown') as industry,
        created_at as "createdAt",
        last_contacted as "lastContact",
        COALESCE(lead_score, 0) as "interestLevel"
      FROM leads
      WHERE (active IS NULL OR active = true)
    `;
    
    const queryParams = [];
    const conditions = [];
    
    // Add status filter if specified (this is from the dropdown in the UI)
    if (status && status !== 'all') {
      console.log('Filtering by status:', status);
      conditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }
    
    // Add filter condition if specified (keeping for backwards compatibility)
    if (filter && filter !== 'all' && !status) {
      // Convert filter to match database capitalization (first letter uppercase)
      const formattedFilter = filter.charAt(0).toUpperCase() + filter.slice(1).toLowerCase();
      console.log('Filtering by filter param:', formattedFilter);
      conditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(formattedFilter);
    }
    
    // Add search condition if specified
    if (search) {
      conditions.push(`(
        company_name ILIKE $${queryParams.length + 1} OR
        first_name ILIKE $${queryParams.length + 1} OR
        last_name ILIKE $${queryParams.length + 1} OR
        email ILIKE $${queryParams.length + 1}
      )`);
      queryParams.push(`%${search}%`);
    }
    
    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add ordering
    query += ` ORDER BY company_name`;
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Error fetching leads', error: error.message });
  }
});

// Get leads for opportunity dropdowns
router.get('/api/sales/leads-for-opportunities', async (req, res) => {
  try {
    // Check if leads table exists first
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
        company_name, 
        CONCAT(first_name, ' ', last_name) as contact_name
      FROM leads
      WHERE status != 'disqualified'
      ORDER BY company_name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leads for dropdown:', error);
    res.status(500).json({ message: 'Error fetching leads', error: error.message });
  }
});

// Create a new lead
router.post('/api/sales/leads', async (req, res) => {
  try {
    const { name, contact_person, email, phone, source, status, industry } = req.body;
    
    // Basic validation
    if (!name || !contact_person || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Split contact person into first and last name
    const nameParts = contact_person.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Create the new lead
    const result = await pool.query(`
      INSERT INTO leads (
        company_name, 
        first_name, 
        last_name, 
        email, 
        phone, 
        source, 
        status, 
        industry, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING 
        id, 
        company_name as name,
        CONCAT(first_name, ' ', last_name) as contact_person,
        email,
        phone,
        source,
        status,
        industry,
        created_at as "createdAt"
    `, [name, firstName, lastName, email, phone, source, status, industry]);
    
    // Return the newly created lead
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Error creating lead', error: error.message });
  }
});

export default router;