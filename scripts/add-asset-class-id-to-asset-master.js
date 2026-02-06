import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function addAssetClassIdColumn() {
  try {
    // Add asset_class_id column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'asset_master' 
          AND column_name = 'asset_class_id'
        ) THEN
          ALTER TABLE asset_master ADD COLUMN asset_class_id INTEGER REFERENCES asset_classes(id);
          CREATE INDEX idx_asset_master_asset_class_id ON asset_master(asset_class_id);
        END IF;
      END $$;
    `);
    
    console.log('asset_class_id column added successfully (if it didn\'t exist)');
    
    // Migrate existing asset_class text values to asset_class_id
    // First, create asset classes from existing unique asset_class values
    const existingClasses = await pool.query(`
      SELECT DISTINCT asset_class 
      FROM asset_master 
      WHERE asset_class IS NOT NULL 
      AND asset_class != ''
      AND asset_class_id IS NULL
    `);
    
    console.log(`Found ${existingClasses.rows.length} unique asset classes to migrate`);
    
    for (const row of existingClasses.rows) {
      const assetClassText = row.asset_class;
      if (!assetClassText) continue;
      
      // Create asset class if it doesn't exist
      const code = assetClassText.substring(0, 20).toUpperCase().replace(/[^A-Z0-9]/g, '_');
      
      const checkExisting = await pool.query(
        `SELECT id FROM asset_classes WHERE code = $1`,
        [code]
      );
      
      let assetClassId;
      if (checkExisting.rows.length > 0) {
        assetClassId = checkExisting.rows[0].id;
      } else {
        const insertResult = await pool.query(`
          INSERT INTO asset_classes (code, name, description, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, true, NOW(), NOW())
          RETURNING id
        `, [code, assetClassText, `Migrated from asset_master.asset_class`]);
        assetClassId = insertResult.rows[0].id;
        console.log(`Created asset class: ${code} (${assetClassText})`);
      }
      
      // Update asset_master records
      await pool.query(`
        UPDATE asset_master 
        SET asset_class_id = $1 
        WHERE asset_class = $2 
        AND asset_class_id IS NULL
      `, [assetClassId, assetClassText]);
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addAssetClassIdColumn();

