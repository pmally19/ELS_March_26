import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function checkCompanyCodes() {
  try {
    console.log('🔍 Checking for Company Codes...\n');
    
    // Check if company_codes table exists and has data
    const result = await pool.query(`
      SELECT code, name 
      FROM company_codes 
      LIMIT 10
    `);
    
    console.log(`📊 Found ${result.rows.length} company codes:`);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.code} - ${row.name}`);
    });
    
    if (result.rows.length === 0) {
      console.log('\n⚠️  No company codes found. Company currency settings require company codes to exist first.');
      console.log('   Company codes can be created through the Company Code master data module.');
    }
    
    return result.rows;
    
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('⚠️  company_codes table does not exist yet.');
      return [];
    }
    console.error('❌ Error:', error.message);
    return [];
  } finally {
    await pool.end();
  }
}

checkCompanyCodes().catch(console.error);

