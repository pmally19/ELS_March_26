// Script to investigate vendor_invoices structure
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function investigate() {
    const client = await pool.connect();

    try {
        console.log('🔍 Investigating vendor_invoices structure...\n');

        // Check if it's a table or view
        const typeCheck = await client.query(`
      SELECT table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vendor_invoices'
    `);

        console.log('📋 vendor_invoices is a:', typeCheck.rows[0]?.table_type || 'NOT FOUND');

        if (typeCheck.rows[0]?.table_type === 'VIEW') {
            console.log('\n📖 Getting view definition...');
            const viewDef = await client.query(`
        SELECT pg_get_viewdef('vendor_invoices', true) as definition
      `);
            console.log('\nView Definition:');
            console.log(viewDef.rows[0].definition);
        }

        // Check for actual tables that might be the base
        console.log('\n🔍 Looking for similar table names...');
        const similarTables = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%invoice%' OR table_name LIKE '%vendor%')
      ORDER BY table_name
    `);

        console.log('\nFound tables/views:');
        similarTables.rows.forEach(t => {
            console.log(`  - ${t.table_name} (${t.table_type})`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

investigate();
