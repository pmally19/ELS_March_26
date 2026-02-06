import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkPurchaseFields() {
    try {
        // Check for purchase columns
        const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'materials' 
        AND (column_name LIKE '%purchase%' OR column_name LIKE '%purch%')
      ORDER BY column_name
    `);

        console.log('=== PURCHASE-RELATED COLUMNS IN MATERIALS TABLE ===\n');

        if (result.rows.length > 0) {
            console.log('✓ Found columns:');
            result.rows.forEach(r => {
                console.log(`  - ${r.column_name} (${r.data_type})`);
            });
        } else {
            console.log('❌ NO purchase-related columns found!');
        }

        console.log('\n=== CHECKING IF COLUMNS NEED TO BE ADDED ===\n');

        const hasOrgCol = result.rows.some(r => r.column_name === 'purchase_organization');
        const hasGroupCol = result.rows.some(r => r.column_name === 'purchasing_group');

        console.log(`purchase_organization: ${hasOrgCol ? '✓ EXISTS' : '❌ MISSING'}`);
        console.log(`purchasing_group: ${hasGroupCol ? '✓ EXISTS' : '❌ MISSING'}`);

        if (!hasOrgCol || !hasGroupCol) {
            console.log('\n⚠️  ACTION REQUIRED: Columns need to be added to materials table!');
        } else {
            console.log('\n✓ All required columns exist');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPurchaseFields();
