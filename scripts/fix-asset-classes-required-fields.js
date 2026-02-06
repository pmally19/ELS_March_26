import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting asset classes migration...');
    
    await client.query('BEGIN');
    
    // Step 1: Add new required columns
    console.log('Step 1: Adding new columns...');
    await client.query(`
      ALTER TABLE asset_classes
        ADD COLUMN IF NOT EXISTS depreciation_method_id INTEGER REFERENCES depreciation_methods(id) ON DELETE RESTRICT,
        ADD COLUMN IF NOT EXISTS account_determination_key VARCHAR(50),
        ADD COLUMN IF NOT EXISTS number_range_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS screen_layout_code VARCHAR(50);
    `);
    
    // Step 2: Remove default values
    console.log('Step 2: Removing default values...');
    await client.query(`
      ALTER TABLE asset_classes
        ALTER COLUMN is_active DROP DEFAULT;
    `);
    
    // Step 3: Create junction table for asset class and company code assignment
    console.log('Step 3: Creating junction table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_class_company_codes (
        id SERIAL PRIMARY KEY,
        asset_class_id INTEGER NOT NULL REFERENCES asset_classes(id) ON DELETE CASCADE,
        company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        UNIQUE(asset_class_id, company_code_id)
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_class_company_codes_asset_class ON asset_class_company_codes(asset_class_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_class_company_codes_company_code ON asset_class_company_codes(company_code_id);
    `);
    
    // Step 4: Migrate existing data if any
    console.log('Step 4: Migrating existing data...');
    const existingClasses = await client.query(`
      SELECT id, default_depreciation_method FROM asset_classes 
      WHERE default_depreciation_method IS NOT NULL
    `);
    
    for (const ac of existingClasses.rows) {
      const dmResult = await client.query(`
        SELECT id FROM depreciation_methods WHERE code = $1 LIMIT 1
      `, [ac.default_depreciation_method]);
      
      if (dmResult.rows.length > 0) {
        await client.query(`
          UPDATE asset_classes 
          SET depreciation_method_id = $1 
          WHERE id = $2
        `, [dmResult.rows[0].id, ac.id]);
        console.log(`  Migrated asset class ${ac.id} to use depreciation method ${dmResult.rows[0].id}`);
      }
    }
    
    // Step 5: Update table comments (remove SAP terminology)
    console.log('Step 5: Updating table comments...');
    await client.query(`
      COMMENT ON TABLE asset_classes IS 'Master data table for asset classification';
      COMMENT ON COLUMN asset_classes.code IS 'Unique code identifier for the asset class';
      COMMENT ON COLUMN asset_classes.name IS 'Display name of the asset class';
      COMMENT ON COLUMN asset_classes.depreciation_method_id IS 'Required reference to depreciation method';
      COMMENT ON COLUMN asset_classes.account_determination_key IS 'Required key for account determination configuration';
      COMMENT ON COLUMN asset_classes.number_range_code IS 'Code for number range assignment';
      COMMENT ON COLUMN asset_classes.screen_layout_code IS 'Code for screen layout configuration';
      COMMENT ON TABLE asset_class_company_codes IS 'Junction table for asset class and company code assignment';
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

