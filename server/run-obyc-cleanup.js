import { pool } from './db.js';
import fs from 'fs';

const migrationSQL = fs.readFileSync('./server/migrations/013_remove_account_category_reference_from_obyc.sql', 'utf8');

async function runMigration() {
    try {
        console.log('🔧 Running migration: 013_remove_account_category_reference_from_obyc.sql\n');
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully!');
        console.log('   Removed account_category_reference_id from material_account_determination table');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
