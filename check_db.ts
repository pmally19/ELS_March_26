import { Client } from 'pg';

async function check() {
    const client = new Client({ connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp' });
    await client.connect();
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_order_item_conditions'");
    console.log("COLUMNS IN DB:");
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

    const data = await client.query("SELECT * FROM sales_order_item_conditions ORDER BY id DESC LIMIT 2");
    console.log("RECENT ROWS:");
    console.log(JSON.stringify(data.rows, null, 2));

    await client.end();
}

check().catch(console.error);
