#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('Missing DATABASE_URL env');
      process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const q = async (text, params = []) => (await pool.query(text, params)).rows;

    const out = {};
    out.currencies_columns = await q(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='currencies' ORDER BY ordinal_position"
    );
    out.currencies_count = await q("SELECT COUNT(*)::int AS count FROM currencies");
    try {
      out.currencies_recent = await q(
        'SELECT * FROM currencies ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 10'
      );
    } catch (_) {
      out.currencies_recent = await q('SELECT * FROM currencies ORDER BY id DESC LIMIT 10');
    }

    try {
      out.global_columns = await q(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='global_currencies' ORDER BY ordinal_position"
      );
      out.global_count = await q('SELECT COUNT(*)::int AS count FROM global_currencies');
      try {
        out.global_recent = await q(
          'SELECT * FROM global_currencies ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 10'
        );
      } catch (_) {
        out.global_recent = await q('SELECT * FROM global_currencies ORDER BY id DESC LIMIT 10');
      }
    } catch (e) {
      out.global_error = e.message;
    }

    console.log(JSON.stringify(out, null, 2));
    await pool.end();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();


