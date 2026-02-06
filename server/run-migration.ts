import { readFileSync } from 'fs';
import { join } from 'path';
import { dbPool } from './database.js';

async function runMigration() {
    const client = await dbPool.connect();

    try {
        console.log('🔄 Starting database migration...');

        // Read the SQL migration file
        const migrationPath = join(process.cwd(), 'database', 'migrations', 'add_period_closing_documents.sql');
        const sql = readFileSync(migrationPath, 'utf8');

        console.log('📄 Executing migration: add_period_closing_documents.sql');

        // Execute the migration
        await client.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('📊 Created tables:');
        console.log('   - period_closing_documents');
        console.log('   - daily_validation_runs');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await dbPool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('\n✨ Database is ready for Period End Closing features!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration error:', error.message);
        process.exit(1);
    });
