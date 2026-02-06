import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function inspectPRItems() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'mallyerp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

    const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    const pool = new Pool({ connectionString });

    try {
        console.log('🔄 Fetching recent Purchase Requisition Items...');

        // Removed 'active' column as it caused an error
        const res = await pool.query(`
      SELECT 
        id, 
        requisition_id, 
        line_number, 
        material_code, 
        plant_id, 
        storage_location, 
        quantity
      FROM purchase_requisition_items 
      ORDER BY id DESC 
      LIMIT 10
    `);

        if (res.rows.length === 0) {
            console.log('⚠️ No items found in purchase_requisition_items table.');
        } else {
            console.log(`✅ Found ${res.rows.length} recent items:`);
            console.table(res.rows);
        }

    } catch (error) {
        console.error('Error inspecting PR items:', error);
    } finally {
        await pool.end();
    }
}

inspectPRItems();
