import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function addGLAccountFields() {
  const client = await pool.connect();
  try {
    console.log('Adding GL Account fields...\n');
    
    await client.query('BEGIN');
    
    // Section 1: Basic Data
    console.log('Section 1: Basic Data');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS long_text TEXT`);
    console.log('✓ Added long_text');
    
    // Section 2: Account Characteristics
    console.log('\nSection 2: Account Characteristics');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS cash_account_indicator BOOLEAN DEFAULT false`);
    console.log('✓ Added cash_account_indicator');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS mark_for_deletion BOOLEAN DEFAULT false`);
    console.log('✓ Added mark_for_deletion');
    
    // Section 3: Company Code Assignment
    console.log('\nSection 3: Company Code Assignment');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS company_code_id INTEGER`);
    console.log('✓ Added company_code_id');
    
    // Add foreign key constraint
    const constraintExists = await client.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_gl_accounts_company_code'
    `);
    if (constraintExists.rows.length === 0) {
      await client.query(`
        ALTER TABLE gl_accounts
        ADD CONSTRAINT fk_gl_accounts_company_code 
        FOREIGN KEY (company_code_id) 
        REFERENCES company_codes(id)
        ON DELETE SET NULL
      `);
      console.log('✓ Added foreign key constraint for company_code_id');
    } else {
      console.log('⚠ Foreign key constraint already exists');
    }
    
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS account_currency VARCHAR(3)`);
    console.log('✓ Added account_currency');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS field_status_group VARCHAR(4)`);
    console.log('✓ Added field_status_group');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS open_item_management BOOLEAN DEFAULT false`);
    console.log('✓ Added open_item_management');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS line_item_display BOOLEAN DEFAULT true`);
    console.log('✓ Added line_item_display');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS sort_key VARCHAR(2)`);
    console.log('✓ Added sort_key');
    
    // Section 4: Tax Settings
    console.log('\nSection 4: Tax Settings');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS tax_category VARCHAR(2)`);
    console.log('✓ Added tax_category');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS posting_without_tax_allowed BOOLEAN DEFAULT false`);
    console.log('✓ Added posting_without_tax_allowed');
    
    // Section 5: Interest Calculation
    console.log('\nSection 5: Interest Calculation');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS interest_calculation_indicator BOOLEAN DEFAULT false`);
    console.log('✓ Added interest_calculation_indicator');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS interest_calculation_frequency VARCHAR(2)`);
    console.log('✓ Added interest_calculation_frequency');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS interest_calculation_date DATE`);
    console.log('✓ Added interest_calculation_date');
    
    // Section 6: Account Relationships
    console.log('\nSection 6: Account Relationships');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS alternative_account_number VARCHAR(10)`);
    console.log('✓ Added alternative_account_number');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS group_account_number VARCHAR(10)`);
    console.log('✓ Added group_account_number');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS trading_partner VARCHAR(10)`);
    console.log('✓ Added trading_partner');
    
    // Section 8: System Fields
    console.log('\nSection 8: System Fields');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS created_by INTEGER`);
    console.log('✓ Added created_by');
    await client.query(`ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS updated_by INTEGER`);
    console.log('✓ Added updated_by');
    
    // Create indexes
    console.log('\nCreating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gl_accounts_company_code_id ON gl_accounts(company_code_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gl_accounts_account_currency ON gl_accounts(account_currency)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gl_accounts_tax_category ON gl_accounts(tax_category)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gl_accounts_alternative_account_number ON gl_accounts(alternative_account_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gl_accounts_group_account_number ON gl_accounts(group_account_number)`);
    console.log('✓ Created indexes');
    
    // Remove duplicate 'active' field
    console.log('\nCleaning up duplicate fields...');
    const activeColumnExists = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'gl_accounts' AND column_name = 'active'
    `);
    if (activeColumnExists.rows.length > 0) {
      await client.query(`ALTER TABLE gl_accounts DROP COLUMN IF EXISTS active`);
      console.log('✓ Removed duplicate active field');
    } else {
      console.log('⚠ No duplicate active field found');
    }
    
    await client.query('COMMIT');
    
    // Verify the structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'gl_accounts' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Successfully added GL Account fields!');
    console.log(`\n📊 Total fields in gl_accounts table: ${result.rows.length}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

addGLAccountFields()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

