import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

// Uses existing chart_of_depreciation codes seeded earlier
const seeds = [
  {
    code: "AC-MACH",
    name: "Machinery",
    description: "Heavy machinery and equipment",
    default_depreciation_method: "SL-01",
    default_useful_life_years: 10,
    account_determination: "MACH-ACC",
    is_active: true,
    depreciation_method_id: null,
    account_determination_key: "MACH",
    number_range_code: "NR-MACH",
    screen_layout_code: "SL-MACH",
    chart_of_depreciation_code: "COD-EU",
  },
  {
    code: "AC-VEH",
    name: "Vehicles",
    description: "Cars, trucks, fleet vehicles",
    default_depreciation_method: "DB-01",
    default_useful_life_years: 5,
    account_determination: "VEH-ACC",
    is_active: true,
    depreciation_method_id: null,
    account_determination_key: "VEH",
    number_range_code: "NR-VEH",
    screen_layout_code: "SL-VEH",
    chart_of_depreciation_code: "COD-US",
  },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Resolve chart_of_depreciation_id by code
    const codMapRes = await client.query(`SELECT id, code FROM chart_of_depreciation`);
    const codMap = new Map(codMapRes.rows.map((r) => [r.code, r.id]));

    for (const row of seeds) {
      const codId = codMap.get(row.chart_of_depreciation_code) || null;
      await client.query(
        `
        INSERT INTO asset_classes (
          code, name, description, default_depreciation_method, default_useful_life_years,
          account_determination, is_active, depreciation_method_id, account_determination_key,
          number_range_code, screen_layout_code, chart_of_depreciation_id, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()
        )
        ON CONFLICT (code) DO NOTHING;
      `,
        [
          row.code,
          row.name,
          row.description,
          row.default_depreciation_method,
          row.default_useful_life_years,
          row.account_determination,
          row.is_active,
          row.depreciation_method_id,
          row.account_determination_key,
          row.number_range_code,
          row.screen_layout_code,
          codId,
        ],
      );
    }

    await client.query("COMMIT");
    console.log(`✅ Seeded ${seeds.length} asset_classes rows (skipped existing codes).`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding asset_classes failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

