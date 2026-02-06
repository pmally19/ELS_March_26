import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function insertCurrencies() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inserting global currencies data...');
    
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, active: true, hard: true, country: 'US', source: 'Federal Reserve', rate: 1.0000 },
      { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, active: true, hard: true, country: 'EU', source: 'European Central Bank', rate: 0.9200 },
      { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, active: true, hard: true, country: 'GB', source: 'Bank of England', rate: 0.7900 },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, active: true, hard: true, country: 'JP', source: 'Bank of Japan', rate: 150.0000 },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, active: true, hard: true, country: 'CN', source: 'People\'s Bank of China', rate: 7.2000 },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, active: true, hard: false, country: 'IN', source: 'Reserve Bank of India', rate: 83.0000 },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, active: true, hard: true, country: 'AU', source: 'Reserve Bank of Australia', rate: 1.5200 },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, active: true, hard: true, country: 'CA', source: 'Bank of Canada', rate: 1.3500 },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, active: true, hard: true, country: 'CH', source: 'Swiss National Bank', rate: 0.8800 },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, active: true, hard: true, country: 'SG', source: 'Monetary Authority of Singapore', rate: 1.3400 },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, active: true, hard: true, country: 'HK', source: 'Hong Kong Monetary Authority', rate: 7.8000 },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, active: true, hard: true, country: 'NZ', source: 'Reserve Bank of New Zealand', rate: 1.6200 },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2, active: true, hard: false, country: 'SE', source: 'Sveriges Riksbank', rate: 10.5000 },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, active: true, hard: false, country: 'NO', source: 'Norges Bank', rate: 10.8000 },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2, active: true, hard: false, country: 'DK', source: 'Danmarks Nationalbank', rate: 6.8500 }
    ];
    
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const currency of currencies) {
      try {
        const result = await client.query(`
          INSERT INTO global_currencies (
            currency_code, 
            currency_name, 
            currency_symbol, 
            decimal_places, 
            is_active, 
            is_hard_currency, 
            iso_country_code, 
            central_bank_rate_source, 
            current_usd_rate, 
            last_rate_update, 
            created_at, 
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (currency_code) DO NOTHING
          RETURNING currency_code
        `, [
          currency.code,
          currency.name,
          currency.symbol,
          currency.decimals,
          currency.active,
          currency.hard,
          currency.country,
          currency.source,
          currency.rate
        ]);
        
        if (result.rows.length > 0) {
          insertedCount++;
          console.log(`✅ Inserted ${currency.code} - ${currency.name}`);
        } else {
          skippedCount++;
          console.log(`ℹ️  ${currency.code} already exists (skipped)`);
        }
      } catch (error) {
        console.error(`❌ Error inserting ${currency.code}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Currency data insertion complete!`);
    console.log(`   - Inserted: ${insertedCount} currencies`);
    console.log(`   - Skipped (already exist): ${skippedCount} currencies`);
    
    // Verify the data
    const verifyResult = await client.query(`
      SELECT currency_code, currency_name, currency_symbol, is_active, is_hard_currency, current_usd_rate
      FROM global_currencies 
      ORDER BY currency_code
    `);
    
    console.log(`\n📊 Total currencies in database: ${verifyResult.rows.length}`);
    console.log('\n📋 Currency List:');
    verifyResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.currency_code} - ${row.currency_name} (${row.currency_symbol}) - ${row.is_hard_currency ? 'Hard' : 'Regional'} - Rate: ${row.current_usd_rate}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Insert failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertCurrencies().catch(console.error);
