import pg from 'pg';
const { Pool } = pg;

// Create a direct database connection for migration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log('Adding reference column to billing_documents...');
    await client.query(`
      ALTER TABLE billing_documents 
      ADD COLUMN IF NOT EXISTS reference VARCHAR(255)
    `);
    
    console.log('Adding company_code_id column to billing_documents...');
    await client.query(`
      ALTER TABLE billing_documents 
      ADD COLUMN IF NOT EXISTS company_code_id INTEGER
    `);
    
    console.log('Creating index on company_code_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_documents_company_code_id 
      ON billing_documents(company_code_id)
    `);
    
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

