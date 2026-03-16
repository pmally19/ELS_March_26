import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function createCountriesTable() {
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
    console.log('🔄 Starting migration: Create/update countries table...');
    client = await pool.connect();

    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'countries'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table countries already exists. Updating structure...');
      
      // Check and add missing columns
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'countries';
      `);
      
      const existingColumns = columnsCheck.rows.map(row => row.column_name);
      
      // Add description column if missing
      if (!existingColumns.includes('description')) {
        await client.query(`ALTER TABLE countries ADD COLUMN description TEXT;`);
        console.log('✅ Added description column');
      }
      
      // Add region column if missing
      if (!existingColumns.includes('region')) {
        await client.query(`ALTER TABLE countries ADD COLUMN region VARCHAR(50);`);
        console.log('✅ Added region column');
      }
      
      // Ensure currency_code exists (might be currency)
      if (!existingColumns.includes('currency_code') && !existingColumns.includes('currency')) {
        await client.query(`ALTER TABLE countries ADD COLUMN currency_code VARCHAR(3);`);
        console.log('✅ Added currency_code column');
      }
      
      // Ensure language_code exists
      if (!existingColumns.includes('language_code')) {
        await client.query(`ALTER TABLE countries ADD COLUMN language_code VARCHAR(5);`);
        console.log('✅ Added language_code column');
      }
      
      // Ensure is_active exists
      if (!existingColumns.includes('is_active')) {
        await client.query(`ALTER TABLE countries ADD COLUMN is_active BOOLEAN DEFAULT true;`);
        console.log('✅ Added is_active column');
      }
      
      // Ensure created_at and updated_at exist
      if (!existingColumns.includes('created_at')) {
        await client.query(`ALTER TABLE countries ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL;`);
        console.log('✅ Added created_at column');
      }
      
      if (!existingColumns.includes('updated_at')) {
        await client.query(`ALTER TABLE countries ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;`);
        console.log('✅ Added updated_at column');
      }
      
      // Remove duplicate active column if it exists
      if (existingColumns.includes('active') && existingColumns.includes('is_active')) {
        await client.query(`ALTER TABLE countries DROP COLUMN IF EXISTS active;`);
        console.log('✅ Removed duplicate active column');
      }
      
      // Remove region_id if it exists (we're using region text field instead)
      if (existingColumns.includes('region_id')) {
        await client.query(`ALTER TABLE countries DROP COLUMN IF EXISTS region_id;`);
        console.log('✅ Removed region_id column');
      }
      
      console.log('✅ Table structure updated successfully');
    } else {
      console.log('📝 Creating countries table...');
      await client.query(`
        CREATE TABLE countries (
          id SERIAL PRIMARY KEY,
          code VARCHAR(2) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          region VARCHAR(50),
          currency_code VARCHAR(3),
          language_code VARCHAR(5),
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_countries_code ON countries (code);
        CREATE INDEX IF NOT EXISTS idx_countries_name ON countries (name);
        CREATE INDEX IF NOT EXISTS idx_countries_region ON countries (region);
        CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries (is_active);
      `);
      
      console.log('✅ Table countries created successfully with indexes');
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

createCountriesTable()
  .then(() => {
    console.log('🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

