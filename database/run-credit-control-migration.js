// Script to run the credit control areas migration
// This script executes the SQL migration to add credit control area data to the database

import pkg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    console.log('Running credit control areas migration...');
    
    // Read the SQL file
    const sqlPath = join(__dirname, 'migrate-credit-control-areas.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Credit control areas migration completed successfully!');
    
    // Verify the data was inserted
    const result = await client.query(`
      SELECT 
        cca.id,
        cca.code,
        cca.name,
        cc.code as company_code,
        cc.name as company_name,
        cca.currency,
        cca.status,
        cca.is_active
      FROM credit_control_areas cca
      LEFT JOIN company_codes cc ON cca.company_code_id = cc.id
      ORDER BY cca.code
    `);
    
    console.log('\n📊 Credit Control Areas in database:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

