import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { FormScreenshotService } from '../services/form-screenshot-service';
import { completeE2EFlowService } from '../services/complete-e2e-business-flow';

const { Client } = pg;

const router = Router();

// Get all connection IDs and their screenshots
router.get('/connections', async (req, res) => {
  try {
    const projectTestDir = path.join(process.cwd(), 'uploads', 'ProjectTest', 'screenshots');
    
    if (!fs.existsSync(projectTestDir)) {
      return res.json({ success: true, connections: [] });
    }

    const connections = [];
    const connectionDirs = fs.readdirSync(projectTestDir).filter(dir => 
      fs.statSync(path.join(projectTestDir, dir)).isDirectory()
    );

    for (const connectionId of connectionDirs) {
      const indexPath = path.join(projectTestDir, connectionId, 'index.json');
      if (fs.existsSync(indexPath)) {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        connections.push(indexData);
      }
    }

    // Sort by created_at descending (newest first)
    connections.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ success: true, connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch connections' });
  }
});

// Get screenshots for a specific connection ID
router.get('/connections/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connectionDir = path.join(process.cwd(), 'uploads', 'ProjectTest', 'screenshots', connectionId);
    const indexPath = path.join(connectionDir, 'index.json');

    if (!fs.existsSync(indexPath)) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Get additional database info for each test
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const testsWithDetails = [];
    for (const test of indexData.tests) {
      try {
        const dbResult = await client.query(
          'SELECT status, description, domain FROM dominos_test_results WHERE test_number = $1',
          [test.test_number]
        );
        
        const resultRow = dbResult.rows[0];
        testsWithDetails.push({
          ...test,
          status: resultRow?.status || 'completed',
          description: resultRow?.description || '',
          domain: resultRow?.domain || 'business-process'
        });
      } catch (error) {
        console.error(`Error fetching details for ${test.test_number}:`, error);
        testsWithDetails.push({
          ...test,
          status: 'completed',
          description: '',
          domain: 'business-process'
        });
      }
    }
    
    await client.end();

    res.json({
      success: true,
      connection: {
        ...indexData,
        tests: testsWithDetails
      }
    });
  } catch (error) {
    console.error('Error fetching connection details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch connection details' });
  }
});

// Capture new form screenshots with actual data entry forms
router.post('/capture-form-screenshots', async (req, res) => {
  try {
    console.log('📸 Starting form screenshot capture for actual data entry forms...');
    
    const screenshotService = new FormScreenshotService();
    await screenshotService.initialize();
    
    const results = await screenshotService.captureFormScreenshots();
    await screenshotService.cleanup();
    
    console.log(`✅ Successfully captured ${results.length} form screenshots`);
    
    res.json({
      success: true,
      message: `Captured ${results.length} form screenshots`,
      results: results
    });
  } catch (error) {
    console.error('❌ Error capturing form screenshots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture form screenshots',
      details: error.message
    });
  }
});

// Clear all test results and screenshots
router.delete('/clear-all', async (req, res) => {
  try {
    const projectTestDir = path.join(process.cwd(), 'uploads', 'ProjectTest', 'screenshots');
    
    if (fs.existsSync(projectTestDir)) {
      // Remove all connection directories
      const connectionDirs = fs.readdirSync(projectTestDir).filter(dir => 
        fs.statSync(path.join(projectTestDir, dir)).isDirectory()
      );
      
      for (const connectionId of connectionDirs) {
        const connectionPath = path.join(projectTestDir, connectionId);
        fs.rmSync(connectionPath, { recursive: true, force: true });
      }
    }
    
    res.json({
      success: true,
      message: 'All test results and screenshots cleared',
      cleared_connections: fs.existsSync(projectTestDir) ? 
        fs.readdirSync(projectTestDir).length : 0
    });
  } catch (error) {
    console.error('Error clearing all results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear all results',
      details: error.message
    });
  }
});

// Delete specific connection
router.delete('/connections/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connectionPath = path.join(process.cwd(), 'uploads', 'ProjectTest', 'screenshots', connectionId);
    
    if (fs.existsSync(connectionPath)) {
      fs.rmSync(connectionPath, { recursive: true, force: true });
      res.json({
        success: true,
        message: `Connection ${connectionId} deleted successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete connection',
      details: error.message
    });
  }
});

// Run complete E2E business flow
router.post('/run-complete-e2e-flow', async (req, res) => {
  try {
    console.log('🚀 Starting Complete E2E Business Flow...');
    
    const result = await completeE2EFlowService.runCompleteE2EFlow();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Complete E2E Business Flow executed successfully',
        connection_id: result.connectionId,
        steps_completed: result.results.filter(r => r.status === 'completed').length,
        total_steps: result.results.length,
        summary: result.summary,
        results: result.results
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'E2E Business Flow execution failed',
        details: result.summary
      });
    }
  } catch (error) {
    console.error('Error running complete E2E flow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run complete E2E business flow',
      details: error.message
    });
  }
});

export default router;