import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres.jbbwsxoafqbohwusbxkk',
    password: process.env.DB_PASSWORD || 'Mokshith@21',
    ssl: { rejectUnauthorized: false }
});

async function runMigration(filePath, migrationName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${migrationName}`);
    console.log('='.repeat(60));

    try {
        // Read migration file
        const sql = fs.readFileSync(filePath, 'utf8');

        // Execute migration
        await pool.query(sql);

        console.log(`✅ SUCCESS: ${migrationName} completed`);
        return true;
    } catch (error) {
        console.error(`❌ ERROR in ${migrationName}:`);
        console.error(error.message);
        return false;
    }
}

async function runMigrations() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     AP WORKFLOW P0 FIXES - DATABASE MIGRATION          ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    try {
        // Test connection
        console.log('\nTesting database connection...');
        await pool.query('SELECT current_database()');
        console.log('✅ Connected to database: mallyerp');

        const migrationsDir = path.join(__dirname, 'migrations');

        // Migration 1105: vendor_invoices VIEW
        const migration1105 = path.join(migrationsDir, '1105-create-vendor-invoices-view.sql');
        const success1105 = await runMigration(migration1105, 'Migration 1105: vendor_invoices VIEW');

        if (!success1105) {
            console.log('\n⚠️  Migration 1105 failed. Stopping...');
            process.exit(1);
        }

        // Migration 1106: company_code_chart_assignments table
        const migration1106 = path.join(migrationsDir, '1106-create-company-code-chart-assignments.sql');
        const success1106 = await runMigration(migration1106, 'Migration 1106: company_code_chart_assignments');

        if (!success1106) {
            console.log('\n⚠️  Migration 1106 failed.');
            process.exit(1);
        }

        // Verify migrations
        console.log(`\n${'='.repeat(60)}`);
        console.log('VERIFICATION');
        console.log('='.repeat(60));

        // Check vendor_invoices VIEW
        const viewCheck = await pool.query(`
      SELECT COUNT(*) as count FROM vendor_invoices
    `);
        console.log(`✅ vendor_invoices VIEW: ${viewCheck.rows[0].count} records`);

        // Check company_code_chart_assignments table
        const tableCheck = await pool.query(`
      SELECT COUNT(*) as count FROM company_code_chart_assignments
    `);
        console.log(`✅ company_code_chart_assignments table: ${tableCheck.rows[0].count} assignments`);

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║     ✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!          ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('Next steps:');
        console.log('1. Test invoice creation (three-way match will auto-run)');
        console.log('2. Test invoice approval (Approve button should appear)');
        console.log('3. Test payment creation (should work without 500 error)');

    } catch (error) {
        console.error('\n❌ FATAL ERROR:');
        console.error(error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
