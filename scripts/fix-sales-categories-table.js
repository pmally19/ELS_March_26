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

async function fixSalesCategoriesTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Add code column as nullable first
    console.log('🔧 Step 1: Adding code column...');
    await client.query(`
      ALTER TABLE sales_categories 
      ADD COLUMN IF NOT EXISTS code VARCHAR(50);
    `);

    // Step 2: Generate codes for existing rows
    console.log('🔧 Step 2: Generating codes for existing rows...');
    const existingRows = await client.query('SELECT id, name FROM sales_categories WHERE code IS NULL');
    
    for (const row of existingRows.rows) {
      // Generate code from name (uppercase, remove spaces, limit to 50 chars)
      let code = row.name.toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 20);
      
      // If code is empty or too short, use ID-based code
      if (!code || code.length < 2) {
        code = `CAT${row.id}`;
      }
      
      // Ensure uniqueness by appending ID if needed
      const checkUnique = await client.query('SELECT COUNT(*) FROM sales_categories WHERE code = $1', [code]);
      if (parseInt(checkUnique.rows[0].count) > 0) {
        code = `${code}${row.id}`;
      }
      
      await client.query('UPDATE sales_categories SET code = $1 WHERE id = $2', [code, row.id]);
      console.log(`  ✅ Updated row ${row.id} with code: ${code}`);
    }

    // Step 3: Make code NOT NULL and add unique constraint
    console.log('🔧 Step 3: Making code NOT NULL and unique...');
    await client.query(`
      ALTER TABLE sales_categories 
      ALTER COLUMN code SET NOT NULL;
    `);
    
    // Drop existing unique constraint if it exists
    await client.query(`
      ALTER TABLE sales_categories 
      DROP CONSTRAINT IF EXISTS sales_categories_code_unique;
    `);
    
    await client.query(`
      ALTER TABLE sales_categories 
      ADD CONSTRAINT sales_categories_code_unique UNIQUE (code);
    `);

    // Step 4: Add is_active column if it doesn't exist (for compatibility)
    console.log('🔧 Step 4: Adding is_active column for compatibility...');
    await client.query(`
      ALTER TABLE sales_categories 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
    `);

    // Step 5: Sync active and is_active columns
    console.log('🔧 Step 5: Syncing active and is_active columns...');
    await client.query(`
      UPDATE sales_categories 
      SET is_active = COALESCE(active, true)
      WHERE is_active IS NULL;
    `);

    // Step 6: Add sample data if needed
    console.log('🔧 Step 6: Checking if more sample data is needed...');
    const count = await client.query('SELECT COUNT(*) FROM sales_categories');
    const currentCount = parseInt(count.rows[0].count);
    
    if (currentCount < 10) {
      const sampleData = [
        { code: 'STANDARD', name: 'Standard', description: 'Standard sales category for regular products and services', is_active: true },
        { code: 'PROMOTIONAL', name: 'Promotional', description: 'Promotional sales category for special offers and discounts', is_active: true },
        { code: 'BULK', name: 'Bulk', description: 'Bulk sales category for large quantity orders', is_active: true },
        { code: 'RETAIL', name: 'Retail', description: 'Retail sales category for consumer products', is_active: true },
        { code: 'WHOLESALE', name: 'Wholesale', description: 'Wholesale sales category for business-to-business transactions', is_active: true },
        { code: 'ONLINE', name: 'Online', description: 'Online sales category for e-commerce transactions', is_active: true },
        { code: 'DIRECT', name: 'Direct', description: 'Direct sales category for direct customer sales', is_active: true },
        { code: 'INDIRECT', name: 'Indirect', description: 'Indirect sales category for channel partner sales', is_active: true },
        { code: 'SERVICE', name: 'Service', description: 'Service sales category for service-based offerings', is_active: true },
        { code: 'PRODUCT', name: 'Product', description: 'Product sales category for physical goods', is_active: true }
      ];

      for (const item of sampleData) {
        // Check if code already exists
        const exists = await client.query('SELECT COUNT(*) FROM sales_categories WHERE code = $1', [item.code]);
        if (parseInt(exists.rows[0].count) === 0) {
          await client.query(`
            INSERT INTO sales_categories (code, name, description, is_active, active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [item.code, item.name, item.description, item.is_active]);
          console.log(`  ✅ Inserted: ${item.code} - ${item.name}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Sales categories table fixed successfully!');
    
    // Show final structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'sales_categories'
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 Final Table Structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Show sample data
    const data = await client.query('SELECT id, code, name, description, is_active, active FROM sales_categories ORDER BY id LIMIT 10');
    console.log('\n📊 Sample Data:');
    data.rows.forEach(row => {
      console.log(`  ${row.id}. [${row.code}] ${row.name} - Active: ${row.is_active || row.active}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing sales categories table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSalesCategoriesTable()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

