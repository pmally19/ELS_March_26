
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function checkTables() {
    try {
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%purchas%'
    `);

        console.log('Tables matching "purchas":');
        res.rows.forEach(row => console.log(row.table_name));

        // Also check for columns in materials table related to this
        const res2 = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'materials' AND column_name LIKE '%purchas%'
    `);
        console.log('\nColumns in "materials" matching "purchas":');
        res2.rows.forEach(row => console.log(`${row.column_name} (${row.data_type})`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTables();
