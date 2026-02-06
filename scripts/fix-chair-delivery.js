import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function fixChairDelivery() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 FIXING CHAIR DELIVERY - POSTING PGI');
    console.log('='.repeat(80) + '\n');

    try {
        // 1. Get the chair delivery
        const delivery = await pool.query(`
            SELECT dd.id, dd.delivery_number, dd.pgi_status
            FROM delivery_documents dd
            WHERE dd.delivery_number = 'DL2025000001'
        `);

        if (delivery.rows.length === 0) {
            console.log('❌ Delivery DL2025000001 not found');
            return;
        }

        const del = delivery.rows[0];
        console.log(`📦 Found delivery: ${del.delivery_number}`);
        console.log(`   Current PGI Status: ${del.pgi_status}\n`);

        if (del.pgi_status === 'POSTED') {
            console.log('✅ Delivery already posted. Checking for movements...\n');
            const mvCheck = await pool.query(
                'SELECT COUNT(*) as count FROM stock_movements WHERE delivery_order_id = $1',
                [del.id]
            );
            console.log(`   Material movements: ${mvCheck.rows[0].count}`);
            return;
        }

        // 2. Get delivery items
        const items = await pool.query(`
            SELECT di.*, p.sku, p.name as product_name
            FROM delivery_items di
            LEFT JOIN products p ON di.material_id = p.id
            WHERE di.delivery_id = $1
        `, [del.id]);

        console.log(`   Items to post: ${items.rows.length}\n`);
        items.rows.forEach(i => {
            console.log(`   - ${i.product_name || 'Unknown'} (SKU: ${i.sku || 'N/A'}) - Qty: ${i.delivery_quantity}`);
        });

        console.log('\n⚠️  IMPORTANT: The delivery needs to be posted via the frontend!');
        console.log('   Steps to post:');
        console.log('   1. Go to Sales → Order to Cash');
        console.log('   2. Click on Delivery tab');
        console.log('   3. Find delivery DL2025000001');
        console.log('   4. Click "Post Goods Issue" button');
        console.log('   5. Check Inventory → Movements tab\n');

        console.log('🔍 Alternative: Check if material_code is missing...\n');
        const itemCheck = await pool.query(`
            SELECT 
                di.id,
                di.material_id,
                di.material_code,
                di.material_name,
                p.sku,
                p.name
            FROM delivery_items di
            LEFT JOIN products p ON di.material_id = p.id
            WHERE di.delivery_id = $1
        `, [del.id]);

        itemCheck.rows.forEach(i => {
            console.log(`   Item ID ${i.id}:`);
            console.log(`   - material_id: ${i.material_id}`);
            console.log(`   - material_code: ${i.material_code || 'NULL ❌'}`);
            console.log(`   - product SKU: ${i.sku || 'NULL ❌'}`);
            console.log(`   - product name: ${i.name}`);
            console.log('');
        });

        if (!itemCheck.rows[0].material_code && !itemCheck.rows[0].sku) {
            console.log('❌ PROBLEM: Product has no SKU!');
            console.log('   The product needs a SKU to create material movements.');
            console.log('   Fix: Update the product with a SKU code\n');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixChairDelivery();
