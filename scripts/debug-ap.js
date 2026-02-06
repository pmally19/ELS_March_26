
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    try {
        console.log("Checking for records with missing vendor info...");
        const result = await pool.query(`
      SELECT 
        api.id, 
        api.vendor_id, 
        api.invoice_number,
        api.outstanding_amount
      FROM ap_open_items api
      LEFT JOIN vendors v ON api.vendor_id = v.id
      WHERE v.id IS NULL
    `);

        console.log(`Found ${result.rows.length} records with missing vendor info (orphaned vendor_id):`);
        console.log(JSON.stringify(result.rows, null, 2));

        // Also check records where vendor_id itself is NULL
        const nullVendorId = await pool.query(`
      SELECT id, invoice_number, outstanding_amount 
      FROM ap_open_items 
      WHERE vendor_id IS NULL
    `);
        console.log(`Found ${nullVendorId.rows.length} records with NULL vendor_id:`);
        console.log(JSON.stringify(nullVendorId.rows, null, 2));

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await pool.end();
    }
}

run();
