require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to DB. Adding missing SAP fields...');
    
    await client.query(`
      ALTER TABLE fsv_items 
      ADD COLUMN IF NOT EXISTS dr_cr_shift BOOLEAN DEFAULT FALSE NOT NULL, 
      ADD COLUMN IF NOT EXISTS check_sign BOOLEAN DEFAULT FALSE NOT NULL, 
      ADD COLUMN IF NOT EXISTS display_balance BOOLEAN DEFAULT TRUE NOT NULL;
    `);
    
    console.log('Migration successful: Added dr_cr_shift, check_sign, display_balance.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

main();
