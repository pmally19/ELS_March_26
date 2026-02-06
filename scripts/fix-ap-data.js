
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Select before delete to confirm
        console.log("Checking records to delete...");
        const check = await client.query('SELECT * FROM ap_open_items WHERE id IN (51, 52)');
        console.log(`Found ${check.rows.length} records.`);
        console.log(JSON.stringify(check.rows, null, 2));

        if (check.rows.length > 0) {
            console.log("Deleting orphaned records...");
            const result = await client.query('DELETE FROM ap_open_items WHERE id IN (51, 52)');
            console.log(`Deleted ${result.rowCount} records.`);
            await client.query('COMMIT');
            console.log("Cleanup successful.");
        } else {
            console.log("No records found to delete. Rolling back.");
            await client.query('ROLLBACK');
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Database Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
