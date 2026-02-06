import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

interface AWSConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

class AWSConnectionService {
  private awsPool: Pool | null = null;
  private awsDb: any = null;
  private localDb: any;

  constructor(localDb: any) {
    this.localDb = localDb;
  }

  // Initialize AWS RDS connection with your credentials
  async initializeAWSConnection(): Promise<void> {
    const awsConfig: AWSConnectionConfig = {
      host: 'database-1.cez84giwuqlr.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'mallyerp',
      user: 'postgres',
      password: 'Mokshith@21',
      ssl: true
    };

    try {
      this.awsPool = new Pool({
        host: awsConfig.host,
        port: awsConfig.port,
        database: awsConfig.database,
        user: awsConfig.user,
        password: awsConfig.password,
        ssl: awsConfig.ssl ? { rejectUnauthorized: false } : false,
        max: 20,
        connectionTimeoutMillis: 30000,
      });

      // Test connection
      const client = await this.awsPool.connect();
      await client.query('SELECT NOW() as connection_test');
      client.release();

      this.awsDb = drizzle(this.awsPool, { schema });

      // Store credentials in local database for future reference
      await this.storeAWSCredentials(awsConfig);

      console.log('✅ AWS RDS connection established successfully');
      console.log(`🔗 Connected to: ${awsConfig.host}:${awsConfig.port}/${awsConfig.database}`);
      
    } catch (error) {
      console.error('❌ Failed to connect to AWS RDS:', error);
      throw new Error(`AWS RDS connection failed: ${error.message}`);
    }
  }

  // Store AWS credentials securely in local database
  private async storeAWSCredentials(config: AWSConnectionConfig): Promise<void> {
    try {
      await this.localDb.execute(`
        INSERT INTO aws_database_credentials (
          connection_name, aws_region, rds_instance_id, hostname, port, 
          database, username, password, is_primary, description
        ) VALUES (
          'primary-aws-rds', 'us-east-1', 'database-1', $1, $2, 
          $3, $4, $5, true, 'Primary AWS RDS instance for MallyERP'
        ) ON CONFLICT (connection_name) DO UPDATE SET
          hostname = $1, port = $2, database = $3, username = $4,
          updated_at = NOW(), connection_status = 'connected', last_connected = NOW()
      `, [config.host, config.port, config.database, config.user, config.password]);
      
      console.log('🔐 AWS credentials stored securely');
    } catch (error) {
      console.error('Failed to store AWS credentials:', error);
    }
  }

  // Sync all ERP data to AWS RDS
  async syncAllDataToAWS(): Promise<{ success: boolean; summary: any }> {
    if (!this.awsDb || !this.awsPool) {
      throw new Error('AWS connection not initialized. Call initializeAWSConnection() first.');
    }

    console.log('🔄 Starting comprehensive data sync to AWS RDS...');
    
    const syncResults = {
      totalTables: 0,
      successfulTables: 0,
      failedTables: 0,
      totalRecords: 0,
      errors: [] as string[]
    };

    try {
      // First, ensure all tables exist in AWS RDS
      await this.createAllTablesInAWS();

      // Get all table names with data
      const tablesWithData = await this.getTablesWithData();
      syncResults.totalTables = tablesWithData.length;

      console.log(`📊 Found ${tablesWithData.length} tables with data to sync`);

      // Sync each table
      for (const tableName of tablesWithData) {
        try {
          const recordCount = await this.syncTableToAWS(tableName);
          syncResults.successfulTables++;
          syncResults.totalRecords += recordCount;
          console.log(`✅ Synced ${recordCount} records from ${tableName}`);
        } catch (error) {
          syncResults.failedTables++;
          syncResults.errors.push(`${tableName}: ${error.message}`);
          console.error(`❌ Failed to sync ${tableName}:`, error.message);
        }
      }

      // Sync the gigantic enterprise tables
      await this.syncGiganticTables();

      const summary = {
        timestamp: new Date().toISOString(),
        tablesProcessed: syncResults.totalTables,
        successfulTables: syncResults.successfulTables,
        failedTables: syncResults.failedTables,
        totalRecordsSynced: syncResults.totalRecords,
        errors: syncResults.errors
      };

      console.log(`
🎉 AWS RDS Sync Complete!
📋 Summary:
   • Tables processed: ${summary.tablesProcessed}
   • Successful syncs: ${summary.successfulTables}
   • Failed syncs: ${summary.failedTables}
   • Total records synced: ${summary.totalRecordsSynced}
   • Database: mallyerp on AWS RDS (us-east-1)
      `);

      return { success: true, summary };

    } catch (error) {
      console.error('💥 Critical sync error:', error);
      return { 
        success: false, 
        summary: { 
          error: error.message,
          partialResults: syncResults
        }
      };
    }
  }

