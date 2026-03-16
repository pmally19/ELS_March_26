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
    // Add legacy-compatible columns to avoid trigger failures
    await client.query(`
      ALTER TABLE chart_of_depreciation
      ADD COLUMN IF NOT EXISTS effective_start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS effective_end_date TIMESTAMP;
    `);

    // Backfill from current columns for any existing rows
    await client.query(`
      UPDATE chart_of_depreciation
      SET effective_start_date = COALESCE(effective_start_date, depreciation_start_date),
          effective_end_date   = COALESCE(effective_end_date, depreciation_end_date);
    `);

    // Ensure future inserts stay in sync via trigger (simple before insert/update)
    await client.query(`
      CREATE OR REPLACE FUNCTION cod_sync_effective_dates()
      RETURNS trigger AS $$
      BEGIN
        NEW.effective_start_date := COALESCE(NEW.effective_start_date, NEW.depreciation_start_date);
        NEW.effective_end_date   := COALESCE(NEW.effective_end_date, NEW.depreciation_end_date);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_cod_sync_effective_dates ON chart_of_depreciation;
      CREATE TRIGGER trg_cod_sync_effective_dates
      BEFORE INSERT OR UPDATE ON chart_of_depreciation
      FOR EACH ROW EXECUTE FUNCTION cod_sync_effective_dates();
    `);

    await client.query("COMMIT");
    console.log("✅ Added legacy effective_* columns and sync trigger.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to fix chart_of_depreciation effective_* columns:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

