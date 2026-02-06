// Simple migration runner - uses existing database config
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
    host: 'localhost',
    port: 5432,
    database: 'myerp',
    user: 'postgres',
    password: 'EasyLifeSolutions'
});

async function runMigration() {
    try {
        console.log('📊 Running payment proposal workflow migration...');

        const sqlPath = path.join(__dirname, '../database/migrations/1003-payment-proposal-workflow.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('   - Created payment_proposals table');
        console.log('   - Created payment_proposal_items table');
        console.log('   - Created payment_approval_workflows table');
        console.log('   - Created payment_approval_signatures table');
        console.log('   - Created payment_exceptions table');
        console.log('   - Created payment_audit_logs table');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
