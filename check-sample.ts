import { pool } from './server/db.js';

async function check() {
  const m = await pool.query(`SELECT code, price_control, cost, base_unit_price FROM materials LIMIT 50`);
  console.log('materials:', m.rows);
  const s = await pool.query(`SELECT material_code, moving_average_price, standard_cost FROM stock_balances WHERE moving_average_price IS NOT NULL OR standard_cost IS NOT NULL LIMIT 20`);
  console.log('stock_balances:', s.rows);
  process.exit(0);
}
check();
