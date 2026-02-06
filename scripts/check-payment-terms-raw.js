import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function checkPaymentTermsData() {
    try {
        const result = await pool.query(`SELECT * FROM payment_terms ORDER BY id`);

        console.log('=== PAYMENT TERMS RAW DATA ===\n');
        result.rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`  payment_term_key: ${row.payment_term_key || '(NULL)'}`);
            console.log(`  description: ${row.description}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPaymentTermsData();
