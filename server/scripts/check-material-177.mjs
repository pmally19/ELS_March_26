
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp',
});

async function checkMaterial() {
    try {
        const result = await pool.query(`
      SELECT 
        id, code, plant_code, 
        min_stock, max_stock, lead_time, 
        profit_center, cost_center, 
        purchase_organization, purchasing_group,
        production_storage_location, price_control
      FROM materials 
      WHERE id = 177
    `);
        console.log('Material 177 Data:', result.rows[0]);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkMaterial();
