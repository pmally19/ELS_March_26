import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function insertSampleAssetClasses() {
  try {
    // Check if asset_classes table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'asset_classes'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('asset_classes table does not exist. Please create it first.');
      return;
    }
    
    // Sample asset classes data
    const sampleAssetClasses = [
      {
        code: 'MACHINERY',
        name: 'Machinery and Equipment',
        description: 'Production machinery, manufacturing equipment, and industrial machinery',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 10,
        account_determination: 'MACH',
        is_active: true
      },
      {
        code: 'VEHICLES',
        name: 'Vehicles',
        description: 'Company vehicles including cars, trucks, vans, and delivery vehicles',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 5,
        account_determination: 'VEH',
        is_active: true
      },
      {
        code: 'IT_EQUIPMENT',
        name: 'IT Equipment',
        description: 'Computers, servers, laptops, printers, and other IT hardware',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 3,
        account_determination: 'IT',
        is_active: true
      },
      {
        code: 'FURNITURE',
        name: 'Office Furniture',
        description: 'Desks, chairs, cabinets, tables, and other office furniture',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 7,
        account_determination: 'FURN',
        is_active: true
      },
      {
        code: 'BUILDINGS',
        name: 'Buildings and Structures',
        description: 'Office buildings, warehouses, factories, and other structures',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 30,
        account_determination: 'BLDG',
        is_active: true
      },
      {
        code: 'LAND',
        name: 'Land',
        description: 'Land and land improvements',
        default_depreciation_method: null,
        default_useful_life_years: null,
        account_determination: 'LAND',
        is_active: true
      },
      {
        code: 'TOOLS',
        name: 'Tools and Instruments',
        description: 'Hand tools, power tools, measuring instruments, and testing equipment',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 5,
        account_determination: 'TOOL',
        is_active: true
      },
      {
        code: 'SOFTWARE',
        name: 'Software and Licenses',
        description: 'Software licenses, ERP systems, and computer software',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 3,
        account_determination: 'SW',
        is_active: true
      },
      {
        code: 'LEASEHOLD',
        name: 'Leasehold Improvements',
        description: 'Improvements made to leased properties',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 10,
        account_determination: 'LSE',
        is_active: true
      },
      {
        code: 'INTANGIBLE',
        name: 'Intangible Assets',
        description: 'Patents, trademarks, copyrights, and other intangible assets',
        default_depreciation_method: 'Straight Line',
        default_useful_life_years: 10,
        account_determination: 'INT',
        is_active: true
      }
    ];
    
    let inserted = 0;
    let skipped = 0;
    
    for (const assetClass of sampleAssetClasses) {
      // Check if code already exists
      const existing = await pool.query(
        `SELECT id FROM asset_classes WHERE code = $1`,
        [assetClass.code]
      );
      
      if (existing.rows.length > 0) {
        console.log(`Skipping ${assetClass.code} - already exists`);
        skipped++;
        continue;
      }
      
      // Insert asset class
      await pool.query(`
        INSERT INTO asset_classes (
          code, name, description, default_depreciation_method,
          default_useful_life_years, account_determination, is_active,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        assetClass.code,
        assetClass.name,
        assetClass.description,
        assetClass.default_depreciation_method,
        assetClass.default_useful_life_years,
        assetClass.account_determination,
        assetClass.is_active
      ]);
      
      console.log(`Inserted: ${assetClass.code} - ${assetClass.name}`);
      inserted++;
    }
    
    console.log(`\nSummary:`);
    console.log(`- Inserted: ${inserted} asset classes`);
    console.log(`- Skipped: ${skipped} asset classes (already exist)`);
    console.log(`- Total: ${sampleAssetClasses.length} asset classes processed`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertSampleAssetClasses();

