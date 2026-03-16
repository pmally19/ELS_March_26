import { Router } from 'express';
import { db } from '../db';
import { eq, desc, and, or } from 'drizzle-orm';

const router = Router();

// Comprehensive tile change tracking
router.post('/track-tile-change', async (req, res) => {
  try {
    const {
      tileId,
      tileName,
      pageRoute,
      changeType, // 'new', 'modified', 'deleted'
      apiEndpoints,
      crudOperations,
      changedBy,
      changeDescription,
      beforeState,
      afterState
    } = req.body;

    // Store tile change record using pool query
    const changeRecord = await db.execute(`
      INSERT INTO tile_change_tracking (
        tile_id, tile_name, page_route, change_type, api_endpoints, 
        crud_operations, changed_by, change_description, before_state, 
        after_state, change_timestamp
      ) VALUES ('${tileId}', '${tileName}', '${pageRoute}', '${changeType}', 
        '${JSON.stringify(apiEndpoints)}', '${JSON.stringify(crudOperations)}',
        '${changedBy}', '${changeDescription}', '${JSON.stringify(beforeState)}', 
        '${JSON.stringify(afterState)}', NOW()) 
      RETURNING id, change_timestamp
    `);

    // Test CRUD operations for the tile
    const crudResults = await testTileCRUDOperations(apiEndpoints, crudOperations);

    res.json({
      success: true,
      changeId: changeRecord.rows[0].id,
      timestamp: changeRecord.rows[0].change_timestamp,
      crudTestResults: crudResults,
      message: `Tile ${changeType} tracked successfully`
    });
  } catch (error) {
    console.error('Tile tracking error:', error);
    res.status(500).json({ error: 'Failed to track tile change' });
  }
});

// Get comprehensive tile change report
router.get('/tile-change-report', async (req, res) => {
  try {
    const { dateFrom, dateTo, pageRoute, changeType } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (dateFrom) {
      whereClause += ` AND change_timestamp >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereClause += ` AND change_timestamp <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }
    
    if (pageRoute) {
      whereClause += ` AND page_route = $${paramIndex}`;
      params.push(pageRoute);
      paramIndex++;
    }
    
    if (changeType) {
      whereClause += ` AND change_type = $${paramIndex}`;
      params.push(changeType);
      paramIndex++;
    }

    const report = await db.execute(`
      SELECT 
        id,
        tile_id,
        tile_name,
        page_route,
        change_type,
        api_endpoints,
        crud_operations,
        changed_by,
        change_description,
        before_state,
        after_state,
        change_timestamp,
        crud_test_results
      FROM tile_change_tracking 
      WHERE ${whereClause}
      ORDER BY change_timestamp DESC
    `, params);

    // Get summary statistics
    const summary = await db.execute(`
      SELECT 
        COUNT(*) as total_changes,
        COUNT(CASE WHEN change_type = 'new' THEN 1 END) as new_tiles,
        COUNT(CASE WHEN change_type = 'modified' THEN 1 END) as modified_tiles,
        COUNT(CASE WHEN change_type = 'deleted' THEN 1 END) as deleted_tiles,
        COUNT(DISTINCT page_route) as affected_pages,
        COUNT(DISTINCT tile_id) as unique_tiles
      FROM tile_change_tracking 
      WHERE ${whereClause}
    `, params);

    res.json({
      success: true,
      report: {
        changes: report.rows,
        summary: summary.rows[0],
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate tile change report' });
  }
});

// Test CRUD operations for specific tile
router.post('/test-tile-crud/:tileId', async (req, res) => {
  try {
    const { tileId } = req.params;
    const { apiEndpoints, crudOperations } = req.body;

    const testResults = await testTileCRUDOperations(apiEndpoints, crudOperations);
    
    // Update tracking record with test results
    await db.execute(`
      UPDATE tile_change_tracking 
      SET crud_test_results = $1, last_tested = NOW()
      WHERE tile_id = $2
    `, [JSON.stringify(testResults), tileId]);

    res.json({
      success: true,
      tileId,
      testResults,
      testedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('CRUD test error:', error);
    res.status(500).json({ error: 'Failed to test CRUD operations' });
  }
});

// Get tile functionality status
router.get('/tile-functionality-status', async (req, res) => {
  try {
    const functionalityReport = await db.execute(`
      SELECT 
        page_route,
        tile_name,
        change_type,
        crud_test_results,
        change_timestamp,
        CASE 
          WHEN crud_test_results::text LIKE '%"success":true%' THEN 'operational'
          WHEN crud_test_results IS NULL THEN 'untested'
          ELSE 'failed'
        END as functionality_status
      FROM tile_change_tracking 
      WHERE change_timestamp >= NOW() - INTERVAL '30 days'
      ORDER BY page_route, tile_name, change_timestamp DESC
    `);

    // Group by page for better organization
    const pageGroups = {};
    functionalityReport.rows.forEach(row => {
      if (!pageGroups[row.page_route]) {
        pageGroups[row.page_route] = [];
      }
      pageGroups[row.page_route].push(row);
    });

    res.json({
      success: true,
      functionalityReport: pageGroups,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Functionality status error:', error);
    res.status(500).json({ error: 'Failed to get functionality status' });
  }
});

// Helper function to test CRUD operations
async function testTileCRUDOperations(apiEndpoints: any[], crudOperations: any[]) {
  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    operations: []
  };

  for (const operation of crudOperations) {
    results.totalTests++;
    
    try {
      const endpoint = apiEndpoints.find(ep => ep.operation === operation.type);
      if (!endpoint) {
        results.operations.push({
          operation: operation.type,
          status: 'failed',
          error: 'API endpoint not found'
        });
        results.failedTests++;
        continue;
      }

      // Simulate API call (replace with actual fetch in production)
      const testResult = await simulateCRUDTest(endpoint, operation);
      
      if (testResult.status === 'passed') {
        results.passedTests++;
      } else {
        results.failedTests++;
      }
      
      results.operations.push(testResult);
    } catch (error) {
      results.failedTests++;
      results.operations.push({
        operation: operation.type,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

// Simulate CRUD operation testing
async function simulateCRUDTest(endpoint: any, operation: any) {
  try {
    // This would be replaced with actual HTTP calls to test endpoints
    const baseUrl = 'http://localhost:5000';
    const url = `${baseUrl}${endpoint.path}`;
    
    // Basic connectivity test
    const response = await fetch(url, {
      method: endpoint.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    return {
      operation: operation.type,
      endpoint: endpoint.path,
      method: endpoint.method,
      status: response.ok ? 'passed' : 'failed',
      responseCode: response.status,
      testedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      operation: operation.type,
      endpoint: endpoint.path,
      status: 'failed',
      error: error.message,
      testedAt: new Date().toISOString()
    };
  }
}

export default router;