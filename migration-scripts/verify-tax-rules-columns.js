import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function verifyTaxRulesColumns() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'mallyerp';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

  const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

  const pool = new Pool({
    connectionString: connectionString,
  });

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tax_rules' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in tax_rules table:');
    console.table(result.rows);
    
    const hasPostingAccount = result.rows.some(row => row.column_name === 'posting_account');
    if (hasPostingAccount) {
      console.log('\n❌ posting_account column still exists!');
    } else {
      console.log('\n✅ posting_account column successfully removed!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

verifyTaxRulesColumns();

