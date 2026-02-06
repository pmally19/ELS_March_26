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

async function updateChartOfAccountsFields() {
  const client = await pool.connect();
  try {
    console.log('Updating chart_of_accounts table with required fields...\n');
    
    const migrationPath = join(__dirname, '..', 'database', 'migrations', 'update-chart-of-accounts-fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Successfully updated chart_of_accounts table:');
    console.log('   ✓ Added controlling_integration');
    console.log('   ✓ Added manual_creation_allowed');
    console.log('   ✓ Added language (default language)');
    console.log('   ✓ Updated field comments');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'chart_of_accounts'
        AND column_name IN ('chart_id', 'description', 'language', 'account_length', 'controlling_integration', 'group_chart_id', 'active', 'manual_creation_allowed', 'maintenance_language')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Verification - Required columns:');
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

updateChartOfAccountsFields()
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

