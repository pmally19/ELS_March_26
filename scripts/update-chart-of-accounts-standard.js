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

async function updateChartOfAccounts() {
  const client = await pool.connect();
  try {
    console.log('Updating chart_of_accounts table to standard structure...\n');
    
    const migrationPath = join(__dirname, '..', 'database', 'migrations', 'update-chart-of-accounts-standard.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Successfully updated chart_of_accounts table:');
    console.log('   ✓ Added country_code');
    console.log('   ✓ Added company_code_id');
    console.log('   ✓ Added account_number_format');
    console.log('   ✓ Added account_group_structure');
    console.log('   ✓ Added is_operational_chart');
    console.log('   ✓ Added consolidation_chart_id');
    console.log('   ✓ Added group_chart_id');
    console.log('   ✓ Removed hardcoded defaults');
    console.log('   ✓ Added foreign key constraints');
    console.log('   ✓ Created indexes');
    
    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'chart_of_accounts'
        AND column_name IN ('country_code', 'company_code_id', 'account_number_format', 'account_group_structure', 'is_operational_chart')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Verification - New columns:');
    result.rows.forEach((col) => {
      console.log(`   ✓ ${col.column_name}: ${col.data_type} - ${col.is_nullable === 'YES' ? 'Nullable' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

updateChartOfAccounts()
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

