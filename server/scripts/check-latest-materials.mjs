
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp',
});

async function checkLatestMaterials() {
    try {
        const result = await pool.query(`
      SELECT 
        id, code, name, plant_code, 
        min_stock, max_stock, lead_time, 
        profit_center, cost_center, 
        purchase_organization, purchasing_group,
        production_storage_location, price_control
      FROM materials 
      ORDER BY id DESC
      LIMIT 5
    `);
        console.log('Latest 5 Materials:', result.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkLatestMaterials();
