import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function runMigration() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync('database/migrations/2026-01-02_fix_depreciation_areas_integration.sql', 'utf8');

        console.log('🔧 Running depreciation areas integration migration...\n');
        await client.query(sql);
        console.log('✅ Migration completed successfully!');

        // Verify changes
        const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'depreciation_areas' 
      AND column_name IN ('posting_indicator', 'ledger_group', 'currency_type', 'fiscal_year_variant_id', 'base_method', 'period_control')
      ORDER BY column_name
    `);

        console.log('\n📋 New fields added to depreciation_areas:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
