const { pool } = require('../server/db');

async function insertMaterialGroupsSampleData() {
  console.log('Inserting sample material groups data...');
  
  try {
    const result = await pool.query(`
      INSERT INTO material_groups (
        code, 
        description, 
        material_group_hierarchy, 
        general_item_category, 
        is_active, 
        created_at, 
        updated_at
      ) VALUES
        -- Raw Materials
        ('RAW', 'Raw Materials', '01', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('RAW_MET', 'Raw Materials - Metals', '01', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('RAW_POL', 'Raw Materials - Polymers', '01', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('RAW_CHEM', 'Raw Materials - Chemicals', '01', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Semi-Finished Goods
        ('SEM', 'Semi-Finished Goods', '02', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('SEM_ASM', 'Semi-Finished - Assemblies', '02', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('SEM_MFG', 'Semi-Finished - Manufactured', '02', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Finished Goods
        ('FERT', 'Finished Products', '03', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('FERT_ELEC', 'Finished Products - Electronics', '03', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('FERT_MECH', 'Finished Products - Mechanical', '03', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('FERT_AUTO', 'Finished Products - Automotive', '03', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Trading Goods
        ('HAWA', 'Trading Goods', '04', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Packaging Materials
        ('PACK', 'Packaging Materials', '05', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('PACK_BOX', 'Packaging - Boxes', '05', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('PACK_PAL', 'Packaging - Pallets', '05', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Services
        ('SERV', 'Services', '06', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('SERV_MFG', 'Services - Manufacturing', '06', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('SERV_REP', 'Services - Repair', '06', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Maintenance Materials
        ('MRO', 'Maintenance, Repair & Operations', '07', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Consumables
        ('CONS', 'Consumables', '08', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('CONS_OFF', 'Consumables - Office', '08', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('CONS_PROD', 'Consumables - Production', '08', 'NORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
      RETURNING code, description
    `);

    console.log(`✓ Successfully inserted ${result.rows.length} material groups`);
    result.rows.forEach(row => {
      console.log(`  - ${row.code}: ${row.description}`);
    });
    
    // Check existing count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM material_groups');
    console.log(`\nTotal material groups in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error inserting material groups sample data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  insertMaterialGroupsSampleData()
    .then(() => {
      console.log('\n✓ Sample data insertion completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Sample data insertion failed:', error);
      process.exit(1);
    });
}

module.exports = { insertMaterialGroupsSampleData };

