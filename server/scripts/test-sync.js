import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trail_els_db',
  user: 'postgres',
  password: 'postgres'
});

async function testOneProjectSync() {
  console.log('🧪 Testing OneProject Synchronization System...\n');

  try {
    // Test 1: Check if sync_operation_log table exists
    console.log('1. Checking sync infrastructure...');
    const logTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sync_operation_log'
      );
    `);
    
    if (logTableCheck.rows[0].exists) {
      console.log('✅ sync_operation_log table exists');
    } else {
      console.log('❌ sync_operation_log table missing');
    }

    // Test 2: Check if triggers exist
    console.log('\n2. Checking database triggers...');
    const triggerCheck = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%_sync_trigger'
      ORDER BY trigger_name;
    `);
    
    console.log(`Found ${triggerCheck.rows.length} sync triggers:`);
    triggerCheck.rows.forEach(row => {
      console.log(`  - ${row.trigger_name}`);
    });

    // Test 3: Check OneProject table structure
    console.log('\n3. Checking OneProject table...');
    const oneProjectCheck = await pool.query(`
      SELECT COUNT(*) as record_count 
      FROM one_project;
    `);
    
    console.log(`OneProject table has ${oneProjectCheck.rows[0].record_count} records`);

    // Test 4: Check company_codes table
    console.log('\n4. Checking company_codes table...');
    const companyCodesCheck = await pool.query(`
      SELECT COUNT(*) as record_count 
      FROM company_codes;
    `);
    
    console.log(`company_codes table has ${companyCodesCheck.rows[0].record_count} records`);

    // Test 5: Check plants table
    console.log('\n5. Checking plants table...');
    const plantsCheck = await pool.query(`
      SELECT COUNT(*) as record_count 
      FROM plants;
    `);
    
    console.log(`plants table has ${plantsCheck.rows[0].record_count} records`);

    // Test 6: Manual sync test - create a test company code
    console.log('\n6. Testing manual sync...');
    
    // Create a test company code
    const testCompanyCode = await pool.query(`
      INSERT INTO company_codes (code, name, city, country, currency, language, active, created_at, updated_at)
      VALUES ('TEST001', 'Test Company', 'Test City', 'Test Country', 'USD', 'EN', true, NOW(), NOW())
      RETURNING *;
    `);
    
    console.log(`✅ Created test company code: ${testCompanyCode.rows[0].code}`);

    // Wait a moment for sync to process
    console.log('⏳ Waiting for sync to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if it appears in OneProject table
    const oneProjectSyncCheck = await pool.query(`
      SELECT COUNT(*) as sync_count 
      FROM one_project 
      WHERE company_code = 'TEST001';
    `);
    
    if (oneProjectSyncCheck.rows[0].sync_count > 0) {
      console.log('✅ Company code synced to OneProject table');
      
      // Get the synced record details
      const syncedRecord = await pool.query(`
        SELECT company_code, company_name, company_city, company_country, record_type, created_by
        FROM one_project 
        WHERE company_code = 'TEST001';
      `);
      
      console.log('📋 Synced record details:', syncedRecord.rows[0]);
    } else {
      console.log('❌ Company code NOT synced to OneProject table');
      
      // Check if there are any sync errors in the log
      const syncErrors = await pool.query(`
        SELECT * FROM sync_operation_log 
        WHERE source_table = 'company_codes' 
        AND sync_status = 'FAILED'
        ORDER BY created_at DESC 
        LIMIT 5;
      `);
      
      if (syncErrors.rows.length > 0) {
        console.log('🚨 Found sync errors:', syncErrors.rows);
      }
    }

    // Clean up test data
    await pool.query(`DELETE FROM company_codes WHERE code = 'TEST001'`);
    await pool.query(`DELETE FROM one_project WHERE company_code = 'TEST001'`);
    console.log('🧹 Cleaned up test data');

    // Test 7: Check sync operation log
    console.log('\n7. Checking sync operation log...');
    const syncLogCheck = await pool.query(`
      SELECT COUNT(*) as log_count 
      FROM sync_operation_log;
    `);
    
    console.log(`Sync operation log has ${syncLogCheck.rows[0].log_count} entries`);

    // Test 8: Check recent sync operations
    const recentSyncOps = await pool.query(`
      SELECT source_table, target_table, sync_status, COUNT(*) as count
      FROM sync_operation_log 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY source_table, target_table, sync_status
      ORDER BY count DESC;
    `);
    
    if (recentSyncOps.rows.length > 0) {
      console.log('\n📊 Recent sync operations:');
      recentSyncOps.rows.forEach(row => {
        console.log(`  - ${row.source_table} → ${row.target_table}: ${row.sync_status} (${row.count})`);
      });
    }

    console.log('\n🎯 OneProject Sync Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testOneProjectSync();
