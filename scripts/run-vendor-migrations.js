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

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting vendor migrations...\n');
    
    await client.query('BEGIN');
    
    // Migration 1: Add account_group_id to vendors
    console.log('📝 Running: add-account-group-id-to-vendors.sql');
    const migration1Path = join(__dirname, '..', 'database', 'migrations', 'add-account-group-id-to-vendors.sql');
    const migration1SQL = readFileSync(migration1Path, 'utf-8');
    await client.query(migration1SQL);
    console.log('✅ Account group ID column added\n');
    
    // Migration 2: Add reconciliation_account_id to vendors
    console.log('📝 Running: add-reconciliation-account-to-vendors.sql');
    const migration2Path = join(__dirname, '..', 'database', 'migrations', 'add-reconciliation-account-to-vendors.sql');
    const migration2SQL = readFileSync(migration2Path, 'utf-8');
    await client.query(migration2SQL);
    console.log('✅ Reconciliation account ID column added\n');
    
    await client.query('COMMIT');
    
    console.log('✅ All vendor migrations completed successfully!');
    
    // Verify columns were added
    console.log('\n🔍 Verifying migrations...\n');
    const columnsCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'vendors'
        AND column_name IN ('account_group_id', 'reconciliation_account_id')
      ORDER BY column_name
    `);
    
    console.log('✅ Added columns:');
    columnsCheck.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migrations
runMigrations()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

