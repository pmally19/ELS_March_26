
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debug() {
    try {
        console.log('--- DEBUG ID 19 ---');
        const record = await pool.query('SELECT * FROM period_end_closing WHERE id = 19');
        if (record.rows.length > 0) {
            console.log('Record 19:', JSON.stringify(record.rows[0], null, 2));
        } else {
            console.log('Record 19 NOT FOUND');
        }

        // Check all rows again with summary
        const all = await pool.query('SELECT id, year, period FROM period_end_closing');
        console.log('All IDs:', all.rows.map(r => `${r.id}: ${r.year}(${typeof r.year})`).join(', '));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
debug();
