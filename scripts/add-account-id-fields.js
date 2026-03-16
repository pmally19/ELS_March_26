import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function addAccountIdFields() {
  const client = await pool.connect();
  
  try {
    console.log('Adding missing ERP-standard fields to account_id_master...\n');
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'database', 'migrations', 'add-account-id-fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Successfully added fields to account_id_master:');
    console.log('   ✓ gl_account_id (INTEGER) - GL Account linkage');
    console.log('   ✓ routing_number (VARCHAR(20)) - Routing/Transit number');
    console.log('   ✓ iban (VARCHAR(34)) - International Bank Account Number');
    console.log('   ✓ account_holder_name (VARCHAR(100)) - Account holder name');
    console.log('   ✓ Indexes created');
    console.log('   ✓ Foreign key constraint added (if gl_accounts exists)');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'account_id_master'
        AND column_name IN ('gl_account_id', 'routing_number', 'iban', 'account_holder_name')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Verification - New columns:');
    result.rows.forEach((col) => {
      console.log(`   ✓ ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} - ${col.is_nullable === 'YES' ? 'Nullable' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding fields:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
addAccountIdFields()
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

