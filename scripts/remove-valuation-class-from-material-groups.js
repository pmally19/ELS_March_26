import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function removeValuationClass() {
  console.log('='.repeat(80));
  console.log('REMOVING VALUATION_CLASS FROM MATERIAL_GROUPS TABLE');
  console.log('='.repeat(80));
  
  try {
    // Check if column exists first
    console.log('\n📋 Checking if valuation_class column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'material_groups' AND column_name = 'valuation_class'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('✅ valuation_class column does not exist. Nothing to remove.');
      return;
    }
    
    console.log('⚠️  valuation_class column found. Proceeding to remove...\n');
    
    // Drop the index first (if it exists)
    console.log('1️⃣  Dropping index idx_material_groups_valuation_class...');
    try {
      await pool.query('DROP INDEX IF EXISTS idx_material_groups_valuation_class');
      console.log('   ✅ Index dropped (or did not exist)');
    } catch (error) {
      console.log('   ⚠️  Error dropping index (may not exist):', error.message);
    }
    
    // Drop the column
    console.log('2️⃣  Dropping column valuation_class...');
    await pool.query('ALTER TABLE material_groups DROP COLUMN IF EXISTS valuation_class');
    console.log('   ✅ Column dropped successfully');
    
    // Verify removal
    console.log('\n3️⃣  Verifying removal...');
    const verifyCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'material_groups' AND column_name = 'valuation_class'
    `);
    
    if (verifyCheck.rows.length === 0) {
      console.log('   ✅ Verification successful: valuation_class column removed');
    } else {
      console.log('   ❌ Verification failed: column still exists');
      throw new Error('Column removal verification failed');
    }
    
    // Show current table structure
    console.log('\n📋 Current material_groups table structure:');
    const tableInfo = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'material_groups'
      ORDER BY ordinal_position
    `);
    
    console.table(tableInfo.rows);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error removing valuation_class column:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
removeValuationClass()
  .then(() => {
    console.log('\n✓ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration script failed:', error);
    process.exit(1);
  });

