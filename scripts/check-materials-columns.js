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

async function checkMaterialsTable() {
    try {
        console.log('🔍 Checking materials table structure...\n');

        const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'materials' 
      ORDER BY ordinal_position
    `);

        console.log('Materials table columns:');
        console.table(columns.rows);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        pool.end();
    }
}

checkMaterialsTable();
