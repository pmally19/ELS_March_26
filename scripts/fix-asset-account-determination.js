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

async function fixAssetAccountDetermination() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Starting asset account determination fix...');

    // 1. Create transaction_types master data table
    console.log('Creating transaction_types table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transaction_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT transaction_types_code_unique UNIQUE(code)
      );
      
      CREATE INDEX IF NOT EXISTS idx_transaction_types_code ON transaction_types(code);
      CREATE INDEX IF NOT EXISTS idx_transaction_types_active ON transaction_types(is_active);
    `);

    // 2. Create account_categories master data table
    console.log('Creating account_categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_categories (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        account_type VARCHAR(20) NOT NULL,
        is_active BOOLEAN NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT account_categories_code_unique UNIQUE(code)
      );
      
      CREATE INDEX IF NOT EXISTS idx_account_categories_code ON account_categories(code);
      CREATE INDEX IF NOT EXISTS idx_account_categories_active ON account_categories(is_active);
      CREATE INDEX IF NOT EXISTS idx_account_categories_type ON account_categories(account_type);
    `);

    // 3. Create asset_account_determination table if it doesn't exist
    console.log('Creating asset_account_determination table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_account_determination (
        id SERIAL PRIMARY KEY,
        asset_class_id INTEGER NOT NULL REFERENCES asset_classes(id),
        transaction_type VARCHAR(50) NOT NULL,
        account_category VARCHAR(50) NOT NULL,
        gl_account_id INTEGER NOT NULL REFERENCES gl_accounts(id),
        company_code_id INTEGER REFERENCES company_codes(id),
        is_active BOOLEAN NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(asset_class_id, transaction_type, account_category, company_code_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_account_determination_class ON asset_account_determination(asset_class_id);
      CREATE INDEX IF NOT EXISTS idx_account_determination_type ON asset_account_determination(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_account_determination_category ON asset_account_determination(account_category);
      CREATE INDEX IF NOT EXISTS idx_account_determination_company ON asset_account_determination(company_code_id);
    `);

    // 4. Add foreign key columns to asset_account_determination
    console.log('Adding foreign key columns to asset_account_determination...');
    await client.query(`
      ALTER TABLE asset_account_determination 
        ADD COLUMN IF NOT EXISTS transaction_type_id INTEGER REFERENCES transaction_types(id),
        ADD COLUMN IF NOT EXISTS account_category_id INTEGER REFERENCES account_categories(id);
    `);

    // 5. Remove defaults from asset_account_determination
    console.log('Removing default values...');
    try {
      await client.query(`
        ALTER TABLE asset_account_determination 
          ALTER COLUMN is_active DROP DEFAULT;
      `);
    } catch (error) {
      // Ignore if default doesn't exist
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }

    // 6. Ensure all required fields are NOT NULL
    console.log('Ensuring required fields are NOT NULL...');
    await client.query(`
      ALTER TABLE asset_account_determination 
        ALTER COLUMN asset_class_id SET NOT NULL,
        ALTER COLUMN transaction_type SET NOT NULL,
        ALTER COLUMN account_category SET NOT NULL,
        ALTER COLUMN gl_account_id SET NOT NULL,
        ALTER COLUMN is_active SET NOT NULL,
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET NOT NULL;
    `);

    // 7. Add comments
    await client.query(`
      COMMENT ON TABLE asset_account_determination IS 'Asset account determination rules - maps asset classes and transaction types to GL accounts';
      COMMENT ON TABLE transaction_types IS 'Master data for asset transaction types';
      COMMENT ON TABLE account_categories IS 'Master data for account categories used in asset account determination';
    `);

    // 8. Check if we need to migrate existing string values to master data
    console.log('Checking for existing data to migrate...');
    const existingTypes = await client.query(`
      SELECT DISTINCT transaction_type FROM asset_account_determination WHERE transaction_type IS NOT NULL;
    `);
    
    const existingCategories = await client.query(`
      SELECT DISTINCT account_category FROM asset_account_determination WHERE account_category IS NOT NULL;
    `);

    // Insert transaction types if they don't exist
    for (const row of existingTypes.rows) {
      const typeCode = row.transaction_type;
      const typeName = typeCode.charAt(0) + typeCode.slice(1).toLowerCase().replace(/_/g, ' ');
      
      await client.query(`
        INSERT INTO transaction_types (code, name, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (code) DO NOTHING;
      `, [typeCode, typeName, `Transaction type for ${typeName}`, true]);
    }

    // Insert account categories if they don't exist
    for (const row of existingCategories.rows) {
      const catCode = row.account_category;
      const catName = catCode.charAt(0) + catCode.slice(1).toLowerCase().replace(/_/g, ' ');
      const accountType = catCode.includes('ACCOUNT') && !catCode.includes('EXPENSE') ? 'BALANCE_SHEET' : 'PROFIT_LOSS';
      
      await client.query(`
        INSERT INTO account_categories (code, name, description, account_type, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (code) DO NOTHING;
      `, [catCode, catName, `Account category for ${catName}`, accountType, true]);
    }

    // 9. Update asset_account_determination to link to master data
    console.log('Linking existing records to master data...');
    await client.query(`
      UPDATE asset_account_determination aad
      SET transaction_type_id = tt.id
      FROM transaction_types tt
      WHERE aad.transaction_type = tt.code
        AND aad.transaction_type_id IS NULL;
    `);

    await client.query(`
      UPDATE asset_account_determination aad
      SET account_category_id = ac.id
      FROM account_categories ac
      WHERE aad.account_category = ac.code
        AND aad.account_category_id IS NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Asset account determination fix completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing asset account determination:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAssetAccountDetermination().catch(console.error);

