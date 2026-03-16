import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function verifyCustomerGroupsStructure() {
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
    console.log('🔄 Verifying customer_groups table structure...');
    client = await pool.connect();

    // Check table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'customer_groups' 
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Customer Groups Table Columns:');
    console.table(columns.rows);

    // Check for foreign key constraints
    const foreignKeys = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'customer_groups';
    `);

    console.log('\n🔗 Foreign Key Constraints:');
    if (foreignKeys.rows.length > 0) {
      console.table(foreignKeys.rows);
    } else {
      console.log('No foreign key constraints found.');
    }

    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'customer_groups';
    `);

    console.log('\n📑 Indexes:');
    if (indexes.rows.length > 0) {
      indexes.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
      });
    } else {
      console.log('No indexes found.');
    }

    // Verify required columns exist
    const requiredColumns = ['id', 'code', 'name', 'account_group_id', 'reconciliation_account_id', 'credit_limit_group_id', 'sort_order', 'is_active'];
    const existingColumns = columns.rows.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('\n✅ All required columns are present');
    }

    console.log('\n✅ Verification completed');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

verifyCustomerGroupsStructure();

