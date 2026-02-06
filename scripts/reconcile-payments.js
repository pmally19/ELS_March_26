
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get all POSTED payments
        const payments = await client.query(`
        SELECT 
            id, payment_amount, invoice_id, payment_date
        FROM vendor_payments 
        WHERE status = 'POSTED' OR status = 'PROCESSED'
    `);

        console.log(`Found ${payments.rows.length} posted payments. Reconciling...`);

        for (const payment of payments.rows) {
            if (!payment.invoice_id) continue;

            // 1. Update Accounts Payable
            // Get current invoice amount
            const invoice = await client.query('SELECT amount, net_amount FROM accounts_payable WHERE id = $1', [payment.invoice_id]);
            if (invoice.rows.length > 0) {
                const totalAmount = parseFloat(invoice.rows[0].amount || invoice.rows[0].net_amount || 0);

                // Calculate total paid for this invoice including this payment
                const totalPaidResult = await client.query(`
                SELECT SUM(payment_amount) as paid 
                FROM vendor_payments 
                WHERE invoice_id = $1 AND (status = 'POSTED' OR status = 'PROCESSED')
            `, [payment.invoice_id]);
                const totalPaid = parseFloat(totalPaidResult.rows[0].paid || 0);

                const remaining = Math.max(0, totalAmount - totalPaid);
                const newStatus = remaining === 0 ? 'paid' : 'partial';

                console.log(`Invoice ${payment.invoice_id}: Total ${totalAmount}, Paid ${totalPaid}, Remaining ${remaining} -> Status: ${newStatus}`);

                await client.query(`
                UPDATE accounts_payable 
                SET status = $1, updated_at = NOW()
                WHERE id = $2
            `, [newStatus, payment.invoice_id]);

                // 2. Update AP Open Items
                // Find open item by invoice_id if possible, or link via invoice number
                const openItemCheck = await client.query(`
                SELECT id FROM ap_open_items 
                WHERE invoice_number = (SELECT invoice_number FROM accounts_payable WHERE id = $1)
            `, [payment.invoice_id]);

                if (openItemCheck.rows.length > 0) {
                    const openItemStatus = remaining === 0 ? 'Cleared' : 'Partial';
                    await client.query(`
                    UPDATE ap_open_items
                    SET outstanding_amount = $1, status = $2, last_payment_date = $3
                    WHERE id = $4
                 `, [remaining, openItemStatus, payment.payment_date, openItemCheck.rows[0].id]);
                    console.log(`Updated Open Item ${openItemCheck.rows[0].id} to ${openItemStatus}, Outstanding: ${remaining}`);
                }
            }
        }

        await client.query('COMMIT');
        console.log("Reconciliation complete.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Database Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
