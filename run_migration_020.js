
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration based on user input
// Password "Mokshith@21" needs to be URL encoded: "Mokshith%4021"
const connectionString = "postgres://postgres:Mokshith%4021@localhost:5432/mallyerp";

const dbConfig = {
    connectionString: connectionString,
};

async function runMigration() {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();

    try {
        const migrationFile = path.join(__dirname, 'server', 'migrations', '020_create_shipping_point_determination.sql');
        console.log(`Reading migration file: ${migrationFile}`);

        const migrationSql = fs.readFileSync(migrationFile, 'utf8');
        console.log('Executing migration...');

        await client.query('BEGIN');
        await client.query(migrationSql);
        await client.query('COMMIT');

        console.log('Migration executed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
