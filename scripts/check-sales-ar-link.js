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

async function checkSalesIntegration() {
    const client = await pool.connect();

    try {
        console.log('🔍 SALES ORDER & AR INTEGRATION CHECK\n');

        // 1. Recent customer payments
        console.log('1️⃣ Recent Customer Payments for Customer 45:');
        const payments = await client.query(`
      SELECT * FROM customer_payments
      WHERE customer_id = 45
      ORDER BY payment_date DESC
      LIMIT 5;
    `);
        console.table(payments.rows);

        // 2. AR Open Items
        console.log('\n2️⃣ AR Open Items for Customer 45:');
        const arItems = await client.query(`
      SELECT * FROM ar_open_items
      WHERE customer_id = 45
      LIMIT 10;
    `);
        console.table(arItems.rows);

        // 3. Sales Invoices
        console.log('\n3️⃣ Sales Invoices for Customer 45:');
        const invoices = await client.query(`
      SELECT * FROM sales_invoices
      WHERE customer_id = 45
      ORDER BY created_at DESC
      LIMIT 5;
    `);
        console.table(invoices.rows);

        // 4. Sales Orders - Check payment_status
        console.log('\n4️⃣ Sales Orders for Customer 45 - Payment Status:');
        const orders = await client.query(`
      SELECT id, order_number, status, payment_status, total_amount
      FROM sales_orders
      WHERE customer_id = 45
      ORDER BY created_at DESC;
    `);
        console.table(orders.rows);

        // 5. Check credit calculation
        console.log('\n5️⃣ Current Credit Calculation:');
        const credit = await client.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as used_credit_from_orders
      FROM sales_orders 
      WHERE customer_id = 45
        AND (payment_status IS NULL OR payment_status != 'Paid')
        AND status IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Shipped', 'Partially Delivered');
    `);
        console.log('Used Credit (from orders):', credit.rows[0].used_credit_from_orders);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkSalesIntegration();
