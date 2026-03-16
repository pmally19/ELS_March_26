
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    try {
        console.log("Checking payment vs invoice status...");

        // Get recent payments
        const payments = await pool.query(`
      SELECT 
        vp.id as payment_id, 
        vp.payment_number, 
        vp.payment_amount, 
        vp.invoice_id,
        vp.purchase_order_id,
        vp.status as payment_status
      FROM vendor_payments vp
      ORDER BY vp.created_at DESC
      LIMIT 10
    `);

        console.log("Recent Payments:");
        console.log(JSON.stringify(payments.rows, null, 2));

        if (payments.rows.length > 0) {
            const invoiceIds = payments.rows.map(p => p.invoice_id).filter(id => id);

            if (invoiceIds.length > 0) {
                // Check associated invoices
                console.log(`Checking Invoices for IDs: ${invoiceIds.join(', ')}`);
                const invoices = await pool.query(`
                SELECT 
                    id, 
                    invoice_number, 
                    amount, 
                    net_amount,
                    status as invoice_status,
                    payment_reference
                FROM accounts_payable
                WHERE id = ANY($1::int[])
            `, [invoiceIds]);
                console.log(JSON.stringify(invoices.rows, null, 2));

                // Check associated open items
                console.log("Checking Open Items...");
                const openItems = await pool.query(`
                 SELECT 
                    id,
                    invoice_number,
                    original_amount,
                    outstanding_amount,
                    status as open_item_status,
                    vendor_id
                 FROM ap_open_items
                 WHERE invoice_number IN (SELECT invoice_number FROM accounts_payable WHERE id = ANY($1::int[]))
            `, [invoiceIds]);
                console.log(JSON.stringify(openItems.rows, null, 2));
            }
        }

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await pool.end();
    }
}

run();
