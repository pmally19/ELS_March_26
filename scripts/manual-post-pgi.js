import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function manuallyPostPGI() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 MANUALLY POSTING PGI FOR DL2025000001');
    console.log('='.repeat(80) + '\n');

    try {
        // 1. Get delivery info
        const delivery = await pool.query(`
            SELECT id, delivery_number, pgi_status, sales_order_id
            FROM delivery_documents
            WHERE delivery_number = 'DL2025000001'
        `);

        if (delivery.rows.length === 0) {
            console.log('❌ Delivery not found');
            return;
        }

        const del = delivery.rows[0];
        console.log(`📦 Delivery: ${del.delivery_number}`);
        console.log(`   Current PGI Status: ${del.pgi_status}\n`);

        if (del.pgi_status === 'POSTED') {
            console.log('✅ Already posted');
            return;
        }

        // 2. Get delivery item
        const items = await pool.query(`
            SELECT di.*, p.sku, p.name, p.plant_id, pl.code as plant_code
            FROM delivery_items di
            LEFT JOIN products p ON di.material_id = p.id
            LEFT JOIN plants pl ON p.plant_id = pl.id
            WHERE di.delivery_id = $1
        `, [del.id]);

        if (items.rows.length === 0) {
            console.log('❌ No items found');
            return;
        }

        const item = items.rows[0];
        console.log(`📋 Item: ${item.name} (SKU: ${item.sku}) - Qty: ${item.delivery_quantity}\n`);

        // 3. Create material movement
        await pool.query('BEGIN');

        const mvNum = `MV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`;

        await pool.query(`
            INSERT INTO stock_movements (
                movement_number, movement_type, material_code, material_name,
                quantity, unit_of_measure, from_location,
                delivery_order_id, sales_order_id,
                reference_document, reference_type,
                movement_date, posting_date, status, notes
            ) VALUES (
                $1, 'Goods Issue', $2, $3, $4, 'EA', 'MAIN',
                $5, $6, $7, 'Delivery',
                CURRENT_TIMESTAMP, CURRENT_DATE, 'Posted',
                'Manually created for testing'
            )
        `, [mvNum, item.sku, item.name, item.delivery_quantity, del.id, del.sales_order_id, del.delivery_number]);

        // 4. Update delivery status
        await pool.query(`
            UPDATE delivery_documents
            SET pgi_status = 'POSTED', pgi_date = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [del.id]);

        await pool.query(`
            UPDATE delivery_items
            SET inventory_posting_status = 'POSTED', pgi_quantity = delivery_quantity
            WHERE delivery_id = $1
        `, [del.id]);

        await pool.query('COMMIT');

        console.log(`✅ Material movement created: ${mvNum}`);
        console.log(`✅ Delivery updated to POSTED\n`);
        console.log('🎉 Now check Inventory → Movements tab (refresh page)!\n');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

manuallyPostPGI();
