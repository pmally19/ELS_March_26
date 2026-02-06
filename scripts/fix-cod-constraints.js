import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Allow legacy and new values, plus free-form codes up to 50 chars
    await client.query(`
      ALTER TABLE chart_of_depreciation
      DROP CONSTRAINT IF EXISTS chart_depreciation_calculation_basis_check;

      ALTER TABLE chart_of_depreciation
      ADD CONSTRAINT chart_depreciation_calculation_basis_check CHECK (
        depreciation_calculation IS NULL OR
        depreciation_calculation IN ('PROPORTIONAL','FULL_PERIOD','HALF_PERIOD','FULL_YEAR','PRO_RATA') OR
        char_length(depreciation_calculation) <= 50
      );

      ALTER TABLE chart_of_depreciation
      DROP CONSTRAINT IF EXISTS chart_depreciation_value_basis_check;

      ALTER TABLE chart_of_depreciation
      ADD CONSTRAINT chart_depreciation_value_basis_check CHECK (
        base_method IS NULL OR
        base_method IN (
          'ACQUISITION_COST','CURRENT_VALUE','REPLACEMENT_COST','FAIR_VALUE',
          'ACQUISITION_VALUE','BOOK_VALUE','REPLACEMENT_VALUE'
        ) OR
        char_length(base_method) <= 50
      );

      ALTER TABLE chart_of_depreciation
      DROP CONSTRAINT IF EXISTS chart_depreciation_method_type_check;

      ALTER TABLE chart_of_depreciation
      ADD CONSTRAINT chart_depreciation_method_type_check CHECK (
        depreciation_method IS NULL OR
        depreciation_method IN (
          'STRAIGHT_LINE','DECLINING_BALANCE','UNITS_OF_PRODUCTION','SUM_OF_YEARS','CUSTOM'
        ) OR
        char_length(depreciation_method) <= 50
      );
    `);

    await client.query("COMMIT");
    console.log("✅ Updated chart_of_depreciation constraints to allow legacy/custom values.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to update constraints:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

