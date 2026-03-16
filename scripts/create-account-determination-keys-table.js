import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function createAccountDeterminationKeysTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating account_determination_keys table...');
    
    await client.query('BEGIN');
    
    // Read and execute SQL migration
    const sqlPath = path.join(__dirname, '../database/migrations/create-account-determination-keys-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    await client.query('COMMIT');
    console.log('✅ account_determination_keys table created successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating account_determination_keys table:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAccountDeterminationKeysTable().catch(console.error);

