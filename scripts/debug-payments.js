
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    try {
        console.log("Checking for vendor payments with missing accounting document number...");
        const result = await pool.query(`
      SELECT 
        id, payment_number, payment_amount, status, accounting_document_number, created_at
      FROM vendor_payments
      WHERE accounting_document_number IS NULL OR accounting_document_number = ''
    `);

        console.log(`Found ${result.rows.length} payments with missing accounting document info:`);
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await pool.end();
    }
}

run();
