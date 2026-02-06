import { Router } from 'express';
import { AWSConnectionService } from '../aws-connection-service';
import { db } from '../db';

const router = Router();

// Ensure all data is synced to AWS
router.post('/sync-to-aws', async (req, res) => {
  try {
    const awsService = new AWSConnectionService(db);
    await awsService.initializeAWSConnection();
    
    const syncResult = await awsService.syncAllDataToAWS();
    
    res.json({
      success: true,
      message: 'Data successfully synced to AWS RDS',
      summary: syncResult.summary
    });
  } catch (error) {
    console.error('AWS sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync data to AWS',
      message: error.message
    });
  }
});

// Get AWS connection status
router.get('/aws-status', async (req, res) => {
  try {
    const awsService = new AWSConnectionService(db);
    await awsService.initializeAWSConnection();
    
    const status = awsService.getConnectionStatus();
    const integrity = await awsService.verifyDataIntegrity();
    
    res.json({
      connection: status,
      dataIntegrity: integrity,
      endpoint: 'database-1.cez84giwuqlr.us-east-1.rds.amazonaws.com'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check AWS status',
      message: error.message
    });
  }
});

export default router;