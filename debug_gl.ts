import { pool } from './server/db.js';

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, account_number, account_name FROM gl_accounts WHERE account_number IN ('505000', '145000')
    `);
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
