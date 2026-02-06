import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function createAssetClassesTable() {
  try {
    // Check if table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'asset_classes'
      )
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('asset_classes table already exists');
      
      // Check structure
      const columns = await pool.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'asset_classes'
        ORDER BY ordinal_position
      `);
      
      console.log('\nCurrent table structure:');
      console.log(JSON.stringify(columns.rows, null, 2));
      return;
    }
    
    // Create asset_classes table
    await pool.query(`
      CREATE TABLE asset_classes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        default_depreciation_method VARCHAR(50),
        default_useful_life_years INTEGER,
        account_determination VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('asset_classes table created successfully');
    
    // Create index on code for faster lookups
    await pool.query(`
      CREATE INDEX idx_asset_classes_code ON asset_classes(code)
    `);
    
    console.log('Index created on code column');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAssetClassesTable();

