import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same credentials as the main application
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';
const dbName = process.env.DB_NAME || 'mallyerp';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: dbName,
    user: 'postgres',
    password: dbPassword
});

async function runMigration() {
    try {
        console.log('📊 Starting payment proposal workflow migration...');
        console.log(`   Database: ${dbName}`);

        const sqlPath = path.join(__dirname, '../database/migrations/1003-payment-proposal-workflow.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('   Executing SQL migration...');
        await pool.query(sql);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📋 Tables created:');
        console.log('   1. payment_proposals');
        console.log('   2. payment_proposal_items');
        console.log('   3. payment_approval_workflows');
        console.log('   4. payment_approval_signatures');
        console.log('   5. payment_exceptions');
        console.log('   6. payment_audit_logs');
        console.log('\n✨ Payment proposal workflow is now ready to use!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.code) {
            console.error('   Error code:', error.code);
        }
        if (error.detail) {
            console.error('   Detail:', error.detail);
        }
        await pool.end();
        process.exit(1);
    }
}

runMigration();
