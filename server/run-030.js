import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    const sql = readFileSync(join(process.cwd(), 'migrations', '030_accruals_and_provisions.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migration 030 completed');
    process.exit(0);
}
run().catch(console.error);
