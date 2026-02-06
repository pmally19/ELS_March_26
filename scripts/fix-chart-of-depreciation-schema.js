import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

const renameMap = [
  ["method_type", "depreciation_method"],
  ["value_basis", "base_method"],
  ["calculation_basis", "depreciation_calculation"],
  ["period_frequency", "period_control"],
  ["manual_adjustments_allowed", "allow_manual_depreciation"],
  ["accelerated_methods_allowed", "allow_accelerated_depreciation"],
  ["special_methods_allowed", "allow_special_depreciation"],
  ["method_key_required", "require_depreciation_key"],
  ["negative_values_allowed", "allow_negative_depreciation"],
  ["effective_start_date", "depreciation_start_date"],
  ["effective_end_date", "depreciation_end_date"],
];

async function columnExists(client, column) {
  const res = await client.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'chart_of_depreciation'
      AND column_name = $1
  `,
    [column],
  );
  return res.rowCount > 0;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [oldName, newName] of renameMap) {
      const oldExists = await columnExists(client, oldName);
      const newExists = await columnExists(client, newName);

      if (oldExists && !newExists) {
        console.log(`Renaming column ${oldName} -> ${newName}`);
        await client.query(
          `ALTER TABLE chart_of_depreciation RENAME COLUMN "${oldName}" TO "${newName}";`,
        );
      } else if (!oldExists && !newExists) {
        console.log(
          `Column ${oldName}/${newName} missing; adding ${newName} with nullable type`,
        );
        await client.query(
          `ALTER TABLE chart_of_depreciation ADD COLUMN "${newName}" VARCHAR(50);`,
        );
      } else {
        console.log(`Skipping ${oldName}; already aligned as ${newName}`);
      }
    }

    await client.query("COMMIT");
    console.log("Chart of depreciation columns aligned successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error aligning chart_of_depreciation columns:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

