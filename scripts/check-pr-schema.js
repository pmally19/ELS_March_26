import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function checkPRTables() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'mallyerp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

    const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    const pool = new Pool({ connectionString });

    try {
        console.log('🔄 Checking purchase_requisition_items table structure...');

        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_requisition_items';
    `);

        console.table(res.rows.map(r => ({ column: r.column_name, type: r.data_type })));

        console.log('🔄 Checking purchase_requisitions table structure...');
        const resHeader = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_requisitions';
    `);

        console.table(resHeader.rows.map(r => ({ column: r.column_name, type: r.data_type })));

    } catch (error) {
        console.error('Error checking tables:', error);
    } finally {
        await pool.end();
    }
}

checkPRTables();
