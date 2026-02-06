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

async function fixAssetStatus() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔍 Checking asset statuses...");

    // Check current asset statuses
    const statusCheck = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM asset_master
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log("\n📊 Current asset statuses:");
    statusCheck.rows.forEach((row) => {
      console.log(`   ${row.status || "NULL"}: ${row.count} assets`);
    });

    // Update NULL statuses to 'Active'
    const nullStatusUpdate = await client.query(`
      UPDATE asset_master
      SET status = 'Active', updated_at = NOW()
      WHERE status IS NULL
      RETURNING id, asset_number, name
    `);

    if (nullStatusUpdate.rows.length > 0) {
      console.log(`\n✅ Updated ${nullStatusUpdate.rows.length} assets with NULL status to 'Active':`);
      nullStatusUpdate.rows.forEach((asset) => {
        console.log(`   - ${asset.asset_number}: ${asset.name}`);
      });
    }

    // Ensure all active assets have required fields
    const missingFields = await client.query(`
      SELECT 
        id, asset_number, name,
        CASE 
          WHEN depreciation_method IS NULL THEN 'depreciation_method'
          WHEN useful_life_years IS NULL OR useful_life_years <= 0 THEN 'useful_life_years'
          WHEN acquisition_cost IS NULL OR acquisition_cost <= 0 THEN 'acquisition_cost'
          ELSE NULL
        END as missing_field
      FROM asset_master
      WHERE (is_active = true OR active = true)
        AND UPPER(TRIM(COALESCE(status, 'Active'))) = 'ACTIVE'
        AND (
          depreciation_method IS NULL 
          OR useful_life_years IS NULL 
          OR useful_life_years <= 0
          OR acquisition_cost IS NULL 
          OR acquisition_cost <= 0
        )
    `);

    if (missingFields.rows.length > 0) {
      console.log(`\n⚠️  Found ${missingFields.rows.length} assets with missing required fields:`);
      
      for (const asset of missingFields.rows) {
        console.log(`   - ${asset.asset_number}: ${asset.name} - Missing: ${asset.missing_field}`);
        
        // Try to get defaults from asset class
        const assetClassResult = await client.query(`
          SELECT default_depreciation_method, default_useful_life_years
          FROM asset_classes
          WHERE id = (SELECT asset_class_id FROM asset_master WHERE id = $1)
        `, [asset.id]);

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (!asset.depreciation_method && assetClassResult.rows[0]?.default_depreciation_method) {
          updates.push(`depreciation_method = $${paramIndex++}`);
          values.push(assetClassResult.rows[0].default_depreciation_method);
        } else if (!asset.depreciation_method) {
          updates.push(`depreciation_method = $${paramIndex++}`);
          values.push("STRAIGHT_LINE");
        }

        if ((!asset.useful_life_years || asset.useful_life_years <= 0) && assetClassResult.rows[0]?.default_useful_life_years) {
          updates.push(`useful_life_years = $${paramIndex++}`);
          values.push(assetClassResult.rows[0].default_useful_life_years);
        } else if (!asset.useful_life_years || asset.useful_life_years <= 0) {
          updates.push(`useful_life_years = $${paramIndex++}`);
          values.push(5); // Default 5 years
        }

        if (updates.length > 0) {
          values.push(asset.id);
          await client.query(`
            UPDATE asset_master
            SET ${updates.join(", ")}, updated_at = NOW()
            WHERE id = $${paramIndex}
          `, values);
          console.log(`      ✅ Fixed missing fields for ${asset.asset_number}`);
        }
      }
    }

    // Show eligible assets for depreciation
    const eligibleAssets = await client.query(`
      SELECT 
        COUNT(*) as count,
        SUM(acquisition_cost) as total_acquisition_cost
      FROM asset_master am
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE (am.is_active = true OR am.active = true)
        AND UPPER(TRIM(COALESCE(am.status, 'Active'))) = 'ACTIVE'
        AND am.acquisition_cost > 0
        AND am.useful_life_years > 0
        AND (am.depreciation_method IS NOT NULL OR ac.default_depreciation_method IS NOT NULL)
    `);

    console.log(`\n✅ Eligible assets for depreciation: ${eligibleAssets.rows[0].count}`);
    console.log(`   Total acquisition cost: $${parseFloat(eligibleAssets.rows[0].total_acquisition_cost || 0).toLocaleString()}`);

    await client.query("COMMIT");
    console.log("\n✅ Asset status fix completed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error fixing asset status:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAssetStatus().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

