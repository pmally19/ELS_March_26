
import { pool } from '../db';

async function migrate() {
    console.log('🔧 Starting migration: Adding FI columns to debit_memos...');

    try {
        // Add document_date
        await pool.query(`
      ALTER TABLE debit_memos 
      ADD COLUMN IF NOT EXISTS document_date DATE;
    `);
        console.log('✅ Added column: document_date');

        // Add company_code_id
        await pool.query(`
      ALTER TABLE debit_memos 
      ADD COLUMN IF NOT EXISTS company_code_id INTEGER;
    `);
        console.log('✅ Added column: company_code_id');

        // Add reference
        await pool.query(`
      ALTER TABLE debit_memos 
      ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
    `);
        console.log('✅ Added column: reference');

        // Add currency if not exists (it should exist based on previous code, but safe to check)
        await pool.query(`
      ALTER TABLE debit_memos 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
    `);
        console.log('✅ Checked column: currency');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
