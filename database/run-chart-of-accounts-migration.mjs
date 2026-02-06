import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running Chart of Accounts migration for Company Codes...\n');

        await client.query('BEGIN');

        // Read and execute the migration file
        const migrationSQL = readFileSync(
            join(__dirname, 'migrations/2026-01-02_add_chart_of_accounts_to_company_codes.sql'),
            'utf-8'
        );

        await client.query(migrationSQL);

        // Verify the column was added
        const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'company_codes'
        AND column_name = 'chart_of_accounts_id'
    `);

        if (verifyResult.rows.length > 0) {
            console.log('✅ Migration successful!');
            console.log('\nColumn details:');
            console.log(`  - Column: ${verifyResult.rows[0].column_name}`);
            console.log(`  - Data Type: ${verifyResult.rows[0].data_type}`);
            console.log(`  - Nullable: ${verifyResult.rows[0].is_nullable}`);
        } else {
            throw new Error('Column was not created');
        }

        // Verify FK constraint
        const fkResult = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'company_codes'
        AND constraint_name = 'fk_company_codes_chart_of_accounts'
        AND constraint_type = 'FOREIGN KEY'
    `);

        if (fkResult.rows.length > 0) {
            console.log(`\n✅ Foreign key constraint created: ${fkResult.rows[0].constraint_name}`);
        }

        await client.query('COMMIT');
        console.log('\n🎉 Migration completed successfully!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
