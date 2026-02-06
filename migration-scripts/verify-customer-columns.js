import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function verifyCustomerColumns() {
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
    console.log('🔍 Verifying columns in erp_customers table...');
    client = await pool.connect();

    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'erp_customers' 
      AND column_name IN (
        'sales_org_code', 
        'distribution_channel_code', 
        'division_code', 
        'reconciliation_account_code',
        'language_code',
        'shipping_conditions',
        'delivery_priority',
        'sales_district',
        'sales_office_code',
        'sales_group_code',
        'price_list'
      )
      ORDER BY column_name
    `);

    console.log('✅ Columns found:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    const expectedColumns = [
      'sales_org_code',
      'distribution_channel_code',
      'division_code',
      'reconciliation_account_code',
      'language_code',
      'shipping_conditions',
      'delivery_priority',
      'sales_district',
      'sales_office_code',
      'sales_group_code',
      'price_list'
    ];

    const foundColumns = result.rows.map(r => r.column_name);
    const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n❌ Missing columns:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
      console.log('\n⚠️  Please run the migration script to add missing columns.');
    } else {
      console.log('\n✅ All required columns exist in erp_customers table!');
    }

  } catch (error) {
    console.error('❌ Error verifying columns:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

verifyCustomerColumns().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});

