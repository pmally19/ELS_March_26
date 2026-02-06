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

async function insertSampleExchangeRates() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inserting sample exchange rates...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const exchangeRates = [
      { from: 'USD', to: 'EUR', rate: 0.9200, source: 'Federal Reserve' },
      { from: 'USD', to: 'GBP', rate: 0.7900, source: 'Federal Reserve' },
      { from: 'USD', to: 'INR', rate: 83.0000, source: 'Federal Reserve' },
      { from: 'USD', to: 'JPY', rate: 150.0000, source: 'Federal Reserve' },
      { from: 'USD', to: 'CNY', rate: 7.2000, source: 'Federal Reserve' },
      { from: 'USD', to: 'AUD', rate: 1.5200, source: 'Federal Reserve' },
      { from: 'USD', to: 'CAD', rate: 1.3500, source: 'Federal Reserve' },
      { from: 'USD', to: 'CHF', rate: 0.8800, source: 'Federal Reserve' },
      { from: 'USD', to: 'SGD', rate: 1.3400, source: 'Federal Reserve' },
      { from: 'USD', to: 'HKD', rate: 7.8000, source: 'Federal Reserve' },
      { from: 'EUR', to: 'GBP', rate: 0.8587, source: 'European Central Bank' },
      { from: 'EUR', to: 'INR', rate: 90.2174, source: 'European Central Bank' },
      { from: 'GBP', to: 'INR', rate: 105.0633, source: 'Bank of England' },
      { from: 'INR', to: 'JPY', rate: 1.8072, source: 'Reserve Bank of India' },
      { from: 'EUR', to: 'JPY', rate: 163.0435, source: 'European Central Bank' }
    ];
    
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const rate of exchangeRates) {
      try {
        const result = await client.query(`
          INSERT INTO daily_exchange_rates (
            rate_date, from_currency, to_currency, exchange_rate, 
            rate_type, rate_source, is_official, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (rate_date, from_currency, to_currency, rate_type)
          DO UPDATE SET
            exchange_rate = EXCLUDED.exchange_rate,
            rate_source = EXCLUDED.rate_source,
            is_official = EXCLUDED.is_official,
            updated_at = CURRENT_TIMESTAMP
          RETURNING (xmax = 0) AS inserted
        `, [
          today,
          rate.from,
          rate.to,
          rate.rate,
          'spot',
          rate.source,
          true
        ]);
        
        if (result.rows[0].inserted) {
          insertedCount++;
          console.log(`✅ Inserted ${rate.from} → ${rate.to}: ${rate.rate}`);
        } else {
          updatedCount++;
          console.log(`🔄 Updated ${rate.from} → ${rate.to}: ${rate.rate}`);
        }
      } catch (error) {
        console.error(`❌ Error inserting ${rate.from} → ${rate.to}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Exchange rates insertion complete!`);
    console.log(`   - Inserted: ${insertedCount} rates`);
    console.log(`   - Updated: ${updatedCount} rates`);
    console.log(`   - Total: ${exchangeRates.length} rates`);
    
    // Verify the data
    const verifyResult = await client.query(`
      SELECT 
        from_currency, 
        to_currency, 
        exchange_rate, 
        rate_date, 
        rate_source
      FROM daily_exchange_rates 
      WHERE rate_date = $1
      ORDER BY from_currency, to_currency
    `, [today]);
    
    console.log(`\n📊 Total exchange rates in database for ${today}: ${verifyResult.rows.length}`);
    console.log('\n📋 Exchange Rates List:');
    verifyResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.from_currency} → ${row.to_currency}: ${row.exchange_rate} (${row.rate_source})`);
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

insertSampleExchangeRates().catch(console.error);

