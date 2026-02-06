
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    try {
        console.log("Checking all AP Open Items...");
        const result = await pool.query(`
      SELECT 
        id, 
        invoice_number, 
        original_amount, 
        outstanding_amount, 
        status, 
        vendor_id
      FROM ap_open_items
      ORDER BY id
    `);

        console.log(`Found ${result.rows.length} total items.`);
        console.log(JSON.stringify(result.rows, null, 2));

        // Also check AP Statistics to see if they match the open items
        console.log("Checking AP Statistics calculation...");
        const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_open_items,
        SUM(outstanding_amount) as total_outstanding
      FROM ap_open_items
      WHERE active = true
    `);
        console.log("Calculated Stats from DB:", stats.rows[0]);

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await pool.end();
    }
}

run();
