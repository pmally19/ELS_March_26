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

async function checkSchemaAndTables() {
    const client = await pool.connect();
    try {
        console.log('--- Sales Orders Status Column ---');
        const statusCol = await client.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_orders' AND column_name = 'status';
    `);
        console.table(statusCol.rows);

        console.log('\n--- Object Type for erp_customers ---');
        const objType = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'erp_customers' OR table_name = 'sales_customers';
    `);
        console.table(objType.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

checkSchemaAndTables();
