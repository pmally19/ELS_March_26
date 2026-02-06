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

async function verifyARStructure() {
    const client = await pool.connect();

    try {
        console.log('🔍 VERIFYING AR OPEN ITEMS STRUCTURE\n');

        // Check ar_open_items columns
        console.log('1️⃣ ar_open_items Table Columns:');
        const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ar_open_items'
      ORDER BY ordinal_position;
    `);
        console.table(columns.rows);

        // Check sample data
        console.log('\n2️⃣ Sample AR Open Items for Customer 45:');
        const sample = await client.query(`
      SELECT * FROM ar_open_items
      WHERE customer_id = 45
      LIMIT 3;
    `);
        console.table(sample.rows);

        // Check total AR exposure
        console.log('\n3️⃣ Total AR Exposure for Customer 45:');
        const exposure = await client.query(`
      SELECT 
        COUNT(*) as open_item_count,
        COALESCE(SUM(CAST(open_amount AS DECIMAL)), 0) as total_ar_exposure
      FROM ar_open_items
      WHERE customer_id = 45;
    `);
        console.table(exposure.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        pool.end();
    }
}

verifyARStructure();
