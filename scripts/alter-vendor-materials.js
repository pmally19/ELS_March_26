import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log("Starting DB migration to add validity dates to vendor_materials...");

        // Add valid_from column if it doesn't exist
        await client.query(`
      ALTER TABLE vendor_materials 
      ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP;
    `);
        console.log("✅ Added valid_from column");

        // Add valid_to column if it doesn't exist
        await client.query(`
      ALTER TABLE vendor_materials 
      ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;
    `);
        console.log("✅ Added valid_to column");

        console.log("🎉 Migration completed successfully!");
    } catch (err) {
        console.error("❌ Migration failed", err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
