import pkg from 'pg';
const { Pool } = pkg;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
};

const pool = new Pool(dbConfig);

async function createPeriodEndClosingTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'period_end_closing'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table period_end_closing already exists. Skipping creation.');
      await client.query('COMMIT');
      return;
    }

    // Create period_end_closing table
    await client.query(`
      CREATE TABLE period_end_closing (
        id SERIAL PRIMARY KEY,
        fiscal_period_id INTEGER,
        company_code_id INTEGER REFERENCES company_codes(id),
        year INTEGER NOT NULL,
        period INTEGER NOT NULL,
        closing_date TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        closing_type VARCHAR(20),
        description TEXT,
        notes TEXT,
        validated_entries INTEGER DEFAULT 0,
        unbalanced_entries INTEGER DEFAULT 0,
        total_debits DECIMAL(15, 2) DEFAULT 0.00,
        total_credits DECIMAL(15, 2) DEFAULT 0.00,
        closing_document_number VARCHAR(50),
        started_by INTEGER,
        completed_by INTEGER,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_period_end_closing_fiscal_period ON period_end_closing(fiscal_period_id);
      CREATE INDEX IF NOT EXISTS idx_period_end_closing_company_code ON period_end_closing(company_code_id);
      CREATE INDEX IF NOT EXISTS idx_period_end_closing_year_period ON period_end_closing(year, period);
      CREATE INDEX IF NOT EXISTS idx_period_end_closing_status ON period_end_closing(status);
      CREATE INDEX IF NOT EXISTS idx_period_end_closing_closing_type ON period_end_closing(closing_type);
    `);

    await client.query('COMMIT');
    console.log('✅ Successfully created period_end_closing table with indexes');

    // Verify table creation
    const verifyQuery = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'period_end_closing'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Table structure:');
    verifyQuery.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? '[nullable]' : '[required]'}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating period_end_closing table:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
createPeriodEndClosingTable().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

