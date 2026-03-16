import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Get Dominos E2E test results with proper formatting
router.get('/dominos-results', async (req, res) => {
  try {
    const results = await pool.query(`
      SELECT 
        id,
        test_number as "testNumber",
        test_name as "testName",
        status,
        timestamp,
        duration,
        screenshot,
        domain,
        description,
        error_message as "errorMessage",
        test_data as "testData"
      FROM dominos_test_results 
      ORDER BY timestamp DESC
    `);
    
    const formattedResults = results.rows.map(row => ({
      ...row,
      id: row.id.toString(),
      testData: typeof row.testData === 'string' ? JSON.parse(row.testData) : row.testData
    }));
    
    res.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length
    });
  } catch (error) {
    console.error('Error fetching Dominos test results:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch test results',
      results: []
    });
  }
});

export default router;