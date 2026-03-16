const { pool } = require('./server/db');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cost_centers'")
    .then(r => { console.log("cost_centers:", r.rows.map(row => row.column_name)); return pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'materials'"); })
    .then(r => console.log("materials:", r.rows.map(row => row.column_name)))
    .catch(console.error)
    .finally(() => pool.end());
