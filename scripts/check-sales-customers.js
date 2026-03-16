import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkSalesCustomers() {
    try {
        const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'sales_customers'
      ORDER BY ordinal_position
    `);

        console.log('=== SALES_CUSTOMERS TABLE COLUMNS ===\n');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Check if sales_office column exists
        const salesOfficeCol = columns.rows.find(c => c.column_name.includes('office'));

        if (salesOfficeCol) {
            console.log(`\n✅ Found: ${salesOfficeCol.column_name}`);
        } else {
            console.log('\n❌ No sales office column found in sales_customers');
        }

        // Get sample customer
        const sample = await pool.query(`SELECT * FROM sales_customers LIMIT 1`);
        if (sample.rows.length > 0) {
            console.log('\nSample customer columns:');
            console.log(Object.keys(sample.rows[0]).join(', '));
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSalesCustomers();
