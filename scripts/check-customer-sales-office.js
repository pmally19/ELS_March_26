import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkCustomerMaster() {
    try {
        // Find customer-related tables
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%customer%'
      ORDER BY table_name
    `);

        console.log('=== CUSTOMER TABLES ===');
        tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

        // Check customer_master columns
        const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'customer_master'
      ORDER BY ordinal_position
    `);

        console.log('\n=== CUSTOMER_MASTER COLUMNS ===');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Check for sales_office columns
        const salesOfficeCol = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'customer_master' 
        AND column_name LIKE '%sales%'
    `);

        console.log('\n=== SALES-RELATED COLUMNS IN CUSTOMER_MASTER ===');
        salesOfficeCol.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Check sales_offices table
        const salesOfficesTable = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'sales_offices'
      ORDER BY ordinal_position
    `);

        console.log('\n=== SALES_OFFICES TABLE ===');
        if (salesOfficesTable.rows.length > 0) {
            salesOfficesTable.rows.forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });

            // Get sample data
            const sampleData = await pool.query(`SELECT * FROM sales_offices LIMIT 5`);
            console.log(`\nSample data (${sampleData.rows.length} records):`);
            sampleData.rows.forEach(row => {
                console.log(`  - ${row.code || row.id}: ${row.name || row.description || 'N/A'}`);
            });
        } else {
            console.log('  Table does not exist');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkCustomerMaster();
