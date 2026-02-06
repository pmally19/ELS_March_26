import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function checkAndFixColumns() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'asset_transactions' 
            ORDER BY ordinal_position
        `);

        console.log('=== Current asset_transactions columns ===');
        result.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

        const existingColumns = result.rows.map(r => r.column_name);

        // Check and add missing columns
        const requiredColumns = [
            { name: 'from_cost_center_id', type: 'INTEGER REFERENCES cost_centers(id)' },
            { name: 'to_cost_center_id', type: 'INTEGER REFERENCES cost_centers(id)' },
            { name: 'from_company_code_id', type: 'INTEGER REFERENCES company_codes(id)' },
            { name: 'to_company_code_id', type: 'INTEGER REFERENCES company_codes(id)' },
        ];

        for (const col of requiredColumns) {
            if (!existingColumns.includes(col.name)) {
                console.log(`\n➕ Adding missing column: ${col.name}`);
                await pool.query(`ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                console.log(`✅ Added ${col.name}`);
            } else {
                console.log(`✅ Column ${col.name} already exists`);
            }
        }

        console.log('\n=== Migration complete ===');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkAndFixColumns();
