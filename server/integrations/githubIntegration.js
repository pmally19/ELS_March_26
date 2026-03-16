/**
 * GitHub Integration for Transport Requests
 * 
 * This module handles integration between transport requests and GitHub repositories
 * Users can connect their own GitHub repositories to automatically:
 * - Create feature branches for transport requests
 * - Commit configuration changes
 * - Create pull requests for code reviews
 * - Track deployment status
 */

import { pool } from '../db.ts';

/**
 * Initialize GitHub integration tables
 */
export async function initializeGitHubIntegration() {
  try {
    // GitHub repository configurations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS github_repositories (
        id SERIAL PRIMARY KEY,
        repository_name VARCHAR(255) NOT NULL,
        repository_url VARCHAR(500) NOT NULL,
        owner_username VARCHAR(100) NOT NULL,
        access_token_encrypted TEXT NOT NULL,
        default_branch VARCHAR(100) DEFAULT 'main',
        environment_mapping JSONB,
        auto_create_pr BOOLEAN DEFAULT true,
        auto_merge_approved BOOLEAN DEFAULT false,
        webhook_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transport-GitHub integration tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transport_github_integrations (
        id SERIAL PRIMARY KEY,
        transport_request_id INTEGER REFERENCES transport_requests(id),
        github_repository_id INTEGER REFERENCES github_repositories(id),
        branch_name VARCHAR(255),
        commit_hash VARCHAR(40),
        pull_request_number INTEGER,
        pull_request_url VARCHAR(500),
        deployment_status VARCHAR(20) DEFAULT 'PENDING',
        sync_status VARCHAR(20) DEFAULT 'PENDING',
        error_message TEXT,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // GitHub webhook events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS github_webhook_events (
        id SERIAL PRIMARY KEY,
        repository_id INTEGER REFERENCES github_repositories(id),
        event_type VARCHAR(50) NOT NULL,
        event_action VARCHAR(50),
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT false,
        processed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('GitHub integration tables initialized successfully');
  } catch (error) {
    console.error('Error initializing GitHub integration:', error);
    throw error;
  }
}

/**
 * Register a GitHub repository for transport integration
 */
export async function registerGitHubRepository(config) {
  try {
    const {
      repositoryName,
      repositoryUrl,
      ownerUsername,
      accessToken,
      defaultBranch = 'main',
      environmentMapping = {},
      autoCreatePR = true,
      autoMergeApproved = false,
      createdBy
    } = config;

    // Encrypt access token (in production, use proper encryption)
    const encryptedToken = Buffer.from(accessToken).toString('base64');

    const result = await pool.query(`
      INSERT INTO github_repositories 
      (repository_name, repository_url, owner_username, access_token_encrypted, 
       default_branch, environment_mapping, auto_create_pr, auto_merge_approved, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      repositoryName,
      repositoryUrl,
      ownerUsername,
      encryptedToken,
      defaultBranch,
      JSON.stringify(environmentMapping),
      autoCreatePR,
      autoMergeApproved,
      createdBy
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error registering GitHub repository:', error);
    throw error;
  }
}

/**
 * Create GitHub branch for transport request
 */
export async function createTransportBranch(transportId, repositoryId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get transport request details
    const transportResult = await client.query(
      'SELECT * FROM transport_requests WHERE id = $1',
      [transportId]
    );

    if (transportResult.rows.length === 0) {
      throw new Error('Transport request not found');
    }

    const transport = transportResult.rows[0];

    // Get repository configuration
    const repoResult = await client.query(
      'SELECT * FROM github_repositories WHERE id = $1 AND is_active = true',
      [repositoryId]
    );

    if (repoResult.rows.length === 0) {
      throw new Error('GitHub repository not found or inactive');
    }

    const repository = repoResult.rows[0];

    // Generate branch name
    const branchName = `transport/${transport.request_number.toLowerCase()}-${transport.target_environment.toLowerCase()}`;

    // Record the integration
    await client.query(`
      INSERT INTO transport_github_integrations 
      (transport_request_id, github_repository_id, branch_name, sync_status)
      VALUES ($1, $2, $3, $4)
    `, [transportId, repositoryId, branchName, 'BRANCH_CREATED']);

    await client.query('COMMIT');

    return {
      branchName,
      repository: repository.repository_name,
      owner: repository.owner_username,
      accessToken: Buffer.from(repository.access_token_encrypted, 'base64').toString()
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating transport branch:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Generate configuration files for transport objects
 */
export async function generateConfigurationFiles(transportId) {
  try {
    // Get transport objects
    const objectsResult = await pool.query(`
      SELECT data_snapshot, object_type, object_name, table_name
      FROM transport_objects 
      WHERE request_id = $1
    `, [transportId]);

    const configFiles = [];

    for (const obj of objectsResult.rows) {
      const fileName = `config/${obj.object_type.toLowerCase()}/${obj.object_name.toLowerCase()}.json`;
      const fileContent = {
        objectType: obj.object_type,
        objectName: obj.object_name,
        tableName: obj.table_name,
        configuration: obj.data_snapshot,
        transportMetadata: {
          transportId,
          generatedAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      configFiles.push({
        path: fileName,
        content: JSON.stringify(fileContent, null, 2),
        encoding: 'utf-8'
      });
    }

    // Add transport manifest
    const manifestFile = {
      path: 'transport-manifest.json',
      content: JSON.stringify({
        transportId,
        objectCount: objectsResult.rows.length,
        objects: objectsResult.rows.map(obj => ({
          type: obj.object_type,
          name: obj.object_name,
          table: obj.table_name
        })),
        generatedAt: new Date().toISOString()
      }, null, 2),
      encoding: 'utf-8'
    };

    configFiles.push(manifestFile);

    return configFiles;
  } catch (error) {
    console.error('Error generating configuration files:', error);
    throw error;
  }
}

/**
 * Create pull request for transport
 */
export async function createTransportPullRequest(transportId, repositoryId) {
  try {
    const transport = await pool.query(
      'SELECT * FROM transport_requests WHERE id = $1',
      [transportId]
    );

    const repository = await pool.query(
      'SELECT * FROM github_repositories WHERE id = $1',
      [repositoryId]
    );

    const integration = await pool.query(
      'SELECT * FROM transport_github_integrations WHERE transport_request_id = $1 AND github_repository_id = $2',
      [transportId, repositoryId]
    );

    if (transport.rows.length === 0 || repository.rows.length === 0 || integration.rows.length === 0) {
      throw new Error('Required records not found');
    }

    const transportData = transport.rows[0];
    const repoData = repository.rows[0];
    const integrationData = integration.rows[0];

    const pullRequestData = {
      title: `Transport ${transportData.request_number}: ${transportData.description}`,
      head: integrationData.branch_name,
      base: repoData.default_branch,
      body: `
## Transport Request Details

**Transport Number:** ${transportData.request_number}
**Type:** ${transportData.request_type}
**Target Environment:** ${transportData.target_environment}
**Owner:** ${transportData.owner}

**Description:**
${transportData.description}

**Release Notes:**
${transportData.release_notes || 'No release notes provided'}

---
*This pull request was automatically created by MallyERP Transport System*
      `.trim(),
      draft: false
    };

    return {
      pullRequestData,
      repository: repoData.repository_name,
      owner: repoData.owner_username,
      accessToken: Buffer.from(repoData.access_token_encrypted, 'base64').toString()
    };

  } catch (error) {
    console.error('Error creating pull request data:', error);
    throw error;
  }
}

export {
  initializeGitHubIntegration,
  registerGitHubRepository,
  createTransportBranch,
  generateConfigurationFiles,
  createTransportPullRequest
};