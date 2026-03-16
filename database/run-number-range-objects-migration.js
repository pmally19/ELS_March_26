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
    console.log('🔄 Running Number Range Objects table migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-number-range-objects-table.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Number Range Objects table created successfully!');
    
    // Verify the table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'number_range_objects'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table structure:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check for existing data
    const countResult = await client.query('SELECT COUNT(*) as count FROM number_range_objects');
    console.log(`\n📊 Current records: ${countResult.rows[0].count}`);
    console.log('   (No hardcoded data - all data must be configured by users)');
    
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

