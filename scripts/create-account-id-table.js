import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function createAccountIdTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating account_id_master table...\n');
    
    // Check if table already exists
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'account_id_master'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  Table account_id_master already exists!');
      console.log('Skipping creation to avoid conflicts.');
      return;
    }
    
    await client.query('BEGIN');
    
    // Create the table
    console.log('1. Creating account_id_master table...');
    await client.query(`
      CREATE TABLE account_id_master (
        id SERIAL PRIMARY KEY,
        account_id VARCHAR(10) NOT NULL UNIQUE,
        description VARCHAR(100) NOT NULL,
        bank_master_id INTEGER,
        company_code_id INTEGER,
        account_number VARCHAR(50),
        account_type VARCHAR(20) DEFAULT 'checking',
        currency VARCHAR(3) DEFAULT 'USD',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Table created');
    
    // Add foreign key to bank_master
    console.log('2. Adding foreign key to bank_master...');
    await client.query(`
      ALTER TABLE account_id_master
      ADD CONSTRAINT fk_account_id_bank_master 
      FOREIGN KEY (bank_master_id) 
      REFERENCES bank_master(id)
      ON DELETE SET NULL
    `);
    console.log('   ✓ Foreign key to bank_master added');
    
    // Add foreign key to company_codes
    console.log('3. Adding foreign key to company_codes...');
    await client.query(`
      ALTER TABLE account_id_master
      ADD CONSTRAINT fk_account_id_company_code 
      FOREIGN KEY (company_code_id) 
      REFERENCES company_codes(id)
      ON DELETE SET NULL
    `);
    console.log('   ✓ Foreign key to company_codes added');
    
    // Create indexes
    console.log('4. Creating indexes...');
    await client.query(`
      CREATE INDEX idx_account_id_master_account_id ON account_id_master(account_id)
    `);
    await client.query(`
      CREATE INDEX idx_account_id_master_bank_master_id ON account_id_master(bank_master_id)
    `);
    await client.query(`
      CREATE INDEX idx_account_id_master_company_code_id ON account_id_master(company_code_id)
    `);
    await client.query(`
      CREATE INDEX idx_account_id_master_is_active ON account_id_master(is_active)
    `);
    console.log('   ✓ Indexes created');
    
    // Add comments
    console.log('5. Adding table comments...');
    await client.query(`
      COMMENT ON TABLE account_id_master IS 'Master data for account identifiers used in payment processing'
    `);
    await client.query(`
      COMMENT ON COLUMN account_id_master.account_id IS 'Unique account identifier code'
    `);
    await client.query(`
      COMMENT ON COLUMN account_id_master.bank_master_id IS 'Reference to bank_master.id for bank association'
    `);
    await client.query(`
      COMMENT ON COLUMN account_id_master.company_code_id IS 'Reference to company_codes.id for multi-company support'
    `);
    console.log('   ✓ Comments added');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully created account_id_master table!');
    
    // Verify the table was created
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'account_id_master'
      ORDER BY ordinal_position
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('\nTable Structure:');
      console.log('───────────────────────────────────────────────────────────────');
      verifyResult.rows.forEach((col) => {
        console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
      });
      console.log('───────────────────────────────────────────────────────────────');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating table:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
createAccountIdTable()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

