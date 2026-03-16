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

async function setupSampleData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting Asset Account Determination Sample Data Setup...\n');

    // Step 1: Populate Transaction Types
    console.log('📋 Step 1: Populating Transaction Types...');
    await client.query(`
      INSERT INTO transaction_types (code, name, description, is_active, created_at, updated_at)
      VALUES 
        ('CAPITALIZATION', 'Capitalization', 'Asset acquisition and capitalization transactions', true, NOW(), NOW()),
        ('DEPRECIATION', 'Depreciation', 'Regular depreciation transactions', true, NOW(), NOW()),
        ('RETIREMENT', 'Retirement', 'Asset retirement and disposal transactions', true, NOW(), NOW()),
        ('SALE', 'Sale', 'Asset sale transactions', true, NOW(), NOW()),
        ('TRANSFER', 'Transfer', 'Asset transfer between locations or companies', true, NOW(), NOW()),
        ('UNPLANNED_DEPRECIATION', 'Unplanned Depreciation', 'Unplanned or special depreciation transactions', true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
    `);
    console.log('✅ Transaction Types populated\n');

    // Step 2: Populate Account Categories
    console.log('📋 Step 2: Populating Account Categories...');
    await client.query(`
      INSERT INTO account_categories (code, name, description, account_type, is_active, created_at, updated_at)
      VALUES 
        ('ASSET_ACCOUNT', 'Fixed Asset Account', 'GL account for fixed asset acquisition', 'BALANCE_SHEET', true, NOW(), NOW()),
        ('ACCUMULATED_DEPRECIATION_ACCOUNT', 'Accumulated Depreciation Account', 'GL account for accumulated depreciation', 'BALANCE_SHEET', true, NOW(), NOW()),
        ('DEPRECIATION_EXPENSE_ACCOUNT', 'Depreciation Expense Account', 'GL account for depreciation expense', 'PROFIT_LOSS', true, NOW(), NOW()),
        ('CLEARING_ACCOUNT', 'Clearing Account', 'GL account for clearing transactions', 'BALANCE_SHEET', true, NOW(), NOW()),
        ('RETIREMENT_ACCOUNT', 'Retirement Account', 'GL account for asset retirement', 'BALANCE_SHEET', true, NOW(), NOW()),
        ('REVENUE_ACCOUNT', 'Revenue Account', 'GL account for asset sale revenue', 'PROFIT_LOSS', true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          account_type = EXCLUDED.account_type,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
    `);
    console.log('✅ Account Categories populated\n');

    // Step 3: Create Sample GL Accounts (if not exist)
    console.log('📋 Step 3: Creating Sample GL Accounts...');
    const glAccountsToCreate = [
      { number: '1500', name: 'Fixed Assets - Property, Plant & Equipment', type: 'ASSETS' },
      { number: '1501', name: 'Accumulated Depreciation - Property, Plant & Equipment', type: 'ASSETS' },
      { number: '5000', name: 'Depreciation Expense', type: 'EXPENSES' },
      { number: '1502', name: 'Asset Retirement Account', type: 'ASSETS' },
      { number: '4000', name: 'Gain/Loss on Asset Disposal', type: 'REVENUE' }
    ];

    for (const acc of glAccountsToCreate) {
      const existing = await client.query(
        `SELECT id FROM gl_accounts WHERE account_number = $1`,
        [acc.number]
      );
      
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO gl_accounts (account_number, account_name, account_type, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, true, NOW(), NOW())
        `, [acc.number, acc.name, acc.type]);
        console.log(`   Created: ${acc.number} - ${acc.name}`);
      } else {
        console.log(`   Exists: ${acc.number} - ${acc.name}`);
      }
    }
    console.log('✅ Sample GL Accounts ready\n');

    // Step 4: Get or Create Sample Asset Class
    console.log('📋 Step 4: Getting/Creating Sample Asset Class...');
    const assetClassResult = await client.query(`
      INSERT INTO asset_classes (code, name, description, is_active, created_at, updated_at)
      VALUES ('1000', 'Buildings', 'Building and real estate assets', true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, code, name;
    `);
    const assetClass = assetClassResult.rows[0];
    console.log(`✅ Asset Class: ${assetClass.code} - ${assetClass.name} (ID: ${assetClass.id})\n`);

    // Step 5: Get GL Account IDs
    console.log('📋 Step 5: Getting GL Account IDs...');
    const glAccountsResult = await client.query(`
      SELECT id, account_number, account_name, account_type
      FROM gl_accounts
      WHERE account_number IN ('1500', '1501', '5000', '1502', '4000')
      ORDER BY account_number;
    `);
    
    const glAccounts = {};
    glAccountsResult.rows.forEach(acc => {
      glAccounts[acc.account_number] = acc.id;
      console.log(`   ${acc.account_number} - ${acc.account_name} (ID: ${acc.id})`);
    });
    console.log('');

    // Step 6: Create Sample Account Determination Rules
    console.log('📋 Step 6: Creating Sample Account Determination Rules...\n');

    // Rule 1: Capitalization - Asset Account
    await client.query(`
      INSERT INTO asset_account_determination (
        asset_class_id, transaction_type, account_category, gl_account_id,
        company_code_id, description, is_active, created_at, updated_at
      )
      VALUES ($1, 'CAPITALIZATION', 'ASSET_ACCOUNT', $2, NULL, 'Capitalization rule for Buildings asset class', true, NOW(), NOW())
      ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO UPDATE
      SET gl_account_id = EXCLUDED.gl_account_id,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
    `, [assetClass.id, glAccounts['1500']]);
    console.log('✅ Rule 1: Capitalization → Fixed Asset Account (1500)');

    // Rule 2: Depreciation - Expense Account
    await client.query(`
      INSERT INTO asset_account_determination (
        asset_class_id, transaction_type, account_category, gl_account_id,
        company_code_id, description, is_active, created_at, updated_at
      )
      VALUES ($1, 'DEPRECIATION', 'DEPRECIATION_EXPENSE_ACCOUNT', $2, NULL, 'Depreciation expense for Buildings', true, NOW(), NOW())
      ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO UPDATE
      SET gl_account_id = EXCLUDED.gl_account_id,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
    `, [assetClass.id, glAccounts['5000']]);
    console.log('✅ Rule 2: Depreciation → Depreciation Expense Account (5000)');

    // Rule 3: Depreciation - Accumulated Account
    await client.query(`
      INSERT INTO asset_account_determination (
        asset_class_id, transaction_type, account_category, gl_account_id,
        company_code_id, description, is_active, created_at, updated_at
      )
      VALUES ($1, 'DEPRECIATION', 'ACCUMULATED_DEPRECIATION_ACCOUNT', $2, NULL, 'Accumulated depreciation for Buildings', true, NOW(), NOW())
      ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO UPDATE
      SET gl_account_id = EXCLUDED.gl_account_id,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
    `, [assetClass.id, glAccounts['1501']]);
    console.log('✅ Rule 3: Depreciation → Accumulated Depreciation Account (1501)');

    // Rule 4: Retirement - Retirement Account
    await client.query(`
      INSERT INTO asset_account_determination (
        asset_class_id, transaction_type, account_category, gl_account_id,
        company_code_id, description, is_active, created_at, updated_at
      )
      VALUES ($1, 'RETIREMENT', 'RETIREMENT_ACCOUNT', $2, NULL, 'Retirement rule for Buildings', true, NOW(), NOW())
      ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO UPDATE
      SET gl_account_id = EXCLUDED.gl_account_id,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
    `, [assetClass.id, glAccounts['1502']]);
    console.log('✅ Rule 4: Retirement → Retirement Account (1502)');

    // Rule 5: Sale - Revenue Account
    await client.query(`
      INSERT INTO asset_account_determination (
        asset_class_id, transaction_type, account_category, gl_account_id,
        company_code_id, description, is_active, created_at, updated_at
      )
      VALUES ($1, 'SALE', 'REVENUE_ACCOUNT', $2, NULL, 'Sale revenue for Buildings', true, NOW(), NOW())
      ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO UPDATE
      SET gl_account_id = EXCLUDED.gl_account_id,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
    `, [assetClass.id, glAccounts['4000']]);
    console.log('✅ Rule 5: Sale → Revenue Account (4000)');

    await client.query('COMMIT');
    console.log('\n✅ Sample data setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Transaction Types: 6`);
    console.log(`   - Account Categories: 6`);
    console.log(`   - GL Accounts: 5`);
    console.log(`   - Asset Class: 1 (Buildings)`);
    console.log(`   - Account Determination Rules: 5`);
    console.log('\n🎉 You can now use the UI to create more rules or modify existing ones!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up sample data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupSampleData().catch(console.error);

