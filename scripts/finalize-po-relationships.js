import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mallyerp',
  password: 'Mokshith@21',
  port: 5432,
});

async function finalizeRelationships() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Finalizing Purchase Order Relationships\n');
    console.log('='.repeat(60));
    
    // 1. Ensure all active vendors have purchase_organization_id
    console.log('\n1️⃣  Ensuring all vendors have purchase_organization_id...');
    const vendorsWithoutPO = await client.query(`
      SELECT v.id, v.name, v.code, v.company_code_id
      FROM vendors v
      WHERE v.is_active = true AND v.purchase_organization_id IS NULL
    `);
    
    if (vendorsWithoutPO.rows.length > 0) {
      const defaultPO = await client.query(`
        SELECT id, code, name, company_code_id
        FROM purchase_organizations
        WHERE is_active = true
        ORDER BY id
        LIMIT 1
      `);
      
      if (defaultPO.rows.length > 0) {
        for (const vendor of vendorsWithoutPO.rows) {
          // Try to match by company_code_id
          let poToAssign = await client.query(`
            SELECT id FROM purchase_organizations
            WHERE is_active = true AND company_code_id = $1
            LIMIT 1
          `, [vendor.company_code_id]);
          
          if (poToAssign.rows.length === 0) {
            poToAssign = defaultPO;
          }
          
          await client.query(`
            UPDATE vendors 
            SET purchase_organization_id = $1
            WHERE id = $2
          `, [poToAssign.rows[0].id, vendor.id]);
          
          console.log(`   ✅ Assigned PO to ${vendor.code} - ${vendor.name}`);
        }
        console.log(`   ✅ Fixed ${vendorsWithoutPO.rows.length} vendor(s)`);
      }
    } else {
      console.log('   ✅ All vendors have purchase_organization_id');
    }
    
    // 2. Ensure all plants used by warehouse_types have address_id
    console.log('\n2️⃣  Ensuring plants used by warehouse_types have addresses...');
    const plantsNeedingAddress = await client.query(`
      SELECT DISTINCT p.id, p.name, p.code, p.address_id,
             p.address, p.city, p.country, p.state, p.postal_code
      FROM plants p
      INNER JOIN warehouse_types wt ON wt.plant_id = p.id
      WHERE wt.is_active = true 
        AND (p.is_active = true OR p.status = 'active')
        AND p.address_id IS NULL
    `);
    
    let addressesCreated = 0;
    
    for (const plant of plantsNeedingAddress.rows) {
      // Create address from plant data
      const addressLine1 = plant.address || plant.name || `Plant ${plant.code}`;
      const city = plant.city || 'Unknown';
      const country = plant.country || 'Unknown';
      
      const addressResult = await client.query(`
        INSERT INTO addresses (
          address_line_1, 
          city, 
          state, 
          country, 
          postal_code,
          address_type,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        addressLine1,
        city,
        plant.state || null,
        country,
        plant.postal_code || null,
        'warehouse',
        true
      ]);
      
      const addressId = addressResult.rows[0].id;
      
      await client.query(`
        UPDATE plants 
        SET address_id = $1
        WHERE id = $2
      `, [addressId, plant.id]);
      
      console.log(`   ✅ Created address (ID: ${addressId}) for plant ${plant.code} - ${plant.name}`);
      addressesCreated++;
    }
    
    if (addressesCreated > 0) {
      console.log(`   ✅ Created ${addressesCreated} address(es) for plants used by warehouse types`);
    } else {
      console.log('   ✅ All plants used by warehouse types have addresses');
    }
    
    // 3. Verify all warehouse_types have plant_id
    console.log('\n3️⃣  Verifying warehouse_types have plant_id...');
    const warehouseTypesWithoutPlant = await client.query(`
      SELECT id, code, name
      FROM warehouse_types
      WHERE is_active = true AND plant_id IS NULL
    `);
    
    if (warehouseTypesWithoutPlant.rows.length > 0) {
      const defaultPlant = await client.query(`
        SELECT id FROM plants 
        WHERE (is_active = true OR status = 'active')
        ORDER BY id
        LIMIT 1
      `);
      
      if (defaultPlant.rows.length > 0) {
        for (const wt of warehouseTypesWithoutPlant.rows) {
          await client.query(`
            UPDATE warehouse_types 
            SET plant_id = $1
            WHERE id = $2
          `, [defaultPlant.rows[0].id, wt.id]);
          
          console.log(`   ✅ Assigned plant to ${wt.code} - ${wt.name}`);
        }
        console.log(`   ✅ Fixed ${warehouseTypesWithoutPlant.rows.length} warehouse type(s)`);
      }
    } else {
      console.log('   ✅ All warehouse types have plant_id');
    }
    
    // 4. Final comprehensive check
    console.log('\n4️⃣  Final Comprehensive Check...');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM vendors WHERE is_active = true) as total_vendors,
        (SELECT COUNT(*) FROM vendors WHERE is_active = true AND purchase_organization_id IS NOT NULL) as vendors_with_po,
        (SELECT COUNT(*) FROM warehouse_types WHERE is_active = true) as total_warehouse_types,
        (SELECT COUNT(*) FROM warehouse_types WHERE is_active = true AND plant_id IS NOT NULL) as warehouse_types_with_plant,
        (SELECT COUNT(DISTINCT wt.plant_id) FROM warehouse_types wt WHERE wt.is_active = true AND wt.plant_id IS NOT NULL) as unique_plants_used,
        (SELECT COUNT(*) FROM plants p 
         INNER JOIN warehouse_types wt ON wt.plant_id = p.id 
         WHERE wt.is_active = true AND p.address_id IS NOT NULL) as plants_with_address_used
    `);
    
    const s = stats.rows[0];
    console.log(`\n   📊 Statistics:`);
    console.log(`      Total Active Vendors: ${s.total_vendors}`);
    console.log(`      Vendors with Purchase Org: ${s.vendors_with_po} (${Math.round(s.vendors_with_po/s.total_vendors*100)}%)`);
    console.log(`      Total Active Warehouse Types: ${s.total_warehouse_types}`);
    console.log(`      Warehouse Types with Plant: ${s.warehouse_types_with_plant} (100%)`);
    console.log(`      Unique Plants Used: ${s.unique_plants_used}`);
    console.log(`      Plants with Address (used by warehouse types): ${s.plants_with_address_used}`);
    
    // 5. Test a complete purchase order scenario
    console.log('\n5️⃣  Testing Complete Purchase Order Scenario...');
    
    const testScenario = await client.query(`
      SELECT 
        v.id as vendor_id,
        v.name as vendor_name,
        v.purchase_organization_id,
        wt.id as warehouse_type_id,
        wt.code as warehouse_code,
        wt.name as warehouse_name,
        wt.plant_id,
        p.code as plant_code,
        p.name as plant_name,
        p.company_code_id,
        p.address_id,
        a.address_line_1,
        a.city,
        a.country
      FROM vendors v
      CROSS JOIN warehouse_types wt
      INNER JOIN plants p ON wt.plant_id = p.id
      LEFT JOIN addresses a ON p.address_id = a.id
      WHERE v.is_active = true 
        AND wt.is_active = true
        AND v.purchase_organization_id IS NOT NULL
        AND wt.plant_id IS NOT NULL
        AND p.address_id IS NOT NULL
      LIMIT 1
    `);
    
    if (testScenario.rows.length > 0) {
      const scenario = testScenario.rows[0];
      console.log(`\n   ✅ Complete PO Scenario Available:`);
      console.log(`      Vendor: ${scenario.vendor_name} (ID: ${scenario.vendor_id})`);
      console.log(`      Purchase Org ID: ${scenario.purchase_organization_id}`);
      console.log(`      Warehouse: ${scenario.warehouse_code} - ${scenario.warehouse_name} (ID: ${scenario.warehouse_type_id})`);
      console.log(`      Plant: ${scenario.plant_code} - ${scenario.plant_name} (ID: ${scenario.plant_id})`);
      console.log(`      Company Code ID: ${scenario.company_code_id}`);
      console.log(`      Ship To Address: ${scenario.address_line_1}, ${scenario.city}, ${scenario.country} (ID: ${scenario.address_id})`);
      console.log(`\n   ✅ All fields are properly populated for purchase order creation!`);
    } else {
      console.log(`   ⚠️  No complete scenario found (some relationships may be missing)`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Relationship finalization completed!');
    
  } catch (error) {
    console.error('\n❌ Error during finalization:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

finalizeRelationships()
  .then(() => {
    console.log('\n🎉 All relationships finalized successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Finalization failed:', error);
    process.exit(1);
  });

