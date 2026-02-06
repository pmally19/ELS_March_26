import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function checkQuotationsTable() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'mallyerp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

    const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    const pool = new Pool({
        connectionString: connectionString,
    });

    let client;
    try {
        console.log('🔄 Checking quotations table structure...');
        client = await pool.connect();

        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quotations';
    `);

        if (res.rows.length === 0) {
            console.log('⚠️  Table "quotations" does not exist.');
        } else {
            console.log('✅ Table "quotations" exists with columns:');
            console.table(res.rows);
        }

    } catch (error) {
        console.error('❌ Error checking table:', error);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

checkQuotationsTable().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
