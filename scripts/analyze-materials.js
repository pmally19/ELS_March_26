import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function analyzeMaterialsSchema() {
    try {
        console.log('=== ANALYZING MATERIALS TABLE ===\n');

        // Get actual column list
        const colQuery = `SELECT column_name FROM information_schema.columns WHERE table_name = 'materials' ORDER BY ordinal_position;`;
        const cols = await pool.query(colQuery);
        console.log('All columns:', cols.rows.map(r => r.column_name).join(', '));

        // Check if specific columns exist
        const checkCols = [
            'id', 'description', 'material_type', 'material_group',
            'plant_code', 'purchasing_group', 'cost_center', 'purchase_organization',
            'production_storage_location', 'base_uom', 'standard_price'
        ];

        console.log('\n=== CHECKING KEY COLUMNS ===');
        for (const col of checkCols) {
            const exists = cols.rows.some(r => r.column_name === col);
            console.log(`${exists ? '✓' : '✗'} ${col}`);
        }

        // Get sample data
        const sampleQuery = 'SELECT * FROM materials LIMIT 2;';
        const sample = await pool.query(sampleQuery);
        console.log('\n=== SAMPLE DATA (2 rows) ===');
        if (sample.rows.length > 0) {
            console.log('Row 1 keys:', Object.keys(sample.rows[0]).join(', '));
            console.table(sample.rows);
        }

        // Check related tables
        const tables = ['plants', 'cost_centers', 'purchasing_groups', 'purchasing_organizations', 'material_groups', 'storage_locations'];
        console.log('\n=== RELATED TABLES ===');
        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const colResult = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 LIMIT 10`, [table]);
                console.log(`✓ ${table}: ${result.rows[0].count} rows, columns: ${colResult.rows.map(r => r.column_name).join(', ')}`);
            } catch (err) {
                console.log(`✗ ${table}: ${err.message}`);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

analyzeMaterialsSchema();
