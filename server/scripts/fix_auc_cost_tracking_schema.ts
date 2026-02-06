
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

async function fixAucCostTrackingSchema() {
    const client = await pool.connect();
    try {
        console.log('Fixing auc_cost_tracking schema...');

        await client.query('BEGIN');

        // Add missing columns referenced in capitalization service
        const columns = [
            'ALTER TABLE auc_cost_tracking ADD COLUMN IF NOT EXISTS settled_asset_id INTEGER',
            'ALTER TABLE auc_cost_tracking ADD COLUMN IF NOT EXISTS settlement_document_number VARCHAR(50)',
            'ALTER TABLE auc_cost_tracking ADD COLUMN IF NOT EXISTS settlement_date TIMESTAMP',
            'ALTER TABLE auc_cost_tracking ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT false',
            // Ensure description exists as it's updated too
            'ALTER TABLE auc_cost_tracking ADD COLUMN IF NOT EXISTS description TEXT'
        ];

        for (const query of columns) {
            console.log(`Executing: ${query}`);
            await client.query(query);
        }

        await client.query('COMMIT');
        console.log('Successfully updated auc_cost_tracking schema.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error fixing auc_cost_tracking schema:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

fixAucCostTrackingSchema();
