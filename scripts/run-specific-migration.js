
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/els_db",
};

async function runMigration() {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();

    try {
        const migrationFile = process.argv[2];

        if (!migrationFile) {
            console.error('Please provide a migration file name (e.g., 019_create_transportation_groups.sql)');
            process.exit(1);
        }

        const filePath = path.join(__dirname, '..', 'server', 'migrations', migrationFile);

        if (!fs.existsSync(filePath)) {
            console.error(`Migration file not found: ${filePath}`);
            process.exit(1);
        }

        console.log(`Running migration: ${migrationFile}...`);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log('Migration completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
