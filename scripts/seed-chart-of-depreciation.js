import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

// Sample rows; uses existing company_code_id=2 and fiscal_year_variant_id=1 (seen in DB)
const seeds = [
  {
    code: "COD-EU",
    name: "EU Standard Chart",
    description: "Straight-line depreciation (EU)",
    company_code_id: 2,
    fiscal_year_variant_id: 1,
    currency: "EUR",
    country: "DE",
    depreciation_method: "SL-01", // from seeded depreciation methods
    base_method: "ACQUISITION_COST",
    depreciation_calculation: "FULL_YEAR",
    period_control: "MONTHLY",
    allow_manual_depreciation: true,
    allow_accelerated_depreciation: false,
    allow_special_depreciation: false,
    require_depreciation_key: true,
    allow_negative_depreciation: false,
    depreciation_start_date: "2024-01-01",
    depreciation_end_date: null,
    is_active: true,
  },
  {
    code: "COD-US",
    name: "US Accelerated Chart",
    description: "Declining balance with annual periods",
    company_code_id: 4,
    fiscal_year_variant_id: 1,
    currency: "USD",
    country: "US",
    depreciation_method: "DB-01",
    base_method: "CURRENT_VALUE",
    depreciation_calculation: "PROPORTIONAL",
    period_control: "ANNUAL",
    allow_manual_depreciation: true,
    allow_accelerated_depreciation: true,
    allow_special_depreciation: true,
    require_depreciation_key: true,
    allow_negative_depreciation: false,
    depreciation_start_date: "2024-04-01",
    depreciation_end_date: null,
    is_active: true,
  },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of seeds) {
      await client.query(
        `
        INSERT INTO chart_of_depreciation (
          code, name, description, company_code_id, fiscal_year_variant_id,
          currency, country, depreciation_method, base_method, depreciation_calculation,
          period_control, allow_manual_depreciation, allow_accelerated_depreciation,
          allow_special_depreciation, require_depreciation_key, allow_negative_depreciation,
          depreciation_start_date, depreciation_end_date, is_active,
          effective_start_date, effective_end_date
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        ON CONFLICT (code) DO NOTHING;
      `,
        [
          row.code,
          row.name,
          row.description,
          row.company_code_id,
          row.fiscal_year_variant_id,
          row.currency,
          row.country,
          row.depreciation_method,
          row.base_method,
          row.depreciation_calculation,
          row.period_control,
          row.allow_manual_depreciation,
          row.allow_accelerated_depreciation,
          row.allow_special_depreciation,
          row.require_depreciation_key,
          row.allow_negative_depreciation,
          row.depreciation_start_date,
          row.depreciation_end_date,
          row.is_active,
          row.depreciation_start_date,
          row.depreciation_end_date,
        ],
      );
    }
    await client.query("COMMIT");
    console.log(`✅ Seeded ${seeds.length} chart_of_depreciation rows (skipped existing codes).`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding chart_of_depreciation failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

