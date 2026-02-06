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

async function checkData() {
    const client = await pool.connect();
    try {
        console.log('--- Recent Sales Orders Status ---');
        const orders = await client.query(`
      SELECT order_number, status, total_amount, created_at 
      FROM sales_orders 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
        console.table(orders.rows);

        console.log('\n--- Comparing Customers Tables ---');
        const erpCount = await client.query('SELECT COUNT(*) FROM erp_customers');
        const salesCount = await client.query('SELECT COUNT(*) FROM sales_customers');
        console.log(`erp_customers count: ${erpCount.rows[0].count}`);
        console.log(`sales_customers count: ${salesCount.rows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

checkData();
