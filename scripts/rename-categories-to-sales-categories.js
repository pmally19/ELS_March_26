import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'mallyerp';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function renameTable() {
  try {
    // Check if categories table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
      );
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('⚠️  Table categories does not exist. Skipping rename.');
      await pool.end();
      return;
    }

    // Check if sales_categories already exists
    const checkNewTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_categories'
      );
    `);
    
    if (checkNewTable.rows[0].exists) {
      console.log('⚠️  Table sales_categories already exists. Skipping rename.');
      await pool.end();
      return;
    }

    // Rename the table
    await pool.query(`ALTER TABLE categories RENAME TO sales_categories;`);
    console.log('✅ Table renamed from categories to sales_categories');
    
    // Rename the sequence if it exists
    try {
      await pool.query(`ALTER SEQUENCE categories_id_seq RENAME TO sales_categories_id_seq;`);
      console.log('✅ Sequence renamed');
    } catch (err) {
      console.log('ℹ️  Sequence rename skipped (may not exist)');
    }
    
    // Update the default value for id column if needed
    try {
      await pool.query(`
        ALTER TABLE sales_categories 
        ALTER COLUMN id SET DEFAULT nextval('sales_categories_id_seq'::regclass);
      `);
      console.log('✅ Updated sequence default');
    } catch (err) {
      console.log('ℹ️  Sequence default update skipped');
    }
    
  } catch (error) {
    console.error('❌ Error renaming table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

renameTable();