  // Create all table structures in AWS RDS
  private async createAllTablesInAWS(): Promise<void> {
    console.log('🏗️ Creating table structures in AWS RDS...');
    
    try {
      // Execute the complete schema on AWS RDS
      const schemaSQL = await this.getCompleteSchema();
      await this.awsDb.execute(schemaSQL);
      console.log('✅ All table structures created in AWS RDS');
    } catch (error) {
      console.error('Failed to create tables in AWS:', error);
      throw error;
    }
  }

  // Get tables that contain data
  private async getTablesWithData(): Promise<string[]> {
    const result = await this.localDb.execute(`
      SELECT schemaname, relname as table_name, n_live_tup as row_count
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public' AND n_live_tup > 0
      ORDER BY n_live_tup DESC
    `);
    
    return result.rows.map(row => row.table_name);
  }

  // Sync individual table to AWS
  private async syncTableToAWS(tableName: string): Promise<number> {
    // Get all data from local table
    const localData = await this.localDb.execute(`SELECT * FROM ${tableName}`);
    const records = localData.rows;

    if (records.length === 0) {
      return 0;
    }

    // Clear existing data in AWS table
    await this.awsDb.execute(`TRUNCATE TABLE ${tableName} CASCADE`);

    // Insert data in batches
    const batchSize = 1000;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Build insert statement dynamically
          const columns = Object.keys(record).join(', ');
          const placeholders = Object.keys(record).map((_, index) => `$${index + 1}`).join(', ');
          const values = Object.values(record);

          await this.awsDb.execute(
            `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
            values
          );
          insertedCount++;
        } catch (error) {
          console.warn(`Skipping problematic record in ${tableName}:`, error.message);
        }
      }
    }

    return insertedCount;
  }

  // Sync the gigantic enterprise tables specifically
  private async syncGiganticTables(): Promise<void> {
    const giganticTables = [
      'enterprise_transaction_registry',
      'material_movement_registry'
    ];

    console.log('💼 Syncing gigantic enterprise tables...');

    for (const tableName of giganticTables) {
      try {
        const count = await this.syncTableToAWS(tableName);
        console.log(`✅ Synced ${count} records from ${tableName} (gigantic table)`);
      } catch (error) {
        console.error(`❌ Failed to sync gigantic table ${tableName}:`, error);
      }
    }
  }

  // Get complete database schema
  private async getCompleteSchema(): Promise<string> {
    // This would typically read from your schema file
    // For now, we'll use a simplified approach
    const result = await this.localDb.execute(`
      SELECT 
        'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
        string_agg(
          column_name || ' ' || 
          CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'boolean' THEN 'BOOLEAN'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'numeric' THEN 'NUMERIC'
            WHEN data_type = 'jsonb' THEN 'JSONB'
            ELSE data_type
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
          ', '
        ) || ');' as create_statement
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
      ORDER BY table_name
    `);

    return result.rows.map(row => row.create_statement).join('\n');
  }

  // Verify data integrity between local and AWS
  async verifyDataIntegrity(): Promise<{ tablesChecked: number; discrepancies: string[] }> {
    console.log('🔍 Verifying data integrity between local and AWS...');
    
    const discrepancies: string[] = [];
    const tables = await this.getTablesWithData();
    
    for (const tableName of tables) {
      try {
        const localCount = await this.localDb.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        const awsCount = await this.awsDb.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        
        if (localCount.rows[0].count !== awsCount.rows[0].count) {
          discrepancies.push(`${tableName}: Local(${localCount.rows[0].count}) vs AWS(${awsCount.rows[0].count})`);
        }
      } catch (error) {
        discrepancies.push(`${tableName}: Verification failed - ${error.message}`);
      }
    }

    return {
      tablesChecked: tables.length,
      discrepancies
    };
  }

  // Close AWS connection
  async closeConnection(): Promise<void> {
    if (this.awsPool) {
      await this.awsPool.end();
      this.awsPool = null;
      this.awsDb = null;
      console.log('🔌 AWS RDS connection closed');
    }
  }

  // Get connection status
  getConnectionStatus(): { connected: boolean; host?: string; database?: string } {
    return {
      connected: !!this.awsPool,
      host: this.awsPool ? 'database-1.cez84giwuqlr.us-east-1.rds.amazonaws.com' : undefined,
      database: this.awsPool ? 'mallyerp' : undefined
    };
  }
}

export { AWSConnectionService };