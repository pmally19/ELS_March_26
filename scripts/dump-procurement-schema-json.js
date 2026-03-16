
import pg from 'pg';
import fs from 'fs';
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
    // 'goods_receipt_items', // Verification if this exists - likely it doesn't separate items if copied from PO, but let's check
    'ap_invoices',
    'ap_invoice_items',
    'accounts_payable',
    'accounting_documents'
];

async function dumpSchema() {
    const client = await pool.connect();
    const schemaData = {};

    try {
        for (const table of tables) {
            const res = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

            if (res.rows.length > 0) {
                schemaData[table] = res.rows;
            } else {
                // Check if table exists at all
                const tableExists = await client.query(`
            SELECT EXISTS (
               SELECT FROM information_schema.tables 
               WHERE  table_schema = 'public'
               AND    table_name   = $1
            );
         `, [table]);

                if (tableExists.rows[0].exists) {
                    schemaData[table] = "Table exists but no columns found (permission issue?)";
                } else {
                    schemaData[table] = "Table not found";
                }
            }
        }

        fs.writeFileSync('procurement_schema.json', JSON.stringify(schemaData, null, 2), 'utf-8');
        console.log('Schema dumped to procurement_schema.json');

    } catch (err) {
        console.error('Error dumping schema:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

dumpSchema();
