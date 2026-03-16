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

async function makeCompanyCodeRequired() {
  const client = await pool.connect();
  
  try {
    console.log('Making company_code_id required in account_id_master...\n');
    
    await client.query('BEGIN');
    
    // Check if there are any NULL company_code_id records
    const nullCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM account_id_master 
      WHERE company_code_id IS NULL
    `);
    
    const nullCount = parseInt(nullCheck.rows[0].count);
    
    if (nullCount > 0) {
      console.log(`⚠️  Found ${nullCount} records with NULL company_code_id.`);
      console.log('Updating them to use company code from associated bank master...');
      
      // Update NULL company_code_id from bank_master
      await client.query(`
        UPDATE account_id_master ai
        SET company_code_id = bm.company_code_id
        FROM bank_master bm
        WHERE ai.bank_master_id = bm.id
          AND ai.company_code_id IS NULL
          AND bm.company_code_id IS NOT NULL
      `);
      
      // Check remaining NULLs
      const remainingNulls = await client.query(`
        SELECT COUNT(*) as count 
        FROM account_id_master 
        WHERE company_code_id IS NULL
      `);
      
      const remainingCount = parseInt(remainingNulls.rows[0].count);
      
      if (remainingCount > 0) {
        console.log(`⚠️  ${remainingCount} records still have NULL company_code_id.`);
        console.log('These records will need manual assignment before making the field required.');
        await client.query('ROLLBACK');
        return;
      }
    }
    
    // Make company_code_id NOT NULL
    console.log('Making company_code_id NOT NULL...');
    await client.query(`
      ALTER TABLE account_id_master
      ALTER COLUMN company_code_id SET NOT NULL
    `);
    console.log('   ✓ Company code is now required');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully made company_code_id required!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
makeCompanyCodeRequired()
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

