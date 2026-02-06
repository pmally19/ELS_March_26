import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,  // Changed from 6543 to standard postgres port
    database: 'mallyerp',
    user: 'postgres.jbbwsxoafqbohwusbxkk',
    password: 'Mokshith@21',
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        console.log('Checking invoice tables in database...\n');

        const vi = await pool.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vendor_invoices')`);
        const ap = await pool.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts_payable')`);

        console.log('=== TABLE EXISTENCE ===');
        console.log(`vendor_invoices: ${vi.rows[0].exists ? 'YES' : 'NO'}`);
        console.log(`accounts_payment: ${ap.rows[0].exists ? 'YES' : 'NO'}`);

        if (vi.rows[0].exists) {
            const count = await pool.query('SELECT COUNT(*) as count FROM vendor_invoices');
            console.log(`\nvendor_invoices records: ${count.rows[0].count}`);
        }

        if (ap.rows[0].exists) {
            const count = await pool.query('SELECT COUNT(*) as count FROM accounts_payable');
            console.log(`accounts_payable records: ${count.rows[0].count}`);
        }

        console.log('\n=== RECOMMENDATION ===');
        if (vi.rows[0].exists && !ap.rows[0].exists) {
            console.log('Use vendor_invoices + create VIEW for accounts_payable');
        } else if (ap.rows[0].exists && !vi.rows[0].exists) {
            console.log('Use accounts_payable + create VIEW for vendor_invoices');
        } else if (vi.rows[0].exists && ap.rows[0].exists) {
            console.log('BOTH exist - need to merge!');
        } else {
            console.log('NEITHER exists - critical error!');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
