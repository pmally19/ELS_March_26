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

async function addSalesDocumentCategoryToSDDocumentTypes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'sd_document_types'
        AND column_name = 'sales_document_category_id'
      );
    `);

    if (columnCheck.rows[0].exists) {
      console.log('✅ Column sales_document_category_id already exists');
    } else {
      // Add the new column
      await client.query(`
        ALTER TABLE sd_document_types
        ADD COLUMN sales_document_category_id BIGINT;
      `);
      console.log('✅ Added sales_document_category_id column');

      // Add foreign key constraint
      await client.query(`
        ALTER TABLE sd_document_types
        ADD CONSTRAINT fk_sd_document_types_sales_document_category
        FOREIGN KEY (sales_document_category_id)
        REFERENCES sales_document_categories(id)
        ON DELETE SET NULL;
      `);
      console.log('✅ Added foreign key constraint');

      // Create index for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sd_document_types_sales_document_category_id
        ON sd_document_types(sales_document_category_id);
      `);
      console.log('✅ Created index');
    }

    // Map existing category values to sales document categories
    // ORDER -> C (Order)
    // DELIVERY -> K (Delivery Note) or H (Scheduling Agreement)
    // BILLING -> I (Invoice) or E (Credit Memo) or F (Debit Memo)
    
    const categoryMappings = {
      'ORDER': 'C', // Order
      'DELIVERY': 'K', // Delivery Note
      'BILLING': 'I' // Invoice
    };

    // Get sales document category IDs
    const categoryIds = {};
    for (const [oldCategory, categoryCode] of Object.entries(categoryMappings)) {
      const result = await client.query(`
        SELECT id FROM sales_document_categories WHERE category_code = $1
      `, [categoryCode]);
      
      if (result.rows.length > 0) {
        categoryIds[oldCategory] = result.rows[0].id;
      }
    }

    // Update existing records based on category field
    for (const [oldCategory, categoryId] of Object.entries(categoryIds)) {
      const updateResult = await client.query(`
        UPDATE sd_document_types
        SET sales_document_category_id = $1
        WHERE category = $2
        AND sales_document_category_id IS NULL
      `, [categoryId, oldCategory]);
      
      console.log(`✅ Updated ${updateResult.rowCount} records with category '${oldCategory}' to use sales_document_category_id ${categoryId}`);
    }

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSalesDocumentCategoryToSDDocumentTypes()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

