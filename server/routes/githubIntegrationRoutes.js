/**
 * GitHub Integration API Routes
 * Handles repository connections, transport automation, and webhook management
 */

import express from 'express';
import { pool } from '../db.ts';
import { updateTransportStatus } from '../transport/transportStatusManager.js';

const router = express.Router();

/**
 * Get all connected GitHub repositories
 */
router.get('/repositories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, repository_name, repository_url, owner_username, 
             default_branch, environment_mapping, auto_create_pr, 
             auto_merge_approved, is_active, created_at, updated_at
      FROM github_repositories 
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      repositories: result.rows
    });

  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch repositories'
    });
  }
});

/**
 * Connect new GitHub repository
 */
router.post('/repositories', async (req, res) => {
  try {
    const {
      repositoryName,
      repositoryUrl,
      ownerUsername,
      accessToken,
      defaultBranch = 'main',
      environmentMapping = {},
      autoCreatePR = true,
      autoMergeApproved = false
    } = req.body;

    // Validate required fields
    if (!repositoryName || !ownerUsername || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Repository name, owner username, and access token are required'
      });
    }

    // Test GitHub API connection
    const testConnection = await testGitHubRepository(
      ownerUsername, 
      repositoryName, 
      accessToken
    );

    if (!testConnection.success) {
      return res.status(400).json({
        success: false,
        error: testConnection.error
      });
    }

    // Insert repository configuration
    const result = await pool.query(`
      INSERT INTO github_repositories 
      (repository_name, repository_url, owner_username, access_token_hash, 
       default_branch, environment_mapping, auto_create_pr, auto_merge_approved, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, repository_name, repository_url, owner_username, 
                default_branch, environment_mapping, auto_create_pr, 
                auto_merge_approved, is_active, created_at
    `, [
      repositoryName,
      repositoryUrl || `https://github.com/${ownerUsername}/${repositoryName}`,
      ownerUsername,
      hashAccessToken(accessToken), // Store hashed token for security
      defaultBranch,
      JSON.stringify(environmentMapping),
      autoCreatePR,
      autoMergeApproved,
      true
    ]);

    res.json({
      success: true,
      repository: result.rows[0],
      message: 'Repository successfully connected'
    });

  } catch (error) {
    console.error('Error connecting GitHub repository:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect repository'
    });
  }
});

/**
 * Create GitHub branch for transport request
 */
