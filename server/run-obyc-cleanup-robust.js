import { pool } from './db.js';

const migrationSQL = `
-- Drop the unique constraint first (it depends on the column)
ALTER TABLE material_account_determination 
DROP CONSTRAINT IF EXISTS uq_material_account_det;

-- Drop the foreign key constraint
ALTER TABLE material_account_determination 
DROP CONSTRAINT IF EXISTS fk_account_category_ref;

-- Drop the column
ALTER TABLE material_account_determination 
DROP COLUMN IF EXISTS account_category_reference_id;

-- Re-create unique constraint without the dropped column
ALTER TABLE material_account_determination 
ADD CONSTRAINT uq_material_account_det UNIQUE (
  chart_of_accounts_id, 
  valuation_grouping_code_id, 
  valuation_class_id,
  transaction_key_id
);
`;

async function runMigration() {
    try {
        console.log('🔧 Running inline migration to remove account_category_reference_id...\n');
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully!');
        console.log('   Removed account_category_reference_id from material_account_determination table');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
