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

async function seedAccountId() {
  const client = await pool.connect();
  
  try {
    console.log('Starting account ID master data seeding...\n');
    
    // Get bank masters and company codes from database
    const bankResult = await client.query('SELECT id, bank_key, bank_name FROM bank_master WHERE is_active = true LIMIT 5');
    const companyResult = await client.query('SELECT id, code, name FROM company_codes LIMIT 3');
    
    const banks = bankResult.rows;
    const companies = companyResult.rows;
    
    if (banks.length === 0) {
      console.log('⚠️  No active banks found. Please create bank master records first.');
      return;
    }
    
    // Check if data already exists
    const checkResult = await client.query('SELECT COUNT(*) as count FROM account_id_master');
    const existingCount = parseInt(checkResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`Account ID master table already has ${existingCount} records.`);
      console.log('Skipping seed to avoid duplicates. Delete existing records first if you want to reseed.');
      return;
    }
    
    // Generate sample account IDs
    const accountTypes = ['checking', 'savings', 'money-market'];
    const currencies = ['USD', 'EUR', 'GBP'];
    
    const sampleAccountIds = [];
    let accountCounter = 1;
    
    // Create account IDs for each bank
    for (const bank of banks) {
      for (let i = 0; i < 2; i++) {
        const accountType = accountTypes[i % accountTypes.length];
        const currency = currencies[i % currencies.length];
        const company = companies.length > 0 ? companies[i % companies.length] : null;
        
        sampleAccountIds.push({
          account_id: `ACC${String(accountCounter).padStart(3, '0')}`,
          description: `${bank.bank_name} ${accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account`,
          bank_master_id: bank.id,
          company_code_id: company ? company.id : null,
          account_number: `${1000000000 + accountCounter}`,
          account_type: accountType,
          currency: currency,
          is_active: true
        });
        
        accountCounter++;
      }
    }
    
    // Insert sample account IDs
    for (const account of sampleAccountIds) {
      await client.query(`
        INSERT INTO account_id_master (
          account_id,
          description,
          bank_master_id,
          company_code_id,
          account_number,
          account_type,
          currency,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        account.account_id,
        account.description,
        account.bank_master_id,
        account.company_code_id,
        account.account_number,
        account.account_type,
        account.currency,
        account.is_active
      ]);
      
      console.log(`✓ Inserted account ID: ${account.account_id} - ${account.description}`);
    }
    
    console.log(`\n✅ Successfully seeded ${sampleAccountIds.length} account ID records!`);
    
  } catch (error) {
    console.error('❌ Error seeding account ID data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed function
seedAccountId()
  .then(() => {
    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

