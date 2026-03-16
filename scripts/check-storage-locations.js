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

async function checkStorageLocations() {
    try {
        console.log('🔍 Checking storage_locations table...\n');

        // Check columns
        const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'storage_locations' 
      ORDER BY ordinal_position
    `);

        console.log('Storage Locations Columns:');
        console.table(columns.rows);

        // Get sample data
        const data = await pool.query(`
      SELECT id, code, name, plant_id 
      FROM storage_locations 
      LIMIT 5
    `);

        console.log('\nSample Storage Locations:');
        console.table(data.rows);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        pool.end();
    }
}

checkStorageLocations();
