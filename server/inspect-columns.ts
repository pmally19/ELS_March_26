
import { pool } from './db';

async function inspectColumns() {
    const tables = [
        'chart_of_accounts',
        'valuation_grouping_codes',
        'valuation_classes',
        'transaction_keys',
        'gl_accounts'
    ];

    try {
        for (const table of tables) {
            const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND column_name LIKE '%active%'
        ORDER BY ordinal_position
      `, [table]);

            console.log(`${table}: ${res.rows.map(r => r.column_name).join(', ') || 'NO ACTIVE COLUMN FOUND'}`);
        }
    } catch (err) {
        console.error('Error inspecting columns:', err);
    } finally {
        process.exit(0);
    }
}

inspectColumns();
