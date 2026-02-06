import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function seedChartOfAccounts() {
  const client = await pool.connect();
  try {
    console.log('Seeding chart_of_accounts table with sample data...\n');
    
    await client.query('BEGIN');
    
    // Check if data already exists
    const existingCheck = await client.query('SELECT COUNT(*) as count FROM chart_of_accounts');
    const existingCount = parseInt(existingCheck.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`⚠️  Table already contains ${existingCount} record(s).`);
      console.log('   Clearing existing data...');
      await client.query('DELETE FROM chart_of_accounts');
    }
    
    // Sample data for Chart of Accounts
    const sampleCharts = [
      {
        chart_id: 'INCO',
        description: 'India Operational Chart of Accounts',
        language: 'EN',
        account_length: 10,
        controlling_integration: true,
        group_chart_id: null,
        active: true,
        manual_creation_allowed: true,
        maintenance_language: 'EN'
      },
      {
        chart_id: 'USCO',
        description: 'US Operational Chart of Accounts',
        language: 'EN',
        account_length: 8,
        controlling_integration: true,
        group_chart_id: null,
        active: true,
        manual_creation_allowed: true,
        maintenance_language: 'EN'
      },
      {
        chart_id: 'KONS',
        description: 'Consolidation Chart of Accounts',
        language: 'EN',
        account_length: 10,
        controlling_integration: false,
        group_chart_id: null,
        active: true,
        manual_creation_allowed: false,
        maintenance_language: 'EN'
      },
      {
        chart_id: 'DEUT',
        description: 'Germany Operational Chart of Accounts',
        language: 'DE',
        account_length: 10,
        controlling_integration: true,
        group_chart_id: null,
        active: true,
        manual_creation_allowed: true,
        maintenance_language: 'DE'
      },
      {
        chart_id: 'FRAN',
        description: 'France Operational Chart of Accounts',
        language: 'FR',
        account_length: 9,
        controlling_integration: true,
        group_chart_id: null,
        active: true,
        manual_creation_allowed: true,
        maintenance_language: 'FR'
      },
      {
        chart_id: 'UKCO',
        description: 'United Kingdom Operational Chart of Accounts',
        language: 'EN',
        account_length: 8,
        controlling_integration: true,
        group_chart_id: null,
        active: true,
        manual_creation_allowed: true,
        maintenance_language: 'EN'
      },
      {
        chart_id: 'BLOCK',
        description: 'Blocked Chart of Accounts',
        language: 'EN',
        account_length: 10,
        controlling_integration: false,
        group_chart_id: null,
        active: false,
        manual_creation_allowed: false,
        maintenance_language: 'EN'
      }
    ];
    
    // Insert sample data
    for (const chart of sampleCharts) {
      await client.query(`
        INSERT INTO chart_of_accounts (
          chart_id,
          description,
          language,
          account_length,
          controlling_integration,
          group_chart_id,
          active,
          manual_creation_allowed,
          maintenance_language,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        chart.chart_id,
        chart.description,
        chart.language,
        chart.account_length,
        chart.controlling_integration,
        chart.group_chart_id,
        chart.active,
        chart.manual_creation_allowed,
        chart.maintenance_language
      ]);
      
      console.log(`   ✓ Inserted: ${chart.chart_id} - ${chart.description}`);
    }
    
    // Now update group_chart_id for some charts to reference KONS (consolidation chart)
    await client.query(`
      UPDATE chart_of_accounts 
      SET group_chart_id = (SELECT id FROM chart_of_accounts WHERE chart_id = 'KONS')
      WHERE chart_id IN ('INCO', 'USCO', 'DEUT', 'FRAN', 'UKCO')
    `);
    
    console.log('\n   ✓ Updated group chart references to KONS');
    
    await client.query('COMMIT');
    
    // Verify the data
    const result = await client.query(`
      SELECT 
        coa.id,
        coa.chart_id,
        coa.description,
        coa.language,
        coa.account_length,
        coa.controlling_integration,
        coa.active,
        coa.manual_creation_allowed,
        coa.maintenance_language,
        grp.chart_id as group_chart_id_code
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts grp ON coa.group_chart_id = grp.id
      ORDER BY coa.chart_id
    `);
    
    console.log('\n✅ Successfully seeded chart_of_accounts table!');
    console.log(`\n📊 Total records: ${result.rows.length}\n`);
    console.log('Sample data:');
    result.rows.forEach((row) => {
      console.log(`   • ${row.chart_id} - ${row.description}`);
      console.log(`     Language: ${row.language || 'N/A'}, Account Length: ${row.account_length || 'N/A'}`);
      console.log(`     Controlling Integration: ${row.controlling_integration ? 'Yes' : 'No'}, Active: ${row.active ? 'Yes' : 'No'}`);
      console.log(`     Manual Creation: ${row.manual_creation_allowed ? 'Yes' : 'No'}, Group Chart: ${row.group_chart_id_code || 'None'}`);
      console.log('');
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

seedChartOfAccounts()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

