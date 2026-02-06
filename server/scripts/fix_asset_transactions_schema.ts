
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

async function fixAssetTransactionsSchema() {
    const client = await pool.connect();
    try {
        console.log('Fixing asset_transactions schema...');

        await client.query('BEGIN');

        // Add missing columns referenced in capitalization service
        const columns = [
            'ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS fiscal_year INTEGER',
            'ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS fiscal_period INTEGER'
        ];

        for (const query of columns) {
            console.log(`Executing: ${query}`);
            await client.query(query);
        }

        await client.query('COMMIT');
        console.log('Successfully updated asset_transactions schema.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error fixing asset_transactions schema:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

fixAssetTransactionsSchema();
