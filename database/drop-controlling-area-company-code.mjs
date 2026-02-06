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
    user: 'postgres',
    password: 'Mokshith@21',
});

async function dropCompanyCodeFromControllingAreas() {
    const client = await pool.connect();

    try {
        console.log('🗑️  Starting removal of company_code_id from management_control_areas...');

        // Read and execute the SQL migration file
        const sqlPath = join(__dirname, 'migrations', 'drop-company-code-from-controlling-areas.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        await client.query(sql);

        console.log('✅ Successfully removed company_code_id column');
        console.log('✅ Dropped index and foreign key constraint');

    } catch (error) {
        console.error('❌ Error removing column:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
dropCompanyCodeFromControllingAreas()
    .then(() => {
        console.log('✅ Migration completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
