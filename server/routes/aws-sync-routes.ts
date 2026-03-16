import { Router } from 'express';
import { AWSConnectionService } from '../aws-connection-service';
import { db } from '../db';

const router = Router();

// Initialize AWS connection service
const awsService = new AWSConnectionService(db);

// Sync all tables to AWS
router.post('/sync-all', async (req, res) => {
  try {
    console.log('Starting AWS PostgreSQL sync...');
    
    // Initialize AWS connection
    await awsService.initializeAWSConnection();
    
    // Sync all data to AWS
    const result = await awsService.syncAllDataToAWS();
    
    res.json({
      success: true,
      message: 'AWS sync completed successfully',
      summary: result.summary
    });
  } catch (error) {
    console.error('AWS sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync to AWS',
      details: error.message
    });
  }
});

// Sync specific tables to AWS
router.post('/sync-tables', async (req, res) => {
  try {
    const { tables } = req.body;
    
    if (!tables || !Array.isArray(tables)) {
      return res.status(400).json({
        success: false,
        error: 'Tables array is required'
      });
    }
    
    await awsService.initializeAWSConnection();
    
    const results = [];
    for (const tableName of tables) {
      try {
        const rowsSynced = await awsService.syncTableToAWS(tableName);
        results.push({ table: tableName, rowsSynced, status: 'success' });
      } catch (error) {
        results.push({ table: tableName, error: error.message, status: 'failed' });
      }
    }
    
    res.json({
      success: true,
      message: 'Table sync completed',
      results
    });
  } catch (error) {
    console.error('Table sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync tables',
      details: error.message
    });
  }
});

// Get AWS connection status
router.get('/status', async (req, res) => {
  try {
    const status = awsService.getConnectionStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

// Verify data integrity between local and AWS
router.get('/verify-integrity', async (req, res) => {
  try {
    await awsService.initializeAWSConnection();
    const integrity = await awsService.verifyDataIntegrity();
    
    res.json({
      success: true,
      integrity
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify data integrity',
      details: error.message
    });
  }
});

// Sync Designer Agent tables specifically
router.post('/sync-designer-tables', async (req, res) => {
  try {
    await awsService.initializeAWSConnection();
    
    const designerTables = [
      'designer_documents',
      'designer_analysis', 
      'designer_reviews',
      'designer_implementations',
      'designer_agent_communications'
    ];
    
    const results = [];
    for (const tableName of designerTables) {
      try {
        const rowsSynced = await awsService.syncTableToAWS(tableName);
        results.push({ table: tableName, rowsSynced, status: 'success' });
      } catch (error) {
        results.push({ table: tableName, error: error.message, status: 'failed' });
      }
    }
    
    res.json({
      success: true,
      message: 'Designer Agent tables synced to AWS',
      results
    });
  } catch (error) {
    console.error('Designer tables sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync designer tables',
      details: error.message
    });
  }
});

// Sync General Ledger tables specifically
router.post('/sync-gl-tables', async (req, res) => {
  try {
    await awsService.initializeAWSConnection();
    
    const glTables = ['gl_accounts', 'gl_entries'];
    
    const results = [];
    for (const tableName of glTables) {
      try {
        const rowsSynced = await awsService.syncTableToAWS(tableName);
        results.push({ table: tableName, rowsSynced, status: 'success' });
      } catch (error) {
        results.push({ table: tableName, error: error.message, status: 'failed' });
      }
    }
    
    res.json({
      success: true,
      message: 'General Ledger tables synced to AWS',
      results
    });
  } catch (error) {
    console.error('GL tables sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync GL tables',
      details: error.message
    });
  }
});

export default router;