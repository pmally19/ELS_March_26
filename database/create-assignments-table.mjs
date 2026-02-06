import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection configuration
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres', // Based on user update
    password: 'Mokshith@21',
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Running migration: create-controlling-area-assignments...');

        // Read and execute the SQL migration file
        const sqlPath = join(__dirname, 'migrations', 'create-controlling-area-assignments.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        await client.query(sql);

        console.log('✅ Successfully created controlling_area_company_assignments table');

    } catch (error) {
        console.error('❌ Error running migration:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('✅ Migration completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
