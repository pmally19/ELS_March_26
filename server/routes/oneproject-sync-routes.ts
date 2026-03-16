import { Router } from 'express';
import { oneProjectSyncAgent } from '../services/oneproject-sync-agent';
import { pool } from '../db';

const router = Router();

/**
 * OneProject Synchronization Agent API Routes
 * Provides real-time parallel synchronization between OneProject and business domain tables
 */

// Get sync status and statistics
router.get('/status', async (req, res) => {
  try {
    const status = await oneProjectSyncAgent.getSyncStatus();
    res.json({
      success: true,
      syncStatus: status,
      message: 'OneProject synchronization status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get synchronization status'
    });
  }
});

// Trigger manual sync for specific table
router.post('/manual-sync/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    await oneProjectSyncAgent.triggerManualSync(tableName);
    
    res.json({
      success: true,
      message: `Manual synchronization triggered for ${tableName}`,
      tableName
    });
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger manual synchronization'
    });
  }
});

// Trigger full system sync (all tables)
router.post('/full-sync', async (req, res) => {
  try {
    const supportedTables = [
      'customers', 'sales_orders', 'materials', 'vendors', 
      'purchase_orders', 'production_orders', 'general_ledger_accounts', 'cost_centers'
    ];
    
    const syncResults = [];
    
    for (const tableName of supportedTables) {
      try {
        await oneProjectSyncAgent.triggerManualSync(tableName);
        syncResults.push({ table: tableName, status: 'success' });
      } catch (error) {
        syncResults.push({ table: tableName, status: 'failed', error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: 'Full system synchronization triggered',
      results: syncResults
    });
  } catch (error) {
    console.error('Error triggering full sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger full system synchronization'
    });
  }
});

// Get sync operation logs
router.get('/logs', async (req, res) => {
  try {
    const { limit = 100, status, table } = req.query;
    
    const client = await pool.connect();
    try {
      let query = `
        SELECT * FROM sync_operation_log 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;
      
      if (status) {
        paramCount++;
        query += ` AND sync_status = $${paramCount}`;
        params.push(status);
      }
      
      if (table) {
        paramCount++;
        query += ` AND (source_table = $${paramCount} OR target_table = $${paramCount})`;
        params.push(table);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1}`;
      params.push(Number(limit));
      
      const result = await client.query(query, params);
      
      res.json({
        success: true,
        logs: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting sync logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve synchronization logs'
    });
  }
});

// Get sync mapping configuration
router.get('/mappings', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Get current sync mappings from the agent
      const status = await oneProjectSyncAgent.getSyncStatus();
      
      res.json({
        success: true,
        mappings: status.supportedTables.map(table => ({
          businessTable: table,
          syncDirection: 'BIDIRECTIONAL',
          enabled: true
        })),
        totalMappings: status.syncMappings
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting sync mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync mappings'
    });
  }
});

// Test sync operation
router.post('/test-sync', async (req, res) => {
  try {
    const { sourceTable, operation, recordId } = req.body;
    
    if (!sourceTable || !operation || !recordId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: sourceTable, operation, recordId'
      });
    }
    
    // Trigger test sync operation
    if (sourceTable === 'one_project') {
      await oneProjectSyncAgent.syncOneProjectToBusiness(recordId, operation, [], {});
    } else {
      await oneProjectSyncAgent.syncBusinessToOneProject(sourceTable, recordId, operation, {});
    }
    
    res.json({
      success: true,
      message: `Test sync operation queued successfully`,
      operation: {
        sourceTable,
        operation,
        recordId
      }
    });
  } catch (error) {
    console.error('Error testing sync operation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test sync operation'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const status = await oneProjectSyncAgent.getSyncStatus();
    
    res.json({
      success: true,
      health: {
        syncAgent: 'operational',
        queuedOperations: status.queuedOperations,
        isProcessing: status.isProcessing,
        supportedTables: status.supportedTables.length,
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking sync agent health:', error);
    res.status(500).json({
      success: false,
      health: {
        syncAgent: 'failed',
        error: error.message,
        lastCheck: new Date().toISOString()
      }
    });
  }
});

export default router;