import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function addMissingCustomerColumns() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'mallyerp';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

  const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

  const pool = new Pool({
    connectionString: connectionString,
  });

  let client;
  try {
    console.log('🔄 Starting migration: Add missing columns to erp_customers table...');
    client = await pool.connect();

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'erp_customers'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Table erp_customers does not exist. Skipping migration.');
      return;
    }

    console.log('📝 Adding missing columns to erp_customers table...');
    
    // Add language_code if it doesn't exist
    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS language_code VARCHAR(2);
    `);

    // Add sales area fields
    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS sales_org_code VARCHAR(10);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS distribution_channel_code VARCHAR(5);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS division_code VARCHAR(5);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS shipping_conditions VARCHAR(4);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS delivery_priority VARCHAR(2);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS sales_district VARCHAR(6);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS sales_office_code VARCHAR(4);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS sales_group_code VARCHAR(3);
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS price_list VARCHAR(10);
    `);

    // Add reconciliation_account_code if it doesn't exist
    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS reconciliation_account_code VARCHAR(50);
    `);

    // Add tax_profile_id and tax_rule_id if they don't exist
    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS tax_profile_id INTEGER;
    `);

    await client.query(`
      ALTER TABLE erp_customers 
      ADD COLUMN IF NOT EXISTS tax_rule_id INTEGER;
    `);

    console.log('✅ Successfully added missing columns to erp_customers table!');
    console.log('✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

addMissingCustomerColumns().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

