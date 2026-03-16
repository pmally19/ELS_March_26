import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

const methods = [
  {
    code: "SL-01",
    name: "Straight Line - 5 Years",
    description: "Standard straight-line depreciation over 5 years",
    calculation_type: "STRAIGHT_LINE",
    base_value_type: "ACQUISITION_COST",
    depreciation_rate: null,
    useful_life_years: 5,
    residual_value_percent: 0,
    supports_partial_periods: true,
    time_basis: "MONTHLY",
    method_switching_allowed: false,
    company_code_id: null,
    applicable_to_asset_class: null,
    is_active: true,
    is_default: true,
    created_by: "seed",
  },
  {
    code: "DB-01",
    name: "Declining Balance - 20%",
    description: "Declining balance at 20% rate",
    calculation_type: "DECLINING_BALANCE",
    base_value_type: "CURRENT_VALUE",
    depreciation_rate: 20,
    useful_life_years: null,
    residual_value_percent: 0,
    supports_partial_periods: true,
    time_basis: "DAILY",
    method_switching_allowed: true,
    company_code_id: null,
    applicable_to_asset_class: null,
    is_active: true,
    is_default: false,
    created_by: "seed",
  },
  {
    code: "UOP-01",
    name: "Units of Production",
    description: "Units of production method for variable usage assets",
    calculation_type: "UNITS_OF_PRODUCTION",
    base_value_type: "ACQUISITION_COST",
    depreciation_rate: null,
    useful_life_years: null,
    residual_value_percent: 5,
    supports_partial_periods: true,
    time_basis: "ANNUAL",
    method_switching_allowed: false,
    company_code_id: null,
    applicable_to_asset_class: "MACHINERY",
    is_active: true,
    is_default: false,
    created_by: "seed",
  },
  {
    code: "SOYD-01",
    name: "Sum of Years Digits",
    description: "Accelerated depreciation using SOYD",
    calculation_type: "SUM_OF_YEARS",
    base_value_type: "ACQUISITION_COST",
    depreciation_rate: null,
    useful_life_years: 7,
    residual_value_percent: 0,
    supports_partial_periods: true,
    time_basis: "MONTHLY",
    method_switching_allowed: false,
    company_code_id: null,
    applicable_to_asset_class: "VEHICLES",
    is_active: true,
    is_default: false,
    created_by: "seed",
  },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const m of methods) {
      await client.query(
        `
        INSERT INTO depreciation_methods (
          code, name, description, calculation_type, base_value_type,
          depreciation_rate, useful_life_years, residual_value_percent,
          supports_partial_periods, time_basis, method_switching_allowed,
          company_code_id, applicable_to_asset_class,
          is_active, is_default, created_by, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW()
        )
        ON CONFLICT (code) DO NOTHING;
      `,
        [
          m.code,
          m.name,
          m.description,
          m.calculation_type,
          m.base_value_type,
          m.depreciation_rate,
          m.useful_life_years,
          m.residual_value_percent,
          m.supports_partial_periods,
          m.time_basis,
          m.method_switching_allowed,
          m.company_code_id,
          m.applicable_to_asset_class,
          m.is_active,
          m.is_default,
          m.created_by,
        ],
      );
    }
    await client.query("COMMIT");
    console.log(`✅ Seeded ${methods.length} depreciation methods (skipped if existed).`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

