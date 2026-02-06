import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

const seeds = [
  { code: "BOOK", name: "Book Depreciation", description: "Standard book area", is_active: true },
  { code: "TAX", name: "Tax Depreciation", description: "Tax compliance area", is_active: true },
  { code: "MGMT", name: "Management", description: "Internal management reporting", is_active: true },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of seeds) {
      await client.query(
        `
        INSERT INTO depreciation_areas (
          code, name, description, is_active, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,NOW(),NOW()
        )
        ON CONFLICT (code) DO NOTHING;
      `,
        [row.code, row.name, row.description, row.is_active],
      );
    }
    await client.query("COMMIT");
    console.log(`✅ Seeded ${seeds.length} depreciation_areas rows (skipped existing codes).`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding depreciation_areas failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

