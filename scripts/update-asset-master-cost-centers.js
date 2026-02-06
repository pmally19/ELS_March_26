import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21',
});

async function updateAssetMasterCostCenters() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating asset master records with cost centers...');
    
    await client.query('BEGIN');
    
    // Get assets with NULL cost_center_id but have company_code_id
    const assetsResult = await client.query(`
      SELECT am.id, am.company_code_id, cc.code as company_code
      FROM asset_master am
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      WHERE am.cost_center_id IS NULL 
      AND am.company_code_id IS NOT NULL
      AND am.is_active = true
      ORDER BY am.id
    `);
    
    console.log(`Found ${assetsResult.rows.length} assets without cost centers`);
    
    // Get cost centers grouped by company code
    const costCentersResult = await client.query(`
      SELECT id, cost_center, description, company_code
      FROM cost_centers
      WHERE active = true
      ORDER BY id
    `);
    
    const costCenters = costCentersResult.rows;
    console.log(`Found ${costCenters.length} cost centers`);
    
    let updatedCount = 0;
    
    for (const asset of assetsResult.rows) {
      // Find a cost center for this company code
      let costCenter = costCenters.find(cc => cc.company_code === asset.company_code);
      
      // If no matching cost center, use the first available one
      if (!costCenter && costCenters.length > 0) {
        costCenter = costCenters[0];
      }
      
      if (costCenter) {
        await client.query(
          'UPDATE asset_master SET cost_center_id = $1, updated_at = NOW() WHERE id = $2',
          [costCenter.id, asset.id]
        );
        console.log(`✅ Updated asset ID ${asset.id} with cost center ${costCenter.cost_center}`);
        updatedCount++;
      } else {
        console.log(`⚠️  No cost center available for asset ID ${asset.id}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✨ Successfully updated ${updatedCount} assets with cost centers`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating asset master:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateAssetMasterCostCenters()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

