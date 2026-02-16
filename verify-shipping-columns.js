// Verify columns in sd_shipping_conditions
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkColumns() {
    try {
        console.log('Checking columns in sd_shipping_conditions...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sd_shipping_conditions'
        `);

        const columns = res.rows.map(r => r.column_name);
        console.log('Current columns:', columns);

        const removed = ['description', 'plant_code', 'proposed_shipping_point'];
        const present = columns.filter(c => removed.includes(c));

        if (present.length === 0) {
            console.log('✅ Success: Target columns are removed.');
        } else {
            console.error('❌ Failure: Some columns still exist:', present);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkColumns();
