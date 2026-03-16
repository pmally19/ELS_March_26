import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { awsDatabaseCredentials, databaseSyncLog } from '../shared/aws-database-schema';
import { db } from './db';

// Encryption key for storing sensitive credentials (use environment variable in production)
const ENCRYPTION_KEY = process.env.AWS_DB_ENCRYPTION_KEY || 'your-32-character-secret-key-here!!';

class AWSRDSManager {
  private connections: Map<string, Pool> = new Map();

  // Encrypt password before storing
  private encryptPassword(password: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // Decrypt password when connecting
  private decryptPassword(encryptedPassword: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Store AWS RDS credentials securely
  async storeCredentials(credentials: {
    connectionName: string;
    awsRegion: string;
    rdsInstanceId: string;
    hostname: string;
    port: number;
    database: string;
    username: string;
    password: string;
    sslMode?: string;
    maxConnections?: number;
    isPrimary?: boolean;
    description?: string;
  }) {
    try {
      const encryptedPassword = this.encryptPassword(credentials.password);
      
      const [result] = await db.insert(awsDatabaseCredentials).values({
        ...credentials,
        password: encryptedPassword
      }).returning();

      console.log(`AWS RDS credentials stored for: ${credentials.connectionName}`);
      return result;
    } catch (error) {
      console.error('Failed to store AWS credentials:', error);
      throw error;
    }
  }

  // Get active AWS RDS connection
  async getConnection(connectionName: string): Promise<Pool> {
    if (this.connections.has(connectionName)) {
      return this.connections.get(connectionName)!;
    }

    try {
      const [credentials] = await db
        .select()
        .from(awsDatabaseCredentials)
        .where(and(
          eq(awsDatabaseCredentials.connectionName, connectionName),
          eq(awsDatabaseCredentials.isActive, true)
        ));

      if (!credentials) {
        throw new Error(`AWS RDS credentials not found for: ${connectionName}`);
      }

      const decryptedPassword = this.decryptPassword(credentials.password);
      
      const pool = new Pool({
        host: credentials.hostname,
        port: credentials.port,
        database: credentials.database,
        user: credentials.username,
        password: decryptedPassword,
        ssl: credentials.sslMode === 'require' ? { rejectUnauthorized: false } : false,
        max: credentials.maxConnections || 20,
        connectionTimeoutMillis: (credentials.connectionTimeout || 30) * 1000,
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Update connection status
      await db
        .update(awsDatabaseCredentials)
        .set({ 
          connectionStatus: 'connected',
          lastConnected: new Date()
        })
        .where(eq(awsDatabaseCredentials.id, credentials.id));

      this.connections.set(connectionName, pool);
      console.log(`Successfully connected to AWS RDS: ${connectionName}`);
      
      return pool;
    } catch (error) {
      console.error(`Failed to connect to AWS RDS ${connectionName}:`, error);
      
      // Update connection status to failed
      const [credentials] = await db
        .select()
        .from(awsDatabaseCredentials)
        .where(eq(awsDatabaseCredentials.connectionName, connectionName));
      
      if (credentials) {
        await db
          .update(awsDatabaseCredentials)
          .set({ connectionStatus: 'failed' })
          .where(eq(awsDatabaseCredentials.id, credentials.id));
      }
      
      throw error;
    }
  }

  // Sync all ERP data to AWS RDS
  async syncToAWS(connectionName: string, options: {
    syncType?: 'full_sync' | 'incremental' | 'backup';
    specificTables?: string[];
  } = {}) {
    try {
      const awsPool = await this.getConnection(connectionName);
      const awsDb = drizzle(awsPool);
      
      const [credentials] = await db
        .select()
        .from(awsDatabaseCredentials)
        .where(eq(awsDatabaseCredentials.connectionName, connectionName));

      const syncType = options.syncType || 'full_sync';
      
      // Get list of tables to sync
      const tablesToSync = options.specificTables || await this.getAllTableNames();
      
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      for (const tableName of tablesToSync) {
        const syncLogId = await this.startSyncLog(credentials.id, tableName, syncType);
        
        try {
          // Export data from local table
          const result = await db.execute(`SELECT * FROM ${tableName}`);
          const records = result.rows;
          
          if (records.length > 0) {
            // Create table structure in AWS if not exists
            await this.createTableInAWS(awsDb, tableName);
            
            // Insert data into AWS RDS
            if (syncType === 'full_sync') {
              await awsDb.execute(`TRUNCATE TABLE ${tableName} CASCADE`);
            }
            
            // Batch insert records
            await this.batchInsertRecords(awsDb, tableName, records);
          }
          
          await this.completeSyncLog(syncLogId, records.length, records.length, 0, 'completed');
          totalProcessed += records.length;
          totalSuccessful += records.length;
          
          console.log(`✓ Synced ${records.length} records from ${tableName}`);
        } catch (error) {
          await this.completeSyncLog(syncLogId, 0, 0, 1, 'failed', error.message);
          totalFailed++;
          console.error(`✗ Failed to sync ${tableName}:`, error);
        }
      }

      console.log(`
🔄 AWS RDS Sync Complete
📊 Tables processed: ${tablesToSync.length}
✅ Records synced: ${totalSuccessful}
❌ Failed tables: ${totalFailed}
🎯 Connection: ${connectionName}
      `);

      return {
        tablesProcessed: tablesToSync.length,
        recordsSynced: totalSuccessful,
        failedTables: totalFailed
      };
    } catch (error) {
      console.error('AWS RDS sync failed:', error);
      throw error;
    }
  }

  // Helper methods
  private async getAllTableNames(): Promise<string[]> {
    const result = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE_TABLE'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  }

  private async startSyncLog(credentialId: number, tableName: string, syncType: string) {
    const [result] = await db.insert(databaseSyncLog).values({
      awsCredentialId: credentialId,
      tableName,
      syncType,
      syncStatus: 'in_progress'
    }).returning();
    return result.id;
  }

  private async completeSyncLog(
    syncLogId: number, 
    processed: number, 
    successful: number, 
    failed: number, 
    status: string,
    errorDetails?: string
  ) {
    await db
      .update(databaseSyncLog)
      .set({
        recordsProcessed: processed,
        recordsSuccessful: successful,
        recordsFailed: failed,
        syncStatus: status,
        endTime: new Date(),
        errorDetails
      })
      .where(eq(databaseSyncLog.id, syncLogId));
  }

  private async createTableInAWS(awsDb: any, tableName: string) {
    // Get table structure from local database
    const result = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position
    `);
    
    const columns = result.rows.map(col => {
      const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';
      const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
      return `${col.column_name} ${col.data_type} ${nullable} ${defaultVal}`.trim();
    }).join(', ');
    
    await awsDb.execute(`
      CREATE TABLE IF NOT EXISTS ${tableName} (${columns})
    `);
  }

  private async batchInsertRecords(awsDb: any, tableName: string, records: any[]) {
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      // Implementation depends on your specific data structure
      // This is a simplified version - you'd need to handle proper column mapping
      for (const record of batch) {
        const columns = Object.keys(record).join(', ');
        const values = Object.values(record).map(v => `'${v}'`).join(', ');
        await awsDb.execute(`INSERT INTO ${tableName} (${columns}) VALUES (${values})`);
      }
    }
  }

  // Get sync status and logs
  async getSyncStatus(connectionName?: string) {
    let query = db.select().from(databaseSyncLog);
    
    if (connectionName) {
      const [credentials] = await db
        .select()
        .from(awsDatabaseCredentials)
        .where(eq(awsDatabaseCredentials.connectionName, connectionName));
      
      if (credentials) {
        query = query.where(eq(databaseSyncLog.awsCredentialId, credentials.id));
      }
    }
    
    return await query.orderBy(databaseSyncLog.createdAt);
  }

  // Close all connections
  async closeAllConnections() {
    for (const [name, pool] of this.connections) {
      await pool.end();
      console.log(`Closed AWS RDS connection: ${name}`);
    }
    this.connections.clear();
  }
}

export const awsRDSManager = new AWSRDSManager();