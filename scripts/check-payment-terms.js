import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkPaymentTerms() {
    try {
        // Check for payment terms tables
        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%payment%term%'
      ORDER BY table_name
    `);

        console.log('=== PAYMENT TERMS TABLES ===');
        if (tablesResult.rows.length > 0) {
            tablesResult.rows.forEach(r => console.log('  -', r.table_name));
        } else {
            console.log('  No payment terms tables found');
        }

        // Check payment_terms table structure if it exists
        const columnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'payment_terms'
      ORDER BY ordinal_position
    `);

        if (columnsResult.rows.length > 0) {
            console.log('\n=== PAYMENT_TERMS TABLE COLUMNS ===');
            columnsResult.rows.forEach(r => {
                console.log(`  - ${r.column_name} (${r.data_type})`);
            });
        }

        // Check sample data
        const dataResult = await pool.query(`
      SELECT * FROM payment_terms LIMIT 5
    `);

        console.log('\n=== SAMPLE PAYMENT TERMS DATA ===');
        console.log(`Found ${dataResult.rows.length} records`);
        dataResult.rows.forEach(r => {
            console.log(`  ${r.code || r.id}: ${r.description || r.name}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPaymentTerms();
