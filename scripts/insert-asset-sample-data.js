import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'mallyerp';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

const pool = new Pool({
  host: dbHost,
  port: parseInt(dbPort),
  database: dbName,
  user: dbUser,
  password: dbPassword,
});

async function insertSampleData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔍 Checking existing data...');

    // Check for GL accounts - we need depreciation expense and accumulated depreciation accounts
    const expenseAccounts = await client.query(`
      SELECT id, account_number, account_name 
      FROM gl_accounts 
      WHERE account_type = 'EXPENSES' 
        AND (account_name ILIKE '%depreciation%' OR account_name ILIKE '%amortization%')
        AND is_active = true
      LIMIT 3
    `);

    const accumulatedAccounts = await client.query(`
      SELECT id, account_number, account_name 
      FROM gl_accounts 
      WHERE account_type = 'ASSETS' 
        AND (account_name ILIKE '%accumulated%depreciation%' OR account_name ILIKE '%depreciation%accumulated%')
        AND is_active = true
      LIMIT 3
    `);

    const assetAccounts = await client.query(`
      SELECT id, account_number, account_name 
      FROM gl_accounts 
      WHERE account_type = 'ASSETS' 
        AND (account_name ILIKE '%fixed%asset%' OR account_name ILIKE '%property%plant%equipment%' OR account_name ILIKE '%PP&E%')
        AND is_active = true
      LIMIT 3
    `);

    // Get company codes - use active column
    const companyCodes = await client.query(`
      SELECT id, code, name 
      FROM company_codes 
      WHERE active = true
      LIMIT 5
    `);

    if (companyCodes.rows.length === 0) {
      throw new Error('No company codes found. Please create company codes first.');
    }

    // Get cost centers - use cost_center column (not code)
    const costCenters = await client.query(`
      SELECT id, cost_center as code, description as name 
      FROM cost_centers 
      WHERE active = true
      LIMIT 5
    `);

    if (costCenters.rows.length === 0) {
      throw new Error('No cost centers found. Please create cost centers first.');
    }

    console.log(`Found ${expenseAccounts.rows.length} depreciation expense accounts`);
    console.log(`Found ${accumulatedAccounts.rows.length} accumulated depreciation accounts`);
    console.log(`Found ${assetAccounts.rows.length} fixed asset accounts`);
    console.log(`Found ${companyCodes.rows.length} company codes`);
    console.log(`Found ${costCenters.rows.length} cost centers`);

    // If we don't have enough GL accounts, create them
    if (expenseAccounts.rows.length === 0 || accumulatedAccounts.rows.length === 0 || assetAccounts.rows.length === 0) {
      console.log('⚠️  Creating required GL accounts...');
      
      // Get the highest account number to generate new ones
      const maxAccountResult = await client.query(`
        SELECT MAX(CAST(account_number AS INTEGER)) as max_num
        FROM gl_accounts
        WHERE account_number ~ '^[0-9]+$'
      `);
      const nextAccountNum = (parseInt(maxAccountResult.rows[0]?.max_num || '600000') + 1);

      // Create depreciation expense account if missing
      if (expenseAccounts.rows.length === 0) {
        const expenseResult = await client.query(`
          INSERT INTO gl_accounts (account_number, account_name, account_type, is_active, created_at, updated_at)
          VALUES ($1, 'Depreciation Expense - Equipment', 'EXPENSES', true, NOW(), NOW())
          RETURNING id, account_number, account_name
        `, [(nextAccountNum).toString()]);
        expenseAccounts.rows.push(expenseResult.rows[0]);
        console.log(`✅ Created expense account: ${expenseResult.rows[0].account_number}`);
      }

      // Create accumulated depreciation account if missing
      if (accumulatedAccounts.rows.length === 0) {
        const accumResult = await client.query(`
          INSERT INTO gl_accounts (account_number, account_name, account_type, is_active, created_at, updated_at)
          VALUES ($1, 'Accumulated Depreciation - Equipment', 'ASSETS', true, NOW(), NOW())
          RETURNING id, account_number, account_name
        `, [(nextAccountNum + 1).toString()]);
        accumulatedAccounts.rows.push(accumResult.rows[0]);
        console.log(`✅ Created accumulated account: ${accumResult.rows[0].account_number}`);
      }

      // Create fixed asset account if missing
      if (assetAccounts.rows.length === 0) {
        const assetResult = await client.query(`
          INSERT INTO gl_accounts (account_number, account_name, account_type, is_active, created_at, updated_at)
          VALUES ($1, 'Fixed Assets - Equipment', 'ASSETS', true, NOW(), NOW())
          RETURNING id, account_number, account_name
        `, [(nextAccountNum + 2).toString()]);
        assetAccounts.rows.push(assetResult.rows[0]);
        console.log(`✅ Created asset account: ${assetResult.rows[0].account_number}`);
      }
    }

    // Insert Asset Classes
    console.log('\n📦 Inserting asset classes...');
    
    const assetClassesData = [
      {
        code: '3000',
        name: 'Machinery and Equipment',
        description: 'Production machinery, manufacturing equipment, and industrial tools',
        default_depreciation_method: 'STRAIGHT_LINE',
        default_useful_life_years: 10
      },
      {
        code: '4000',
        name: 'Office Furniture and Fixtures',
        description: 'Desks, chairs, filing cabinets, and office furnishings',
        default_depreciation_method: 'STRAIGHT_LINE',
        default_useful_life_years: 7
      },
      {
        code: '5000',
        name: 'Computer Equipment',
        description: 'Servers, workstations, laptops, and networking equipment',
        default_depreciation_method: 'STRAIGHT_LINE',
        default_useful_life_years: 5
      }
    ];

    const insertedAssetClasses = [];
    for (const ac of assetClassesData) {
      // Check if asset class already exists
      const existing = await client.query(`
        SELECT id FROM asset_classes WHERE code = $1
      `, [ac.code]);

      if (existing.rows.length === 0) {
        const result = await client.query(`
          INSERT INTO asset_classes (code, name, description, default_depreciation_method, default_useful_life_years, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
          RETURNING id, code, name
        `, [ac.code, ac.name, ac.description, ac.default_depreciation_method, ac.default_useful_life_years]);
        insertedAssetClasses.push(result.rows[0]);
        console.log(`✅ Created asset class: ${ac.code} - ${ac.name}`);
      } else {
        insertedAssetClasses.push(existing.rows[0]);
        console.log(`⏭️  Asset class already exists: ${ac.code} - ${ac.name}`);
      }
    }

    if (insertedAssetClasses.length === 0) {
      throw new Error('Failed to create asset classes');
    }

    // Insert Account Determination Rules
    console.log('\n📋 Inserting account determination rules...');
    
    const companyCodeId = companyCodes.rows[0].id;
    const expenseAccountId = expenseAccounts.rows[0].id;
    const accumAccountId = accumulatedAccounts.rows[0].id;
    const assetAccountId = assetAccounts.rows[0].id;

    for (const assetClass of insertedAssetClasses) {
      // Check if account determination already exists for this asset class
      const existingDep = await client.query(`
        SELECT id FROM asset_account_determination 
        WHERE asset_class_id = $1 
          AND transaction_type = 'DEPRECIATION'
          AND company_code_id IS NULL
      `, [assetClass.id]);

      if (existingDep.rows.length === 0) {
        await client.query(`
          INSERT INTO asset_account_determination (
            asset_class_id, transaction_type, 
            gl_depreciation_expense_account_id, 
            gl_accumulated_depreciation_account_id,
            gl_asset_account_id,
            company_code_id, is_active, created_at, updated_at
          )
          VALUES ($1, 'DEPRECIATION', $2, $3, $4, NULL, true, NOW(), NOW())
        `, [assetClass.id, expenseAccountId, accumAccountId, assetAccountId]);
        console.log(`✅ Created depreciation account determination for ${assetClass.code}`);
      } else {
        // Update existing rule
        await client.query(`
          UPDATE asset_account_determination
          SET gl_depreciation_expense_account_id = $1,
              gl_accumulated_depreciation_account_id = $2,
              gl_asset_account_id = $3,
              updated_at = NOW()
          WHERE id = $4
        `, [expenseAccountId, accumAccountId, assetAccountId, existingDep.rows[0].id]);
        console.log(`✅ Updated depreciation account determination for ${assetClass.code}`);
      }

      // Also create CAPITALIZATION rule
      const existingCap = await client.query(`
        SELECT id FROM asset_account_determination 
        WHERE asset_class_id = $1 
          AND transaction_type = 'CAPITALIZATION'
          AND company_code_id IS NULL
      `, [assetClass.id]);

      if (existingCap.rows.length === 0) {
        await client.query(`
          INSERT INTO asset_account_determination (
            asset_class_id, transaction_type, 
            gl_asset_account_id,
            company_code_id, is_active, created_at, updated_at
          )
          VALUES ($1, 'CAPITALIZATION', $2, NULL, true, NOW(), NOW())
        `, [assetClass.id, assetAccountId]);
        console.log(`✅ Created capitalization account determination for ${assetClass.code}`);
      } else {
        await client.query(`
          UPDATE asset_account_determination
          SET gl_asset_account_id = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [assetAccountId, existingCap.rows[0].id]);
        console.log(`✅ Updated capitalization account determination for ${assetClass.code}`);
      }
    }

    // Insert Asset Master Records
    console.log('\n🏢 Inserting asset master records...');
    
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const assetsData = [
      {
        asset_number: 'AST-2024-001',
        name: 'CNC Milling Machine',
        description: 'Industrial CNC milling machine for metal fabrication',
        asset_class_id: insertedAssetClasses[0].id, // Machinery and Equipment
        company_code_id: companyCodeId,
        cost_center_id: costCenters.rows[0].id,
        acquisition_date: twoYearsAgo.toISOString().split('T')[0],
        capitalization_date: twoYearsAgo.toISOString().split('T')[0],
        acquisition_cost: 125000.00,
        accumulated_depreciation: 25000.00,
        net_book_value: 100000.00,
        current_value: 100000.00,
        depreciation_method: 'STRAIGHT_LINE',
        useful_life_years: 10,
        value_date: twoYearsAgo.toISOString().split('T')[0],
        status: 'ACTIVE',
        is_active: true,
        location: 'Manufacturing Floor - Bay 3'
      },
      {
        asset_number: 'AST-2024-002',
        name: 'Executive Office Furniture Set',
        description: 'Complete office furniture set including desk, chairs, and storage units',
        asset_class_id: insertedAssetClasses[1].id, // Office Furniture
        company_code_id: companyCodeId,
        cost_center_id: costCenters.rows[0].id,
        acquisition_date: oneYearAgo.toISOString().split('T')[0],
        capitalization_date: oneYearAgo.toISOString().split('T')[0],
        acquisition_cost: 15000.00,
        accumulated_depreciation: 2142.86,
        net_book_value: 12857.14,
        current_value: 12857.14,
        depreciation_method: 'STRAIGHT_LINE',
        useful_life_years: 7,
        value_date: oneYearAgo.toISOString().split('T')[0],
        status: 'ACTIVE',
        is_active: true,
        location: 'Executive Suite - Floor 5'
      },
      {
        asset_number: 'AST-2024-003',
        name: 'Production Server Cluster',
        description: 'Dell PowerEdge server cluster for production environment',
        asset_class_id: insertedAssetClasses[2].id, // Computer Equipment
        company_code_id: companyCodeId,
        cost_center_id: costCenters.rows[0].id,
        acquisition_date: sixMonthsAgo.toISOString().split('T')[0],
        capitalization_date: sixMonthsAgo.toISOString().split('T')[0],
        acquisition_cost: 45000.00,
        accumulated_depreciation: 4500.00,
        net_book_value: 40500.00,
        current_value: 40500.00,
        depreciation_method: 'STRAIGHT_LINE',
        useful_life_years: 5,
        value_date: sixMonthsAgo.toISOString().split('T')[0],
        status: 'ACTIVE',
        is_active: true,
        location: 'Data Center - Server Room A'
      }
    ];

    for (const asset of assetsData) {
      // Check if asset already exists
      const existing = await client.query(`
        SELECT id FROM asset_master WHERE asset_number = $1
      `, [asset.asset_number]);

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO asset_master (
            asset_number, name, description, asset_class_id, company_code_id, cost_center_id,
            acquisition_date, capitalization_date, acquisition_cost, accumulated_depreciation,
            net_book_value, current_value, depreciation_method, useful_life_years,
            value_date, status, is_active, location, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        `, [
          asset.asset_number, asset.name, asset.description, asset.asset_class_id,
          asset.company_code_id, asset.cost_center_id, asset.acquisition_date,
          asset.capitalization_date, asset.acquisition_cost, asset.accumulated_depreciation,
          asset.net_book_value, asset.current_value, asset.depreciation_method,
          asset.useful_life_years, asset.value_date, asset.status, asset.is_active, asset.location
        ]);
        console.log(`✅ Created asset: ${asset.asset_number} - ${asset.name}`);
      } else {
        console.log(`⏭️  Asset already exists: ${asset.asset_number} - ${asset.name}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Sample data inserted successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Asset Classes: ${insertedAssetClasses.length}`);
    console.log(`   - Account Determination Rules: ${insertedAssetClasses.length * 2} (DEPRECIATION + CAPITALIZATION)`);
    console.log(`   - Assets: ${assetsData.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting sample data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertSampleData().catch(console.error);

