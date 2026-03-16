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

async function fixAssetAccountDeterminationFinal() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Starting final asset account determination fix...');

    // 1. Remove all default values from asset_account_determination
    console.log('Removing default values from asset_account_determination...');
    try {
      await client.query(`
        ALTER TABLE asset_account_determination 
          ALTER COLUMN is_active DROP DEFAULT;
      `);
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }

    try {
      await client.query(`
        ALTER TABLE asset_account_determination 
          ALTER COLUMN created_at DROP DEFAULT;
      `);
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }

    try {
      await client.query(`
        ALTER TABLE asset_account_determination 
          ALTER COLUMN updated_at DROP DEFAULT;
      `);
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }

    // 2. Ensure all required fields are NOT NULL
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

    // 3. Remove SAP terminology from comments
    console.log('Updating table comments...');
    await client.query(`
      COMMENT ON TABLE asset_account_determination IS 'Asset account determination rules - maps asset classes and transaction types to GL accounts';
      COMMENT ON TABLE transaction_types IS 'Master data for asset transaction types';
      COMMENT ON TABLE account_categories IS 'Master data for account categories used in asset account determination';
    `);

    // 4. Ensure master data tables have no defaults
    console.log('Removing defaults from master data tables...');
    
    // transaction_types
    try {
      await client.query(`
        ALTER TABLE transaction_types 
          ALTER COLUMN is_active DROP DEFAULT,
          ALTER COLUMN created_at DROP DEFAULT,
          ALTER COLUMN updated_at DROP DEFAULT;
      `);
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }

    // account_categories
    try {
      await client.query(`
        ALTER TABLE account_categories 
          ALTER COLUMN is_active DROP DEFAULT,
          ALTER COLUMN created_at DROP DEFAULT,
          ALTER COLUMN updated_at DROP DEFAULT;
      `);
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }

    // 5. Ensure master data tables have required fields as NOT NULL
    console.log('Ensuring master data tables have required fields...');
    await client.query(`
      ALTER TABLE transaction_types 
        ALTER COLUMN code SET NOT NULL,
        ALTER COLUMN name SET NOT NULL,
        ALTER COLUMN is_active SET NOT NULL,
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET NOT NULL;
    `);

    await client.query(`
      ALTER TABLE account_categories 
        ALTER COLUMN code SET NOT NULL,
        ALTER COLUMN name SET NOT NULL,
        ALTER COLUMN account_type SET NOT NULL,
        ALTER COLUMN is_active SET NOT NULL,
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Final asset account determination fix completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing asset account determination:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAssetAccountDeterminationFinal().catch(console.error);

