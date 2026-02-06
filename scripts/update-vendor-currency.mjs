import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function updateVendorCurrency() {
    try {
        console.log('🔧 Updating vendors with default currency...\n');

        // Update vendors to have USD as default currency where currency is NULL
        const result = await pool.query(`
      UPDATE vendors
      SET currency = 'USD'
      WHERE currency IS NULL
    `);

        console.log(`✅ Updated ${result.rowCount} vendors with USD as default currency`);

        // Verify the update
        const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_vendors,
        COUNT(currency) as vendors_with_currency,
        COUNT(*) - COUNT(currency) as vendors_without_currency
      FROM vendors
    `);

        console.log('\n📊 Currency Statistics:');
        console.log(`   Total vendors: ${verifyResult.rows[0].total_vendors}`);
        console.log(`   With currency: ${verifyResult.rows[0].vendors_with_currency}`);
        console.log(`   Without currency: ${verifyResult.rows[0].vendors_without_currency}`);

        if (parseInt(verifyResult.rows[0].vendors_without_currency) === 0) {
            console.log('\n✅ All vendors now have currency values');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

updateVendorCurrency();
