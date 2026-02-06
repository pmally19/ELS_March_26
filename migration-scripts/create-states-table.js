import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function createStatesTable() {
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
    console.log('🔄 Starting migration: Create/update states table...');
    client = await pool.connect();

    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'states'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table states already exists. Updating structure...');
      
      // Check and add missing columns
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'states';
      `);
      
      const existingColumns = columnsCheck.rows.map(row => row.column_name);
      
      // Add country_id column if missing
      if (!existingColumns.includes('country_id')) {
        await client.query(`ALTER TABLE states ADD COLUMN country_id INTEGER;`);
        console.log('✅ Added country_id column');
      }
      
      // Add description column if missing
      if (!existingColumns.includes('description')) {
        await client.query(`ALTER TABLE states ADD COLUMN description TEXT;`);
        console.log('✅ Added description column');
      }
      
      // Add region column if missing
      if (!existingColumns.includes('region')) {
        await client.query(`ALTER TABLE states ADD COLUMN region VARCHAR(50);`);
        console.log('✅ Added region column');
      }
      
      // Ensure is_active exists
      if (!existingColumns.includes('is_active')) {
        await client.query(`ALTER TABLE states ADD COLUMN is_active BOOLEAN DEFAULT true;`);
        console.log('✅ Added is_active column');
      }
      
      // Ensure created_at and updated_at exist
      if (!existingColumns.includes('created_at')) {
        await client.query(`ALTER TABLE states ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL;`);
        console.log('✅ Added created_at column');
      }
      
      if (!existingColumns.includes('updated_at')) {
        await client.query(`ALTER TABLE states ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;`);
        console.log('✅ Added updated_at column');
      }
      
      // Create unique constraint on code and country_id if it doesn't exist
      const constraintCheck = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'states' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'uk_states_code_country';
      `);
      
      if (constraintCheck.rows.length === 0) {
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS uk_states_code_country 
          ON states (code, country_id) 
          WHERE country_id IS NOT NULL;
        `);
        console.log('✅ Created unique constraint on code and country_id');
      }
      
      console.log('✅ Table structure updated successfully');
    } else {
      console.log('📝 Creating states table...');
      await client.query(`
        CREATE TABLE states (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          country_id INTEGER REFERENCES countries(id),
          region VARCHAR(50),
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_states_code ON states (code);
        CREATE INDEX IF NOT EXISTS idx_states_name ON states (name);
        CREATE INDEX IF NOT EXISTS idx_states_country_id ON states (country_id);
        CREATE INDEX IF NOT EXISTS idx_states_region ON states (region);
        CREATE INDEX IF NOT EXISTS idx_states_is_active ON states (is_active);
        CREATE UNIQUE INDEX IF NOT EXISTS uk_states_code_country ON states (code, country_id) WHERE country_id IS NOT NULL;
      `);
      
      console.log('✅ Table states created successfully with indexes');
    }

    console.log('✅ Migration completed successfully');
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

createStatesTable()
  .then(() => {
    console.log('🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

