import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function checkStorageLocations() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'mallyerp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

    const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    const pool = new Pool({ connectionString });

    try {
        console.log('🔄 Checking storage_locations table structure...');

        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'storage_locations';
    `);

        console.table(res.rows.map(r => ({ column: r.column_name, type: r.data_type })));

        // Also check some sample data
        console.log('🔄 Sample storage locations:');
        const sample = await pool.query('SELECT * FROM storage_locations LIMIT 5');
        console.table(sample.rows);

    } catch (error) {
        console.error('Error checking table:', error);
    } finally {
        await pool.end();
    }
}

checkStorageLocations();
