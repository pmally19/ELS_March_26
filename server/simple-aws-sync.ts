import pkg from 'pg';
const { Pool } = pkg;

class SimpleAWSSync {
  private localDb: any;
  private awsPool: any = null;

  constructor(localDb: any) {
    this.localDb = localDb;
  }

  async initializeAWSConnection(): Promise<void> {
    this.awsPool = new Pool({
      host: 'database-1.cez84giwuqlr.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'mallyerp',
      user: 'postgres',
      password: 'MallyERP_312',
      ssl: { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 30000,
    });

    // Test connection
    const client = await this.awsPool.connect();
    await client.query('SELECT NOW() as connection_test');
    client.release();
    console.log('AWS connection established for simple sync');
  }

  async getTableCounts(): Promise<{ local: number; aws: number; newTables: string[] }> {
    // Get local table count
    const localResult = await this.localDb.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    // Get AWS table count
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
    const newTables = localTables.filter(table => !awsTables.includes(table));

    return {
      local: localTables.length,
      aws: awsTables.length,
      newTables
    };
  }

  async syncNewTablesOnly(): Promise<{ 
    success: boolean; 
    summary: { 
      localTables: number; 
      awsTables: number; 
      newTablesSynced: number; 
      newTables: string[];
      errors: string[];
    } 
  }> {
    try {
      await this.initializeAWSConnection();
      
      const tableCounts = await this.getTableCounts();
      console.log(`Local: ${tableCounts.local} tables, AWS: ${tableCounts.aws} tables`);
      console.log(`Found ${tableCounts.newTables.length} new tables to sync`);

      const errors: string[] = [];
      let syncedCount = 0;

      // Sync only the new tables using simple CREATE TABLE AS SELECT
      for (const tableName of tableCounts.newTables) {
        try {
          console.log(`Syncing new table: ${tableName}`);
          
          // Get sample data to understand structure
          const sampleResult = await this.localDb.execute(`SELECT * FROM "${tableName}" LIMIT 1`);
          
          if (sampleResult.rows.length === 0) {
            console.log(`Skipping empty table: ${tableName}`);
            continue;
          }

          // Create table in AWS using a simple approach
          const client = await this.awsPool.connect();
          
          // Use CREATE TABLE AS SELECT for simple replication
          await client.query(`
            CREATE TABLE IF NOT EXISTS "${tableName}" AS 
            SELECT * FROM dblink(
              'host=localhost port=5432 dbname=mallyerp user=postgres',
              'SELECT * FROM "${tableName}" LIMIT 0'
            ) AS t(${this.generateColumnList(sampleResult.rows[0])})
          `);
          
          client.release();
          syncedCount++;
          
        } catch (error) {
          const errorMsg = `Failed to sync table ${tableName}: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: syncedCount > 0,
        summary: {
          localTables: tableCounts.local,
          awsTables: tableCounts.aws,
          newTablesSynced: syncedCount,
          newTables: tableCounts.newTables,
          errors
        }
      };

    } catch (error) {
      console.error('Simple AWS sync failed:', error);
      throw error;
    } finally {
      if (this.awsPool) {
        await this.awsPool.end();
      }
    }
  }

  private generateColumnList(sampleRow: any): string {
    return Object.keys(sampleRow).map(col => `"${col}" TEXT`).join(', ');
  }
}

export { SimpleAWSSync };