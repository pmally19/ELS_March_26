import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

interface SyncResult {
  tableName: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  recordsAdded: number;
  message?: string;
}

class IncrementalAWSSync {
  private awsPool: Pool | null = null;
  private awsDb: any = null;
  private localDb: any;

  constructor(localDb: any) {
    this.localDb = localDb;
  }

  async initializeAWSConnection(): Promise<void> {
    const awsConfig = {
      host: 'database-1.cez84giwuqlr.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'mallyerp',
      user: 'postgres',
      password: 'MallyERP_312',
      ssl: true
    };

    this.awsPool = new Pool({
      host: awsConfig.host,
      port: awsConfig.port,
      database: awsConfig.database,
      user: awsConfig.user,
      password: awsConfig.password,
      ssl: awsConfig.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      connectionTimeoutMillis: 30000,
    });

    // Test connection
    const client = await this.awsPool.connect();
    await client.query('SELECT NOW() as connection_test');
    client.release();

    this.awsDb = drizzle(this.awsPool, { schema });
    console.log('AWS connection established for incremental sync');
  }

  async getLocalTableCount(): Promise<number> {
    const result = await this.localDb.execute(`
      SELECT COUNT(*) as total_tables 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    return parseInt(result.rows[0].total_tables);
  }

  async getAWSTableCount(): Promise<number> {
    if (!this.awsPool) throw new Error('AWS connection not initialized');
    
    const client = await this.awsPool.connect();
    const result = await client.query(`
      SELECT COUNT(*) as total_tables 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    client.release();
    return parseInt(result.rows[0].total_tables);
  }

  async getNewTables(): Promise<string[]> {
    if (!this.awsPool) throw new Error('AWS connection not initialized');
    
    // Get local tables
    const localResult = await this.localDb.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    // Get AWS tables
    const client = await this.awsPool.connect();
    const awsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    client.release();

    const localTables = localResult.rows.map(row => row.table_name);
    const awsTables = awsResult.rows.map(row => row.table_name);
    
    // Find tables that exist locally but not in AWS
    const newTables = localTables.filter(table => !awsTables.includes(table));
    
    console.log(`Found ${newTables.length} new tables to sync:`, newTables.slice(0, 10));
    return newTables;
  }

  async syncNewTablesOnly(): Promise<{ 
    success: boolean; 
    summary: { 
      totalNewTables: number; 
      synced: number; 
      failed: number; 
      results: SyncResult[] 
    } 
  }> {
    try {
      await this.initializeAWSConnection();
      
      const localCount = await this.getLocalTableCount();
      const awsCount = await this.getAWSTableCount();
      const newTables = await this.getNewTables();
      
      console.log(`Local DB: ${localCount} tables, AWS DB: ${awsCount} tables`);
      console.log(`Syncing ${newTables.length} new tables to AWS...`);
      
      const results: SyncResult[] = [];
      let syncedCount = 0;
      let failedCount = 0;

      for (const tableName of newTables) {
        try {
          console.log(`Syncing table: ${tableName}`);
          
          // Create table structure in AWS using local schema
          await this.createTableInAWS(tableName);
          
          // Copy data from local to AWS
          const recordsAdded = await this.copyTableData(tableName);
          
          results.push({
            tableName,
            status: 'created',
            recordsAdded,
            message: `Successfully synced ${recordsAdded} records`
          });
          
          syncedCount++;
          
        } catch (error) {
          console.error(`Failed to sync table ${tableName}:`, error.message);
          results.push({
            tableName,
            status: 'error',
            recordsAdded: 0,
            message: error.message
          });
          failedCount++;
        }
      }

      return {
        success: syncedCount > 0,
        summary: {
          totalNewTables: newTables.length,
          synced: syncedCount,
          failed: failedCount,
          results
        }
      };

    } catch (error) {
      console.error('Incremental AWS sync failed:', error);
      throw error;
    } finally {
      await this.closeConnection();
    }
  }

  private async createTableInAWS(tableName: string): Promise<void> {
    if (!this.awsPool) throw new Error('AWS connection not initialized');
    
    // Get table schema from local database
    const schemaResult = await this.localDb.execute(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    if (schemaResult.rows.length === 0) {
      throw new Error(`Table ${tableName} not found in local database`);
    }

    // Build CREATE TABLE statement
    const columns = schemaResult.rows.map(col => {
      let columnDef = `"${col.column_name}" ${col.data_type}`;
      
      if (col.character_maximum_length) {
        columnDef += `(${col.character_maximum_length})`;
      }
      
      if (col.is_nullable === 'NO') {
        columnDef += ' NOT NULL';
      }
      
      if (col.column_default) {
        columnDef += ` DEFAULT ${col.column_default}`;
      }
      
      return columnDef;
    }).join(',\n  ');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        ${columns}
      )
    `;

    const client = await this.awsPool.connect();
    await client.query(createTableSQL);
    client.release();
    
    console.log(`Created table structure for ${tableName} in AWS`);
  }

  private async copyTableData(tableName: string): Promise<number> {
    if (!this.awsPool) throw new Error('AWS connection not initialized');
    
    // Get data from local table
    const dataResult = await this.localDb.execute(`SELECT * FROM "${tableName}"`);
    
    if (dataResult.rows.length === 0) {
      console.log(`No data to copy for table ${tableName}`);
      return 0;
    }

    // Get column names
    const columns = Object.keys(dataResult.rows[0]);
    const columnsList = columns.map(col => `"${col}"`).join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    const insertSQL = `
      INSERT INTO "${tableName}" (${columnsList}) 
      VALUES (${placeholders})
      ON CONFLICT DO NOTHING
    `;

    const client = await this.awsPool.connect();
    let insertedCount = 0;
    
    try {
      for (const row of dataResult.rows) {
        const values = columns.map(col => row[col]);
        const result = await client.query(insertSQL, values);
        insertedCount += result.rowCount || 0;
      }
    } finally {
      client.release();
    }
    
    console.log(`Copied ${insertedCount} records for table ${tableName}`);
    return insertedCount;
  }

  async closeConnection(): Promise<void> {
    if (this.awsPool) {
      await this.awsPool.end();
      this.awsPool = null;
      this.awsDb = null;
    }
  }
}

export { IncrementalAWSSync };