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

async function addChartOfDepreciationToRuns() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔧 Adding chart_of_depreciation_id to asset_depreciation_runs...\n");

    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE asset_depreciation_runs
      ADD COLUMN IF NOT EXISTS chart_of_depreciation_id INTEGER REFERENCES chart_of_depreciation(id)
    `);

    console.log("✅ Added chart_of_depreciation_id column");

    // Populate existing runs with chart based on company code
    const updateResult = await client.query(`
      UPDATE asset_depreciation_runs adr
      SET chart_of_depreciation_id = (
        SELECT cod.id
        FROM chart_of_depreciation cod
        WHERE cod.company_code_id = adr.company_code_id
          AND cod.is_active = true
        LIMIT 1
      )
      WHERE adr.chart_of_depreciation_id IS NULL
        AND adr.company_code_id IS NOT NULL
    `);

    console.log(`✅ Updated ${updateResult.rowCount} existing runs with chart of depreciation`);

    await client.query("COMMIT");
    console.log("\n✅ Chart of depreciation integration completed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addChartOfDepreciationToRuns().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

