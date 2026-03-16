import { pool } from './db.js';
import fs from 'fs';

const migrationSQL = fs.readFileSync('./server/migrations/012_create_material_account_determination.sql', 'utf8');

async function runMigration() {
    try {
        console.log('🔧 Running migration: 012_create_material_account_determination.sql\n');
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully!');
        console.log('   Created material_account_determination table');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
