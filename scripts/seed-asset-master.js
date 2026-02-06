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

async function seedAssetMaster() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔍 Checking dependencies...");

    // Get company codes
    const companyCodesResult = await client.query(`
      SELECT id, code, name 
      FROM company_codes 
      WHERE active = true
      ORDER BY id 
      LIMIT 5
    `);
    const companyCodes = companyCodesResult.rows;

    if (companyCodes.length === 0) {
      console.log("⚠️  No company codes found. Creating sample company code...");
      const newCompanyResult = await client.query(`
        INSERT INTO company_codes (code, name, active, created_at, updated_at)
        VALUES ('COMP001', 'Main Company', true, NOW(), NOW())
        RETURNING id, code, name
      `);
      companyCodes.push(newCompanyResult.rows[0]);
      console.log(`✅ Created company code: ${newCompanyResult.rows[0].code}`);
    }

    // Get cost centers
    const costCentersResult = await client.query(`
      SELECT id, cost_center, description 
      FROM cost_centers 
      WHERE active = true
      ORDER BY id 
      LIMIT 10
    `);
    const costCenters = costCentersResult.rows;

    if (costCenters.length === 0) {
      console.log("⚠️  No cost centers found. Creating sample cost center...");
      const newCostCenterResult = await client.query(`
        INSERT INTO cost_centers (cost_center, description, active, created_at, updated_at)
        VALUES ('CC001', 'General Cost Center', true, NOW(), NOW())
        RETURNING id, cost_center, description
      `);
      costCenters.push(newCostCenterResult.rows[0]);
      console.log(`✅ Created cost center: ${newCostCenterResult.rows[0].cost_center}`);
    }

    // Get asset classes
    const assetClassesResult = await client.query(`
      SELECT id, code, name 
      FROM asset_classes 
      WHERE is_active = true
      ORDER BY id 
      LIMIT 10
    `);
    let assetClasses = assetClassesResult.rows;

    if (assetClasses.length === 0) {
      console.log("⚠️  No asset classes found. Creating sample asset classes...");
      const assetClassesData = [
        { code: "MACH", name: "Machinery and Equipment" },
        { code: "VEH", name: "Vehicles" },
        { code: "BLDG", name: "Buildings" },
        { code: "IT", name: "IT Equipment" },
        { code: "FURN", name: "Furniture and Fixtures" },
      ];

      for (const ac of assetClassesData) {
        const result = await client.query(`
          INSERT INTO asset_classes (code, name, is_active, created_at, updated_at)
          VALUES ($1, $2, true, NOW(), NOW())
          ON CONFLICT (code) DO NOTHING
          RETURNING id, code, name
        `, [ac.code, ac.name]);
        if (result.rows.length > 0) {
          assetClasses.push(result.rows[0]);
          console.log(`✅ Created asset class: ${ac.code} - ${ac.name}`);
        }
      }
    }

    // Get depreciation methods
    const depreciationMethodsResult = await client.query(`
      SELECT code, name 
      FROM depreciation_methods 
      WHERE is_active = true
      ORDER BY id 
      LIMIT 5
    `);
    const depreciationMethods = depreciationMethodsResult.rows.map((dm) => dm.code || dm.name);

    console.log(`✅ Found ${companyCodes.length} company codes`);
    console.log(`✅ Found ${costCenters.length} cost centers`);
    console.log(`✅ Found ${assetClasses.length} asset classes`);
    console.log(`✅ Found ${depreciationMethods.length} depreciation methods`);

    // Prepare sample asset data
    const today = new Date();
    const dates = {
      twoYearsAgo: new Date(today.getFullYear() - 2, 0, 15),
      oneYearAgo: new Date(today.getFullYear() - 1, 5, 1),
      sixMonthsAgo: new Date(today.getFullYear(), today.getMonth() - 6, 1),
      threeMonthsAgo: new Date(today.getFullYear(), today.getMonth() - 3, 1),
      oneMonthAgo: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      today: today,
    };

    const sampleAssets = [
      {
        asset_number: "AST-2024-001",
        name: "CNC Milling Machine",
        description: "Industrial CNC milling machine for metal fabrication and precision machining",
        asset_class_id: assetClasses.find((ac) => ac.code === "MACH")?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "MACH")?.name || "Machinery",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: dates.twoYearsAgo.toISOString().split("T")[0],
        acquisition_cost: 125000.0,
        current_value: 100000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 10,
        status: "Active",
        location: "Manufacturing Floor - Bay 3",
      },
      {
        asset_number: "AST-2024-002",
        name: "Delivery Truck - Ford Transit",
        description: "Commercial delivery truck for logistics and distribution operations",
        asset_class_id: assetClasses.find((ac) => ac.code === "VEH")?.id || assetClasses[1]?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "VEH")?.name || "Vehicles",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: dates.oneYearAgo.toISOString().split("T")[0],
        acquisition_cost: 45000.0,
        current_value: 36000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 5,
        status: "Active",
        location: "Fleet Garage",
      },
      {
        asset_number: "AST-2024-003",
        name: "Office Building - Main Headquarters",
        description: "Corporate headquarters building with 5 floors, 50,000 sq ft",
        asset_class_id: assetClasses.find((ac) => ac.code === "BLDG")?.id || assetClasses[2]?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "BLDG")?.name || "Buildings",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: dates.twoYearsAgo.toISOString().split("T")[0],
        acquisition_cost: 5000000.0,
        current_value: 4800000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 40,
        status: "Active",
        location: "Downtown Business District",
      },
      {
        asset_number: "AST-2024-004",
        name: "Production Server Cluster",
        description: "Dell PowerEdge server cluster for production environment and data processing",
        asset_class_id: assetClasses.find((ac) => ac.code === "IT")?.id || assetClasses[3]?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "IT")?.name || "IT Equipment",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: dates.sixMonthsAgo.toISOString().split("T")[0],
        acquisition_cost: 75000.0,
        current_value: 60000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 5,
        status: "Active",
        location: "Data Center - Server Room A",
      },
      {
        asset_number: "AST-2024-005",
        name: "Executive Office Furniture Set",
        description: "Complete office furniture set including desk, chairs, and storage units",
        asset_class_id: assetClasses.find((ac) => ac.code === "FURN")?.id || assetClasses[4]?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "FURN")?.name || "Furniture",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: dates.oneYearAgo.toISOString().split("T")[0],
        acquisition_cost: 15000.0,
        current_value: 12000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 7,
        status: "Active",
        location: "Executive Suite - Floor 5",
      },
      {
        asset_number: "AST-2024-006",
        name: "Warehouse Forklift",
        description: "Electric forklift for warehouse material handling and logistics",
        asset_class_id: assetClasses.find((ac) => ac.code === "MACH")?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "MACH")?.name || "Machinery",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters.length > 1 ? costCenters[1]?.id : costCenters[0]?.id,
        acquisition_date: dates.threeMonthsAgo.toISOString().split("T")[0],
        acquisition_cost: 35000.0,
        current_value: 32000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 7,
        status: "Active",
        location: "Warehouse - Dock Area",
      },
      {
        asset_number: "AST-2024-007",
        name: "Assembly Line Conveyor System",
        description: "Automated assembly line conveyor system for production operations",
        asset_class_id: assetClasses.find((ac) => ac.code === "MACH")?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "MACH")?.name || "Machinery",
        company_code_id: companyCodes.length > 1 ? companyCodes[1]?.id : companyCodes[0]?.id,
        cost_center_id: costCenters.length > 1 ? costCenters[1]?.id : costCenters[0]?.id,
        acquisition_date: dates.oneYearAgo.toISOString().split("T")[0],
        acquisition_cost: 200000.0,
        current_value: 160000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 12,
        status: "Active",
        location: "Production Floor - Line 2",
      },
      {
        asset_number: "AST-2024-008",
        name: "New Manufacturing Facility",
        description: "Under construction manufacturing facility - Phase 1 completion expected Q2 2025",
        asset_class_id: assetClasses.find((ac) => ac.code === "BLDG")?.id || assetClasses[2]?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "BLDG")?.name || "Buildings",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: dates.oneMonthAgo.toISOString().split("T")[0],
        acquisition_cost: 2500000.0,
        current_value: 2500000.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 30,
        status: "Under Construction",
        location: "Industrial Park - Zone 4",
      },
      {
        asset_number: "AST-2023-009",
        name: "Retired Office Equipment",
        description: "Old office equipment that has been fully depreciated and retired",
        asset_class_id: assetClasses.find((ac) => ac.code === "IT")?.id || assetClasses[3]?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "IT")?.name || "IT Equipment",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: new Date(today.getFullYear() - 8, 0, 1).toISOString().split("T")[0],
        acquisition_cost: 20000.0,
        current_value: 0.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 5,
        status: "Retired",
        location: "Storage - Disposal Area",
      },
      {
        asset_number: "AST-2024-010",
        name: "Company Car - Executive Sedan",
        description: "Executive transportation vehicle for senior management",
        asset_class_id: assetClasses.find((ac) => ac.code === "VEH")?.id || assetClasses[1]?.id || assetClasses[0]?.id,
        asset_class: assetClasses.find((ac) => ac.code === "VEH")?.name || "Vehicles",
        company_code_id: companyCodes[0]?.id,
        cost_center_id: costCenters[0]?.id,
        acquisition_date: dates.threeMonthsAgo.toISOString().split("T")[0],
        acquisition_cost: 55000.0,
        current_value: 49500.0,
        depreciation_method: depreciationMethods[0] || "STRAIGHT_LINE",
        useful_life_years: 5,
        status: "Active",
        location: "Corporate Parking",
      },
    ];

    console.log("\n📦 Inserting sample assets...");
    let insertedCount = 0;
    let skippedCount = 0;

    for (const asset of sampleAssets) {
      // Check if asset already exists
      const existing = await client.query(
        `SELECT id FROM asset_master WHERE asset_number = $1`,
        [asset.asset_number]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${asset.asset_number} - already exists`);
        skippedCount++;
        continue;
      }

      // Insert asset
      await client.query(
        `
        INSERT INTO asset_master (
          asset_number, name, description, asset_class_id, asset_class,
          company_code_id, cost_center_id, acquisition_date, acquisition_cost,
          current_value, depreciation_method, useful_life_years, status,
          location, is_active, active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, true, NOW(), NOW())
        `,
        [
          asset.asset_number,
          asset.name,
          asset.description,
          asset.asset_class_id,
          asset.asset_class,
          asset.company_code_id,
          asset.cost_center_id,
          asset.acquisition_date,
          asset.acquisition_cost,
          asset.current_value,
          asset.depreciation_method,
          asset.useful_life_years,
          asset.status,
          asset.location,
        ]
      );

      console.log(`✅ Created asset: ${asset.asset_number} - ${asset.name}`);
      insertedCount++;
    }

    await client.query("COMMIT");
    console.log(`\n✅ Successfully seeded ${insertedCount} assets`);
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped ${skippedCount} existing assets`);
    }
    console.log(`\n📊 Summary:`);
    console.log(`   - Total assets in database: ${insertedCount + skippedCount}`);
    console.log(`   - New assets created: ${insertedCount}`);
    console.log(`   - Assets skipped (already exist): ${skippedCount}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding asset master:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAssetMaster().catch((error) => {
  console.error("❌ Seed script failed:", error);
  process.exit(1);
});

