const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'erp',
  user: 'postgres',
  password: 'password', // Update with your actual password
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running incoterms database migration...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'fix-incoterms-columns.sql'), 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added columns: risk_transfer_point, cost_responsibility, applicable_transport');
    
    // Test the fix by trying to create a test incoterms record
    console.log('🧪 Testing incoterms creation...');
    
    const testData = {
      incotermsKey: 'TEST',
      description: 'Test Incoterms',
      category: 'All Modes',
      applicableVersion: '2020',
      riskTransferPoint: 'Test location',
      costResponsibility: 'Test responsibility',
      applicableTransport: 'MULTIMODAL',
      isActive: true
    };
    
    const result = await client.query(
      `INSERT INTO sd_incoterms (incoterms_key, description, category, applicable_version, risk_transfer_point, cost_responsibility, applicable_transport, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testData.incotermsKey, testData.description, testData.category, testData.applicableVersion, 
       testData.riskTransferPoint, testData.costResponsibility, testData.applicableTransport, testData.isActive]
    );
    
    console.log('✅ Test incoterms record created successfully!');
    console.log(`📝 Test record ID: ${result.rows[0].id}`);
    
    // Clean up test record
    await client.query('DELETE FROM sd_incoterms WHERE incoterms_key = $1', ['TEST']);
    console.log('🧹 Test record cleaned up');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Database migration completed successfully!');
    console.log('🚀 You can now create incoterms with all the new fields!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
