
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function checkData() {
    try {
        const resPurchasing = await pool.query('SELECT count(*) FROM purchasing_groups');
        console.log(`Count in purchasing_groups: ${resPurchasing.rows[0].count}`);
        const rowsPurchasing = await pool.query('SELECT * FROM purchasing_groups LIMIT 5');
        console.log('Sample rows from purchasing_groups:', rowsPurchasing.rows);

        console.log('------------------------------------------------');

        const resPurchase = await pool.query('SELECT count(*) FROM purchase_groups');
        console.log(`Count in purchase_groups: ${resPurchase.rows[0].count}`);
        const rowsPurchase = await pool.query('SELECT * FROM purchase_groups LIMIT 5');
        console.log('Sample rows from purchase_groups:', rowsPurchase.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
