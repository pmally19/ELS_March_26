/**
 * Migration Script: Remove company_code_id column from price_lists table
 * 
 * This script removes the company_code_id column from the price_lists table
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

async function removeCompanyCodeColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Remove company_code_id from price_lists table...');
    await client.query('BEGIN');

    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'price_lists' 
      AND column_name = 'company_code_id'
      AND table_schema = 'public'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('✅ Column company_code_id does not exist in price_lists table. Nothing to remove.');
      await client.query('COMMIT');
      return;
    }

    // Drop the column
    console.log('🗑️  Dropping company_code_id column from price_lists table...');
    await client.query(`
      ALTER TABLE price_lists 
      DROP COLUMN IF EXISTS company_code_id
    `);

    await client.query('COMMIT');
    console.log('✅ Successfully removed company_code_id column from price_lists table!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error removing company_code_id column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
removeCompanyCodeColumn()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
