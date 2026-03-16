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

async function debugCreditIssue() {
    const client = await pool.connect();

    try {
        console.log('🔍 DEBUGGING CREDIT LIMIT ISSUE\n');

        // 1. Check customer 45
        console.log('1️⃣ Customer 45 Details:');
        const customer = await client.query(`
      SELECT id, name, credit_limit 
      FROM erp_customers 
      WHERE id = 45;
    `);
        console.table(customer.rows);

        // 2. Check ALL sales orders for customer 45
        console.log('\n2️⃣ ALL Sales Orders for Customer 45:');
        const allOrders = await client.query(`
      SELECT id, order_number, status, payment_status, total_amount, created_at
      FROM sales_orders 
      WHERE customer_id = 45
      ORDER BY created_at DESC
      LIMIT 10;
    `);
        console.table(allOrders.rows);

        // 3. Check what the CURRENT query returns (simulating the API)
        console.log('\n3️⃣ Current Credit Calculation (What API SHOULD Return):');
        const currentCalc = await client.query(`
      SELECT COALESCE(SUM(total_amount), 0) as used_credit
      FROM sales_orders 
      WHERE customer_id = 45
      AND payment_status != 'Paid'
      AND status IN ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Shipped', 'Partially Delivered');
    `);
        console.log('Used Credit (with new filter):', currentCalc.rows[0].used_credit);

        // 4. Check what the OLD query would return
        console.log('\n4️⃣ Old Credit Calculation (might still be running):');
        const oldCalc = await client.query(`
      SELECT COALESCE(SUM(total_amount), 0) as used_credit
      FROM sales_orders 
      WHERE customer_id = 45
      AND payment_status != 'Paid'
      AND status != 'Cancelled';
    `);
        console.log('Used Credit (with old filter):', oldCalc.rows[0].used_credit);

        // 5. Check orders with NULL status
        console.log('\n5️⃣ Orders with NULL Status:');
        const nullStatus = await client.query(`
      SELECT id, order_number, status, payment_status, total_amount
      FROM sales_orders 
      WHERE customer_id = 45
      AND status IS NULL;
    `);
        console.table(nullStatus.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        pool.end();
    }
}

debugCreditIssue();
