/**
 * Demonstration of Master Data Transport System
 * Shows how Company Codes move from DEV -> QA -> PROD
 * Following enterprise-standard transport management
 */

import TransportSystem, { TRANSPORT_TYPES } from './transportSystem.js';
import { pool } from '../db.ts';

async function demonstrateTransportProcess() {
  console.log('=== Master Data Transport System Demonstration ===');
  console.log('Following enterprise-standard transport management for referential integrity\n');

  const transportSystem = new TransportSystem();
  
  try {
    // Initialize transport system
    await transportSystem.initializeTables();
    
    // Step 1: Create sample master data in DEV environment
    console.log('1. Creating sample Company Code in DEV environment...');
    
    const companyResult = await pool.query(`
      INSERT INTO company_codes (code, name, currency, country, city, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, ['1000', 'Global Enterprise Corp', 'EUR', 'Germany', 'Frankfurt', 'Enterprise Street 16']);
    
    const companyCode = companyResult.rows[0];
    console.log(`   Created Company Code: ${companyCode.code} - ${companyCode.name}`);
    
    // Step 2: Create dependent Plant master data
    console.log('\n2. Creating dependent Plant master data...');
    
    const plantResult = await pool.query(`
      INSERT INTO plants (code, name, company_code_id, address, country, region)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, ['1000', 'Main Plant Walldorf', companyCode.id, 'Dietmar-Hopp-Allee 16', 'Germany', 'Baden-Württemberg']);
    
    const plant = plantResult.rows[0];
    console.log(`   Created Plant: ${plant.code} - ${plant.name}`);
    console.log(`   ✓ Referential integrity maintained: Plant linked to Company Code ${companyCode.code}`);
    
    // Step 3: Create Storage Location dependent on Plant
    console.log('\n3. Creating Storage Location master data...');
    
    const storageResult = await pool.query(`
      INSERT INTO storage_locations (code, name, plant_id, storage_type, capacity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, ['0001', 'Raw Materials Storage', plant.id, 'Raw Materials', 1000]);
    
    const storage = storageResult.rows[0];
    console.log(`   Created Storage Location: ${storage.code} - ${storage.name}`);
    console.log(`   ✓ Referential integrity maintained: Storage Location linked to Plant ${plant.code}`);
    
    // Step 4: Create Transport Request
    console.log('\n4. Creating Transport Request for master data...');
    
    const transportRequest = await transportSystem.createTransportRequest(
      TRANSPORT_TYPES.MASTER_DATA,
      'Transport new organizational structure to QA',
      'DEVELOPER_001',
      'QA'
    );
    
    console.log(`   Created Transport Request: ${transportRequest.request_number}`);
    console.log(`   Type: ${transportRequest.request_type}, Target: ${transportRequest.target_environment}`);
    
    // Step 5: Add master data objects to transport (maintaining dependency order)
    console.log('\n5. Adding master data objects to transport (dependency order)...');
    
    // Add Company Code first (no dependencies)
    await transportSystem.addMasterDataToTransport(
      transportRequest.id,
      'company_codes',
      companyCode.id,
      'INSERT'
    );
    console.log(`   ✓ Added Company Code ${companyCode.code} to transport`);
    
    // Add Plant second (depends on Company Code)
    await transportSystem.addMasterDataToTransport(
      transportRequest.id,
      'plants',
      plant.id,
      'INSERT'
    );
    console.log(`   ✓ Added Plant ${plant.code} to transport`);
    
    // Add Storage Location third (depends on Plant)
    await transportSystem.addMasterDataToTransport(
      transportRequest.id,
      'storage_locations',
      storage.id,
      'INSERT'
    );
    console.log(`   ✓ Added Storage Location ${storage.code} to transport`);
    
    // Step 6: Perform referential integrity check
    console.log('\n6. Performing referential integrity check...');
    
    const details = await transportSystem.getTransportDetails(transportRequest.id);
    const objects = details.objects;
    
    console.log(`   Transport contains ${objects.length} objects:`);
    objects.forEach(obj => {
      console.log(`   - ${obj.object_type}: ${obj.object_name} (${obj.action})`);
    });
    
    // Check dependencies
    let integrityStatus = 'CLEAN';
    const dependencies = [];
    
    for (const obj of objects) {
      const data = JSON.parse(obj.data_snapshot);
      
      if (obj.table_name === 'plants' && data.company_code_id) {
        const hasCompanyCode = objects.some(o => 
          o.table_name === 'company_codes' && 
          JSON.parse(o.data_snapshot).id === data.company_code_id
        );
        if (!hasCompanyCode) {
          dependencies.push(`Plant ${data.code} missing Company Code dependency`);
          integrityStatus = 'DEPENDENCIES_MISSING';
        }
      }
      
      if (obj.table_name === 'storage_locations' && data.plant_id) {
        const hasPlant = objects.some(o => 
          o.table_name === 'plants' && 
          JSON.parse(o.data_snapshot).id === data.plant_id
        );
        if (!hasPlant) {
          dependencies.push(`Storage Location ${data.code} missing Plant dependency`);
          integrityStatus = 'DEPENDENCIES_MISSING';
        }
      }
    }
    
    console.log(`   Integrity Status: ${integrityStatus}`);
    if (dependencies.length > 0) {
      dependencies.forEach(dep => console.log(`   ⚠️  ${dep}`));
    } else {
      console.log('   ✅ All referential integrity checks passed');
    }
    
    // Step 7: Release transport for QA
    console.log('\n7. Releasing transport for QA environment...');
    
    const releasedTransport = await transportSystem.releaseTransportRequest(
      transportRequest.id,
      'Initial organizational structure setup - Company Code 1000 with dependent objects'
    );
    
    console.log(`   ✅ Transport ${releasedTransport.request_number} released for ${releasedTransport.target_environment}`);
    console.log(`   Status: ${releasedTransport.status}`);
    console.log(`   Released at: ${releasedTransport.released_at}`);
    
    // Step 8: Simulate import to QA environment
    console.log('\n8. Simulating import to QA environment...');
    console.log('   (In real implementation, this would connect to QA database)');
    
    const importResult = await transportSystem.importTransport(
      transportRequest.id,
      'QA',
      'QA_ADMIN'
    );
    
    console.log(`   Import Status: ${importResult.status}`);
    console.log(`   Objects processed: ${importResult.results.length}`);
    
    importResult.results.forEach(result => {
      if (result.status === 'SUCCESS') {
        console.log(`   ✅ ${result.object.object_type} ${result.object.object_name}: SUCCESS`);
      } else {
        console.log(`   ❌ ${result.object.object_type} ${result.object.object_name}: FAILED - ${result.error}`);
      }
    });
    
    // Step 9: Show transport history and logs
    console.log('\n9. Transport history and audit trail...');
    
    const transportDetails = await transportSystem.getTransportDetails(transportRequest.id);
    
    console.log(`   Transport Logs (${transportDetails.logs.length} entries):`);
    transportDetails.logs.forEach(log => {
      console.log(`   ${log.executed_at}: [${log.environment}] ${log.action} - ${log.status}`);
      console.log(`      ${log.message}`);
    });
    
    // Step 10: Demonstrate next phase transport (QA to PROD)
    console.log('\n10. Creating PROD transport request...');
    
    const prodTransport = await transportSystem.createTransportRequest(
      TRANSPORT_TYPES.MASTER_DATA,
      'Promote organizational structure to PROD',
      'QA_LEAD',
      'PROD'
    );
    
    console.log(`   Created PROD Transport: ${prodTransport.request_number}`);
    console.log('   ✅ Ready for QA -> PROD promotion after testing');
    
    // Summary
    console.log('\n=== Transport System Demonstration Complete ===');
    console.log('Key Features Demonstrated:');
    console.log('✅ Master data creation with referential integrity');
    console.log('✅ Transport request management');
    console.log('✅ Dependency order preservation');
    console.log('✅ Referential integrity checking');
    console.log('✅ Release and import process');
    console.log('✅ Complete audit trail');
    console.log('✅ Multi-environment support (DEV -> QA -> PROD)');
    console.log('\nThis follows enterprise transport management principles:');
    console.log('- Transport requests group related changes');
    console.log('- Objects maintain dependencies and order');
    console.log('- Release process validates before transport');
    console.log('- Import process handles referential integrity');
    console.log('- Complete audit trail for compliance');
    
    return {
      transportRequest: releasedTransport,
      importResult: importResult,
      prodTransport: prodTransport
    };
    
  } catch (error) {
    console.error('Error in transport demonstration:', error);
    throw error;
  }
}

// Export for use in other scripts
export { demonstrateTransportProcess };

// Run demonstration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTransportProcess()
    .then(result => {
      console.log('\n✅ Demonstration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Demonstration failed:', error);
      process.exit(1);
    });
}