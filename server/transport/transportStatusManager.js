/**
 * Transport Status Management System
 * 
 * Handles transport request status updates, environment progression,
 * failure handling, and rollback mechanisms
 */

import { pool } from '../db.ts';

/**
 * Transport status progression flow
 */
const STATUS_FLOW = {
  'MODIFIABLE': ['RELEASED', 'CANCELLED'],
  'RELEASED': ['IMPORTING', 'FAILED'],
  'IMPORTING': ['IMPORTED', 'FAILED'],
  'IMPORTED': ['DEPLOYING', 'ROLLBACK_REQUIRED'],
  'DEPLOYING': ['DEPLOYED', 'DEPLOYMENT_FAILED'],
  'DEPLOYED': ['ROLLBACK_REQUIRED'],
  'FAILED': ['MODIFIABLE', 'CANCELLED'],
  'DEPLOYMENT_FAILED': ['ROLLBACK_REQUIRED', 'RETRY_DEPLOYMENT'],
  'ROLLBACK_REQUIRED': ['ROLLING_BACK', 'ROLLBACK_CANCELLED'],
  'ROLLING_BACK': ['ROLLED_BACK', 'ROLLBACK_FAILED'],
  'ROLLED_BACK': ['MODIFIABLE'],
  'ROLLBACK_FAILED': ['MANUAL_INTERVENTION_REQUIRED']
};

/**
 * Environment progression order
 */
const ENVIRONMENT_PROGRESSION = ['DEV', 'QA', 'PROD'];

/**
 * Update transport request status with validation
 */
export async function updateTransportStatus(transportId, newStatus, details = {}) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get current transport request
    const transportResult = await client.query(
      'SELECT * FROM transport_requests WHERE id = $1',
      [transportId]
    );

    if (transportResult.rows.length === 0) {
      throw new Error(`Transport request ${transportId} not found`);
    }

    const transport = transportResult.rows[0];
    const currentStatus = transport.status;

    // Validate status transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Update transport request status
    const updateQuery = `
      UPDATE transport_requests 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const updateResult = await client.query(updateQuery, [newStatus, transportId]);
    const updatedTransport = updateResult.rows[0];

    // Create status log entry
    await client.query(`
      INSERT INTO transport_logs 
      (request_id, environment, action, status, message, executed_by, executed_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      transportId,
      details.environment || transport.target_environment,
      getActionFromStatus(newStatus),
      newStatus === 'FAILED' || newStatus === 'DEPLOYMENT_FAILED' ? 'ERROR' : 'SUCCESS',
      details.message || `Status changed to ${newStatus}`,
      details.executedBy || 'SYSTEM'
    ]);

    // Handle specific status updates
    switch (newStatus) {
      case 'FAILED':
      case 'DEPLOYMENT_FAILED':
        await handleTransportFailure(client, transportId, details);
        break;
      case 'IMPORTED':
        await handleSuccessfulImport(client, transportId, details);
        break;
      case 'DEPLOYED':
        await handleSuccessfulDeployment(client, transportId, details);
        break;
      case 'ROLLBACK_REQUIRED':
        await initiateRollbackProcess(client, transportId, details);
        break;
    }

    await client.query('COMMIT');
    return updatedTransport;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating transport status:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handle transport failure scenarios
 */
export async function handleTransportFailure(client, transportId, details) {
  try {
    // Create failure log with detailed information
    await client.query(`
      INSERT INTO transport_failure_logs 
      (transport_id, failure_type, failure_stage, error_message, error_details, failure_timestamp, environment)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
    `, [
      transportId,
      details.failureType || 'IMPORT_FAILURE',
      details.failureStage || 'UNKNOWN',
      details.errorMessage || 'Transport failed',
      JSON.stringify(details.errorDetails || {}),
      details.environment || 'QA'
    ]);

    // Update object status to indicate failure
    await client.query(`
      UPDATE transport_objects 
      SET status = 'FAILED', error_message = $2, updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $1
    `, [transportId, details.errorMessage]);

    // If this is a QA failure, automatically create rollback plan
    if (details.environment === 'QA') {
      await createAutomaticRollbackPlan(client, transportId, details);
    }

    // Notify relevant stakeholders
    await createFailureNotification(client, transportId, details);

  } catch (error) {
    console.error('Error handling transport failure:', error);
    throw error;
  }
}

/**
 * Handle successful import
 */
async function handleSuccessfulImport(client, transportId, details) {
  try {
    // Update object status
    await client.query(`
      UPDATE transport_objects 
      SET status = 'IMPORTED', imported_at = CURRENT_TIMESTAMP
      WHERE request_id = $1
    `, [transportId]);

  } catch (error) {
    console.error('Error handling successful import:', error);
    throw error;
  }
}

/**
 * Handle successful deployment
 */
