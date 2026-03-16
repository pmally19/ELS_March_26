
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkDownstreamSchema() {
    const client = await pool.connect();
    try {
        // Guessing table names based on conventions
        const tables = [
            'goods_receipts',
            'goods_receipt_items', // if exists
            'invoices',            // or vendor_invoices
            'invoice_items',
            'material_movements'   // often used for GR history
        ];

        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const res = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

            if (res.rows.length === 0) {
                console.log(`Table '${table}' not found.`);
            } else {
                console.table(res.rows);
            }
        }
    } catch (err) {
        console.error('Error querying schema:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkDownstreamSchema();
