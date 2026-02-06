import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkMaterialTable() {
    try {
        console.log('Connecting to database...\n');

        // Get table structure
        const structureQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'materials'
      ORDER BY ordinal_position;
    `;

        const structure = await pool.query(structureQuery);
        console.log('=== MATERIAL TABLE STRUCTURE ===');
        console.table(structure.rows);

        // Get row count
        const countQuery = 'SELECT COUNT(*) as total_rows FROM materials;';
        const count = await pool.query(countQuery);
        console.log(`\n=== TOTAL MATERIALS: ${count.rows[0].total_rows} ===\n`);

        // Get sample data with key fields
        const dataQuery = `
      SELECT 
        id, material_number, description, material_type,
        material_group,
        plant_code,
        production_storage_location,
        base_uom,
        standard_price, moving_average_price,
        purchasing_group,
        cost_center,
        purchase_organization
      FROM materials 
      LIMIT 5;
    `;
        const data = await pool.query(dataQuery);
        console.log('=== SAMPLE MATERIAL DATA (First 5 rows) ===');
        console.table(data.rows);

        // Check related tables
        console.log('\n=== CHECKING RELATED TABLES ===\n');

        const tables = [
            'plants',
            'cost_centers',
            'purchasing_groups',
            'purchasing_organizations',
            'material_groups',
            'storage_locations'
        ];

        for (const table of tables) {
            try {
                const checkQuery = `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
          LIMIT 5;
        `;
                const result = await pool.query(checkQuery, [table]);
                if (result.rows.length > 0) {
                    console.log(`✓ Table '${table}' exists with columns:`, result.rows.map(r => r.column_name).join(', '));

                    // Get count
                    const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                    console.log(`  Rows: ${countResult.rows[0].count}`);
                }
            } catch (err) {
                console.log(`✗ Table '${table}' does not exist or is not accessible`);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
        console.log('\nDatabase connection closed.');
    }
}

checkMaterialTable();
