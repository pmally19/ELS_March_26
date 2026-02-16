
import { pool } from './db';

async function inspectData() {
    try {
        console.log('\n--- Transaction Keys ---');
        const tk = await pool.query('SELECT code, business_context, is_active FROM transaction_keys');
        console.log(`Total count: ${tk.rows.length}`);
        console.log('Sample rows:', tk.rows.slice(0, 5));

        console.log('\n--- GL Accounts ---');
        const gl = await pool.query('SELECT account_number, is_active, chart_of_accounts_id FROM gl_accounts LIMIT 5');
        console.log('Sample rows:', gl.rows);

    } catch (err) {
        console.error('Error inspecting data:', err);
    } finally {
        process.exit(0);
    }
}

inspectData();
