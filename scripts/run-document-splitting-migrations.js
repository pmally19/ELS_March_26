import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log('🔄 Starting Document Splitting Migrations...\n');
    
    await client.query('BEGIN');
    
    // Migration 1: Create configuration tables
    console.log('📝 Running: create-document-splitting-configuration.sql');
    const migration1Path = path.join(__dirname, '..', 'database', 'migrations', 'create-document-splitting-configuration.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
    await client.query(migration1SQL);
    console.log('✅ Configuration tables created\n');
    
    // Migration 2: Add fields to accounting_document_items
    console.log('📝 Running: add-splitting-fields-to-accounting-document-items.sql');
    const migration2Path = path.join(__dirname, '..', 'database', 'migrations', 'add-splitting-fields-to-accounting-document-items.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
    await client.query(migration2SQL);
    console.log('✅ Fields added to accounting_document_items\n');
    
    await client.query('COMMIT');
    
    // Verify tables were created
    console.log('🔍 Verifying migrations...\n');
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'document_splitting%'
      ORDER BY table_name
    `);
    
    console.log('✅ Created tables:');
    tablesCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Verify columns were added
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'accounting_document_items' 
      AND column_name IN ('profit_center', 'business_area', 'segment', 'cost_center', 'split_document_id', 'split_characteristic_value')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Added columns to accounting_document_items:');
    columnsCheck.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });
    
    console.log('\n✅ All migrations completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);

