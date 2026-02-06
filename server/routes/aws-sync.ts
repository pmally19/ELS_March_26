import { Router } from 'express';
import { AWSConnectionService } from '../aws-connection-service';
import { db } from '../db';

const router = Router();

// Initialize AWS connection service
const awsService = new AWSConnectionService(db);

// Initialize AWS connection
router.post('/initialize', async (req, res) => {
  try {
    await awsService.initializeAWSConnection();
    res.json({ 
      success: true, 
      message: 'AWS RDS connection initialized successfully',
      connection: awsService.getConnectionStatus()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Sync all data to AWS
router.post('/sync-all', async (req, res) => {
  try {
    const result = await awsService.syncAllDataToAWS();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get sync status
router.get('/sync-status', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        table_name,
        sync_type,
        records_processed,
        records_successful,
        records_failed,
        sync_status,
        start_time,
        end_time,
        error_details
      FROM database_sync_log 
      ORDER BY start_time DESC 
      LIMIT 50
    `);
    
    res.json({ 
      success: true, 
      syncLogs: result.rows 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Verify data integrity
router.post('/verify-integrity', async (req, res) => {
  try {
    const result = await awsService.verifyDataIntegrity();
    res.json({ 
      success: true, 
      ...result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get connection status
router.get('/connection-status', async (req, res) => {
  try {
    const status = awsService.getConnectionStatus();
    res.json({ 
      success: true, 
      ...status 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Close AWS connection
router.post('/disconnect', async (req, res) => {
  try {
    await awsService.closeConnection();
    res.json({ 
      success: true, 
      message: 'AWS RDS connection closed successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;