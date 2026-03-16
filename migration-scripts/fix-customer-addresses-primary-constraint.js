import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function fixCustomerAddressesConstraint() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'mallyerp';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

  const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

  const pool = new Pool({
    connectionString: connectionString,
  });

  let client;
  try {
    console.log('🔄 Starting migration: Fix customer_addresses primary constraint...');
    client = await pool.connect();
    
    await client.query('BEGIN');

    // Check if the problematic constraint exists
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'customer_addresses' 
      AND constraint_name = 'uk_customer_addresses_primary'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('📝 Dropping existing constraint uk_customer_addresses_primary...');
      await client.query(`
        ALTER TABLE customer_addresses 
        DROP CONSTRAINT IF EXISTS uk_customer_addresses_primary
      `);
    }

    // Create a partial unique index that only enforces uniqueness when is_primary = true
    // This allows multiple addresses with is_primary = false
    console.log('📝 Creating partial unique index for primary addresses...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uk_customer_addresses_primary_true
      ON customer_addresses(customer_id, address_type)
      WHERE is_primary = true
    `);

    // Also ensure the trigger function exists to handle setting other addresses to non-primary
    console.log('📝 Ensuring trigger function exists...');
    await client.query(`
      CREATE OR REPLACE FUNCTION ensure_single_primary_address()
      RETURNS TRIGGER AS $$
      BEGIN
        -- If setting is_primary to TRUE, set all others of the same type to FALSE
        IF NEW.is_primary = TRUE THEN
          UPDATE customer_addresses 
          SET is_primary = FALSE,
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = NEW.customer_id 
            AND address_type = NEW.address_type 
            AND id != NEW.id
            AND is_primary = TRUE
            AND is_active = TRUE;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Drop and recreate the trigger to ensure it's active
    console.log('📝 Recreating trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_ensure_single_primary_address ON customer_addresses;
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_ensure_single_primary_address
      BEFORE INSERT OR UPDATE OF is_primary ON customer_addresses
      FOR EACH ROW
      WHEN (NEW.is_primary = TRUE)
      EXECUTE FUNCTION ensure_single_primary_address();
    `);

    await client.query('COMMIT');
    
    console.log('✅ Successfully fixed customer_addresses primary constraint!');
    console.log('✨ Migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - Dropped old constraint that prevented multiple non-primary addresses');
    console.log('  - Created partial unique index that only enforces uniqueness for primary addresses');
    console.log('  - Ensured trigger function handles primary address switching');
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

fixCustomerAddressesConstraint().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

