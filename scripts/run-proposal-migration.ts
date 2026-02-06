import { pool } from '../server/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
    try {
        console.log('📊 Running payment proposal workflow migration...');

        const sql = readFileSync(
            join(__dirname, '../database/migrations/1003-payment-proposal-workflow.sql'),
            'utf8'
        );

        await pool.query(sql);

        console.log('✅ Migration completed successfully');
        console.log('   - Created payment_proposals table');
        console.log('   - Created payment_proposal_items table');
        console.log('   - Created payment_approval_workflows table');
        console.log('   - Created payment_approval_signatures table');
        console.log('   - Created payment_exceptions table  ');
        console.log('   - Created payment_audit_logs table');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runMigration();
