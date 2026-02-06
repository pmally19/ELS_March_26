import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database credentials
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting Purchase Requisition Items Migration...\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'fix-purchase-requisition-items-columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Executing migration SQL...');

        // Execute migration
        await client.query(migrationSQL);

        console.log('✅ Migration executed successfully!\n');

        // Verify columns were added
        console.log('🔍 Verifying new columns...\n');

        const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'purchase_requisition_items'
      ORDER BY ordinal_position
    `);

        console.log('📊 Current Schema (purchase_requisition_items):');
        console.log('='.repeat(80));
        verifyResult.rows.forEach((col, idx) => {
            const nullable = col.is_nullable === 'YES' ? '✓ NULL' : '✗ NOT NULL';
            console.log(`${(idx + 1).toString().padStart(2)}. ${col.column_name.padEnd(35)} ${col.data_type.padEnd(20)} ${nullable}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(`✅ Total columns: ${verifyResult.rows.length}`);

        // Check for the critical new columns
        const newColumns = [
            'material_code', 'material_name', 'description', 'unit_of_measure',
            'material_group', 'storage_location', 'purchasing_group', 'purchasing_org',
            'cost_center', 'plant_id', 'estimated_unit_price'
        ];

        const existingColumns = verifyResult.rows.map(r => r.column_name);
        const foundColumns = newColumns.filter(col => existingColumns.includes(col));
        const missingColumns = newColumns.filter(col => !existingColumns.includes(col));

        console.log(`\n✅ New columns added: ${foundColumns.length}/${newColumns.length}`);

        if (missingColumns.length > 0) {
            console.log('⚠️  Still missing:', missingColumns.join(', '));
        } else {
            console.log('🎉 All required columns are now present!\n');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
