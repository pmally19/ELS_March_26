import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkCustomerTable() {
    const client = await pool.connect();
    try {
        const tableName = 'erp_customers';
        console.log(`🔍 Checking '${tableName}' table structure...\n`);

        // Get table structure
        const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

        if (result.rows.length === 0) {
            console.log(`❌ Table '${tableName}' does not exist or has no columns\n`);
            return;
        }

        console.log('📋 ERP Customers Table Columns:\n');
        console.log('Column Name'.padEnd(40), 'Data Type'.padEnd(25), 'Nullable'.padEnd(10), 'Max Length');
        console.log('='.repeat(100));

        result.rows.forEach(row => {
            const highlight = row.column_name.includes('sales_office') || row.column_name.includes('sales_group') ? '👉 ' : '   ';
            console.log(
                highlight + row.column_name.padEnd(37),
                row.data_type.padEnd(25),
                row.is_nullable.padEnd(10),
                row.character_maximum_length || 'N/A'
            );
        });

        console.log('\n' + '='.repeat(100));

        // Check specifically for sales_office_code
        const salesOfficeColumn = result.rows.find(row => row.column_name === 'sales_office_code');

        if (salesOfficeColumn) {
            console.log('\n✅ sales_office_code column EXISTS');
            console.log(`   Type: ${salesOfficeColumn.data_type}`);
            console.log(`   Max Length: ${salesOfficeColumn.character_maximum_length || 'N/A'}`);
            console.log(`   Nullable: ${salesOfficeColumn.is_nullable}`);
            console.log(`   Default: ${salesOfficeColumn.column_default || 'None'}`);
        } else {
            console.log('\n❌ sales_office_code column DOES NOT EXIST');
            console.log('\n🔧 SQL to add the column:');
            console.log('   ALTER TABLE erp_customers ADD COLUMN sales_office_code VARCHAR(4);');
        }

        // Check for sales_group_code
        const salesGroupColumn = result.rows.find(row => row.column_name === 'sales_group_code');
        if (salesGroupColumn) {
            console.log('\n✅ sales_group_code column EXISTS');
            console.log(`   Type: ${salesGroupColumn.data_type}`);
            console.log(`   Max Length: ${salesGroupColumn.character_maximum_length || 'N/A'}`);
            console.log(`   Nullable: ${salesGroupColumn.is_nullable}`);
        } else {
            console.log('\n❌ sales_group_code column DOES NOT EXIST');
        }

        // Get sample customer data
        console.log('\n\n📊 Sample Customer Data (first 5 rows):');
        try {
            const columnsList = salesOfficeColumn ?
                'id, name, code, sales_office_code' :
                'id, name, code';

            const sampleData = await client.query(`
        SELECT ${columnsList}
        FROM ${tableName}
        LIMIT 5
      `);

            if (sampleData.rows.length > 0) {
                console.table(sampleData.rows);
            } else {
                console.log('   No customers found in database');
            }
        } catch (err) {
            console.log('   ⚠️  Could not fetch sample data:', err.message);
        }

        // Count total customers
        try {
            const countResult = await client.query(`SELECT COUNT(*) as total FROM ${tableName}`);
            console.log(`\n📊 Total customers in database: ${countResult.rows[0].total}`);
        } catch (err) {
            console.log('   Could not count customers');
        }

        // If column doesn't exist, offer to create it
        if (!salesOfficeColumn) {
            console.log('\n\n🔧 RECOMMENDATION:');
            console.log('   Run the following SQL to add sales_office_code column:');
            console.log('   ');
            console.log('   ALTER TABLE erp_customers ADD COLUMN sales_office_code VARCHAR(4);');
            console.log('   ALTER TABLE erp_customers ADD COLUMN sales_group_code VARCHAR(3);');
            console.log('   ');
            console.log('   This will allow the sales order form to auto-fill sales office from customer master data.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nFull error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCustomerTable();
