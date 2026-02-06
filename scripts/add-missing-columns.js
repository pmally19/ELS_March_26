import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function addMissingColumns() {
    console.log('🔧 ADDING ALL MISSING COLUMNS\n');
    console.log('='.repeat(80));

    try {
        const requiredColumns = [
            { name: 'customer_id', type: 'INTEGER NOT NULL REFERENCES erp_customers(id)', default: null },
            { name: 'tax_amount', type: 'NUMERIC(15,2)', default: '0' },
            { name: 'net_amount', type: 'NUMERIC(15,2)', default: '0' },
            { name: 'approval_status', type: 'VARCHAR(20)', default: "'PENDING'" },
            { name: 'approved_by', type: 'INTEGER', default: null },
            { name: 'approved_at', type: 'TIMESTAMP', default: null },
            { name: 'company_code_id', type: 'INTEGER REFERENCES company_codes(id)', default: null },
            { name: 'currency', type: 'VARCHAR(3)', default: "'USD'" },
            { name: 'updated_by', type: 'INTEGER', default: null }
        ];

        console.log('\nChecking and adding missing columns to sales_returns:\n');

        for (const col of requiredColumns) {
            // Check if column exists
            const exists = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'sales_returns'
        AND column_name = $1
      `, [col.name]);

            if (exists.rows.length === 0) {
                // Add column
                let sql = `ALTER TABLE sales_returns ADD COLUMN ${col.name} ${col.type}`;
                if (col.default !== null) {
                    sql += ` DEFAULT ${col.default}`;
                }

                try {
                    await pool.query(sql);
                    console.log(`  ✅ Added ${col.name} (${col.type})`);
                } catch (error) {
                    console.log(`  ⚠️  ${col.name}: ${error.message}`);
                }
            } else {
                console.log(`  ✓  ${col.name} already exists`);
            }
        }

        // Now fix sales_return_items
        console.log('\n\nChecking sales_return_items table:\n');

        const itemColumns = [
            { name: 'sales_order_item_id', type: 'INTEGER REFERENCES sales_order_items(id)', default: null },
            { name: 'billing_item_id', type: 'INTEGER REFERENCES billing_items(id)', default: null },
            { name: 'unit_price', type: 'NUMERIC(15,2)', default: '0' },
            { name: 'total_amount', type: 'NUMERIC(15,2)', default: '0' },
            { name: 'tax_amount', type: 'NUMERIC(15,2)', default: '0' },
            { name: 'return_reason', type: 'VARCHAR(200)', default: null },
            { name: 'condition', type: 'VARCHAR(50)', default: null },
            { name: 'disposition', type: 'VARCHAR(50)', default: null },
            { name: 'plant_id', type: 'INTEGER REFERENCES plants(id)', default: null },
            { name: 'storage_location_id', type: 'INTEGER REFERENCES storage_locations(id)', default: null }
        ];

        for (const col of itemColumns) {
            const exists = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'sales_return_items'
        AND column_name = $1
      `, [col.name]);

            if (exists.rows.length === 0) {
                let sql = `ALTER TABLE sales_return_items ADD COLUMN ${col.name} ${col.type}`;
                if (col.default !== null) {
                    sql += ` DEFAULT ${col.default}`;
                }

                try {
                    await pool.query(sql);
                    console.log(`  ✅ Added ${col.name} (${col.type})`);
                } catch (error) {
                    console.log(`  ⚠️  ${col.name}: ${error.message}`);
                }
            } else {
                console.log(`  ✓  ${col.name} already exists`);
            }
        }

        console.log('\n✅ Schema update complete!');
        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

addMissingColumns();
