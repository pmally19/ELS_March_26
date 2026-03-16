import { pool } from './server/db.js';

async function check() {
  const q = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stock_balances'`;
  const res = await pool.query(q);
  const matched = res.rows.filter(r => 
    r.column_name.includes('price') || 
    r.column_name === 'cost' || 
    r.column_name.includes('standard') ||
    r.column_name.includes('valuation') ||
    r.column_name.includes('control')
  );
  console.log('stock_balances:', matched);
  process.exit(0);
}
check();