async function handleSuccessfulDeployment(client, transportId, details) {
  try {
    // Update deployment timestamp
    await client.query(`
      UPDATE transport_requests 
      SET deployed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [transportId]);

    // Update object status
    await client.query(`
      UPDATE transport_objects 
      SET status = 'DEPLOYED', deployed_at = CURRENT_TIMESTAMP
      WHERE request_id = $1
    `, [transportId]);

  } catch (error) {
    console.error('Error handling successful deployment:', error);
    throw error;
  }
}

/**
 * Initiate rollback process
 */
async function initiateRollbackProcess(client, transportId, details) {
  try {
    // Create rollback plan
    const rollbackPlan = await createRollbackPlan(client, transportId, details);

    // Update transport status
    await client.query(`
      UPDATE transport_requests 
      SET rollback_required = true, rollback_reason = $2
      WHERE id = $1
    `, [transportId, details.rollbackReason]);

  } catch (error) {
    console.error('Error initiating rollback process:', error);
    throw error;
  }
}

/**
 * Create rollback plan with previous configuration snapshots
 */
async function createRollbackPlan(client, transportId, details) {
  try {
    // Get all objects in the transport
    const objectsResult = await client.query(`
      SELECT * FROM transport_objects WHERE request_id = $1
    `, [transportId]);

    // Create rollback plan
    const rollbackResult = await client.query(`
      INSERT INTO transport_rollback_plans 
      (transport_id, plan_name, rollback_type, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      transportId,
      `Rollback Plan for Transport ${transportId}`,
      details.rollbackType || 'CONFIGURATION_RESTORE'
    ]);

    const rollbackPlan = rollbackResult.rows[0];

    // Create rollback steps for each object
    for (const obj of objectsResult.rows) {
      await client.query(`
        INSERT INTO transport_rollback_steps 
        (rollback_plan_id, object_id, step_order, action_type, previous_configuration, rollback_sql)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        rollbackPlan.id,
        obj.id,
        obj.id, // Simple ordering by object ID
        'RESTORE_CONFIGURATION',
        obj.data_snapshot,
        generateRollbackSQL(obj)
      ]);
    }

    return rollbackPlan;

  } catch (error) {
    console.error('Error creating rollback plan:', error);
    throw error;
  }
}

/**
 * Create automatic rollback plan for QA failures
 */
async function createAutomaticRollbackPlan(client, transportId, details) {
  try {
    // For QA failures, create immediate rollback to previous stable state
    const rollbackPlan = await createRollbackPlan(client, transportId, {
      ...details,
      rollbackType: 'AUTOMATIC_QA_FAILURE',
      priority: 'CRITICAL'
    });

    return rollbackPlan;

  } catch (error) {
    console.error('Error creating automatic rollback plan:', error);
    throw error;
  }
}

/**
 * Create failure notification
 */
async function createFailureNotification(client, transportId, details) {
  try {
    await client.query(`
      INSERT INTO transport_notifications 
      (transport_id, notification_type, severity, title, message, created_at, requires_action)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
    `, [
      transportId,
      'TRANSPORT_FAILURE',
      details.severity || 'HIGH',
      `Transport ${transportId} Failed`,
      details.notificationMessage || `Transport failed in ${details.environment} environment: ${details.errorMessage}`,
      true
    ]);

  } catch (error) {
    console.error('Error creating failure notification:', error);
    throw error;
  }
}

/**
 * Generate rollback SQL for an object
 */
function generateRollbackSQL(transportObject) {
  const tableName = transportObject.table_name;
  const objectId = transportObject.data_snapshot?.id;
  const previousData = transportObject.data_snapshot;

  if (!previousData || !objectId) {
    return null;
  }

  // Generate UPDATE statement to restore previous values
  const columns = Object.keys(previousData).filter(key => key !== 'id');
  const setClause = columns.map(col => `${col} = $${columns.indexOf(col) + 2}`).join(', ');
  
  return `UPDATE ${tableName} SET ${setClause} WHERE id = $1`;
}

/**
 * Validate status transition
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = STATUS_FLOW[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get action name from status
 */
function getActionFromStatus(status) {
  const actionMap = {
    'RELEASED': 'RELEASE',
    'IMPORTING': 'IMPORT',
    'IMPORTED': 'IMPORT_COMPLETE',
    'DEPLOYING': 'DEPLOY',
    'DEPLOYED': 'DEPLOY_COMPLETE',
    'FAILED': 'FAILURE',
    'DEPLOYMENT_FAILED': 'DEPLOYMENT_FAILURE',
    'ROLLBACK_REQUIRED': 'ROLLBACK_INITIATED',
    'ROLLING_BACK': 'ROLLBACK_EXECUTING',
    'ROLLED_BACK': 'ROLLBACK_COMPLETE'
  };
  
  return actionMap[status] || status;
}

/**
 * Initialize transport status management tables
 */
export async function initializeTransportStatusTables() {
  try {
    // Transport failure logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transport_failure_logs (
        id SERIAL PRIMARY KEY,
        transport_id INTEGER REFERENCES transport_requests(id),
        failure_type VARCHAR(50) NOT NULL,
        failure_stage VARCHAR(50),
        error_message TEXT,
        error_details JSONB,
        failure_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        environment VARCHAR(10),
        resolved BOOLEAN DEFAULT false,
        resolution_notes TEXT,
        resolved_at TIMESTAMP
      )
    `);

    // Transport rollback plans
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transport_rollback_plans (
        id SERIAL PRIMARY KEY,
        transport_id INTEGER REFERENCES transport_requests(id),
        plan_name VARCHAR(255) NOT NULL,
        rollback_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        executed_at TIMESTAMP
      )
    `);

    // Transport rollback steps
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transport_rollback_steps (
        id SERIAL PRIMARY KEY,
        rollback_plan_id INTEGER REFERENCES transport_rollback_plans(id),
        object_id INTEGER REFERENCES transport_objects(id),
        step_order INTEGER NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        previous_configuration JSONB,
        rollback_sql TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        executed_at TIMESTAMP,
        error_message TEXT
      )
    `);

    // Transport notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transport_notifications (
        id SERIAL PRIMARY KEY,
        transport_id INTEGER REFERENCES transport_requests(id),
        notification_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'MEDIUM',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        requires_action BOOLEAN DEFAULT false,
        action_taken BOOLEAN DEFAULT false
      )
    `);

    console.log('Transport status management tables initialized successfully');
  } catch (error) {
    console.error('Error initializing transport status tables:', error);
    throw error;
  }
}