import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running Depreciation Methods table migration...');
    
    // Read and execute SQL file
    const sqlFile = path.join(__dirname, 'create-depreciation-methods-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Depreciation Methods table created successfully!');
    
    // Verify table creation
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'depreciation_methods'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Table verification: depreciation_methods exists');
      
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'depreciation_methods'
        ORDER BY ordinal_position;
      `);
      
      console.log(`✅ Table has ${columns.rows.length} columns`);
      console.log('📋 Columns:', columns.rows.map(r => r.column_name).join(', '));
    } else {
      console.error('❌ Table verification failed: depreciation_methods does not exist');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration error:', error);
    process.exit(1);
  });

