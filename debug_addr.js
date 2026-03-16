const p = require('pg').Pool;
const db = new p({ host: 'localhost', database: 'mallyerp', user: 'postgres', password: 'Mokshith@21' });
async function run() {
    const t = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%address%' OR table_name ILIKE '%ship%' OR table_name ILIKE '%partner%') ORDER BY table_name");
    console.log('ADDR TABLES:', t.rows.map(x => x.table_name));

    try {
        const cols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='customer_addresses' ORDER BY ordinal_position");
        console.log('customer_addresses cols:', cols.rows.map(x => x.column_name));
        const data = await db.query("SELECT * FROM customer_addresses WHERE customer_id=84 LIMIT 3");
        console.log('DATA:', JSON.stringify(data.rows, null, 2));
    } catch (e) { console.log('No customer_addresses:', e.message); }

    const custCols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='erp_customers' ORDER BY ordinal_position");
    const taxRelated = custCols.rows.map(x => x.column_name).filter(c => c.includes('country') || c.includes('state') || c.includes('address') || c.includes('ship') || c.includes('tax'));
    console.log('erp_customers relevant cols:', taxRelated);

    db.end();
}
run().catch(e => { console.error(e.message); db.end(); });
