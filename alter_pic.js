import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/els_feb_12'
});

async function runMigration() {
    try {
        await pool.query(`
      ALTER TABLE purchasing_item_categories 
      ADD COLUMN IF NOT EXISTS "_tenantId" VARCHAR(10) DEFAULT '001', 
      ADD COLUMN IF NOT EXISTS created_by INTEGER DEFAULT 1, 
      ADD COLUMN IF NOT EXISTS updated_by INTEGER DEFAULT 1, 
      ADD COLUMN IF NOT EXISTS "_deletedAt" TIMESTAMP WITH TIME ZONE
    `);
        console.log('Migration successful');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
