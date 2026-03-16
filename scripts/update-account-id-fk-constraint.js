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

async function updateForeignKeyConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('Updating foreign key constraint for company_code_id...\n');
    
    await client.query('BEGIN');
    
    // Drop existing constraint
    console.log('1. Dropping existing foreign key constraint...');
    await client.query(`
      ALTER TABLE account_id_master
      DROP CONSTRAINT IF EXISTS fk_account_id_company_code
    `);
    console.log('   ✓ Constraint dropped');
    
    // Add new constraint with RESTRICT (since company_code_id is now required)
    console.log('2. Adding new foreign key constraint with RESTRICT...');
    await client.query(`
      ALTER TABLE account_id_master
      ADD CONSTRAINT fk_account_id_company_code 
      FOREIGN KEY (company_code_id) 
      REFERENCES company_codes(id)
      ON DELETE RESTRICT
    `);
    console.log('   ✓ New constraint added');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully updated foreign key constraint!');
    console.log('   Company code deletion will now be restricted if account IDs reference it.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
updateForeignKeyConstraint()
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

