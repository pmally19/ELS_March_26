import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running GL Account Groups migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-gl-account-groups-table.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ GL Account Groups table created successfully!');
    console.log('✅ Default GL Account Groups inserted!');
    
    // Verify the table was created
    const result = await client.query(`
      SELECT code, name, account_category 
      FROM gl_account_groups 
      ORDER BY code
    `);
    
    console.log('\n📋 Created GL Account Groups:');
    result.rows.forEach(row => {
      console.log(`   - ${row.code}: ${row.name} (${row.account_category})`);
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

runMigration().catch(console.error);

