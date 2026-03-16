import { pool } from './server/db.js';

async function check() {
  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'materials' AND column_name LIKE '%valuation%'`);
  console.log(res.rows);
  process.exit(0);
}
check();
