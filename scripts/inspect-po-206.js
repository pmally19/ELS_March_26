import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function inspectPO() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'mallyerp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

    const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    const pool = new Pool({ connectionString });

    try {
        const poId = 206;
        console.log(`Checking PO ${poId}...`);

        // Check PO header
        const poRes = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [poId]);
        if (poRes.rows.length === 0) {
            console.log('❌ PO not found in purchase_orders table.');
        } else {
            console.log('✅ PO header found:');
            console.table(poRes.rows[0]);
        }

        // Check PO Items
        const itemsRes = await pool.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = $1', [poId]);
        if (itemsRes.rows.length === 0) {
            console.log('❌ No items found in purchase_order_items table for this PO.');
        } else {
            console.log(`✅ Found ${itemsRes.rows.length} items:`);
            console.table(itemsRes.rows.map(i => ({
                id: i.id,
                purchase_order_id: i.purchase_order_id,
                material_id: i.material_id,
                quantity: i.quantity,
                received_quantity: i.received_quantity,
                active: i.active
            })));
        }

    } catch (error) {
        console.error('Error inspecting PO:', error);
    } finally {
        await pool.end();
    }
}

inspectPO();
