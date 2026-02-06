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

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating global currencies tables...');
    
    // Run main migration
    const mainSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-global-currencies-tables.sql'),
      'utf8'
    );
    await client.query(mainSQL);
    console.log('✅ Created global_currencies, daily_exchange_rates, and company_currency_settings tables');
    
    // Run history table migration
    const historySQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-exchange-rate-update-history-table.sql'),
      'utf8'
    );
    await client.query(historySQL);
    console.log('✅ Created exchange_rate_update_history table');
    
    console.log('\n✅ All currency tables created successfully without default values!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);

