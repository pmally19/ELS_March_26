import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkVendorsTable() {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vendors'
      ORDER BY ordinal_position
    `);

        console.log('Vendors table columns:');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkVendorsTable();
