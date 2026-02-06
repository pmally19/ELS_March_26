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

async function createSalesDocumentCategoriesTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sales_document_categories'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create table
      await client.query(`
        CREATE TABLE sales_document_categories (
          id BIGSERIAL PRIMARY KEY,
          category_code VARCHAR(10) UNIQUE NOT NULL,
          category_name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT NOT NULL,
          delivery_relevant BOOLEAN NOT NULL DEFAULT false,
          billing_relevant BOOLEAN NOT NULL DEFAULT false,
          pricing_required BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `);
      console.log('✅ Sales document categories table created');

      // Create indexes
      await client.query(`
        CREATE INDEX idx_sales_document_categories_code ON sales_document_categories(category_code);
        CREATE INDEX idx_sales_document_categories_name ON sales_document_categories(category_name);
      `);
      console.log('✅ Indexes created');

      // Create trigger function to auto-update updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_sales_document_categories_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create trigger
      await client.query(`
        CREATE TRIGGER update_sales_document_categories_updated_at
        BEFORE UPDATE ON sales_document_categories
        FOR EACH ROW
        EXECUTE FUNCTION update_sales_document_categories_updated_at();
      `);
      console.log('✅ Trigger created for auto-updating updated_at');

      // Insert default categories based on SAP standards
      await client.query(`
        INSERT INTO sales_document_categories (category_code, category_name, description, delivery_relevant, billing_relevant, pricing_required) VALUES
        ('A', 'Inquiry', 'Customer inquiry for products or services', false, false, true),
        ('B', 'Quotation', 'Price quotation for customer', false, false, true),
        ('C', 'Order', 'Standard sales order', true, true, true),
        ('D', 'Returns', 'Customer returns and refunds', true, true, false),
        ('E', 'Credit Memo', 'Credit memo for customer', false, true, false),
        ('F', 'Debit Memo', 'Debit memo for customer', false, true, false),
        ('G', 'Contract', 'Sales contract agreement', false, false, true),
        ('H', 'Scheduling Agreement', 'Scheduling agreement for deliveries', true, false, true)
        ON CONFLICT (category_code) DO NOTHING;
      `);
      console.log('✅ Default sales document categories inserted');
    } else {
      console.log('✅ Sales document categories table already exists');
    }

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating sales document categories table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSalesDocumentCategoriesTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

