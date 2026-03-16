
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        const tables = [
            'purchase_requisitions',
            'purchase_requisition_items',
            'purchase_orders',
            'purchase_order_items'
        ];

        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const res = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

            console.table(res.rows);
        }
    } catch (err) {
        console.error('Error querying schema:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkSchema();
