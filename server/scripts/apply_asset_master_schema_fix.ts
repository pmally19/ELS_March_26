
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function applySchemaFix() {
    const client = await pool.connect();
    try {
        console.log('Starting schema fix for asset_master...');

        await client.query('BEGIN');

        // Add missing columns
        const columns = [
            'ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS created_by INTEGER',
            'ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS plant_id INTEGER',
            'ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS parent_asset_id INTEGER',
            'ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS is_auc BOOLEAN DEFAULT false',
            'ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS depreciation_start_date DATE',
            'ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(50)', // Ensure this exists too as checked before
            'ALTER TABLE asset_master ADD COLUMN IF NOT EXISTS useful_life_years INTEGER' // Ensure this exists
        ];

        for (const query of columns) {
            console.log(`Executing: ${query}`);
            await client.query(query);
        }

        await client.query('COMMIT');
        console.log('Successfully applied all schema changes.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error applying schema fix:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

applySchemaFix();
