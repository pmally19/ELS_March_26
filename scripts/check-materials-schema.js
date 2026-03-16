import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkSchema() {
    try {
        console.log('Checking materials table schema...\n');

        // Get all columns
        const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'materials' 
      ORDER BY ordinal_position
    `);

        console.log('Total columns:', result.rows.length);
        console.log('\nAll columns in materials table:');
        result.rows.forEach(r => {
            console.log(`  - ${r.column_name} (${r.data_type}${r.character_maximum_length ? `(${r.character_maximum_length})` : ''})`);
        });

        // Check for purchase-related columns
        console.log('\n\nSearching for purchase-related columns:');
        const purchaseColumns = result.rows.filter(r =>
            r.column_name.includes('purchase') || r.column_name.includes('purch')
        );

        if (purchaseColumns.length > 0) {
            console.log('Found purchase-related columns:');
            purchaseColumns.forEach(r => {
                console.log(`  ✓ ${r.column_name} (${r.data_type})`);
            });
        } else {
            console.log('❌ NO purchase-related columns found!');
            console.log('   Missing: purchase_organization, purchasing_group');
        }

        // Check a sample material record
        console.log('\n\nChecking sample material record:');
        const sampleResult = await pool.query(`
      SELECT * FROM materials LIMIT 1
    `);

        if (sampleResult.rows.length > 0) {
            const sample = sampleResult.rows[0];
            console.log('Sample material keys:', Object.keys(sample).join(', '));
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
