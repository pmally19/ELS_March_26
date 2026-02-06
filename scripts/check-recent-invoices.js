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

async function checkRecentInvoices() {
    const client = await pool.connect();

    try {
        console.log('🔍 CHECKING RECENT INVOICES AND CREDIT\n');

        // 1. Recent billing documents/invoices for customer 45
        console.log('1️⃣ Recent Billing Documents for Customer 45:');
        try {
            const billing = await client.query(`
        SELECT id, document_number, billing_date, total_amount, payment_status, created_at
        FROM billing_documents
        WHERE customer_id = 45
        ORDER BY created_at DESC
        LIMIT 5;
      `);
            console.table(billing.rows);
        } catch (e) {
            console.log('Billing documents error:', e.message);
        }

        // 2. Check AR open items
        console.log('\n2️⃣ AR Open Items for Customer 45:');
        const arCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'ar_open_items' 
      ORDER BY ordinal_position;
    `);
        console.log('Available columns:', arCols.rows.map(r => r.column_name).join(', '));

        const arItems = await client.query(`
      SELECT * FROM ar_open_items
      WHERE customer_id = 45
      ORDER BY posting_date DESC
      LIMIT 5;
    `);
        console.table(arItems.rows);

        // 3. Sales orders
        console.log('\n3️⃣ Sales Orders for Customer 45:');
        const orders = await client.query(`
      SELECT id, order_number, status, payment_status, total_amount, created_at
      FROM sales_orders
      WHERE customer_id = 45
      ORDER BY created_at DESC
      LIMIT 5;
    `);
        console.table(orders.rows);

        // 4. Current credit calculation
        console.log('\n4️⃣ Current Credit Calculation:');
        const creditCalc = await client.query(`
      SELECT COALESCE(SUM(total_amount), 0) as used_credit_from_orders
      FROM sales_orders 
      WHERE customer_id = 45
        AND (payment_status IS NULL OR payment_status != 'Paid')
        AND status IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Shipped', 'Partially Delivered');
    `);
        console.log('Used Credit (from orders):', creditCalc.rows[0].used_credit_from_orders);

        // 5. Check customer credit limit
        console.log('\n5️⃣ Customer Credit Limit:');
        const customer = await client.query(`
      SELECT id, name, credit_limit FROM erp_customers WHERE id = 45;
    `);
        console.table(customer.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkRecentInvoices();
