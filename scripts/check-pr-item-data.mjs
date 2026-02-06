import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkPRItemData() {
    try {
        console.log('🔍 Checking PR Item Data for PR-000004\n');
        console.log('='.repeat(80));

        // Get the latest PR items
        const result = await pool.query(`
      SELECT 
        id,
        requisition_id,
        line_number,
        material_id,
        material_code,
        material_name,
        description,
        quantity,
        unit_of_measure,
        material_group,
        storage_location,
        purchasing_group,
        purchasing_org,
        cost_center,
        estimated_unit_price,
        estimated_total_price
      FROM purchase_requisition_items
      WHERE requisition_id = (
        SELECT id FROM purchase_requisitions 
        ORDER BY id DESC LIMIT 1
      )
      ORDER BY line_number
    `);

        if (result.rows.length === 0) {
            console.log('⚠️  No items found');
            await pool.end();
            return;
        }

        console.log(`\n📦 Found ${result.rows.length} items:\n`);

        result.rows.forEach((item, idx) => {
            console.log(`Item ${idx + 1} (Line ${item.line_number}):`);
            console.log(`  Material Code: ${item.material_code || 'NULL'}`);
            console.log(`  Material Name: ${item.material_name || 'NULL'}`);
            console.log(`  Description: ${item.description || 'NULL'}`);
            console.log(`  Quantity: ${item.quantity} ${item.unit_of_measure || 'NULL'}`);
            console.log(`  Material Group: ${item.material_group || 'NULL'} ${item.material_group ? '✅' : '❌'}`);
            console.log(`  Storage Location: ${item.storage_location || 'NULL'} ${item.storage_location ? '✅' : '❌'}`);
            console.log(`  Purchasing Group: ${item.purchasing_group || 'NULL'} ${item.purchasing_group ? '✅' : '❌'}`);
            console.log(`  Purchasing Org: ${item.purchasing_org || 'NULL'} ${item.purchasing_org ? '✅' : '❌'}`);
            console.log(`  Cost Center: ${item.cost_center || 'NULL'} ${item.cost_center ? '✅' : '❌'}`);
            console.log(`  Price: $${item.estimated_unit_price || 0} x ${item.quantity} = $${item.estimated_total_price || 0}`);
            console.log('');
        });

        console.log('='.repeat(80));

        // Check if material has these fields
        console.log('\n🔍 Checking Material Master Data for material_id from items:\n');

        for (const item of result.rows) {
            if (item.material_id) {
                const matResult = await pool.query(`
          SELECT 
            id,
            code,
            name,
            material_group,
            production_storage_location,
            purchasing_group,
            purchase_organization,
            cost_center
          FROM materials
          WHERE id = $1
        `, [item.material_id]);

                if (matResult.rows.length > 0) {
                    const mat = matResult.rows[0];
                    console.log(`Material ${mat.code} (${mat.name}):`);
                    console.log(`  material_group: ${mat.material_group || 'NULL'}`);
                    console.log(`  production_storage_location: ${mat.production_storage_location || 'NULL'}`);
                    console.log(`  purchasing_group: ${mat.purchasing_group || 'NULL'}`);
                    console.log(`  purchase_organization: ${mat.purchase_organization || 'NULL'}`);
                    console.log(`  cost_center: ${mat.cost_center || 'NULL'}`);
                    console.log('');
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPRItemData();
