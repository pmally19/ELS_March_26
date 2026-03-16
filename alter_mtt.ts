import { ensureActivePool } from './server/database';

async function run() {
    const pool = ensureActivePool();
    try {
        await pool.query('ALTER TABLE movement_transaction_types ADD COLUMN IF NOT EXISTS "_tenantId" VARCHAR(10) DEFAULT \'001\', ADD COLUMN IF NOT EXISTS created_by INTEGER DEFAULT 1, ADD COLUMN IF NOT EXISTS updated_by INTEGER DEFAULT 1, ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMP WITH TIME ZONE');
        console.log('Success altering table');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();
