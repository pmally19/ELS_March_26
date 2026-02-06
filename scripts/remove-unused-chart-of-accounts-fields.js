import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function removeUnusedFields() {
  const client = await pool.connect();
  try {
    console.log('Removing unused fields from chart_of_accounts table...\n');
    
    const migrationPath = join(__dirname, '..', 'database', 'migrations', 'remove-unused-chart-of-accounts-fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Successfully removed unused fields:');
    console.log('   ✓ Dropped country_code');
    console.log('   ✓ Dropped company_code_id');
    console.log('   ✓ Dropped account_number_format');
    console.log('   ✓ Dropped account_group_structure');
    console.log('   ✓ Dropped is_operational_chart');
    console.log('   ✓ Dropped consolidation_chart_id');
    console.log('   ✓ Dropped related foreign key constraints');
    console.log('   ✓ Dropped related indexes');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'chart_of_accounts'
      ORDER BY column_name
    `);
    
    console.log('\n✅ Current table structure:');
    result.rows.forEach((col) => {
      console.log(`   ✓ ${col.column_name}: ${col.data_type} - ${col.is_nullable === 'YES' ? 'Nullable' : 'NOT NULL'}`);
    });
    
    // Verify required fields are present
    const requiredFields = [
      'chart_id', 'description', 'language', 'account_length', 
      'controlling_integration', 'group_chart_id', 'active', 
      'manual_creation_allowed', 'maintenance_language'
    ];
    
    const existingFields = result.rows.map((r) => r.column_name);
    const missingFields = requiredFields.filter((f) => !existingFields.includes(f));
    
    if (missingFields.length > 0) {
      console.error('\n❌ Missing required fields:', missingFields);
      throw new Error('Required fields are missing!');
    } else {
      console.log('\n✅ All required fields are present!');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

removeUnusedFields()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

