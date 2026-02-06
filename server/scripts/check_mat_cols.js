
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'materials'");
        console.log('Materials Table Columns:');
        res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