router.post('/transport/:transportId/create-branch', async (req, res) => {
  try {
    const { transportId } = req.params;
    const { repositoryId, environment = 'QA' } = req.body;

    // Get transport details
    const transportResult = await pool.query(`
      SELECT tr.*, u.username as creator_username
      FROM transport_requests tr
      LEFT JOIN users u ON tr.created_by = u.id
      WHERE tr.id = $1
    `, [transportId]);

    if (transportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transport request not found'
      });
    }

    const transport = transportResult.rows[0];

    // Get repository configuration
    const repoResult = await pool.query(
      'SELECT * FROM github_repositories WHERE id = $1 AND is_active = true',
      [repositoryId]
    );

    if (repoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'GitHub repository not found or inactive'
      });
    }

    const repository = repoResult.rows[0];

    // Generate branch name
    const branchName = `transport/${transport.request_number}-${environment.toLowerCase()}`;

    // Create GitHub branch
    const branchResult = await createGitHubBranch(
      repository,
      branchName,
      repository.default_branch
    );

    if (!branchResult.success) {
      return res.status(400).json({
        success: false,
        error: branchResult.error
      });
    }

    // Log GitHub integration
    await pool.query(`
      INSERT INTO transport_logs 
      (request_id, environment, action, status, message, executed_by, executed_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      transportId,
      environment,
      'GITHUB_BRANCH_CREATED',
      'SUCCESS',
      `GitHub branch created: ${branchName}`,
      'GITHUB_INTEGRATION'
    ]);

    res.json({
      success: true,
      branchName,
      branchUrl: branchResult.branchUrl,
      message: 'GitHub branch created successfully'
    });

  } catch (error) {
    console.error('Error creating GitHub branch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create GitHub branch'
    });
  }
});

/**
 * Simulate QA environment deployment failure
 */
router.post('/transport/:transportId/simulate-qa-failure', async (req, res) => {
  try {
    const { transportId } = req.params;

    // Get transport details
    const transportResult = await pool.query(
      'SELECT * FROM transport_requests WHERE id = $1',
      [transportId]
    );

    if (transportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transport request not found'
      });
    }

    // Simulate QA deployment process
    const deploymentResult = await simulateQADeployment(transportId);

    res.json({
      success: true,
      deployment: deploymentResult,
      message: deploymentResult.success ? 
        'QA deployment completed successfully' : 
        'QA deployment failed - rollback initiated'
    });

  } catch (error) {
    console.error('Error simulating QA deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate QA deployment'
    });
  }
});

/**
 * Handle transport status update from QA environment
 */
router.post('/transport/:transportId/status-update', async (req, res) => {
  try {
    const { transportId } = req.params;
    const { 
      status, 
      environment, 
      errorMessage, 
      successMessage,
      failureType,
      rollbackRequired = false
    } = req.body;

    // Validate status
    const validStatuses = ['IMPORTED', 'FAILED', 'DEPLOYMENT_FAILED', 'ROLLBACK_REQUIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status provided'
      });
    }

    // Prepare status update details
    const updateDetails = {
      environment: environment || 'QA',
      executedBy: 'QA_SYSTEM',
      message: status === 'FAILED' || status === 'DEPLOYMENT_FAILED' ? 
        errorMessage : successMessage
    };

    // Add failure-specific details
    if (status === 'FAILED' || status === 'DEPLOYMENT_FAILED') {
      updateDetails.errorMessage = errorMessage;
      updateDetails.failureType = failureType || 'QA_DEPLOYMENT_ERROR';
      updateDetails.autoRollback = rollbackRequired;
    }

    // Update transport status
    const updatedTransport = await updateTransportStatus(
      transportId, 
      status, 
      updateDetails
    );

    res.json({
      success: true,
      transport: updatedTransport,
      message: `Transport status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating transport status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transport status'
    });
  }
});

/**
 * Get transport failure analysis
 */
router.get('/transport/:transportId/failure-analysis', async (req, res) => {
  try {
    const { transportId } = req.params;

    const result = await pool.query(`
      SELECT tfl.*, tr.request_number, tr.title
      FROM transport_failure_logs tfl
      JOIN transport_requests tr ON tfl.transport_id = tr.id
      WHERE tfl.transport_id = $1
      ORDER BY tfl.failure_timestamp DESC
    `, [transportId]);

    res.json({
      success: true,
      failures: result.rows
    });

  } catch (error) {
    console.error('Error fetching failure analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch failure analysis'
    });
  }
});

/**
 * Initialize transport status management tables
 */
router.post('/initialize-status-tables', async (req, res) => {
  try {
    // Create GitHub repositories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS github_repositories (
        id SERIAL PRIMARY KEY,
        repository_name VARCHAR(255) NOT NULL,
        repository_url VARCHAR(500),
        owner_username VARCHAR(255) NOT NULL,
        access_token_hash VARCHAR(255) NOT NULL,
        default_branch VARCHAR(100) DEFAULT 'main',
        environment_mapping JSONB DEFAULT '{}',
        auto_create_pr BOOLEAN DEFAULT true,
        auto_merge_approved BOOLEAN DEFAULT false,
        webhook_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(owner_username, repository_name)
      )
    `);

    // Create transport failure logs table
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
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP
      )
    `);

    res.json({
      success: true,
      message: 'Transport status management tables initialized'
    });

  } catch (error) {
    console.error('Error initializing tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize tables'
    });
  }
});

/**
 * Test GitHub repository connection
 */
