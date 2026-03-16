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

async function initSalesCategoriesTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sales_categories'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create table
      await client.query(`
        CREATE TABLE sales_categories (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Sales categories table created');
    } else {
      console.log('✅ Sales categories table already exists');
    }

    // Check if table has data
    const dataCheck = await client.query('SELECT COUNT(*) FROM sales_categories');
    const count = parseInt(dataCheck.rows[0].count);

    if (count === 0) {
      // Insert sample data
      await client.query(`
        INSERT INTO sales_categories (code, name, description, is_active) VALUES
        ('STANDARD', 'Standard', 'Standard sales category for regular products and services', true),
        ('PROMOTIONAL', 'Promotional', 'Promotional sales category for special offers and discounts', true),
        ('BULK', 'Bulk', 'Bulk sales category for large quantity orders', true),
        ('RETAIL', 'Retail', 'Retail sales category for consumer products', true),
        ('WHOLESALE', 'Wholesale', 'Wholesale sales category for business-to-business transactions', true),
        ('ONLINE', 'Online', 'Online sales category for e-commerce transactions', true),
        ('DIRECT', 'Direct', 'Direct sales category for direct customer sales', true),
        ('INDIRECT', 'Indirect', 'Indirect sales category for channel partner sales', true),
        ('SERVICE', 'Service', 'Service sales category for service-based offerings', true),
        ('PRODUCT', 'Product', 'Product sales category for physical goods', true);
      `);
      console.log('✅ Sample data inserted into sales_categories table');
    } else {
      console.log(`✅ Sales categories table already has ${count} records`);
    }

    await client.query('COMMIT');
    console.log('✅ Sales categories table initialization completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing sales categories table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initSalesCategoriesTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

