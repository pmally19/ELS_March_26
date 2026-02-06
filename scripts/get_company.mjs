
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function getCompanyCodes() {
    try {
        const res = await pool.query('SELECT id, code, name FROM company_codes LIMIT 1');
        console.log('Company Code:', JSON.stringify(res.rows[0]));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

getCompanyCodes();

