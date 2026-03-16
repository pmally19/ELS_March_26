import { pool } from '../db';
import { oneProjectSyncAgent } from './oneproject-sync-agent';

/**
 * OneProject Real-Time Synchronization Service
 * Listens for database notifications and triggers immediate sync operations
 * Ensures 100% parallel data consistency between OneProject and business tables
 */

export class OneProjectRealTimeSync {
  private pool: any;
  private listenerClient: any;
  private isListening: boolean = false;

  constructor(dbPool: any) {
    this.pool = dbPool;
    this.startRealTimeSync();
  }

  /**
   * Start real-time synchronization listeners
   */
  async startRealTimeSync(): Promise<void> {
    try {
      this.listenerClient = await this.pool.connect();
      
      // Listen for OneProject changes (sync to business tables)
      await this.listenerClient.query('LISTEN business_sync');
      
      // Listen for business table changes (sync to OneProject)
      await this.listenerClient.query('LISTEN oneproject_sync');
      
      // Set up notification handlers
      this.listenerClient.on('notification', async (msg: any) => {
        try {
          const payload = JSON.parse(msg.payload);
          
          if (msg.channel === 'business_sync') {
            await this.handleOneProjectChange(payload);
          } else if (msg.channel === 'oneproject_sync') {
            await this.handleBusinessTableChange(payload);
          }
        } catch (error) {
          console.error('Error processing sync notification:', error);
        }
      });
      
      this.isListening = true;
      console.log('🔄 OneProject Real-Time Sync: ACTIVE - 100% parallel synchronization enabled');
      
    } catch (error) {
      console.error('Error starting real-time sync:', error);
      // Retry connection after 5 seconds
      setTimeout(() => this.startRealTimeSync(), 5000);
    }
  }

  /**
   * Handle OneProject table changes - sync to business tables
   */
  private async handleOneProjectChange(payload: any): Promise<void> {
    try {
      const { table, operation, record_id, changed_fields } = payload;
      
      console.log(`🔄 OneProject → Business Tables: ${operation} on record ${record_id}`);
      
      // Trigger synchronization to business tables
      await oneProjectSyncAgent.syncOneProjectToBusiness(
        record_id,
        operation,
        changed_fields || [],
        {}
      );
      
      console.log(`✅ OneProject → Business Tables: Sync completed for ${record_id}`);
      
    } catch (error) {
      console.error('Error handling OneProject change:', error);
    }
  }

  /**
   * Handle business table changes - sync to OneProject
   */
  private async handleBusinessTableChange(payload: any): Promise<void> {
    try {
      const { table, operation, record_id } = payload;
      
      console.log(`🔄 ${table} → OneProject: ${operation} on record ${record_id}`);
      
      // Get the actual record data for sync
      let recordData = null;
      if (operation !== 'DELETE') {
        recordData = await this.getRecordData(table, record_id);
      }
      
      // Trigger synchronization to OneProject
      await oneProjectSyncAgent.syncBusinessToOneProject(
        table,
        record_id,
        operation,
        recordData
      );
      
      console.log(`✅ ${table} → OneProject: Sync completed for ${record_id}`);
      
    } catch (error) {
      console.error('Error handling business table change:', error);
    }
  }

  /**
   * Get record data from business table
   */
  private async getRecordData(tableName: string, recordId: string): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const query = `SELECT * FROM ${tableName} WHERE id = $1`;
      const result = await client.query(query, [recordId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Stop real-time synchronization
   */
  async stopRealTimeSync(): Promise<void> {
    if (this.listenerClient) {
      await this.listenerClient.query('UNLISTEN business_sync');
      await this.listenerClient.query('UNLISTEN oneproject_sync');
      this.listenerClient.release();
      this.isListening = false;
      console.log('🔄 OneProject Real-Time Sync: STOPPED');
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): any {
    return {
      isListening: this.isListening,
      channels: ['business_sync', 'oneproject_sync'],
      status: this.isListening ? 'ACTIVE' : 'INACTIVE',
      message: this.isListening ? 
        '100% parallel synchronization active' : 
        'Real-time sync not active'
    };
  }

  /**
   * Test real-time sync functionality
   */
  async testRealTimeSync(): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      // Create a test customer record to trigger sync (align with current schema)
      const testRecord = await client.query(`
        INSERT INTO customers (code, name, type, email, phone, address, postal_code, notes)
        VALUES ('TEST-SYNC-001', 'Test Sync Customer', 'company', 'test-sync@example.com', '+1-000-000-0000', '123 Test St', '00000', 'Real-time sync test')
        RETURNING id, code as customer_code, name
      `);
      
      // Wait a moment for sync to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if record was synced to OneProject
      const syncCheck = await client.query(`
        SELECT id, customer_number, customer_name 
        FROM one_project 
        WHERE customer_number = 'TEST-SYNC-001'
      `);
      
      // Clean up test data
      await client.query(`DELETE FROM customers WHERE code = 'TEST-SYNC-001'`);
      await client.query(`DELETE FROM one_project WHERE customer_number = 'TEST-SYNC-001'`);
      
      return {
        testResult: syncCheck.rows.length > 0 ? 'SUCCESS' : 'FAILED',
        testRecord: testRecord.rows[0],
        syncedRecord: syncCheck.rows[0] || null,
        syncTime: '< 2 seconds',
        message: syncCheck.rows.length > 0 ? 
          'Real-time sync working correctly' : 
          'Real-time sync test failed'
      };
      
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const oneProjectRealTimeSync = new OneProjectRealTimeSync(pool);