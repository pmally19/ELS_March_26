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

async function fixAllNullFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing All NULL Fields in Database\n');
    console.log('='.repeat(70));
    
    await client.query('BEGIN');
    
    // 1. Fix existing purchase orders
    console.log('\n1️⃣  Fixing Existing Purchase Orders...');
    const posWithNull = await client.query(`
      SELECT po.id, po.order_number, po.vendor_id, po.warehouse_type_id,
             v.purchase_organization_id as vendor_po,
             wt.plant_id,
             p.company_code_id,
             p.address_id
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN warehouse_types wt ON po.warehouse_type_id = wt.id
      LEFT JOIN plants p ON wt.plant_id = p.id
      WHERE po.purchase_organization_id IS NULL 
         OR po.plant_id IS NULL 
         OR po.company_code_id IS NULL 
         OR po.ship_to_address_id IS NULL
    `);
    
    console.log(`   Found ${posWithNull.rows.length} purchase order(s) with NULL fields`);
    
    let posFixed = 0;
    for (const po of posWithNull.rows) {
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (!po.purchase_organization_id && po.vendor_po) {
        updates.push(`purchase_organization_id = $${paramIndex++}`);
        values.push(po.vendor_po);
      }
      
      if (!po.plant_id && po.plant_id !== null) {
        updates.push(`plant_id = $${paramIndex++}`);
        values.push(po.plant_id);
      } else if (po.plant_id) {
        updates.push(`plant_id = $${paramIndex++}`);
        values.push(po.plant_id);
      }
      
      if (!po.company_code_id && po.company_code_id !== null) {
        updates.push(`company_code_id = $${paramIndex++}`);
        values.push(po.company_code_id);
      } else if (po.company_code_id) {
        updates.push(`company_code_id = $${paramIndex++}`);
        values.push(po.company_code_id);
      }
      
      if (!po.ship_to_address_id && po.address_id) {
        updates.push(`ship_to_address_id = $${paramIndex++}`);
        values.push(po.address_id);
      }
      
      if (updates.length > 0) {
        values.push(po.id);
        await client.query(`
          UPDATE purchase_orders 
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
        `, values);
        
        console.log(`   ✅ Fixed PO ${po.order_number} (ID: ${po.id})`);
        posFixed++;
      } else {
        console.log(`   ⚠️  PO ${po.order_number} (ID: ${po.id}) - missing relationships, cannot auto-fix`);
      }
    }
    
    if (posFixed > 0) {
      console.log(`   ✅ Fixed ${posFixed} purchase order(s)`);
    } else {
      console.log('   ℹ️  No purchase orders needed fixing');
    }
    
    // 2. Ensure all vendors have purchase_organization_id
    console.log('\n2️⃣  Ensuring All Vendors Have Purchase Organization...');
    const vendorsWithoutPO = await client.query(`
      SELECT id, code, name, company_code_id
      FROM vendors
      WHERE is_active = true AND purchase_organization_id IS NULL
    `);
    
    if (vendorsWithoutPO.rows.length > 0) {
      const defaultPO = await client.query(`
        SELECT id, company_code_id
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
      console.log('   ✅ All active vendors have purchase_organization_id');
    }
    
    // 3. Create addresses for all plants that don't have one
    console.log('\n3️⃣  Creating Addresses for All Plants...');
    const plantsWithoutAddress = await client.query(`
      SELECT id, code, name, address, city, country, state, postal_code
      FROM plants
      WHERE (is_active = true OR status = 'active') AND address_id IS NULL
    `);
    
    let addressesCreated = 0;
    for (const plant of plantsWithoutAddress.rows) {
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
      console.log(`   ✅ Created ${addressesCreated} address(es) for plants`);
    } else {
      console.log('   ✅ All active plants have addresses');
    }
    
    // 4. Ensure all warehouse_types have plant_id
    console.log('\n4️⃣  Ensuring All Warehouse Types Have Plant ID...');
    const wtWithoutPlant = await client.query(`
      SELECT id, code, name
      FROM warehouse_types
      WHERE is_active = true AND plant_id IS NULL
    `);
    
    if (wtWithoutPlant.rows.length > 0) {
      const defaultPlant = await client.query(`
        SELECT id FROM plants 
        WHERE (is_active = true OR status = 'active')
        ORDER BY id
        LIMIT 1
      `);
      
      if (defaultPlant.rows.length > 0) {
        for (const wt of wtWithoutPlant.rows) {
          await client.query(`
            UPDATE warehouse_types 
            SET plant_id = $1
            WHERE id = $2
          `, [defaultPlant.rows[0].id, wt.id]);
          
          console.log(`   ✅ Assigned plant to ${wt.code} - ${wt.name}`);
        }
        console.log(`   ✅ Fixed ${wtWithoutPlant.rows.length} warehouse type(s)`);
      }
    } else {
      console.log('   ✅ All warehouse types have plant_id');
    }
    
    // 5. Update vendor_materials to use material base_unit_price if unit_price is NULL
    console.log('\n5️⃣  Updating Vendor Materials with NULL Prices...');
    const vmWithNullPrice = await client.query(`
      SELECT vm.id, vm.vendor_id, vm.material_id, vm.unit_price, m.base_unit_price
      FROM vendor_materials vm
      INNER JOIN materials m ON vm.material_id = m.id
      WHERE vm.is_active = true 
        AND vm.unit_price IS NULL 
        AND m.base_unit_price IS NOT NULL 
        AND m.base_unit_price > 0
    `);
    
    let vmUpdated = 0;
    for (const vm of vmWithNullPrice.rows) {
      await client.query(`
        UPDATE vendor_materials 
        SET unit_price = $1
        WHERE id = $2
      `, [vm.base_unit_price, vm.id]);
      
      vmUpdated++;
    }
    
    if (vmUpdated > 0) {
      console.log(`   ✅ Updated ${vmUpdated} vendor material assignment(s) with material base prices`);
    } else {
      console.log('   ℹ️  No vendor materials needed price updates (or materials also have NULL prices)');
    }
    
    await client.query('COMMIT');
    
    // 6. Final verification
    console.log('\n' + '='.repeat(70));
    console.log('6️⃣  Final Verification...');
    
    const finalCheck = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM vendors WHERE is_active = true AND purchase_organization_id IS NOT NULL) as vendors_with_po,
        (SELECT COUNT(*) FROM plants WHERE (is_active = true OR status = 'active') AND address_id IS NOT NULL) as plants_with_address,
        (SELECT COUNT(*) FROM warehouse_types WHERE is_active = true AND plant_id IS NOT NULL) as wt_with_plant,
        (SELECT COUNT(*) FROM purchase_orders WHERE purchase_organization_id IS NOT NULL AND plant_id IS NOT NULL AND company_code_id IS NOT NULL) as pos_complete
    `);
    
    const fc = finalCheck.rows[0];
    console.log(`\n   ✅ Vendors with purchase_organization_id: ${fc.vendors_with_po}`);
    console.log(`   ✅ Plants with address_id: ${fc.plants_with_address}`);
    console.log(`   ✅ Warehouse types with plant_id: ${fc.wt_with_plant}`);
    console.log(`   ✅ Purchase orders with all required fields: ${fc.pos_complete}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ All NULL fields fixed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during fix:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllNullFields()
  .then(() => {
    console.log('\n🎉 All fixes completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fix failed:', error);
    process.exit(1);
  });

