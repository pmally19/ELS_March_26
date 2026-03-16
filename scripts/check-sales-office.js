import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkSalesOrderSchema() {
    try {
        console.log('=== SALES ORDERS TABLE SCHEMA ===\n');

        // Check sales_orders columns
        const salesOrdersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sales_orders'
      ORDER BY ordinal_position
    `);

        console.log('Sales Orders Columns:');
        salesOrdersColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n=== CUSTOMERS TABLE - SALES OFFICE ===\n');

        // Check if customers table has sales_office
        const customersColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
        AND column_name LIKE '%sales%office%'
    `);

        if (customersColumns.rows.length > 0) {
            console.log('Sales office column in customers:');
            customersColumns.rows.forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('No sales_office column found in customers table');
        }

        // Check sample customer data
        const sampleCustomer = await pool.query(`
      SELECT * FROM customers LIMIT 1
    `);

        if (sampleCustomer.rows.length > 0) {
            console.log('\nSample customer columns:');
            console.log(Object.keys(sampleCustomer.rows[0]).join(', '));
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSalesOrderSchema();
