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

async function updateChartSettings() {
  const client = await pool.connect();
  try {
    console.log("🔧 Updating Chart of Depreciation Settings\n");
    console.log("=".repeat(80));

    // Step 1: Check current settings
    console.log("\n1️⃣  CHECKING CURRENT CHART OF DEPRECIATION SETTINGS");
    console.log("-".repeat(80));
    
    const currentCharts = await client.query(`
      SELECT 
        cod.id,
        cod.code,
        cod.name,
        cod.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        cod.require_depreciation_key,
        cod.period_control,
        cod.allow_manual_depreciation,
        cod.is_active
      FROM chart_of_depreciation cod
      LEFT JOIN company_codes cc ON cod.company_code_id = cc.id
      WHERE cod.is_active = true
      ORDER BY cod.company_code_id, cod.code
    `);

    console.log(`✅ Found ${currentCharts.rows.length} active chart(s) of depreciation:\n`);
    currentCharts.rows.forEach((chart, index) => {
      console.log(`${index + 1}. Chart: ${chart.code} - ${chart.name}`);
      console.log(`   Company Code: ${chart.company_code} (${chart.company_name})`);
      console.log(`   Require Depreciation Key: ${chart.require_depreciation_key ? '✅ YES (requires area)' : '❌ NO (allows all areas)'}`);
      console.log(`   Period Control: ${chart.period_control || 'N/A'}`);
      console.log(`   Allow Manual Depreciation: ${chart.allow_manual_depreciation ? 'Yes' : 'No'}`);
      console.log("");
    });

    // Step 2: Update charts that require depreciation key
    console.log("\n2️⃣  UPDATING CHARTS TO ALLOW ALL DEPRECIATION AREAS");
    console.log("-".repeat(80));

    const chartsToUpdate = currentCharts.rows.filter(chart => chart.require_depreciation_key === true);
    
    if (chartsToUpdate.length === 0) {
      console.log("✅ No charts need updating. All charts already allow depreciation runs without specifying an area.");
      return;
    }

    console.log(`📝 Found ${chartsToUpdate.length} chart(s) that require depreciation key:`);
    chartsToUpdate.forEach((chart, index) => {
      console.log(`   ${index + 1}. ${chart.code} - ${chart.name} (Company: ${chart.company_code})`);
    });

    // Update all charts
    for (const chart of chartsToUpdate) {
      await client.query(`
        UPDATE chart_of_depreciation
        SET 
          require_depreciation_key = false,
          updated_at = NOW()
        WHERE id = $1
      `, [chart.id]);

      console.log(`✅ Updated chart "${chart.code}" - Now allows depreciation runs without specifying an area`);
    }

    // Step 3: Verify updates
    console.log("\n3️⃣  VERIFYING UPDATES");
    console.log("-".repeat(80));

    const updatedCharts = await client.query(`
      SELECT 
        cod.id,
        cod.code,
        cod.name,
        cod.company_code_id,
        cc.code as company_code,
        cod.require_depreciation_key
      FROM chart_of_depreciation cod
      LEFT JOIN company_codes cc ON cod.company_code_id = cc.id
      WHERE cod.is_active = true
      ORDER BY cod.company_code_id, cod.code
    `);

    console.log("✅ Updated chart settings:\n");
    updatedCharts.rows.forEach((chart, index) => {
      const status = chart.require_depreciation_key 
        ? '❌ Still requires area' 
        : '✅ Allows all areas';
      console.log(`${index + 1}. ${chart.code} (${chart.company_code}): ${status}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("✅ CHART OF DEPRECIATION SETTINGS UPDATED SUCCESSFULLY");
    console.log("=".repeat(80));
    console.log("\n📋 Summary:");
    console.log(`   - Updated ${chartsToUpdate.length} chart(s)`);
    console.log(`   - All charts now allow depreciation runs without specifying a depreciation area`);
    console.log(`   - You can now run depreciation with "All Depreciation Areas" selected`);
    console.log("\n💡 Note: If you want to require a depreciation area for specific charts in the future,");
    console.log("   you can update the chart settings in Master Data → Chart of Depreciation");

  } catch (error) {
    console.error("❌ Error updating chart settings:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateChartSettings().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

