import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function findInvoiceTables() {
    const client = await pool.connect();

    try {
        console.log('='.repeat(80));
        console.log('SEARCHING FOR INVOICE-RELATED TABLES');
        console.log('='.repeat(80));

        // Find all tables related to invoices
        const allTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (table_name LIKE '%invoice%' OR table_name LIKE '%payment%' OR table_name LIKE '%vendor%')
      ORDER BY table_name;
    `);

        console.log('\n📋 Found tables:');
        console.table(allTables.rows);

        // List ALL tables
        console.log('\n' + '='.repeat(80));
        console.log('ALL TABLES IN DATABASE');
        console.log('='.repeat(80));

        const allDbTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

        console.log('\n📋 All tables:');
        console.table(allDbTables.rows);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

findInvoiceTables();
