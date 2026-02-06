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

async function cleanupRates() {
  try {
    console.log('🧹 Cleaning up exchange rates...\n');
    
    // Remove invalid USD → USD rate
    const deleteResult = await pool.query(`
      DELETE FROM daily_exchange_rates 
      WHERE from_currency = to_currency
    `);
    console.log(`✅ Removed ${deleteResult.rowCount} invalid same-currency rates`);
    
    // Update dates to today if they're from yesterday
    const today = new Date().toISOString().split('T')[0];
    const updateResult = await pool.query(`
      UPDATE daily_exchange_rates 
      SET rate_date = $1
      WHERE rate_date < $1
    `, [today]);
    console.log(`✅ Updated ${updateResult.rowCount} rates to today's date (${today})`);
    
    // Verify final count
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM daily_exchange_rates
    `);
    console.log(`\n📊 Total Exchange Rates: ${countResult.rows[0].count}`);
    
    console.log('\n✅ Cleanup Complete!\n');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

cleanupRates().catch(console.error);

