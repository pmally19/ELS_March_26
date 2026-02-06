// Check actual company_codes table schema
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function checkSchema() {
    const client = await pool.connect();

    try {
        console.log('📋 Checking company_codes table schema...\n');

        const columns = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'company_codes'
      ORDER BY ordinal_position
    `);

        console.log('company_codes columns:');
        columns.rows.forEach((col, idx) => {
            const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            console.log(`  ${idx + 1}. ${col.column_name}: ${col.data_type}${maxLen}`);
        });

        console.log('\n📋 Checking pricing_procedures table...\n');

        const pricingTables = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%pricing%'
      ORDER BY table_name
    `);

        console.log('Pricing-related tables/views:');
        pricingTables.rows.forEach(t => {
            console.log(`  - ${t.table_name} (${t.table_type})`);
        });

        // Check pricing_procedures schema
        const pricingCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('pricing_procedures', 'sd_pricing_procedures')
      ORDER BY table_name, ordinal_position
    `);

        console.log('\nPricing procedures columns:');
        pricingCols.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();
