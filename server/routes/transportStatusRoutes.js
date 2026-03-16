import express from 'express';
import { pool } from '../db.ts';
import { updateTransportStatus, initializeTransportStatusTables } from '../transport/transportStatusManager.js';

const router = express.Router();

/**
 * Simulate QA deployment failure
 */
router.post('/simulate-qa-failure/:transportId', async (req, res) => {
  try {
    const { transportId } = req.params;
    const { 
      failureType = 'DEPLOYMENT_ERROR', 
      errorMessage = 'Simulated QA deployment failure for testing' 
    } = req.body;

    // Simulate different types of QA failures
    const failureScenarios = [
      {
        type: 'DATABASE_CONNECTION_TIMEOUT',
        message: 'Database connection timeout during object synchronization in QA environment',
        stage: 'DATABASE_SYNC'
      },
      {
        type: 'REFERENTIAL_INTEGRITY_VIOLATION',
        message: 'Referential integrity constraint violation: Foreign key constraint failed for customer_master table',
        stage: 'DATA_VALIDATION'
      },
      {
        type: 'CONFIGURATION_CONFLICT',
        message: 'Configuration conflict detected: Duplicate material code exists in QA environment',
        stage: 'CONFIGURATION_CHECK'
      },
      {
        type: 'INSUFFICIENT_PRIVILEGES',
        message: 'Insufficient database privileges for creating indexes in QA schema',
        stage: 'PERMISSION_CHECK'
      },
      {
        type: 'VALIDATION_FAILED',
        message: 'Data validation failed: Invalid date format in purchase_orders.delivery_date',
        stage: 'DATA_VALIDATION'
      }
    ];

    // Select random failure scenario or use provided one
    const scenario = failureType === 'RANDOM' 
      ? failureScenarios[Math.floor(Math.random() * failureScenarios.length)]
      : { type: failureType, message: errorMessage, stage: 'DEPLOYMENT' };

    // Update transport status to failed
    const updatedTransport = await updateTransportStatus(transportId, 'FAILED', {
      environment: 'QA',
      failureType: scenario.type,
      failureStage: scenario.stage,
      errorMessage: scenario.message,
      message: `QA deployment failed: ${scenario.message}`,
      executedBy: 'QA_SYSTEM',
      severity: 'HIGH',
      autoRollback: true,
      notificationMessage: `Transport ${transportId} failed during QA deployment and requires immediate attention`
    });

    res.json({
      success: true,
      transport: updatedTransport,
      failure: {
        type: scenario.type,
        stage: scenario.stage,
        message: scenario.message,
        environment: 'QA',
        timestamp: new Date().toISOString()
      },
      message: 'QA failure simulation completed with automatic rollback initiated'
    });

  } catch (error) {
    console.error('Error simulating QA failure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate QA failure'
    });
  }
});

/**
 * Get transport failure logs
 */
router.get('/failure-logs/:transportId', async (req, res) => {
  try {
    const { transportId } = req.params;

    const result = await pool.query(`
      SELECT 
        tfl.*,
        tr.request_number,
        tr.description as transport_description
      FROM transport_failure_logs tfl
      JOIN transport_requests tr ON tfl.transport_id = tr.id
      WHERE tfl.transport_id = $1
      ORDER BY tfl.failure_timestamp DESC
    `, [transportId]);

    res.json({
      success: true,
      failureLogs: result.rows
    });

  } catch (error) {
    console.error('Error fetching failure logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch failure logs'
    });
  }
});

/**
 * Get rollback plans for transport
 */
router.get('/rollback-plans/:transportId', async (req, res) => {
  try {
    const { transportId } = req.params;

    const plansResult = await pool.query(`
      SELECT 
        trp.*,
        COUNT(trs.id) as step_count
      FROM transport_rollback_plans trp
      LEFT JOIN transport_rollback_steps trs ON trp.id = trs.rollback_plan_id
      WHERE trp.transport_id = $1
      GROUP BY trp.id
      ORDER BY trp.created_at DESC
    `, [transportId]);

    // Get steps for each plan
    const plansWithSteps = await Promise.all(
      plansResult.rows.map(async (plan) => {
        const stepsResult = await pool.query(`
          SELECT 
            trs.*,
            to_obj.object_name,
            to_obj.table_name
          FROM transport_rollback_steps trs
          JOIN transport_objects to_obj ON trs.object_id = to_obj.id
          WHERE trs.rollback_plan_id = $1
          ORDER BY trs.step_order
        `, [plan.id]);

        return {
          ...plan,
          steps: stepsResult.rows
        };
      })
    );

    res.json({
      success: true,
      rollbackPlans: plansWithSteps
    });

  } catch (error) {
    console.error('Error fetching rollback plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rollback plans'
    });
  }
});

