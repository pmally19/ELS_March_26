import express from 'express';
import ChangeLogService from '../utils/changeLogService';

const router = express.Router();
const changeLogService = new ChangeLogService();

// Get change history for a specific object
router.get('/history/:objectClass/:objectId', async (req, res) => {
  try {
    const { objectClass, objectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const history = await changeLogService.getChangeHistory(objectClass, objectId, limit);
    
    res.json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (error) {
    console.error('Error fetching change history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch change history'
    });
  }
});

// Get change analytics for a module
router.get('/analytics/:module', async (req, res) => {
  try {
    const { module } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();
    
    const analytics = await changeLogService.getChangeAnalytics(module, startDate, endDate);
    
    res.json({
      success: true,
      data: analytics,
      period: { startDate, endDate, days }
    });
  } catch (error) {
    console.error('Error fetching change analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch change analytics'
    });
  }
});

// Record a manual change (for testing or manual entries)
router.post('/record', async (req, res) => {
  try {
    const {
      objectClass,
      objectId,
      tableName,
      fieldChanges,
      context
    } = req.body;

    const changeDoc = {
      objectClass,
      objectId,
      changeType: 'UPDATE' as const,
      tableName,
      fieldChanges,
      context: {
        userName: context.userName || 'SYSTEM',
        userRole: context.userRole || 'USER',
        applicationModule: context.applicationModule || 'MANUAL',
        businessProcess: context.businessProcess || 'MANUAL_ENTRY',
        changeReason: context.changeReason || 'Manual change entry'
      }
    };

    const changeNumber = await changeLogService.recordChange(changeDoc);
    
    res.json({
      success: true,
      changeNumber,
      message: 'Change recorded successfully'
    });
  } catch (error) {
    console.error('Error recording change:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record change'
    });
  }
});

// Validate change integrity
router.get('/validate/:changeNumber', async (req, res) => {
  try {
    const { changeNumber } = req.params;
    
    const isValid = await changeLogService.validateChangeIntegrity(changeNumber);
    
    res.json({
      success: true,
      changeNumber,
      isValid,
      status: isValid ? 'VALID' : 'INVALID'
    });
  } catch (error) {
    console.error('Error validating change:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate change'
    });
  }
});

// Get recent changes across all modules
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const module = req.query.module as string;
    
    // Query recent changes directly from database
    const pool = changeLogService['pool']; // Access private pool property
    
    let query = `
      SELECT 
        h.change_number,
        h.object_class,
        h.object_id,
        h.change_type,
        h.user_name,
        h.application_module,
        h.business_process,
        h.change_timestamp,
        h.change_reason,
        COUNT(p.id) as field_count
      FROM change_document_headers h
      LEFT JOIN change_document_positions p ON h.change_document_id = p.change_document_id
    `;
    
    const params = [];
    if (module) {
      query += ' WHERE h.application_module = $1';
      params.push(module);
    }
    
    query += `
      GROUP BY h.change_number, h.object_class, h.object_id, h.change_type, 
               h.user_name, h.application_module, h.business_process, 
               h.change_timestamp, h.change_reason
      ORDER BY h.change_timestamp DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching recent changes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent changes'
    });
  }
});

// Get change statistics summary
router.get('/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    
    const pool = changeLogService['pool'];
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_changes,
        COUNT(DISTINCT h.user_name) as unique_users,
        COUNT(DISTINCT h.application_module) as modules_affected,
        COUNT(CASE WHEN h.change_type = 'CREATE' THEN 1 END) as creates,
        COUNT(CASE WHEN h.change_type = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN h.change_type = 'DELETE' THEN 1 END) as deletes,
        COUNT(CASE WHEN p.business_impact = 'HIGH' THEN 1 END) as high_impact_changes,
        AVG(field_counts.field_count) as avg_fields_per_change
      FROM change_document_headers h
      LEFT JOIN change_document_positions p ON h.change_document_id = p.change_document_id
      LEFT JOIN (
        SELECT change_document_id, COUNT(*) as field_count
        FROM change_document_positions
        GROUP BY change_document_id
      ) field_counts ON h.change_document_id = field_counts.change_document_id
      WHERE h.change_timestamp >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
    `);
    
    const stats = result.rows[0];
    
    // Convert string numbers to integers
    Object.keys(stats).forEach(key => {
      if (stats[key] && !isNaN(stats[key])) {
        stats[key] = parseInt(stats[key]) || 0;
      }
    });
    
    res.json({
      success: true,
      data: stats,
      period: `Last ${days} days`
    });
  } catch (error) {
    console.error('Error fetching change statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch change statistics'
    });
  }
});

// Export the router
export default router;