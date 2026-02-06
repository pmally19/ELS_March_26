import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function checkPlantColumns() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'materials' 
            AND (column_name LIKE '%plant%' OR column_name = 'production_storage_location')
            ORDER BY ordinal_position
        `);

        console.log('\n=== Plant-related columns in materials table ===\n');
        if (result.rows.length === 0) {
            console.log('No plant-related columns found.');
        } else {
            result.rows.forEach(row => {
                console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });
        }

        console.log('\n');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPlantColumns();
