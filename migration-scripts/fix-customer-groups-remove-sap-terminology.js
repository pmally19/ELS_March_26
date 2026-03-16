import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function fixCustomerGroupsTable() {
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
    console.log('🔄 Starting migration: Fix customer_groups table - Remove SAP terminology...');
    client = await pool.connect();

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_groups'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Table customer_groups does not exist. Creating it...');
      
      await client.query(`
        CREATE TABLE customer_groups (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          account_group_id INTEGER,
          reconciliation_account_id INTEGER,
          credit_limit_group_id INTEGER,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          created_by INTEGER,
          updated_by INTEGER
        );
      `);
      
      console.log('✅ Created customer_groups table!');
    } else {
      console.log('📝 Table exists. Updating structure...');
      
      // Add name column if it doesn't exist (rename description if needed)
      const nameCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'customer_groups' 
          AND column_name = 'name'
        );
      `);
      
      if (!nameCheck.rows[0].exists) {
        console.log('📝 Adding name column...');
        await client.query(`
          ALTER TABLE customer_groups 
          ADD COLUMN name VARCHAR(100);
        `);
        
        // Copy description to name if description exists
        await client.query(`
          UPDATE customer_groups 
          SET name = description 
          WHERE name IS NULL;
        `);
        
        // Make name NOT NULL after populating
        await client.query(`
          ALTER TABLE customer_groups 
          ALTER COLUMN name SET NOT NULL;
        `);
      }
      
      // Change description to TEXT if it's not already
      await client.query(`
        ALTER TABLE customer_groups 
        ALTER COLUMN description TYPE TEXT;
      `);
      
      // Drop old SAP terminology columns if they exist
      console.log('🗑️  Removing SAP terminology columns...');
      
      await client.query(`
        ALTER TABLE customer_groups 
        DROP COLUMN IF EXISTS account_group;
      `);
      
      await client.query(`
        ALTER TABLE customer_groups 
        DROP COLUMN IF EXISTS reconciliation_account;
      `);
      
      await client.query(`
        ALTER TABLE customer_groups 
        DROP COLUMN IF EXISTS credit_limit_class;
      `);
      
      // Add new foreign key columns if they don't exist
      console.log('➕ Adding new foreign key columns...');
      
      await client.query(`
        ALTER TABLE customer_groups 
        ADD COLUMN IF NOT EXISTS account_group_id INTEGER;
      `);
      
      await client.query(`
        ALTER TABLE customer_groups 
        ADD COLUMN IF NOT EXISTS reconciliation_account_id INTEGER;
      `);
      
      await client.query(`
        ALTER TABLE customer_groups 
        ADD COLUMN IF NOT EXISTS credit_limit_group_id INTEGER;
      `);
      
      // Add sort_order if it doesn't exist
      await client.query(`
        ALTER TABLE customer_groups 
        ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
      `);
      
      // Add audit fields if they don't exist
      await client.query(`
        ALTER TABLE customer_groups 
        ADD COLUMN IF NOT EXISTS created_by INTEGER;
      `);
      
      await client.query(`
        ALTER TABLE customer_groups 
        ADD COLUMN IF NOT EXISTS updated_by INTEGER;
      `);
      
      // Create indexes
      console.log('📝 Creating indexes...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_groups_account_group_id 
        ON customer_groups(account_group_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_groups_reconciliation_account_id 
        ON customer_groups(reconciliation_account_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_groups_credit_limit_group_id 
        ON customer_groups(credit_limit_group_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_groups_is_active 
        ON customer_groups(is_active);
      `);
    }

    console.log('✅ Successfully updated customer_groups table!');
    console.log('✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

fixCustomerGroupsTable().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

