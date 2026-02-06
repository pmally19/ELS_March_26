// Check what the actual status column is called in vendor_invoices view
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function checkStatusColumns() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking vendor_invoices view structure...\n');

        // Get the view definition
        const viewDef = await client.query(`
      SELECT pg_get_viewdef('vendor_invoices', true) as definition
    `);

        console.log('View Definition:');
        console.log(viewDef.rows[0].definition);
        console.log('\n---\n');

        // Get actual data to see what's being returned
        console.log('📋 Sample invoice data:');
        const sample = await client.query(`
      SELECT id, invoice_number, status, payment_date, payment_reference
      FROM vendor_invoices
      LIMIT 2
    `);

        console.log('Columns in result:', Object.keys(sample.rows[0] || {}));
        sample.rows.forEach(row => {
            console.log(`  Invoice: ${row.invoice_number}, Status: ${row.status}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkStatusColumns();
