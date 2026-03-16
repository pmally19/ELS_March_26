import { pool } from './server/db.ts';

async function checkCols() {
  const table = 'stock_balances';
  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
  console.log(`Columns for ${table}:`, res.rows.map(r => r.column_name));
  process.exit();
}

checkCols();
