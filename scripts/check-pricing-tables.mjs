// Check pricing_procedures table structure in detail
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function checkTables() {
    const client = await pool.connect();

    try {
        console.log('📋 Checking pricing_procedures table...\n');

        const cols1 = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'pricing_procedures'
      ORDER BY ordinal_position
    `);

        console.log('pricing_procedures columns:');
        cols1.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        console.log('\n📋 Checking sd_pricing_procedures table...\n');

        const cols2 = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'sd_pricing_procedures'
      ORDER BY ordinal_position
    `);

        console.log('sd_pricing_procedures columns:');
        cols2.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        console.log('\n📋 Checking pricing_procedure_steps table...\n');

        const steps = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%pricing%step%'
    `);

        console.log('Pricing step tables:');
        steps.rows.forEach(t => console.log(`  - ${t.table_name}`));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTables();
