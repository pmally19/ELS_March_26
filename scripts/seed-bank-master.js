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

// Sample bank master data
const sampleBanks = [
  {
    bank_key: 'BNK001',
    bank_name: 'First National Bank',
    bank_number: '123456789',
    swift_code: 'FNBKUS33',
    country_code: 'US',
    region: 'North America',
    city: 'New York',
    address: '123 Main Street, New York, NY 10001',
    api_endpoint: 'https://api.fnb.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK002',
    bank_name: 'Chase Bank',
    bank_number: '987654321',
    swift_code: 'CHASUS33',
    country_code: 'US',
    region: 'North America',
    city: 'Chicago',
    address: '456 Oak Avenue, Chicago, IL 60601',
    api_endpoint: 'https://api.chase.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK003',
    bank_name: 'Bank of America',
    bank_number: '555123456',
    swift_code: 'BOFAUS3N',
    country_code: 'US',
    region: 'North America',
    city: 'San Francisco',
    address: '789 Market Street, San Francisco, CA 94102',
    api_endpoint: 'https://api.bofa.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK004',
    bank_name: 'Wells Fargo Bank',
    bank_number: '111222333',
    swift_code: 'WFBIUS6S',
    country_code: 'US',
    region: 'North America',
    city: 'Los Angeles',
    address: '321 Broadway, Los Angeles, CA 90012',
    api_endpoint: 'https://api.wellsfargo.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK005',
    bank_name: 'Citibank',
    bank_number: '444555666',
    swift_code: 'CITIUS33',
    country_code: 'US',
    region: 'North America',
    city: 'New York',
    address: '555 Park Avenue, New York, NY 10022',
    api_endpoint: 'https://api.citibank.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK006',
    bank_name: 'HSBC Bank',
    bank_number: '777888999',
    swift_code: 'HSBCUS33',
    country_code: 'US',
    region: 'North America',
    city: 'New York',
    address: '1 HSBC Center, New York, NY 10001',
    api_endpoint: 'https://api.hsbc.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK007',
    bank_name: 'Deutsche Bank',
    bank_number: '222333444',
    swift_code: 'DEUTUS33',
    country_code: 'US',
    region: 'North America',
    city: 'New York',
    address: '60 Wall Street, New York, NY 10005',
    api_endpoint: 'https://api.deutschebank.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK008',
    bank_name: 'Barclays Bank',
    bank_number: '666777888',
    swift_code: 'BARCUS33',
    country_code: 'US',
    region: 'North America',
    city: 'New York',
    address: '745 Seventh Avenue, New York, NY 10019',
    api_endpoint: 'https://api.barclays.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK009',
    bank_name: 'JPMorgan Chase',
    bank_number: '999000111',
    swift_code: 'CHASUS33',
    country_code: 'US',
    region: 'North America',
    city: 'New York',
    address: '270 Park Avenue, New York, NY 10017',
    api_endpoint: 'https://api.jpmorgan.com/v1',
    is_active: true
  },
  {
    bank_key: 'BNK010',
    bank_name: 'Goldman Sachs Bank',
    bank_number: '333444555',
    swift_code: 'GSBAUS33',
    country_code: 'US',
    region: 'North America',
    city: 'New York',
    address: '200 West Street, New York, NY 10282',
    api_endpoint: 'https://api.goldmansachs.com/v1',
    is_active: true
  }
];

async function seedBankMaster() {
  const client = await pool.connect();
  
  try {
    console.log('Starting bank master data seeding...');
    
    // Check if data already exists
    const checkResult = await client.query('SELECT COUNT(*) as count FROM bank_master');
    const existingCount = parseInt(checkResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`Bank master table already has ${existingCount} records.`);
      console.log('Skipping seed to avoid duplicates. Delete existing records first if you want to reseed.');
      return;
    }
    
    // Insert sample banks
    for (const bank of sampleBanks) {
      await client.query(`
        INSERT INTO bank_master (
          bank_key,
          bank_name,
          bank_number,
          swift_code,
          country_code,
          region,
          city,
          address,
          api_endpoint,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `, [
        bank.bank_key,
        bank.bank_name,
        bank.bank_number,
        bank.swift_code,
        bank.country_code,
        bank.region,
        bank.city,
        bank.address,
        bank.api_endpoint,
        bank.is_active
      ]);
      
      console.log(`✓ Inserted bank: ${bank.bank_key} - ${bank.bank_name}`);
    }
    
    console.log(`\n✅ Successfully seeded ${sampleBanks.length} bank master records!`);
    
  } catch (error) {
    console.error('❌ Error seeding bank master data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed function
seedBankMaster()
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

