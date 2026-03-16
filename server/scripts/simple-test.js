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

async function simpleTest() {
  console.log('🧪 Simple OneProject Sync Test...\n');

  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', result.rows[0].current_time);

    // Test 2: Check if OneProject table exists
    console.log('\n2. Checking OneProject table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'one_project'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ OneProject table exists');
      
      // Check record count
      const countResult = await pool.query('SELECT COUNT(*) as count FROM one_project');
      console.log(`📊 OneProject table has ${countResult.rows[0].count} records`);
    } else {
      console.log('❌ OneProject table does not exist');
    }

    // Test 3: Check if company_codes table exists
    console.log('\n3. Checking company_codes table...');
    const companyTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'company_codes'
      );
    `);
    
    if (companyTableCheck.rows[0].exists) {
      console.log('✅ company_codes table exists');
      
      // Check record count
      const countResult = await pool.query('SELECT COUNT(*) as count FROM company_codes');
      console.log(`📊 company_codes table has ${countResult.rows[0].count} records`);
    } else {
      console.log('❌ company_codes table does not exist');
    }

    // Test 4: Check if sync_operation_log table exists
    console.log('\n4. Checking sync_operation_log table...');
    const syncTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sync_operation_log'
      );
    `);
    
    if (syncTableCheck.rows[0].exists) {
      console.log('✅ sync_operation_log table exists');
      
      // Check record count
      const countResult = await pool.query('SELECT COUNT(*) as count FROM sync_operation_log');
      console.log(`📊 sync_operation_log table has ${countResult.rows[0].count} records`);
    } else {
      console.log('❌ sync_operation_log table does not exist');
    }

    console.log('\n🎯 Simple Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
simpleTest();
