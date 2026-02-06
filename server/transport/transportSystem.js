/**
 * ERP Transport System - Enterprise Transport Management
 * Handles master data transport from DEV -> QA -> PROD environments
 */

import { pool } from '../db.ts';
import fs from 'fs';
import path from 'path';
import { initializeTransportNumbering } from './transportNumbering.js';

// Transport Request Types
const TRANSPORT_TYPES = {
  MASTER_DATA: 'MD',
  CONFIGURATION: 'CF', 
  CUSTOMIZATION: 'CZ',
  DEVELOPMENT: 'DV'
};

// Transport Status
const TRANSPORT_STATUS = {
  CREATED: 'CREATED',
  RELEASED: 'RELEASED',
  IMPORTED: 'IMPORTED',
  FAILED: 'FAILED'
};

// Environment Types
const ENVIRONMENTS = {
  DEV: 'DEV',
  QA: 'QA',
  PROD: 'PROD'
};

class TransportSystem {
  constructor() {
    this.transportQueue = [];
    this.initializeTables();
  }

  /**
   * Initialize transport management tables
   */
  async initializeTables() {
    try {
      // Create transport requests table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transport_requests (
          id SERIAL PRIMARY KEY,
          request_number VARCHAR(20) UNIQUE NOT NULL,
          request_type VARCHAR(20) NOT NULL,
          description TEXT,
          owner VARCHAR(100) NOT NULL,
          status VARCHAR(20) DEFAULT 'CREATED',
          source_environment VARCHAR(10) DEFAULT 'DEV',
          target_environment VARCHAR(10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          released_at TIMESTAMP,
          imported_at TIMESTAMP,
          release_notes TEXT
        );
      `);

      // Create transport objects table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transport_objects (
          id SERIAL PRIMARY KEY,
          request_id INTEGER REFERENCES transport_requests(id),
          object_type VARCHAR(50) NOT NULL,
          object_name VARCHAR(100) NOT NULL,
          table_name VARCHAR(100) NOT NULL,
          record_id INTEGER,
          action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
          data_snapshot JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create transport log table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transport_logs (
          id SERIAL PRIMARY KEY,
          request_id INTEGER REFERENCES transport_requests(id),
          environment VARCHAR(10) NOT NULL,
          action VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL,
          message TEXT,
          executed_by VARCHAR(100),
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create environment config table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS environment_config (
          id SERIAL PRIMARY KEY,
          environment VARCHAR(10) UNIQUE NOT NULL,
          database_url TEXT,
          is_active BOOLEAN DEFAULT true,
          last_transport_date TIMESTAMP,
          description TEXT
        );
      `);

      // Initialize transport numbering system
      await initializeTransportNumbering();
      
      console.log('Transport system tables initialized successfully');
    } catch (error) {
      console.error('Error initializing transport tables:', error);
    }
  }

  /**
   * Create a new transport request
   */
  async createTransportRequest(type, description, owner, targetEnv = 'QA') {
    try {
      const requestNumber = this.generateRequestNumber(type);
      
      const result = await pool.query(`
        INSERT INTO transport_requests 
        (request_number, request_type, description, owner, target_environment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [requestNumber, type, description, owner, targetEnv]);

      const transportRequest = result.rows[0];
      
      await this.logTransportAction(
        transportRequest.id,
        'DEV',
        'TRANSPORT_CREATED',
        'SUCCESS',
        `Transport request ${requestNumber} created`,
        owner
      );

      return transportRequest;
    } catch (error) {
      console.error('Error creating transport request:', error);
      throw error;
    }
  }

  /**
   * Add master data object to transport
   */
  async addMasterDataToTransport(requestId, tableName, recordId, action = 'INSERT') {
    try {
      // Get the current data snapshot
      const dataResult = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [recordId]);
      
      if (dataResult.rows.length === 0) {
        throw new Error(`Record not found in ${tableName} with id ${recordId}`);
      }

      const dataSnapshot = dataResult.rows[0];
      const objectType = this.getObjectTypeFromTable(tableName);
      const objectName = this.getObjectNameFromData(tableName, dataSnapshot);

      await pool.query(`
        INSERT INTO transport_objects 
        (request_id, object_type, object_name, table_name, record_id, action, data_snapshot)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [requestId, objectType, objectName, tableName, recordId, action, JSON.stringify(dataSnapshot)]);

      console.log(`Added ${tableName} record ${recordId} to transport request ${requestId}`);
      return true;
    } catch (error) {
      console.error('Error adding object to transport:', error);
      throw error;
    }
  }

  /**
   * Release transport request (make it ready for import)
   */
  async releaseTransportRequest(requestId, releaseNotes = '') {
    try {
      // Check if transport has objects
      const objectsResult = await pool.query(
        'SELECT COUNT(*) as count FROM transport_objects WHERE request_id = $1',
        [requestId]
      );

      if (parseInt(objectsResult.rows[0].count) === 0) {
        throw new Error('Cannot release transport request with no objects');
      }

      // Update transport status
      await pool.query(`
        UPDATE transport_requests 
        SET status = $1, released_at = CURRENT_TIMESTAMP, release_notes = $2
        WHERE id = $3
      `, [TRANSPORT_STATUS.RELEASED, releaseNotes, requestId]);

      // Get transport details
      const transportResult = await pool.query(
        'SELECT * FROM transport_requests WHERE id = $1',
        [requestId]
      );
      const transport = transportResult.rows[0];

      await this.logTransportAction(
        requestId,
        'DEV',
        'TRANSPORT_RELEASED',
        'SUCCESS',
        `Transport ${transport.request_number} released for ${transport.target_environment}`,
        'SYSTEM'
      );

      return transport;
    } catch (error) {
      console.error('Error releasing transport:', error);
      throw error;
    }
  }

  /**
   * Import transport to target environment
   */
  async importTransport(requestId, targetEnvironment, executedBy) {
    try {
      // Get transport details
      const transportResult = await pool.query(
        'SELECT * FROM transport_requests WHERE id = $1 AND status = $2',
        [requestId, TRANSPORT_STATUS.RELEASED]
      );

      if (transportResult.rows.length === 0) {
        throw new Error('Transport request not found or not released');
      }

      const transport = transportResult.rows[0];

      // Get all objects in transport
      const objectsResult = await pool.query(
        'SELECT * FROM transport_objects WHERE request_id = $1 ORDER BY id',
        [requestId]
      );

      const objects = objectsResult.rows;
      const importResults = [];

      // Process each object
      for (const obj of objects) {
        try {
          const result = await this.processTransportObject(obj, targetEnvironment);
          importResults.push({
            object: obj,
            status: 'SUCCESS',
            result: result
          });
        } catch (error) {
          importResults.push({
            object: obj,
            status: 'FAILED',
            error: error.message
          });
        }
      }

      // Update transport status
      const hasFailures = importResults.some(r => r.status === 'FAILED');
      const finalStatus = hasFailures ? TRANSPORT_STATUS.FAILED : TRANSPORT_STATUS.IMPORTED;

      await pool.query(`
        UPDATE transport_requests 
        SET status = $1, imported_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [finalStatus, requestId]);

      await this.logTransportAction(
        requestId,
        targetEnvironment,
        'TRANSPORT_IMPORTED',
        finalStatus,
        `Transport ${transport.request_number} imported to ${targetEnvironment}`,
        executedBy
      );

      return {
        transport: transport,
        results: importResults,
        status: finalStatus
      };
    } catch (error) {
      console.error('Error importing transport:', error);
      await this.logTransportAction(
        requestId,
        targetEnvironment,
        'TRANSPORT_IMPORT_FAILED',
        'FAILED',
        error.message,
        executedBy
      );
      throw error;
    }
  }

  /**
   * Process individual transport object
   */
  async processTransportObject(transportObject, targetEnvironment) {
    const { table_name, action, data_snapshot, record_id } = transportObject;
    const data = typeof data_snapshot === 'string' ? JSON.parse(data_snapshot) : data_snapshot;

    switch (action) {
      case 'INSERT':
        return await this.insertRecord(table_name, data);
      case 'UPDATE':
        return await this.updateRecord(table_name, record_id, data);
      case 'DELETE':
        return await this.deleteRecord(table_name, record_id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Insert record in target environment
   */
  async insertRecord(tableName, data) {
    // Remove id field to let target environment generate new ID
    const { id, created_at, updated_at, ...insertData } = data;
    
    const columns = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING id
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update record in target environment
   */
  async updateRecord(tableName, recordId, data) {
    const { id, created_at, updated_at, ...updateData } = data;
    
    const columns = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = columns.map((col, index) => `${col} = $${index + 2}`);

    const query = `
      UPDATE ${tableName} 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [recordId, ...values]);
    return result.rows[0];
  }

  /**
   * Delete record in target environment
   */
  async deleteRecord(tableName, recordId) {
    const query = `DELETE FROM ${tableName} WHERE id = $1 RETURNING id`;
    const result = await pool.query(query, [recordId]);
    return result.rows[0];
  }

  /**
   * Generate transport request number
   */
  generateRequestNumber(type) {
    const timestamp = Date.now().toString().slice(-6);
    return `${type}K${timestamp}`;
  }

  /**
   * Get object type from table name
   */
  getObjectTypeFromTable(tableName) {
    const objectTypeMap = {
      'company_codes': 'COMPANY_CODE',
      'plants': 'PLANT',
      'storage_locations': 'STORAGE_LOCATION',
      'sales_organizations': 'SALES_ORG',
      'purchase_organizations': 'PURCHASE_ORG',
      'credit_control_areas': 'CREDIT_CONTROL',
      'materials': 'MATERIAL',
      'customers': 'CUSTOMER',
      'vendors': 'VENDOR',
      'chart_of_accounts': 'GL_ACCOUNT',
      'cost_centers': 'COST_CENTER',
      'profit_centers': 'PROFIT_CENTER'
    };
    return objectTypeMap[tableName] || tableName.toUpperCase();
  }

  /**
   * Get object name from data
   */
  getObjectNameFromData(tableName, data) {
    const nameFields = ['code', 'name', 'customer_code', 'vendor_code', 'account_code'];
    
    for (const field of nameFields) {
      if (data[field]) {
        return data[field];
      }
    }
    
    return `${tableName}_${data.id}`;
  }

  /**
   * Log transport action
   */
  async logTransportAction(requestId, environment, action, status, message, executedBy) {
    try {
      await pool.query(`
        INSERT INTO transport_logs 
        (request_id, environment, action, status, message, executed_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [requestId, environment, action, status, message, executedBy]);
    } catch (error) {
      console.error('Error logging transport action:', error);
    }
  }

  /**
   * Get transport requests
   */
  async getTransportRequests(status = null, environment = null) {
    let query = `
      SELECT tr.*, 
             COUNT(tobj.id) as object_count,
             STRING_AGG(DISTINCT tobj.object_type, ', ') as object_types
      FROM transport_requests tr
      LEFT JOIN transport_objects tobj ON tr.id = tobj.request_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push(`tr.status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (environment) {
      conditions.push(`tr.target_environment = $${params.length + 1}`);
      params.push(environment);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` GROUP BY tr.id ORDER BY tr.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get transport details with objects
   */
  async getTransportDetails(requestId) {
    const transportResult = await pool.query(
      'SELECT * FROM transport_requests WHERE id = $1',
      [requestId]
    );

    if (transportResult.rows.length === 0) {
      throw new Error('Transport request not found');
    }

    const objectsResult = await pool.query(
      'SELECT * FROM transport_objects WHERE request_id = $1 ORDER BY id',
      [requestId]
    );

    const logsResult = await pool.query(
      'SELECT * FROM transport_logs WHERE request_id = $1 ORDER BY executed_at DESC',
      [requestId]
    );

    return {
      transport: transportResult.rows[0],
      objects: objectsResult.rows,
      logs: logsResult.rows
    };
  }
}

export default TransportSystem;
export { TRANSPORT_TYPES, TRANSPORT_STATUS, ENVIRONMENTS };