import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

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
    console.log('🔧 Running Dunning System Migrations...\n');
    
    await client.query('BEGIN');
    
    // Migration 1: Add customer dunning fields
    console.log('1️⃣ Adding dunning fields to erp_customers...');
    const migration1 = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'migrations', '2025-12-29_add_dunning_fields_to_customers.sql'),
      'utf8'
    );
    await client.query(migration1);
    console.log('   ✅ Customer dunning fields added\n');
    
    // Migration 2: Create email templates and supporting tables
    console.log('2️⃣ Creating dunning email templates and run log tables...');
    const migration2 = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'migrations', '2025-12-29_create_dunning_email_templates.sql'),
      'utf8'
    );
    await client.query(migration2);
    console.log('   ✅ Email templates and run log tables created\n');
    
    await client.query('COMMIT');
    
    // Verify migrations
    console.log('3️⃣ Verifying migrations...\n');
    
    const customerFields = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'erp_customers'
      AND column_name LIKE '%dunning%'
      ORDER BY column_name
    `);
    
    console.log('   Customer dunning fields:');
    customerFields.rows.forEach(field => {
      console.log(`   ✓ ${field.column_name}: ${field.data_type}`);
    });
    
    const templateCount = await client.query('SELECT COUNT(*) FROM dunning_email_templates');
    console.log(`\n   Email templates: ${templateCount.rows[0].count} created`);
    
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('dunning_email_templates', 'dunning_run_log')
      ORDER BY table_name
    `);
    
    console.log('\n   New tables:');
    tables.rows.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });
    
    console.log('\n✅ All migrations completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('\n🎉 Database migrations complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
