import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'mallyerp';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

const pool = new Pool({
  host: dbHost,
  port: parseInt(dbPort),
  database: dbName,
  user: dbUser,
  password: dbPassword,
});

async function createAssetManagementTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Update asset_master table with missing columns
    console.log('Updating asset_master table...');
    await client.query(`
      ALTER TABLE asset_master 
      ADD COLUMN IF NOT EXISTS asset_class_id INTEGER REFERENCES asset_classes(id),
      ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS net_book_value NUMERIC(18,2),
      ADD COLUMN IF NOT EXISTS value_date DATE,
      ADD COLUMN IF NOT EXISTS last_depreciation_date DATE,
      ADD COLUMN IF NOT EXISTS last_depreciation_period INTEGER,
      ADD COLUMN IF NOT EXISTS last_depreciation_year INTEGER,
      ADD COLUMN IF NOT EXISTS capitalization_date DATE,
      ADD COLUMN IF NOT EXISTS retirement_date DATE,
      ADD COLUMN IF NOT EXISTS retirement_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS retirement_revenue NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS asset_subnumber VARCHAR(10),
      ADD COLUMN IF NOT EXISTS depreciation_area_id INTEGER,
      ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
      ADD COLUMN IF NOT EXISTS fiscal_period INTEGER,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS gl_asset_account_id INTEGER REFERENCES gl_accounts(id),
      ADD COLUMN IF NOT EXISTS gl_depreciation_expense_account_id INTEGER REFERENCES gl_accounts(id),
      ADD COLUMN IF NOT EXISTS gl_accumulated_depreciation_account_id INTEGER REFERENCES gl_accounts(id);
    `);

    // 2. Create depreciation_areas table
    console.log('Creating depreciation_areas table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS depreciation_areas (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create asset_transactions table
    console.log('Creating asset_transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_transactions (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER NOT NULL REFERENCES asset_master(id),
        transaction_type VARCHAR(50) NOT NULL,
        transaction_date DATE NOT NULL,
        document_number VARCHAR(50),
        amount NUMERIC(18,2),
        description TEXT,
        from_cost_center_id INTEGER REFERENCES cost_centers(id),
        to_cost_center_id INTEGER REFERENCES cost_centers(id),
        from_company_code_id INTEGER REFERENCES company_codes(id),
        to_company_code_id INTEGER REFERENCES company_codes(id),
        from_location VARCHAR(255),
        to_location VARCHAR(255),
        retirement_method VARCHAR(50),
        retirement_revenue NUMERIC(18,2),
        gl_document_number VARCHAR(50),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_asset_transactions_asset_id ON asset_transactions(asset_id);
      CREATE INDEX IF NOT EXISTS idx_asset_transactions_type ON asset_transactions(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_asset_transactions_date ON asset_transactions(transaction_date);
    `);

    // 4. Create asset_depreciation_runs table
    console.log('Creating asset_depreciation_runs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_depreciation_runs (
        id SERIAL PRIMARY KEY,
        run_number VARCHAR(50) UNIQUE NOT NULL,
        run_date DATE NOT NULL,
        fiscal_year INTEGER NOT NULL,
        fiscal_period INTEGER NOT NULL,
        depreciation_area_id INTEGER REFERENCES depreciation_areas(id),
        company_code_id INTEGER REFERENCES company_codes(id),
        total_assets_processed INTEGER DEFAULT 0,
        total_depreciation_amount NUMERIC(18,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'PENDING',
        posted_to_gl BOOLEAN DEFAULT false,
        gl_document_number VARCHAR(50),
        run_by VARCHAR(100),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_depreciation_runs_date ON asset_depreciation_runs(run_date);
      CREATE INDEX IF NOT EXISTS idx_depreciation_runs_status ON asset_depreciation_runs(status);
    `);

    // 5. Create asset_depreciation_postings table
    console.log('Creating asset_depreciation_postings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_depreciation_postings (
        id SERIAL PRIMARY KEY,
        depreciation_run_id INTEGER NOT NULL REFERENCES asset_depreciation_runs(id),
        asset_id INTEGER NOT NULL REFERENCES asset_master(id),
        fiscal_year INTEGER NOT NULL,
        fiscal_period INTEGER NOT NULL,
        depreciation_amount NUMERIC(18,2) NOT NULL,
        accumulated_depreciation_before NUMERIC(18,2),
        accumulated_depreciation_after NUMERIC(18,2),
        net_book_value_before NUMERIC(18,2),
        net_book_value_after NUMERIC(18,2),
        gl_entry_id INTEGER REFERENCES gl_entries(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_depreciation_postings_run ON asset_depreciation_postings(depreciation_run_id);
      CREATE INDEX IF NOT EXISTS idx_depreciation_postings_asset ON asset_depreciation_postings(asset_id);
    `);

    // 6. Create asset_account_determination table
    console.log('Creating asset_account_determination table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_account_determination (
        id SERIAL PRIMARY KEY,
        asset_class_id INTEGER NOT NULL REFERENCES asset_classes(id),
        transaction_type VARCHAR(50) NOT NULL,
        account_category VARCHAR(50) NOT NULL,
        gl_account_id INTEGER NOT NULL REFERENCES gl_accounts(id),
        company_code_id INTEGER REFERENCES company_codes(id),
        is_active BOOLEAN NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        UNIQUE(asset_class_id, transaction_type, account_category, company_code_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_account_determination_class ON asset_account_determination(asset_class_id);
      CREATE INDEX IF NOT EXISTS idx_account_determination_type ON asset_account_determination(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_account_determination_category ON asset_account_determination(account_category);
      CREATE INDEX IF NOT EXISTS idx_account_determination_company ON asset_account_determination(company_code_id);
    `);

    // 7. Update net_book_value based on existing data
    console.log('Updating net_book_value for existing assets...');
    await client.query(`
      UPDATE asset_master 
      SET net_book_value = COALESCE(acquisition_cost, 0) - COALESCE(accumulated_depreciation, 0)
      WHERE net_book_value IS NULL;
    `);

    // 8. Insert default depreciation area (only if table exists with correct columns)
    console.log('Inserting default depreciation area...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'depreciation_areas'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'depreciation_areas' 
          AND column_name = 'code'
        );
      `);
      
      if (columnExists.rows[0].exists) {
        const depAreaCheck = await client.query(`
          SELECT id FROM depreciation_areas WHERE code = 'BOOK'
        `);
        if (depAreaCheck.rows.length === 0) {
          await client.query(`
            INSERT INTO depreciation_areas (code, name, description, is_active)
            VALUES ('BOOK', 'Book Depreciation', 'Standard book depreciation for financial reporting', true);
          `);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ All asset management tables created successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAssetManagementTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

