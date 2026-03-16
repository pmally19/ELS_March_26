
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function check() {
    try {
        const res = await pool.query("SELECT to_regclass('purchase_organizations') as exists");
        console.log('purchase_organizations exists:', res.rows[0].exists !== null);

        if (res.rows[0].exists) {
            const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_organizations'");
            console.log('Columns:', cols.rows.map(r => r.column_name));
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
