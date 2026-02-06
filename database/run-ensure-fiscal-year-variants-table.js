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

async function ensureTable() {
  const client = await pool.connect();
  try {
    console.log('🔄 Ensuring fiscal_year_variants table structure...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'ensure-fiscal-year-variants-table.sql'),
      'utf8'
    );
    
    await client.query(migrationSQL);
    
    console.log('✅ Fiscal year variants table structure verified/updated successfully!');
    
    // Verify the table structure
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'fiscal_year_variants'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table Structure:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}) - ${row.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

ensureTable().catch(console.error);

