import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function fixSchema() {
    console.log('🔧 FIXING SALES RETURNS SCHEMA\n');
    console.log('='.repeat(80));

    try {
        // Check current columns
        console.log('\n1. Checking current schema...\n');
        const currentColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sales_returns'
      ORDER BY ordinal_position
    `);

        console.log('Current sales_returns columns:');
        currentColumns.rows.forEach(row => {
            console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}`);
        });

        // Check if columns exist
        const hasSalesOrderId = currentColumns.rows.some(r => r.column_name === 'sales_order_id');
        const hasBillingDocId = currentColumns.rows.some(r => r.column_name === 'billing_document_id');

        console.log(`\n  sales_order_id exists: ${hasSalesOrderId ? '✅' : '❌'}`);
        console.log(`  billing_document_id exists: ${hasBillingDocId ? '✅' : '❌'}`);

        if (!hasSalesOrderId || !hasBillingDocId) {
            console.log('\n2. Adding missing columns...\n');

            if (!hasSalesOrderId) {
                await pool.query(`
          ALTER TABLE sales_returns 
          ADD COLUMN IF NOT EXISTS sales_order_id INTEGER REFERENCES sales_orders(id)
        `);
                console.log('  ✅ Added sales_order_id column');
            }

            if (!hasBillingDocId) {
                await pool.query(`
          ALTER TABLE sales_returns 
          ADD COLUMN IF NOT EXISTS billing_document_id INTEGER REFERENCES billing_documents(id)
        `);
                console.log('  ✅ Added billing_document_id column');
            }

            // Verify fix
            console.log('\n3. Verifying columns...\n');
            const verifyColumns = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'sales_returns'
        AND column_name IN ('sales_order_id', 'billing_document_id')
      `);

            console.log(`  Found ${verifyColumns.rows.length}/2 expected columns`);
            verifyColumns.rows.forEach(row => {
                console.log(`    ✅ ${row.column_name}`);
            });

            if (verifyColumns.rows.length === 2) {
                console.log('\n✅ Schema fixed successfully!');
            } else {
                console.log('\n⚠️  Some columns still missing');
            }
        } else {
            console.log('\n✅ Schema is already correct!');
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

fixSchema();
