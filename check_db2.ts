import { Client } from 'pg';

async function check() {
    const client = new Client({ connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp' });
    await client.connect();
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_order_items'");
    console.log("COLUMNS IN DB:");
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    await client.end();
}

check().catch(console.error);
