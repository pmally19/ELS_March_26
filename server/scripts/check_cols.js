
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function check() {
    try {
        const ptCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_types'");
        console.log('product_types columns:', ptCols.rows.map(r => r.column_name));

        const nrCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'number_ranges'");
        console.log('number_ranges columns:', nrCols.rows.map(r => r.column_name));
    } catch (e) { console.error(e); }
    finally { pool.end(); }
}

check();
