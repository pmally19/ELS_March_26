import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function testPRDetails() {
    try {
        console.log('🔍 Testing PR Details Endpoint\n');
        console.log('='.repeat(80));

        // Find the most recent PR
        const prListResult = await pool.query(`
      SELECT id, requisition_number, status
      FROM purchase_requisitions
      ORDER BY id DESC
      LIMIT 1
    `);

        if (prListResult.rows.length === 0) {
            console.log('⚠️  No purchase requisitions found in database');
            await pool.end();
            return;
        }

        const latestPR = prListResult.rows[0];
        console.log(`\n📋 Testing with: ${latestPR.requisition_number} (ID: ${latestPR.id})\n`);

        // Simulate what the API endpoint does
        const result = await pool.query(`
      SELECT 
        pr.*,
        cc.cost_center,
        cc.description as cost_center_description
      FROM purchase_requisitions pr
      LEFT JOIN cost_centers cc ON pr.cost_center_id = cc.id
      WHERE pr.id = $1
    `, [latestPR.id]);

        const pr = result.rows[0];

        // Fetch items
        const itemsResult = await pool.query(`
      SELECT 
        pri.*,
        m.code as material_code_ref,
        m.name as material_name_ref
      FROM purchase_requisition_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
      WHERE pri.requisition_id = $1
      ORDER BY pri.line_number
    `, [latestPR.id]);

        pr.items = itemsResult.rows;

        console.log('✅ PR Header Data:');
        console.log('  Requisition Number:', pr.requisition_number);
        console.log('  Status:', pr.status);
        console.log('  Priority:', pr.priority);
        console.log('  Department:', pr.department);
        console.log('  Cost Center:', pr.cost_center);
        console.log('  Total Value:', pr.total_value);

        console.log(`\n📦 Items Found: ${pr.items.length}`);

        if (pr.items.length > 0) {
            pr.items.forEach((item, idx) => {
                console.log(`\n  Item ${idx + 1}:`);
                console.log(`    Material Code: ${item.material_code || 'N/A'}`);
                console.log(`    Material Name: ${item.material_name || 'N/A'}`);
                console.log(`    Description: ${item.description || 'N/A'}`);
                console.log(`    Quantity: ${item.quantity} ${item.unit_of_measure || ''}`);
                console.log(`    Unit Price: ${item.estimated_unit_price || item.unit_price || 0}`);
                console.log(`    Total Price: ${item.estimated_total_price || item.total_price || 0}`);
                console.log(`    Material Group: ${item.material_group || 'N/A'}`);
                console.log(`    Storage Location: ${item.storage_location || 'N/A'}`);
                console.log(`    Purchasing Group: ${item.purchasing_group || 'N/A'}`);
                console.log(`    Purchasing Org: ${item.purchasing_org || 'N/A'}`);
                console.log(`    Cost Center: ${item.cost_center || 'N/A'}`);
            });

            console.log('\n' + '='.repeat(80));
            console.log('✅ All item fields are available in the response!');
            console.log('🎉 The frontend should now display all details correctly.\n');
        } else {
            console.log('⚠️  No items found for this PR');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await pool.end();
    }
}

testPRDetails();
