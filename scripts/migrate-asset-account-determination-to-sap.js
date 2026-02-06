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

async function migrateToSAPStructure() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Starting migration to SAP-standard asset account determination structure...');

    // Step 1: Create new table with SAP structure
    console.log('\n📋 Step 1: Creating new SAP-standard table structure...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_account_determination_new (
        id SERIAL PRIMARY KEY,
        chart_of_depreciation_code VARCHAR(10) NOT NULL DEFAULT '01',
        account_determination_key VARCHAR(4) NOT NULL DEFAULT 'ANKA',
        asset_class_id INTEGER NOT NULL REFERENCES asset_classes(id),
        transaction_type INTEGER NOT NULL,
        account_category VARCHAR(2) NOT NULL,
        gl_account_id INTEGER NOT NULL REFERENCES gl_accounts(id),
        company_code_id INTEGER REFERENCES company_codes(id),
        valuation_class VARCHAR(2) DEFAULT '01',
        depreciation_area_id INTEGER REFERENCES depreciation_areas(id),
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(asset_class_id, transaction_type, account_category, company_code_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_aad_class_trans ON asset_account_determination_new(asset_class_id, transaction_type);
      CREATE INDEX IF NOT EXISTS idx_aad_account_category ON asset_account_determination_new(account_category);
      CREATE INDEX IF NOT EXISTS idx_aad_company_code ON asset_account_determination_new(company_code_id);
    `);

    console.log('✅ New table structure created');

    // Step 2: Migrate existing data
    console.log('\n📦 Step 2: Migrating existing data...');
    
    // Check if old table has data
    const oldData = await client.query(`
      SELECT * FROM asset_account_determination WHERE is_active = true
    `);

    if (oldData.rows.length > 0) {
      console.log(`   Found ${oldData.rows.length} existing rules to migrate`);
      
      for (const oldRule of oldData.rows) {
        // Migrate DEPRECIATION rules
        if (oldRule.transaction_type === 'DEPRECIATION') {
          // AB - Depreciation Expense Account (Debit)
          if (oldRule.gl_depreciation_expense_account_id) {
            await client.query(`
              INSERT INTO asset_account_determination_new (
                chart_of_depreciation_code, account_determination_key,
                asset_class_id, transaction_type, account_category,
                gl_account_id, company_code_id, valuation_class, is_active
              )
              VALUES ($1, $2, $3, 700, 'AB', $4, $5, '01', true)
              ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO NOTHING
            `, ['01', 'ANKA', oldRule.asset_class_id, oldRule.gl_depreciation_expense_account_id, oldRule.company_code_id]);
          }
          
          // AV - Accumulated Depreciation Account (Credit)
          if (oldRule.gl_accumulated_depreciation_account_id) {
            await client.query(`
              INSERT INTO asset_account_determination_new (
                chart_of_depreciation_code, account_determination_key,
                asset_class_id, transaction_type, account_category,
                gl_account_id, company_code_id, valuation_class, is_active
              )
              VALUES ($1, $2, $3, 700, 'AV', $4, $5, '01', true)
              ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO NOTHING
            `, ['01', 'ANKA', oldRule.asset_class_id, oldRule.gl_accumulated_depreciation_account_id, oldRule.company_code_id]);
          }
        }
        
        // Migrate CAPITALIZATION rules
        if (oldRule.transaction_type === 'CAPITALIZATION') {
          // AS - Asset Account (Debit)
          if (oldRule.gl_asset_account_id) {
            await client.query(`
              INSERT INTO asset_account_determination_new (
                chart_of_depreciation_code, account_determination_key,
                asset_class_id, transaction_type, account_category,
                gl_account_id, company_code_id, valuation_class, is_active
              )
              VALUES ($1, $2, $3, 100, 'AS', $4, $5, '01', true)
              ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO NOTHING
            `, ['01', 'ANKA', oldRule.asset_class_id, oldRule.gl_asset_account_id, oldRule.company_code_id]);
          }
        }
        
        // Migrate RETIREMENT rules (if any)
        if (oldRule.transaction_type === 'RETIREMENT') {
          // ZS - Asset Retirement Account
          if (oldRule.gl_retirement_account_id) {
            await client.query(`
              INSERT INTO asset_account_determination_new (
                chart_of_depreciation_code, account_determination_key,
                asset_class_id, transaction_type, account_category,
                gl_account_id, company_code_id, valuation_class, is_active
              )
              VALUES ($1, $2, $3, 200, 'ZS', $4, $5, '01', true)
              ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO NOTHING
            `, ['01', 'ANKA', oldRule.asset_class_id, oldRule.gl_retirement_account_id, oldRule.company_code_id]);
          }
        }
        
        // Migrate SALE rules (if any)
        if (oldRule.transaction_type === 'SALE') {
          // ZR - Revenue from Asset Sale
          if (oldRule.gl_revenue_account_id) {
            await client.query(`
              INSERT INTO asset_account_determination_new (
                chart_of_depreciation_code, account_determination_key,
                asset_class_id, transaction_type, account_category,
                gl_account_id, company_code_id, valuation_class, is_active
              )
              VALUES ($1, $2, $3, 260, 'ZR', $4, $5, '01', true)
              ON CONFLICT (asset_class_id, transaction_type, account_category, company_code_id) DO NOTHING
            `, ['01', 'ANKA', oldRule.asset_class_id, oldRule.gl_revenue_account_id, oldRule.company_code_id]);
          }
        }
      }
      
      console.log('✅ Existing data migrated');
    } else {
      console.log('⏭️  No existing data to migrate');
    }

    // Step 3: Rename tables
    console.log('\n🔄 Step 3: Renaming tables...');
    
    await client.query(`
      ALTER TABLE asset_account_determination RENAME TO asset_account_determination_old;
    `);
    console.log('✅ Old table renamed to asset_account_determination_old');
    
    await client.query(`
      ALTER TABLE asset_account_determination_new RENAME TO asset_account_determination;
    `);
    console.log('✅ New table renamed to asset_account_determination');

    // Step 4: Update indexes
    console.log('\n📊 Step 4: Recreating indexes...');
    await client.query(`
      DROP INDEX IF EXISTS idx_account_determination_class;
      DROP INDEX IF EXISTS idx_account_determination_type;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_aad_class_trans ON asset_account_determination(asset_class_id, transaction_type);
      CREATE INDEX IF NOT EXISTS idx_aad_account_category ON asset_account_determination(account_category);
      CREATE INDEX IF NOT EXISTS idx_aad_company_code ON asset_account_determination(company_code_id);
    `);
    console.log('✅ Indexes recreated');

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Notes:');
    console.log('   - Old table backed up as: asset_account_determination_old');
    console.log('   - Transaction types: 100=Capitalization, 700=Depreciation, 200=Retirement, 260=Sale');
    console.log('   - Account categories: AS=Asset, AV=Accumulated Depr, AB=Depr Expense, AZ=Clearing, ZS=Retirement, ZR=Revenue');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateToSAPStructure().catch(console.error);

