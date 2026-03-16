import pkg from 'pg';
const { Pool } = pkg;

// Database connection configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function addCompanyCodeColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding company_code_id column to bank_master table...\n');
    
    await client.query('BEGIN');
    
    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'bank_master' 
        AND column_name = 'company_code_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  Column company_code_id already exists!');
      await client.query('ROLLBACK');
      return;
    }
    
    // Add company_code_id column
    console.log('1. Adding company_code_id column...');
    await client.query(`
      ALTER TABLE bank_master 
      ADD COLUMN company_code_id INTEGER
    `);
    console.log('   ✓ Column added');
    
    // Add foreign key constraint
    console.log('2. Adding foreign key constraint...');
    await client.query(`
      ALTER TABLE bank_master
      ADD CONSTRAINT fk_bank_master_company_code 
      FOREIGN KEY (company_code_id) 
      REFERENCES company_codes(id)
      ON DELETE SET NULL
    `);
    console.log('   ✓ Foreign key constraint added');
    
    // Create index
    console.log('3. Creating index...');
    await client.query(`
      CREATE INDEX idx_bank_master_company_code_id 
      ON bank_master(company_code_id)
    `);
    console.log('   ✓ Index created');
    
    // Add comment
    console.log('4. Adding column comment...');
    await client.query(`
      COMMENT ON COLUMN bank_master.company_code_id IS 'Reference to company code for multi-company bank management'
    `);
    console.log('   ✓ Comment added');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully added company_code_id to bank_master table!');
    
    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'bank_master'
        AND column_name = 'company_code_id'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('\nVerification:');
      console.log(`  Column: ${verifyResult.rows[0].column_name}`);
      console.log(`  Type: ${verifyResult.rows[0].data_type}`);
      console.log(`  Nullable: ${verifyResult.rows[0].is_nullable}`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding column:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
addCompanyCodeColumn()
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

