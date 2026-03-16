import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function insertData() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Inserting depreciation methods data...');
    
    // Check if data already exists
    const checkResult = await client.query('SELECT COUNT(*) as count FROM depreciation_methods');
    const existingCount = parseInt(checkResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing depreciation methods. Skipping insert to avoid duplicates.`);
      console.log('💡 To re-insert data, please truncate the table first.');
      return;
    }
    
    // Read and execute SQL file
    const sqlFile = path.join(__dirname, 'insert-depreciation-methods-data.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Depreciation methods data inserted successfully!');
    
    // Verify data insertion
    const countResult = await client.query('SELECT COUNT(*) as count FROM depreciation_methods');
    const newCount = parseInt(countResult.rows[0].count);
    
    console.log(`✅ Total depreciation methods in database: ${newCount}`);
    
    // Show summary by calculation type
    const summaryResult = await client.query(`
      SELECT 
        calculation_type,
        COUNT(*) as count
      FROM depreciation_methods
      GROUP BY calculation_type
      ORDER BY calculation_type;
    `);
    
    console.log('\n📊 Summary by calculation type:');
    summaryResult.rows.forEach(row => {
      console.log(`   ${row.calculation_type}: ${row.count} methods`);
    });
    
    // Show active methods
    const activeResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM depreciation_methods 
      WHERE is_active = true
    `);
    console.log(`\n✅ Active methods: ${activeResult.rows[0].count}`);
    
    // Show default method
    const defaultResult = await client.query(`
      SELECT code, name 
      FROM depreciation_methods 
      WHERE is_default = true
    `);
    if (defaultResult.rows.length > 0) {
      console.log(`\n⭐ Default method: ${defaultResult.rows[0].code} - ${defaultResult.rows[0].name}`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Insert failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertData()
  .then(() => {
    console.log('\n✅ Data insertion completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Data insertion error:', error);
    process.exit(1);
  });

