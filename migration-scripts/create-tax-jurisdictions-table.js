import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function createTaxJurisdictionsTable() {
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
    console.log('🔄 Starting migration: Create/update tax_jurisdictions table...');
    client = await pool.connect();

    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_jurisdictions'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table tax_jurisdictions already exists. Updating structure...');
      
      // Check and add missing columns
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_jurisdictions';
      `);
      
      const existingColumns = columnsCheck.rows.map(row => row.column_name);
      
      // Ensure all required columns exist
      const requiredColumns = {
        'jurisdiction_code': 'VARCHAR(20)',
        'jurisdiction_name': 'VARCHAR(100)',
        'jurisdiction_type': 'VARCHAR(50)',
        'parent_jurisdiction_id': 'INTEGER',
        'country': 'VARCHAR(3)',
        'state_province': 'VARCHAR(10)',
        'county': 'VARCHAR(50)',
        'city': 'VARCHAR(50)',
        'postal_code_pattern': 'VARCHAR(20)',
        'is_active': 'BOOLEAN',
        'created_at': 'TIMESTAMP'
      };

      for (const [colName, colType] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(colName)) {
          let alterStatement = `ALTER TABLE tax_jurisdictions ADD COLUMN ${colName} ${colType}`;
          if (colName === 'is_active') {
            alterStatement += ' DEFAULT true';
          } else if (colName === 'created_at') {
            alterStatement += ' DEFAULT NOW()';
          } else if (colName === 'country') {
            alterStatement += " DEFAULT 'US'";
          }
          await client.query(alterStatement);
          console.log(`✅ Added ${colName} column`);
        }
      }
      
      // Create indexes if they don't exist
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_code ON tax_jurisdictions (jurisdiction_code);
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_type ON tax_jurisdictions (jurisdiction_type);
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_country ON tax_jurisdictions (country);
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_state_province ON tax_jurisdictions (state_province);
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_is_active ON tax_jurisdictions (is_active);
      `);
      console.log('✅ Created indexes');
      
      console.log('✅ Table structure updated successfully');
    } else {
      console.log('📝 Creating tax_jurisdictions table...');
      await client.query(`
        CREATE TABLE tax_jurisdictions (
          id SERIAL PRIMARY KEY,
          jurisdiction_code VARCHAR(20) NOT NULL,
          jurisdiction_name VARCHAR(100) NOT NULL,
          jurisdiction_type VARCHAR(50) NOT NULL,
          parent_jurisdiction_id INTEGER REFERENCES tax_jurisdictions(id),
          country VARCHAR(3) DEFAULT 'US',
          state_province VARCHAR(10),
          county VARCHAR(50),
          city VARCHAR(50),
          postal_code_pattern VARCHAR(20),
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX idx_tax_jurisdictions_code ON tax_jurisdictions (jurisdiction_code);
        CREATE INDEX idx_tax_jurisdictions_type ON tax_jurisdictions (jurisdiction_type);
        CREATE INDEX idx_tax_jurisdictions_country ON tax_jurisdictions (country);
        CREATE INDEX idx_tax_jurisdictions_state_province ON tax_jurisdictions (state_province);
        CREATE INDEX idx_tax_jurisdictions_is_active ON tax_jurisdictions (is_active);
        CREATE INDEX idx_tax_jurisdictions_parent_id ON tax_jurisdictions (parent_jurisdiction_id);
      `);
      
      console.log('✅ Table tax_jurisdictions created successfully with indexes');
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

createTaxJurisdictionsTable()
  .then(() => {
    console.log('🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

