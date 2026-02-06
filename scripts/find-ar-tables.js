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

async function findARTables() {
    const client = await pool.connect();

    try {
        console.log('🔍 FINDING AR AND PAYMENT TABLES\n');

        // Find all tables with "payment" or "invoice" in name
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%payment%' 
          OR table_name LIKE '%invoice%'
          OR table_name LIKE '%billing%'
          OR table_name LIKE '%ar_%'
          OR table_name LIKE '%receivable%')
      ORDER BY table_name;
    `);

        console.log('📋 Payment/AR related tables:');
        console.table(tables.rows);

        // Check billing_documents
        console.log('\n📄 Checking billing_documents:');
        try {
            const billing = await client.query(`
        SELECT id, invoice_number, sales_order_id, customer_id, total_amount, payment_status, status
        FROM billing_documents
        WHERE customer_id = 45
        ORDER BY created_at DESC
        LIMIT 5;
      `);
            console.table(billing.rows);
        } catch (e) {
            console.log('Error:', e.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        pool.end();
    }
}

findARTables();
