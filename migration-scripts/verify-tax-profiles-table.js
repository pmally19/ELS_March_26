import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function verifyTaxProfilesTable() {
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
    console.log('🔄 Verifying tax_profiles table structure...');
    client = await pool.connect();

    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        character_maximum_length,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'tax_profiles' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Tax Profiles Table Structure:');
    console.table(result.rows);

    // Check for required columns
    const requiredColumns = ['id', 'profile_code', 'name', 'is_active', 'created_at', 'updated_at'];
    const existingColumns = result.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('\n✅ All required columns exist');
    }

    // Check for indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'tax_profiles';
    `);

    console.log('\n📊 Indexes:');
    indexResult.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

verifyTaxProfilesTable()
  .then(() => {
    console.log('\n🎉 Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });

