import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function runMigrations() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RUNNING SAP WORKFLOW MIGRATIONS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const migrations = [
        'add-atp-fields-to-sales-orders.sql',
        'create-production-confirmations-table.sql',
        'create-mrp-runs-table.sql'
    ];

    try {
        for (const migration of migrations) {
            const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migration);

            console.log(`\nRunning migration: ${migration}...`);

            if (!fs.existsSync(migrationPath)) {
                console.log(`⚠️  Migration file not found: ${migrationPath}`);
                continue;
            }

            const sql = fs.readFileSync(migrationPath, 'utf8');

            try {
                await pool.query(sql);
                console.log(`✅ Migration ${migration} completed successfully`);
            } catch (error) {
                console.error(`❌ Migration ${migration} failed:`, error.message);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('MIGRATION RUN COMPLETE');
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await pool.end();
    }
}

runMigrations();
