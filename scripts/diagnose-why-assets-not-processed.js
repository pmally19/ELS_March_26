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

async function diagnoseAssetProcessing() {
  const client = await pool.connect();
  try {
    console.log("🔍 Diagnosing Why Assets Are Not Being Processed...\n");

    const fiscalYear = 2025;
    const fiscalPeriod = 12;

    // 1. Check assets and their depreciation status
    console.log("1. Checking Asset Depreciation Status:");
    const assets = await client.query(`
      SELECT 
        am.id, am.asset_number, am.name,
        am.acquisition_cost, am.accumulated_depreciation,
        am.useful_life_years, am.depreciation_method,
        am.last_depreciation_year, am.last_depreciation_period,
        am.status, am.is_active, am.active,
        am.company_code_id, cc.code as company_code,
        ac.code as asset_class_code,
        CASE 
          WHEN (am.is_active = true OR am.active = true) THEN 'Active'
          ELSE 'Inactive'
        END as active_status,
        CASE 
          WHEN UPPER(TRIM(COALESCE(am.status, 'Active'))) = 'ACTIVE' THEN 'Active'
          ELSE 'Not Active'
        END as status_check,
        CASE 
          WHEN am.acquisition_cost > 0 THEN 'OK'
          ELSE 'No Cost'
        END as cost_check,
        CASE 
          WHEN am.useful_life_years > 0 THEN 'OK'
          ELSE 'No Useful Life'
        END as useful_life_check,
        CASE 
          WHEN am.depreciation_method IS NOT NULL OR ac.default_depreciation_method IS NOT NULL THEN 'OK'
          ELSE 'No Method'
        END as method_check,
        CASE 
          WHEN am.last_depreciation_year IS NULL THEN 'Never Depreciated'
          WHEN am.last_depreciation_year < $1 THEN 'Previous Year'
          WHEN am.last_depreciation_year = $1 AND am.last_depreciation_period < $2 THEN 'Earlier Period'
          WHEN am.last_depreciation_year = $1 AND am.last_depreciation_period = $2 THEN 'ALREADY THIS PERIOD'
          WHEN am.last_depreciation_year = $1 AND am.last_depreciation_period > $2 THEN 'Future Period (Error)'
          ELSE 'Unknown'
        END as depreciation_status,
        CASE 
          WHEN am.last_depreciation_year IS NULL THEN true
          WHEN am.last_depreciation_year < $1 THEN true
          WHEN am.last_depreciation_year = $1 AND am.last_depreciation_period < $2 THEN true
          ELSE false
        END as eligible_by_date
      FROM asset_master am
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      WHERE (am.is_active = true OR am.active = true)
        AND UPPER(TRIM(COALESCE(am.status, 'Active'))) = 'ACTIVE'
        AND am.acquisition_cost > 0
        AND am.useful_life_years > 0
      ORDER BY am.id
      LIMIT 20
    `, [fiscalYear, fiscalPeriod]);

    console.log(`   Found ${assets.rows.length} potentially eligible assets:\n`);
    assets.rows.forEach((asset) => {
      console.log(`   Asset: ${asset.asset_number} (ID: ${asset.id})`);
      console.log(`     Name: ${asset.name}`);
      console.log(`     Active: ${asset.active_status}, Status: ${asset.status_check}`);
      console.log(`     Cost: $${parseFloat(asset.acquisition_cost || 0).toLocaleString()}, Accumulated: $${parseFloat(asset.accumulated_depreciation || 0).toLocaleString()}`);
      console.log(`     Useful Life: ${asset.useful_life_years} years, Method: ${asset.depreciation_method || 'N/A'}`);
      console.log(`     Last Depreciation: Year ${asset.last_depreciation_year || 'NULL'}, Period ${asset.last_depreciation_period || 'NULL'}`);
      console.log(`     Depreciation Status: ${asset.depreciation_status}`);
      console.log(`     Eligible by Date: ${asset.eligible_by_date ? 'YES' : 'NO'}`);
      console.log(`     Cost Check: ${asset.cost_check}, Useful Life: ${asset.useful_life_check}, Method: ${asset.method_check}`);
      console.log("");
    });

    // 2. Check existing postings for this period
    console.log("\n2. Checking Existing Depreciation Postings for Period 12/2025:");
    const existingPostings = await client.query(`
      SELECT 
        adp.id, adp.asset_id, adp.fiscal_year, adp.fiscal_period,
        adp.depreciation_amount, adp.created_at,
        am.asset_number, am.name,
        dr.run_number, dr.status as run_status
      FROM asset_depreciation_postings adp
      JOIN asset_master am ON adp.asset_id = am.id
      LEFT JOIN asset_depreciation_runs dr ON adp.depreciation_run_id = dr.id
      WHERE adp.fiscal_year = $1 AND adp.fiscal_period = $2
      ORDER BY adp.created_at DESC
    `, [fiscalYear, fiscalPeriod]);

    console.log(`   Found ${existingPostings.rows.length} existing postings for period ${fiscalPeriod}/${fiscalYear}:`);
    if (existingPostings.rows.length > 0) {
      existingPostings.rows.forEach((posting) => {
        console.log(`   - Asset ${posting.asset_number} (ID: ${posting.asset_id}): $${parseFloat(posting.depreciation_amount || 0).toFixed(2)}`);
        console.log(`     Run: ${posting.run_number}, Status: ${posting.run_status}, Created: ${posting.created_at}`);
      });
    } else {
      console.log("   No existing postings found for this period.");
    }

    // 3. Check which assets would be selected by the query
    console.log("\n3. Assets That Would Be Selected by the Query:");
    const queryAssets = await client.query(`
      SELECT 
        am.id, am.asset_number, am.name,
        am.last_depreciation_year, am.last_depreciation_period
      FROM asset_master am
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE (am.is_active = true OR am.active = true)
        AND UPPER(TRIM(COALESCE(am.status, 'Active'))) = 'ACTIVE'
        AND am.acquisition_cost > 0
        AND am.useful_life_years > 0
        AND (
          am.last_depreciation_year IS NULL 
          OR am.last_depreciation_year < $1
          OR (am.last_depreciation_year = $1 AND am.last_depreciation_period < $2)
        )
      ORDER BY am.id
    `, [fiscalYear, fiscalPeriod]);

    console.log(`   Query would select ${queryAssets.rows.length} assets:`);
    queryAssets.rows.forEach((asset) => {
      console.log(`   - ${asset.asset_number}: ${asset.name} (Last Dep: ${asset.last_depreciation_year || 'NULL'}/${asset.last_depreciation_period || 'NULL'})`);
    });

    // 4. Check which of those have existing postings (would be skipped)
    console.log("\n4. Assets That Would Be Skipped (Already Posted):");
    if (queryAssets.rows.length > 0) {
      const assetIds = queryAssets.rows.map(a => a.id);
      const alreadyPosted = await client.query(`
        SELECT DISTINCT asset_id
        FROM asset_depreciation_postings
        WHERE asset_id = ANY($1::int[])
          AND fiscal_year = $2
          AND fiscal_period = $3
      `, [assetIds, fiscalYear, fiscalPeriod]);

      console.log(`   ${alreadyPosted.rows.length} assets would be skipped (already posted):`);
      alreadyPosted.rows.forEach((row) => {
        const asset = queryAssets.rows.find(a => a.id === row.asset_id);
        console.log(`   - Asset ID ${row.asset_id}: ${asset?.asset_number || 'Unknown'}`);
      });

      const wouldProcess = queryAssets.rows.filter(a => 
        !alreadyPosted.rows.some(ap => ap.asset_id === a.id)
      );
      console.log(`\n   ${wouldProcess.length} assets would actually be processed:`);
      wouldProcess.forEach((asset) => {
        console.log(`   - ${asset.asset_number}: ${asset.name}`);
      });
    }

    // 5. Check recent depreciation runs
    console.log("\n5. Recent Depreciation Runs:");
    const runs = await client.query(`
      SELECT 
        id, run_number, fiscal_year, fiscal_period,
        status, total_assets_processed, total_depreciation_amount,
        posted_to_gl, gl_document_number, error_message,
        created_at
      FROM asset_depreciation_runs
      WHERE fiscal_year = $1 AND fiscal_period = $2
      ORDER BY created_at DESC
    `, [fiscalYear, fiscalPeriod]);

    console.log(`   Found ${runs.rows.length} runs for period ${fiscalPeriod}/${fiscalYear}:`);
    runs.rows.forEach((run) => {
      console.log(`   - ${run.run_number}: Status=${run.status}, Assets=${run.total_assets_processed}, Amount=$${parseFloat(run.total_depreciation_amount || 0).toFixed(2)}`);
      console.log(`     Posted to GL: ${run.posted_to_gl}, GL Doc: ${run.gl_document_number || 'NULL'}`);
      if (run.error_message) {
        console.log(`     Error: ${run.error_message.substring(0, 100)}`);
      }
    });

    console.log("\n✅ Diagnosis complete!");
  } catch (error) {
    console.error("❌ Error during diagnosis:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseAssetProcessing().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

