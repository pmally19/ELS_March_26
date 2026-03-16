import { pool } from './server/db.js';

async function main() {
  const client = await pool.connect();
  try {
    const mad = await client.query('SELECT * FROM material_account_determination LIMIT 10');
    console.log('MAD:', JSON.stringify(mad.rows, null, 2));
    const adr = await client.query('SELECT * FROM account_determination_rules LIMIT 10');
    console.log('ADR:', JSON.stringify(adr.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
