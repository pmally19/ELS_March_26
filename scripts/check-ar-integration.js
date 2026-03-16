import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function checkPaymentIntegration() {
    const client = await pool.connect();

    try {
        console.log('🔍 CHECKING AR PAYMENT INTEGRATION\n');

        // 1. Check recent AR payments
        console.log('1️⃣ Recent AR Payments:');
        const payments = await client.query(`
      SELECT id, payment_number, customer_id, amount, payment_date, status
      FROM ar_payments
      ORDER BY payment_date DESC
      LIMIT 5;
    `);
        console.table(payments.rows);

        // 2. Check sales orders payment_status
        console.log('\n2️⃣ Sales Orders Payment Status for Customer 45:');
        const orders = await client.query(`
      SELECT id, order_number, status, payment_status, total_amount
      FROM sales_orders
      WHERE customer_id = 45
      ORDER BY created_at DESC;
    `);
        console.table(orders.rows);

        // 3. Check if there's a billing_documents table
        console.log('\n3️⃣ Billing Documents (Invoices):');
        try {
            const invoices = await client.query(`
        SELECT id, invoice_number, sales_order_id, customer_id, total_amount, payment_status
        FROM billing_documents
        WHERE customer_id = 45
        ORDER BY created_at DESC
        LIMIT 5;
      `);
            console.table(invoices.rows);
        } catch (e) {
            console.log('No billing_documents table or error:', e.message);
        }

        // 4. Check AR open items
        console.log('\n4️⃣ AR Open Items:');
        try {
            const arItems = await client.query(`
        SELECT document_type, document_number, customer_id, amount, status
        FROM ar_open_items
        WHERE customer_id = 45
        LIMIT 5;
      `);
            console.table(arItems.rows);
        } catch (e) {
            console.log('No ar_open_items table or error:', e.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkPaymentIntegration();