/**
 * Execute rollback plan
 */
router.post('/execute-rollback/:planId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { planId } = req.params;
    const { executedBy = 'SYSTEM', notes } = req.body;

    // Get rollback plan
    const planResult = await client.query(`
      SELECT * FROM transport_rollback_plans WHERE id = $1
    `, [planId]);

    if (planResult.rows.length === 0) {
      throw new Error('Rollback plan not found');
    }

    const plan = planResult.rows[0];

    // Get rollback steps
    const stepsResult = await client.query(`
      SELECT 
        trs.*,
        to_obj.table_name,
        to_obj.data_snapshot
      FROM transport_rollback_steps trs
      JOIN transport_objects to_obj ON trs.object_id = to_obj.id
      WHERE trs.rollback_plan_id = $1
      ORDER BY trs.step_order
    `, [planId]);

    const steps = stepsResult.rows;
    const executionResults = [];

    // Execute each rollback step
    for (const step of steps) {
      try {
        if (step.rollback_sql && step.data_snapshot) {
          // Execute the rollback SQL
          const previousData = step.data_snapshot;
          if (previousData && previousData.id) {
            const columns = Object.keys(previousData).filter(key => key !== 'id');
            const values = [previousData.id, ...columns.map(col => previousData[col])];
            
            await client.query(step.rollback_sql, values);
          }
        }

        // Mark step as executed
        await client.query(`
          UPDATE transport_rollback_steps 
          SET status = 'EXECUTED', executed_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [step.id]);

        executionResults.push({
          stepId: step.id,
          status: 'SUCCESS',
          message: `Successfully restored ${step.action_type} for object ${step.object_id}`
        });

      } catch (stepError) {
        // Mark step as failed
        await client.query(`
          UPDATE transport_rollback_steps 
          SET status = 'FAILED', error_message = $2, executed_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [step.id, stepError.message]);

        executionResults.push({
          stepId: step.id,
          status: 'FAILED',
          message: stepError.message
        });
      }
    }

    // Update rollback plan status
    const successfulSteps = executionResults.filter(r => r.status === 'SUCCESS').length;
    const planStatus = successfulSteps === steps.length ? 'COMPLETED' : 'PARTIALLY_COMPLETED';

    await client.query(`
      UPDATE transport_rollback_plans 
      SET status = $1, executed_at = CURRENT_TIMESTAMP, executed_by = $2
      WHERE id = $3
    `, [planStatus, executedBy, planId]);

    // Update transport status
    if (planStatus === 'COMPLETED') {
      await updateTransportStatus(plan.transport_id, 'ROLLED_BACK', {
        environment: 'QA',
        message: `Rollback completed successfully. ${successfulSteps} objects restored.`,
        executedBy: executedBy
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      plan: { ...plan, status: planStatus },
      executionResults: executionResults,
      message: `Rollback ${planStatus.toLowerCase()}: ${successfulSteps}/${steps.length} steps executed`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing rollback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute rollback plan'
    });
  } finally {
    client.release();
  }
});

/**
 * Get transport status history
 */
router.get('/status-history/:transportId', async (req, res) => {
  try {
    const { transportId } = req.params;

    const result = await pool.query(`
      SELECT 
        tl.*,
        tr.request_number,
        tr.status as current_status
      FROM transport_logs tl
      JOIN transport_requests tr ON tl.request_id = tr.id
      WHERE tl.request_id = $1
      ORDER BY tl.executed_at DESC
    `, [transportId]);

    res.json({
      success: true,
      statusHistory: result.rows
    });

  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status history'
    });
  }
});

/**
 * Initialize transport status tables
 */
router.post('/initialize-tables', async (req, res) => {
  try {
    await initializeTransportStatusTables();
    
    res.json({
      success: true,
      message: 'Transport status management tables initialized successfully'
    });

  } catch (error) {
    console.error('Error initializing tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize transport status tables'
    });
  }
});

export default router;