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

async function addSalesDocumentCategoriesData() {
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
      console.error('❌ Table sales_document_categories does not exist. Please create it first.');
      process.exit(1);
    }

    // Check if data already exists
    const countResult = await client.query(`
      SELECT COUNT(*) FROM sales_document_categories;
    `);
    const existingCount = parseInt(countResult.rows[0].count);

    if (existingCount > 0) {
      console.log(`✅ Sales document categories table already has ${existingCount} records.`);
      console.log('Adding additional useful categories...');
      
      // Add additional useful categories that don't conflict with existing ones
      await client.query(`
        INSERT INTO sales_document_categories (category_code, category_name, description, delivery_relevant, billing_relevant, pricing_required)
        VALUES
        ('I', 'Invoice', 'Direct invoice document category', FALSE, TRUE, TRUE),
        ('J', 'Proforma Invoice', 'Proforma invoice for customer', FALSE, FALSE, TRUE),
        ('K', 'Delivery Note', 'Delivery note document category', TRUE, FALSE, FALSE),
        ('L', 'Goods Receipt', 'Goods receipt document category', TRUE, FALSE, FALSE),
        ('M', 'Sample Request', 'Sample request document category', TRUE, FALSE, FALSE),
        ('N', 'Complaint', 'Customer complaint document category', FALSE, FALSE, FALSE)
        ON CONFLICT (category_code) DO NOTHING;
      `);
      
      const newCount = await client.query(`SELECT COUNT(*) FROM sales_document_categories;`);
      const addedCount = parseInt(newCount.rows[0].count) - existingCount;
      if (addedCount > 0) {
        console.log(`✅ Added ${addedCount} new categories`);
      } else {
        console.log('ℹ️  All additional categories already exist');
      }
    } else {
      // Insert default SAP-standard categories
      await client.query(`
        INSERT INTO sales_document_categories (category_code, category_name, description, delivery_relevant, billing_relevant, pricing_required)
        VALUES
        ('A', 'Inquiry', 'Sales inquiry document category', FALSE, FALSE, FALSE),
        ('B', 'Quotation', 'Sales quotation document category', FALSE, FALSE, TRUE),
        ('C', 'Order', 'Sales order document category', TRUE, TRUE, TRUE),
        ('D', 'Returns', 'Sales returns document category', TRUE, TRUE, FALSE),
        ('E', 'Credit Memo', 'Sales credit memo request document category', FALSE, TRUE, FALSE),
        ('F', 'Debit Memo', 'Sales debit memo request document category', FALSE, TRUE, FALSE),
        ('G', 'Contract', 'Sales contract document category', FALSE, FALSE, TRUE),
        ('H', 'Scheduling Agreement', 'Sales scheduling agreement document category', TRUE, TRUE, TRUE),
        ('I', 'Invoice', 'Direct invoice document category', FALSE, TRUE, TRUE),
        ('J', 'Proforma Invoice', 'Proforma invoice for customer', FALSE, FALSE, TRUE),
        ('K', 'Delivery Note', 'Delivery note document category', TRUE, FALSE, FALSE),
        ('L', 'Goods Receipt', 'Goods receipt document category', TRUE, FALSE, FALSE),
        ('M', 'Sample Request', 'Sample request document category', TRUE, FALSE, FALSE),
        ('N', 'Complaint', 'Customer complaint document category', FALSE, FALSE, FALSE)
        ON CONFLICT (category_code) DO NOTHING;
      `);
      console.log('✅ Default sales document categories inserted successfully');
    }

    // Display all categories
    const result = await client.query(`
      SELECT 
        id,
        category_code,
        category_name,
        description,
        delivery_relevant,
        billing_relevant,
        pricing_required
      FROM sales_document_categories
      ORDER BY category_code;
    `);

    console.log('\n📋 Current Sales Document Categories:');
    console.log('─'.repeat(100));
    result.rows.forEach((row) => {
      console.log(`  ${row.category_code} - ${row.category_name}`);
      console.log(`    Description: ${row.description}`);
      console.log(`    Delivery: ${row.delivery_relevant ? 'Yes' : 'No'} | Billing: ${row.billing_relevant ? 'Yes' : 'No'} | Pricing: ${row.pricing_required ? 'Yes' : 'No'}`);
      console.log('');
    });
    console.log(`Total: ${result.rows.length} categories`);

    await client.query('COMMIT');
    console.log('✅ Data insertion completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding sales document categories data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSalesDocumentCategoriesData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

