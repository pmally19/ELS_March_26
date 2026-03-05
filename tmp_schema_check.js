const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function check() {
    const tables = ['ap_invoices', 'obyc_account_determination', 'materials', 'inventory_balances', 'purchase_order_items'];

    for (const table of tables) {
        try {
            const r = await pool.query(
                `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
                [table]
            );
            console.log(`\n=== ${table} ===`);
            r.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
        } catch (e) {
            console.log(`  ERROR for ${table}: ${e.message}`);
        }
    }

    // Check if inventory_balances table exists
    try {
        const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%inventor%' OR table_name LIKE '%stock%' OR table_name LIKE '%balance%'`);
        console.log('\n=== Tables with inventory/stock/balance in name ===');
        r.rows.forEach(row => console.log(`  ${row.table_name}`));
    } catch (e) {
        console.log('Error listing tables:', e.message);
    }

    // Sample material to check price_control field
    try {
        const r = await pool.query(`SELECT id, code, price_control, valuation_class_id FROM materials LIMIT 3`);
        console.log('\n=== Sample Materials ===');
        r.rows.forEach(row => console.log(row));
    } catch (e) {
        console.log('Error fetching materials:', e.message);
    }

    // OBYC sample data
    try {
        const r = await pool.query(`SELECT transaction_key, valuation_class_id, gl_account_id FROM obyc_account_determination LIMIT 10`);
        console.log('\n=== Sample OBYC rows ===');
        r.rows.forEach(row => console.log(row));
    } catch (e) {
        console.log('Error fetching OBYC:', e.message);
    }

    await pool.end();
}

check().catch(console.error);
