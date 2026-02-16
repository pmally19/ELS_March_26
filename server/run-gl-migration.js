import { pool } from './db.js';
import fs from 'fs';

const migrationSQL = fs.readFileSync('./database/migrations/add-chart-of-accounts-to-gl-accounts.sql', 'utf8');

async function runMigration() {
    try {
        console.log('Running migration: add-chart-of-accounts-to-gl-accounts.sql');
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
