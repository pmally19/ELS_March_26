import express from 'express';
import ComprehensiveIssueLogger from '../utils/comprehensiveIssueLogger';

const router = express.Router();
const issueLogger = new ComprehensiveIssueLogger();

// Log a new issue
router.post('/log', async (req, res) => {
  try {
    const { errorMessage, context, stackTrace, additionalData } = req.body;
    
    const issueId = await issueLogger.logIssue(
      errorMessage,
      context,
      stackTrace,
      additionalData
    );
    
    res.status(201).json({
      success: true,
      issueId,
      message: 'Issue logged successfully'
    });
  } catch (error) {
    console.error('Error logging issue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log issue'
    });
  }
});

// Get issue statistics
router.get('/stats', async (req, res) => {
  try {
    const { timeframe = 'day' } = req.query;
    const stats = await issueLogger.getIssueStatistics(timeframe as 'hour' | 'day' | 'week' | 'month');
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting issue statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get issue statistics'
    });
  }
});

// Get AI agent performance
router.get('/ai-performance', async (req, res) => {
  try {
    const performance = await issueLogger.getAIAgentPerformance();
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error getting AI agent performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI agent performance'
    });
  }
});

// Get recent issues
router.get('/recent', async (req, res) => {
  try {
    const { limit = 50, module, severity } = req.query;
    
    let query = `
      SELECT 
        issue_id,
        error_message,
        module,
        operation,
        severity,
        category,
        status,
        user_id,
        created_at,
        resolved_at,
        resolved_by
      FROM comprehensive_issues_log
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (module) {
      query += ` AND module = $${paramIndex}`;
      params.push(module);
      paramIndex++;
    }
    
    if (severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string));
    
    const pool = (issueLogger as any).pool;
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting recent issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent issues'
    });
  }
});

// Get module health status
router.get('/module-health', async (req, res) => {
  try {
    const pool = (issueLogger as any).pool;
    const result = await pool.query(`
      SELECT 
        module_name,
        health_score,
        total_issues,
        critical_issues,
        resolved_issues,
        response_time_avg,
        error_rate,
        availability_score,
        ai_intervention_count,
        ai_success_rate,
        last_check
      FROM module_health_status
      ORDER BY health_score ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting module health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get module health'
    });
  }
});

// Get issue details by ID
router.get('/:issueId', async (req, res) => {
  try {
    const { issueId } = req.params;
    
    const pool = (issueLogger as any).pool;
    
    // Get issue details
    const issueResult = await pool.query(`
      SELECT * FROM comprehensive_issues_log
      WHERE issue_id = $1
    `, [issueId]);
    
    if (issueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }
    
    // Get AI interventions
    const interventionsResult = await pool.query(`
      SELECT * FROM ai_agent_interventions
      WHERE issue_id = $1
      ORDER BY created_at DESC
    `, [issueId]);
    
    // Get resolutions
    const resolutionsResult = await pool.query(`
      SELECT * FROM issue_resolutions
      WHERE issue_id = $1
      ORDER BY created_at DESC
    `, [issueId]);
    
    res.json({
      success: true,
      data: {
        issue: issueResult.rows[0],
        interventions: interventionsResult.rows,
        resolutions: resolutionsResult.rows
      }
    });
  } catch (error) {
    console.error('Error getting issue details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get issue details'
    });
  }
});

// Get analytics summary
router.get('/analytics/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const pool = (issueLogger as any).pool;
    const result = await pool.query(`
      SELECT 
        analysis_date,
        total_issues,
        critical_issues,
        high_issues,
        medium_issues,
        low_issues,
        ai_resolved,
        auto_resolved,
        manual_resolved,
        unresolved,
        avg_resolution_time,
        master_data_issues,
        transaction_issues,
        system_issues,
        api_issues,
        database_issues,
        validation_issues
      FROM issue_analytics_summary
      WHERE analysis_date >= CURRENT_DATE - INTERVAL '${parseInt(days as string)} days'
      ORDER BY analysis_date DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics summary'
    });
  }
});

export default router;