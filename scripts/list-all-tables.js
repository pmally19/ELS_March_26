const pg = require('pg');

const pool = new pg.Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function getAllTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE' 
            ORDER BY table_name
        `);

        console.log('=== ALL DATABASE TABLES (' + result.rows.length + ' total) ===\n');

        result.rows.forEach((row, index) => {
            console.log((index + 1) + '. ' + row.table_name);
        });

        pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        pool.end();
    }
}

getAllTables();
