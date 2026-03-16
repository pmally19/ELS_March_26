
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Mokshith%4021@localhost:5432/mallyerp'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT pps.step_number, pps.condition_type_code, pps.description, pps.from_step, pps.to_step, pps.is_subtotal, pps.is_statistical 
      FROM pricing_procedure_steps pps
      JOIN pricing_procedures pp ON pps.procedure_id = pp.id
      WHERE pp.procedure_code = 'ZMRD-20'
      ORDER BY pps.step_number;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
