
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Select before update to confirm
        console.log("Checking records to update...");
        const check = await client.query(`
        SELECT id, payment_number, accounting_document_number 
        FROM vendor_payments 
        WHERE id IN (90, 91)
    `);
        console.log(`Found ${check.rows.length} records.`);
        console.log(JSON.stringify(check.rows, null, 2));

        if (check.rows.length > 0) {
            // Update PAY-2026-000009
            console.log("Updating PAY-2026-000009...");
            await client.query(`
            UPDATE vendor_payments 
            SET accounting_document_number = 'KZ-2026-000014', updated_at = NOW()
            WHERE payment_number = 'PAY-2026-000009'
        `);

            // Update PAY-2026-000010
            console.log("Updating PAY-2026-000010...");
            await client.query(`
            UPDATE vendor_payments 
            SET accounting_document_number = 'KZ-2026-000015', updated_at = NOW()
            WHERE payment_number = 'PAY-2026-000010'
        `);

            await client.query('COMMIT');
            console.log("Update successful. 'N/A' should now be populated.");
        } else {
            console.log("No records found to update. Rolling back.");
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