async function testGitHubRepository(owner, repo, accessToken) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MallyERP-Transport-System'
      }
    });

    if (response.ok) {
      const repoData = await response.json();
      return {
        success: true,
        repository: repoData
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        error: `GitHub API error: ${error.message || response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Connection failed: ${error.message}`
    };
  }
}

/**
 * Create GitHub branch
 */
async function createGitHubBranch(repository, branchName, baseBranch) {
  try {
    const accessToken = unhashAccessToken(repository.access_token_hash);
    
    // Get base branch SHA
    const baseBranchResponse = await fetch(
      `https://api.github.com/repos/${repository.owner_username}/${repository.repository_name}/git/refs/heads/${baseBranch}`,
      {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!baseBranchResponse.ok) {
      throw new Error('Failed to get base branch information');
    }

    const baseBranchData = await baseBranchResponse.json();
    const baseSha = baseBranchData.object.sha;

    // Create new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${repository.owner_username}/${repository.repository_name}/git/refs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha
        })
      }
    );

    if (createBranchResponse.ok) {
      return {
        success: true,
        branchUrl: `${repository.repository_url}/tree/${branchName}`
      };
    } else {
      const error = await createBranchResponse.json();
      return {
        success: false,
        error: `Failed to create branch: ${error.message}`
      };
    }

  } catch (error) {
    return {
      success: false,
      error: `Branch creation failed: ${error.message}`
    };
  }
}

/**
 * Simulate QA deployment with potential failures
 */
async function simulateQADeployment(transportId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Update status to IMPORTING
    await updateTransportStatus(transportId, 'IMPORTING', {
      environment: 'QA',
      message: 'Starting QA environment deployment'
    });

    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate random failure scenario (30% chance)
    const shouldFail = Math.random() < 0.3;

    if (shouldFail) {
      const failureScenarios = [
        {
          type: 'DATABASE_CONNECTION_TIMEOUT',
          message: 'Database connection timeout during object synchronization',
          stage: 'DATA_IMPORT'
        },
        {
          type: 'REFERENTIAL_INTEGRITY_VIOLATION',
          message: 'Referential integrity constraint violation in target system',
          stage: 'DATA_VALIDATION'
        },
        {
          type: 'CONFIGURATION_CONFLICT',
          message: 'Configuration conflict with existing QA environment settings',
          stage: 'CONFIGURATION_MERGE'
        },
        {
          type: 'INSUFFICIENT_PRIVILEGES',
          message: 'Insufficient privileges for object deployment in QA',
          stage: 'PERMISSION_CHECK'
        },
        {
          type: 'DATA_VALIDATION_FAILED',
          message: 'Data validation failed for modified master data objects',
          stage: 'DATA_VALIDATION'
        }
      ];

      const randomFailure = failureScenarios[Math.floor(Math.random() * failureScenarios.length)];

      // Update status to FAILED
      await updateTransportStatus(transportId, 'FAILED', {
        environment: 'QA',
        errorMessage: randomFailure.message,
        failureType: randomFailure.type,
        failureStage: randomFailure.stage,
        autoRollback: true
      });

      await client.query('COMMIT');

      return {
        success: false,
        status: 'FAILED',
        environment: 'QA',
        failureType: randomFailure.type,
        errorMessage: randomFailure.message,
        requiresIntervention: true
      };

    } else {
      // Successful deployment
      await updateTransportStatus(transportId, 'IMPORTED', {
        environment: 'QA',
        message: 'Transport successfully deployed to QA environment'
      });

      await client.query('COMMIT');

      return {
        success: true,
        status: 'IMPORTED',
        environment: 'QA',
        message: 'Transport successfully deployed to QA environment'
      };
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error simulating QA deployment:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Simple token hashing (in production, use proper encryption)
 */
function hashAccessToken(token) {
  // In production, use proper encryption like AES
  return Buffer.from(token).toString('base64');
}

/**
 * Simple token unhashing (in production, use proper decryption)
 */
function unhashAccessToken(hashedToken) {
  // In production, use proper decryption
  return Buffer.from(hashedToken, 'base64').toString('utf8');
}

export default router;