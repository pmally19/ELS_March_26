import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting PR hardcoded data removal...\n');

        // Read migration file
        const fs = await import('fs/promises');
        const migration = await fs.readFile(
            'C:\\Users\\moksh\\Desktop\\28-10-2025\\database\\migrations\\1021-fix-pr-hardcoded-data.sql',
            'utf-8'
        );

        // Run migration
        await client.query(migration);

        console.log('✅ Migration completed successfully!');
        console.log('   - Removed default status \'O\' (SAP terminology)');
        console.log('   - Updated existing records');
        console.log('   - Added status constraints');
        console.log('   - Made currency_code required');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
