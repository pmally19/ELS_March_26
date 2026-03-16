import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function check() {
    try {
        const res1 = await pool.query("SELECT * FROM document_types WHERE document_type_code IN ('WE', 'KR')");
        console.log('Doc Types:', JSON.stringify(res1.rows, null, 2));

        const res2 = await pool.query("SELECT * FROM number_ranges WHERE number_range_code IN ('01', '50', '51', 'RN', 'WE', 'KR')");
        console.log('\nNum Ranges:', JSON.stringify(res2.rows, null, 2));

        const res3 = await pool.query("SELECT * FROM movement_types WHERE movement_type_code IN ('101')");
        console.log('\nMov Types:', JSON.stringify(res3.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
