
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const tables = [
    'purchase_requisitions',
    'purchase_requisition_items',
    'purchase_orders',
    'purchase_order_items',
    'goods_receipts',
    'goods_receipt_items', // Verification if this exists
    'ap_invoices',
    'ap_invoice_items',
    'accounts_payable',
    'accounting_documents'
];

async function dumpSchema() {
    const client = await pool.connect();
    try {
        console.log('--- Database Schema Dump ---');
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const res = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

            if (res.rows.length === 0) {
                console.log('  (Table not found)');
            } else {
                console.table(res.rows);
            }
        }
    } catch (err) {
        console.error('Error dumping schema:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

dumpSchema();
