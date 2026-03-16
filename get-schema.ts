import { pool } from './server/db.ts';

async function check() {
  const mtv = await pool.query(`SELECT movement_type_code, debit_transaction_key, credit_transaction_key FROM movement_types WHERE movement_type_code IN ('601', '101')`);
  console.log("movement_types values:", JSON.stringify(mtv.rows, null, 2));

  // test pulling material account determination for BSX
  const sample = await pool.query(`
    SELECT mad.*, tk.code as tk_code, vc.class_code as vc_code, gl.account_number 
    FROM material_account_determination mad
    JOIN transaction_keys tk ON mad.transaction_key_id = tk.id
    LEFT JOIN valuation_classes vc ON mad.valuation_class_id = vc.id
    LEFT JOIN gl_accounts gl ON mad.gl_account_id = gl.id
    WHERE tk.code IN ('BSX', 'GBB') LIMIT 5
  `);
  console.log("sample OBYC details:", JSON.stringify(sample.rows, null, 2));

  process.exit(0);
}

check().catch(console.error);
