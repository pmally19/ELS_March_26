import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function fixPOItemsActiveStatus() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'mallyerp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

    const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    const pool = new Pool({ connectionString });

    try {
        console.log('🔄 Fixing active status for purchase_order_items...');

        // Update active = true where it is null
        const res = await pool.query(`
      UPDATE purchase_order_items 
      SET active = true 
      WHERE active IS NULL
    `);

        console.log(`✅ Updated ${res.rowCount} items to have active = true.`);

    } catch (error) {
        console.error('Error fixing items:', error);
    } finally {
        await pool.end();
    }
}

fixPOItemsActiveStatus();
