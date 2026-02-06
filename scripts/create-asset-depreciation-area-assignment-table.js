import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

async function createAssetDepreciationAreaAssignmentTable() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔧 Creating Asset Depreciation Area Assignment Table...\n");

    // Create asset_depreciation_area_assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_depreciation_area_assignments (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER NOT NULL REFERENCES asset_master(id) ON DELETE CASCADE,
        depreciation_area_id INTEGER NOT NULL REFERENCES depreciation_areas(id) ON DELETE CASCADE,
        
        -- Area-specific depreciation configuration
        depreciation_method_code VARCHAR(50) REFERENCES depreciation_methods(code),
        useful_life_years INTEGER,
        depreciation_start_date DATE,
        depreciation_end_date DATE,
        
        -- Area-specific values
        acquisition_cost NUMERIC(18,2),
        accumulated_depreciation NUMERIC(18,2) DEFAULT 0,
        net_book_value NUMERIC(18,2),
        
        -- Tracking
        last_depreciation_year INTEGER,
        last_depreciation_period INTEGER,
        last_depreciation_date DATE,
        
        -- Posting configuration
        post_to_gl BOOLEAN DEFAULT true,
        
        -- Status
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Unique constraint: one assignment per asset per area
        UNIQUE(asset_id, depreciation_area_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_asset_dep_area_assignments_asset ON asset_depreciation_area_assignments(asset_id);
      CREATE INDEX IF NOT EXISTS idx_asset_dep_area_assignments_area ON asset_depreciation_area_assignments(depreciation_area_id);
      CREATE INDEX IF NOT EXISTS idx_asset_dep_area_assignments_active ON asset_depreciation_area_assignments(is_active);
    `);

    console.log("✅ Created asset_depreciation_area_assignments table");

    // Migrate existing data: Create assignments for all active assets to default/book area
    const bookArea = await client.query(`
      SELECT id FROM depreciation_areas WHERE code = 'BOOK' AND is_active = true LIMIT 1
    `);

    if (bookArea.rows.length > 0) {
      const bookAreaId = bookArea.rows[0].id;
      
      // Get all active assets that don't have assignments
      const assetsWithoutAssignments = await client.query(`
        SELECT am.id, am.depreciation_method, am.useful_life_years, 
               am.acquisition_cost, am.accumulated_depreciation, am.net_book_value,
               am.last_depreciation_year, am.last_depreciation_period, am.last_depreciation_date
        FROM asset_master am
        WHERE (am.is_active = true OR am.active = true)
          AND NOT EXISTS (
            SELECT 1 FROM asset_depreciation_area_assignments adaa
            WHERE adaa.asset_id = am.id AND adaa.depreciation_area_id = $1
          )
      `, [bookAreaId]);

      if (assetsWithoutAssignments.rows.length > 0) {
        console.log(`\n📦 Migrating ${assetsWithoutAssignments.rows.length} assets to BOOK depreciation area...`);
        
        for (const asset of assetsWithoutAssignments.rows) {
          await client.query(`
            INSERT INTO asset_depreciation_area_assignments (
              asset_id, depreciation_area_id,
              depreciation_method_code, useful_life_years,
              acquisition_cost, accumulated_depreciation, net_book_value,
              last_depreciation_year, last_depreciation_period, last_depreciation_date,
              post_to_gl, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (asset_id, depreciation_area_id) DO NOTHING
          `, [
            asset.id,
            bookAreaId,
            asset.depreciation_method,
            asset.useful_life_years,
            asset.acquisition_cost,
            asset.accumulated_depreciation || 0,
            asset.net_book_value,
            asset.last_depreciation_year,
            asset.last_depreciation_period,
            asset.last_depreciation_date,
            true, // post_to_gl
            true  // is_active
          ]);
        }
        
        console.log(`✅ Migrated ${assetsWithoutAssignments.rows.length} assets`);
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Asset depreciation area assignment table created and data migrated!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAssetDepreciationAreaAssignmentTable().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

