import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function createAccountTypesTable() {
  console.log('='.repeat(80));
  console.log('CREATING ACCOUNT TYPES TABLE');
  console.log('='.repeat(80));
  
  try {
    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../database/migrations/create-account-types-table.sql'),
      'utf8'
    );
    
    console.log('\n📋 Running migration SQL...');
    await pool.query(migrationSQL);
    console.log('   ✅ Migration SQL executed successfully');
    
    // Verify table creation
    console.log('\n2️⃣  Verifying table structure...');
    const tableInfo = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'account_types'
      ORDER BY ordinal_position
    `);
    
    if (tableInfo.rows.length > 0) {
      console.log('   ✅ account_types table created successfully:');
      console.table(tableInfo.rows);
    } else {
      console.log('   ❌ account_types table not found');
      throw new Error('Table creation verification failed');
    }
    
    // Check indexes
    console.log('\n3️⃣  Verifying indexes...');
    const indexes = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'account_types'
      ORDER BY indexname
    `);
    
    if (indexes.rows.length > 0) {
      console.log('   ✅ Indexes created:');
      console.table(indexes.rows);
    }
    
    // Insert sample data
    console.log('\n4️⃣  Inserting sample data...');
    const sampleSQL = fs.readFileSync(
      path.join(__dirname, '../database/migrations/insert-sample-account-types.sql'),
      'utf8'
    );
    
    await pool.query(sampleSQL);
    console.log('   ✅ Sample data inserted successfully');
    
    // Verify sample data
    console.log('\n5️⃣  Verifying sample data...');
    const countResult = await pool.query('SELECT COUNT(*) as total FROM account_types');
    const dataResult = await pool.query('SELECT code, name, description, category, is_active FROM account_types ORDER BY code LIMIT 10');
    
    console.log(`   ✅ Found ${countResult.rows[0].total} account types:`);
    if (dataResult.rows.length > 0) {
      console.table(dataResult.rows);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ACCOUNT TYPES TABLE CREATED SUCCESSFULLY');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error creating account types table:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
createAccountTypesTable()
  .then(() => {
    console.log('\n✓ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration script failed:', error);
    process.exit(1);
  });

