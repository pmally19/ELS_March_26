import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function addAssetMasterData() {
  const client = await pool.connect();
  
  try {
    console.log('📦 Adding asset master data...');
    
    await client.query('BEGIN');
    
    // First, get existing company codes and cost centers
    const companyCodesResult = await client.query('SELECT id, code, name FROM company_codes WHERE active = true ORDER BY id LIMIT 10');
    const costCentersResult = await client.query('SELECT id, cost_center, description, company_code FROM cost_centers WHERE active = true ORDER BY id LIMIT 20');
    
    const companyCodes = companyCodesResult.rows;
    const costCenters = costCentersResult.rows;
    
    console.log(`Found ${companyCodes.length} company codes and ${costCenters.length} cost centers`);
    
    if (companyCodes.length === 0) {
      console.log('⚠️  No company codes found. Please add company codes first.');
      await client.query('ROLLBACK');
      return;
    }
    
    // Sample asset data with proper relationships
    const assets = [
      {
        asset_number: 'AST-001',
        name: 'Manufacturing Equipment - CNC Lathe',
        description: 'High-precision CNC lathe for metalworking operations',
        asset_class: 'MACHINERY',
        acquisition_date: '2023-01-15',
        acquisition_cost: 125000.00,
        current_value: 100000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 10,
        status: 'active',
        location: 'Production Floor - Building A',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
      {
        asset_number: 'AST-002',
        name: 'Office Building - Main Headquarters',
        description: 'Corporate headquarters building with 5 floors',
        asset_class: 'REAL_ESTATE',
        acquisition_date: '2020-06-01',
        acquisition_cost: 5000000.00,
        current_value: 4800000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 40,
        status: 'active',
        location: 'Downtown Business District',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
      {
        asset_number: 'AST-003',
        name: 'Delivery Vehicle - Ford Transit Van',
        description: 'Commercial delivery van for logistics operations',
        asset_class: 'VEHICLES',
        acquisition_date: '2023-03-20',
        acquisition_cost: 35000.00,
        current_value: 28000.00,
        depreciation_method: 'declining-balance',
        useful_life_years: 5,
        status: 'active',
        location: 'Fleet Garage',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
      {
        asset_number: 'AST-004',
        name: 'IT Infrastructure - Server Rack',
        description: 'Enterprise server infrastructure with networking equipment',
        asset_class: 'IT_EQUIPMENT',
        acquisition_date: '2023-09-10',
        acquisition_cost: 75000.00,
        current_value: 60000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 5,
        status: 'active',
        location: 'Data Center - Server Room',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
      {
        asset_number: 'AST-005',
        name: 'Warehouse Equipment - Forklift',
        description: 'Electric forklift for warehouse material handling',
        asset_class: 'EQUIPMENT',
        acquisition_date: '2023-11-05',
        acquisition_cost: 45000.00,
        current_value: 40000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 7,
        status: 'active',
        location: 'Warehouse - Dock Area',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
      {
        asset_number: 'AST-006',
        name: 'Production Line - Assembly Conveyor',
        description: 'Automated assembly line conveyor system',
        asset_class: 'MACHINERY',
        acquisition_date: '2022-08-15',
        acquisition_cost: 200000.00,
        current_value: 160000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 12,
        status: 'active',
        location: 'Production Floor - Line 2',
        company_code_id: companyCodes.length > 1 ? companyCodes[1]?.id : companyCodes[0]?.id || null,
        cost_center_id: companyCodes.length > 1 
          ? (costCenters.find(cc => cc.company_code === companyCodes[1]?.code)?.[0]?.id || costCenters[1]?.id || null)
          : (costCenters[0]?.id || null),
      },
      {
        asset_number: 'AST-007',
        name: 'Company Car - Executive Sedan',
        description: 'Executive transportation vehicle',
        asset_class: 'VEHICLES',
        acquisition_date: '2024-01-10',
        acquisition_cost: 55000.00,
        current_value: 49500.00,
        depreciation_method: 'declining-balance',
        useful_life_years: 5,
        status: 'active',
        location: 'Corporate Parking',
        company_code_id: companyCodes.length > 1 ? companyCodes[1]?.id : companyCodes[0]?.id || null,
        cost_center_id: companyCodes.length > 1 
          ? (costCenters.find(cc => cc.company_code === companyCodes[1]?.code)?.[0]?.id || costCenters[1]?.id || null)
          : (costCenters[0]?.id || null),
      },
      {
        asset_number: 'AST-008',
        name: 'Quality Control Equipment - Testing Station',
        description: 'Automated quality testing and inspection equipment',
        asset_class: 'EQUIPMENT',
        acquisition_date: '2023-05-22',
        acquisition_cost: 85000.00,
        current_value: 70000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 8,
        status: 'active',
        location: 'QC Lab - Building B',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
      {
        asset_number: 'AST-009',
        name: 'Warehouse Building - Distribution Center',
        description: 'Large warehouse facility for distribution operations',
        asset_class: 'REAL_ESTATE',
        acquisition_date: '2021-04-12',
        acquisition_cost: 3500000.00,
        current_value: 3200000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 30,
        status: 'active',
        location: 'Industrial Park - Zone 3',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
      {
        asset_number: 'AST-010',
        name: 'Office Furniture - Executive Suite',
        description: 'Complete office furniture set for executive floor',
        asset_class: 'FURNITURE',
        acquisition_date: '2023-07-08',
        acquisition_cost: 25000.00,
        current_value: 20000.00,
        depreciation_method: 'straight-line',
        useful_life_years: 10,
        status: 'active',
        location: 'Executive Floor - 5th Floor',
        company_code_id: companyCodes[0]?.id || null,
        cost_center_id: costCenters.find(cc => cc.company_code === companyCodes[0]?.code)?.[0]?.id || costCenters[0]?.id || null,
      },
    ];
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const asset of assets) {
      // Check if asset_number already exists
      const existing = await client.query(
        'SELECT id FROM asset_master WHERE asset_number = $1',
        [asset.asset_number]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${asset.asset_number} - already exists`);
        skippedCount++;
        continue;
      }
      
      // Insert asset
      await client.query(
        `INSERT INTO asset_master (
          asset_number, name, description, asset_class, acquisition_date, 
          acquisition_cost, current_value, depreciation_method, useful_life_years, 
          status, location, company_code_id, cost_center_id, is_active, active, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, true, NOW(), NOW())`,
        [
          asset.asset_number,
          asset.name,
          asset.description,
          asset.asset_class,
          asset.acquisition_date,
          asset.acquisition_cost,
          asset.current_value,
          asset.depreciation_method,
          asset.useful_life_years,
          asset.status,
          asset.location,
          asset.company_code_id,
          asset.cost_center_id,
        ]
      );
      
      console.log(`✅ Inserted ${asset.asset_number} - ${asset.name}`);
      insertedCount++;
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✨ Successfully added ${insertedCount} assets`);
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped ${skippedCount} existing assets`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding asset master data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addAssetMasterData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

