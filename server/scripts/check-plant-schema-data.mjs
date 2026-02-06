
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp',
});

async function checkPlantTable() {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'plants'
    `);
        console.log('Plants Table Schema:', result.rows);

        // Also check first few rows to see data
        const dataResult = await pool.query('SELECT * FROM plants LIMIT 3');
        console.log('Sample Data:', dataResult.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkPlantTable();
