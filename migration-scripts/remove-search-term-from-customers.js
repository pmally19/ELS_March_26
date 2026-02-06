/**
 * Migration Script: Remove search_term column from erp_customers table
 * 
 * This script removes the search_term column from the erp_customers table
 * at the database level.
 */

import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'mallyerp';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

const pool = new Pool({
  host: dbHost,
  port: parseInt(dbPort),
  database: dbName,
  user: dbUser,
  password: dbPassword,
});

async function removeSearchTermColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Remove search_term from erp_customers table...');
    await client.query('BEGIN');

    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'erp_customers' 
      AND column_name = 'search_term'
      AND table_schema = 'public'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('✅ Column search_term does not exist in erp_customers table. Nothing to remove.');
      await client.query('COMMIT');
      return;
    }

    // Drop the column
    console.log('🗑️  Dropping search_term column from erp_customers table...');
    await client.query(`
      ALTER TABLE erp_customers 
      DROP COLUMN IF EXISTS search_term
    `);

    await client.query('COMMIT');
    console.log('✅ Successfully removed search_term column from erp_customers table!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error removing search_term column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
removeSearchTermColumn()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

