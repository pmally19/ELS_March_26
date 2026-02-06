import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function createCustomerTypesTable() {
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
    console.log('🔄 Starting migration: Create customer_types table...');
    client = await pool.connect();

    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_types'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table customer_types already exists. Skipping creation.');
      return;
    }

    console.log('📝 Creating customer_types table...');
    await client.query(`
      CREATE TABLE customer_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        requires_tax_id BOOLEAN DEFAULT false,
        requires_registration BOOLEAN DEFAULT false,
        default_payment_terms VARCHAR(10),
        default_credit_limit DECIMAL(15, 2),
        default_currency VARCHAR(3),
        business_rules JSONB,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER,
        updated_by INTEGER
      );
    `);

    console.log('📝 Creating indexes...');
    await client.query(`
      CREATE INDEX idx_customer_types_code ON customer_types(code);
      CREATE INDEX idx_customer_types_is_active ON customer_types(is_active);
      CREATE INDEX idx_customer_types_category ON customer_types(category);
    `);

    console.log('✅ Successfully created customer_types table!');
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

createCustomerTypesTable().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

