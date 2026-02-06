import express from 'express';
import { pool } from '../db';

const router = express.Router();

/**
 * Delete data from selected tables
 * This is a controlled interface for deleting master data
 * Only accessible through the Master Data Checker protection system
 */
router.post('/delete-table-data', async (req, res) => {
  try {
    const { tables } = req.body;
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No tables selected for deletion' 
      });
    }

    const client = await pool.connect();
    let tablesAffected = 0;
    let totalRecordsDeleted = 0;
    
    try {
      // Start a transaction for data safety
      await client.query('BEGIN');

      for (const table of tables) {
        // Sanitize table name to prevent SQL injection
        const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
        
        // Get count of records before deletion
        const countResult = await client.query(`SELECT COUNT(*) FROM ${sanitizedTable}`);
        const recordCount = parseInt(countResult.rows[0].count);
        
        if (recordCount > 0) {
          // Delete all data from table
          await client.query(`DELETE FROM ${sanitizedTable}`);
          tablesAffected++;
          totalRecordsDeleted += recordCount;
        }
      }

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        tablesAffected,
        totalRecordsDeleted,
        message: `Successfully deleted ${totalRecordsDeleted} records from ${tablesAffected} tables`
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting table data:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting data from tables'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error in delete-table-data endpoint:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

export default router;