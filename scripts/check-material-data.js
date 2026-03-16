import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkMaterialData() {
    try {
        console.log('=== CHECKING MATERIAL DATA ===\n');

        // Check if any materials have purchase org/group data
        const result = await pool.query(`
      SELECT 
        id, 
        code, 
        name, 
        purchase_organization, 
        purchasing_group
      FROM materials 
      WHERE is_active = true
      ORDER BY id
      LIMIT 10
    `);

        console.log(`Found ${result.rows.length} materials\n`);

        if (result.rows.length > 0) {
            result.rows.forEach(row => {
                console.log(`Material: ${row.code} (${row.name})`);
                console.log(`  Purchase Org: ${row.purchase_organization || '(not set)'}`);
                console.log(`  Purchase Group: ${row.purchasing_group || '(not set)'}`);
                console.log('');
            });

            // Count how many have these fields set
            const withPurchaseOrg = result.rows.filter(r => r.purchase_organization).length;
            const withPurchaseGroup = result.rows.filter(r => r.purchasing_group).length;

            console.log('=== SUMMARY ===');
            console.log(`Materials with Purchase Org set: ${withPurchaseOrg}/${result.rows.length}`);
            console.log(`Materials with Purchase Group set: ${withPurchaseGroup}/${result.rows.length}`);

            if (withPurchaseOrg === 0 && withPurchaseGroup === 0) {
                console.log('\n⚠️  NO MATERIALS have purchase org or group set!');
                console.log('   This indicates data is not being saved correctly.');
            }
        } else {
            console.log('No materials found in database.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkMaterialData();
