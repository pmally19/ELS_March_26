/**
 * Complete Production Planning Data Population
 * 
 * Populates all production planning tables with realistic data to enable end-to-end testing
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function populateCompleteProductionData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Complete Production Planning Data Population...');
    
    // 1. Populate Resource Types
    console.log('Populating Resource Types...');
    const resourceTypes = [
      { id: 'RT001', description: 'CNC Machines', category: 'MACHINE', unit: 'HOUR' },
      { id: 'RT002', description: 'Assembly Equipment', category: 'EQUIPMENT', unit: 'HOUR' },
      { id: 'RT003', description: 'Testing Equipment', category: 'INSTRUMENT', unit: 'TEST' },
      { id: 'RT004', description: 'Material Handling', category: 'TRANSPORT', unit: 'HOUR' },
      { id: 'RT005', description: 'Packaging Equipment', category: 'PACKAGING', unit: 'HOUR' }
    ];
    
    for (const rt of resourceTypes) {
      await client.query(`
        INSERT INTO resource_types (resource_type_id, description, resource_category, unit_of_measure)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (resource_type_id) DO NOTHING
      `, [rt.id, rt.description, rt.category, rt.unit]);
    }
    
    // 2. Populate Resources
    console.log('Populating Resources...');
    const resources = [
      {
        id: 'RES001', code: 'CNC-001', description: 'CNC Machine #1',
        type_id: 'RT001', plant_id: 1, work_center_id: 1,
        capacity_quantity: 24, capacity_unit: 'HOUR', utilization_rate: 85.00
      },
      {
        id: 'RES002', code: 'ASM-001', description: 'Assembly Line #1',
        type_id: 'RT002', plant_id: 1, work_center_id: 2,
        capacity_quantity: 16, capacity_unit: 'HOUR', utilization_rate: 90.00
      },
      {
        id: 'RES003', code: 'TST-001', description: 'Quality Test Station',
        type_id: 'RT003', plant_id: 1, work_center_id: 3,
        capacity_quantity: 8, capacity_unit: 'HOUR', utilization_rate: 75.00
      }
    ];
    
    for (const res of resources) {
      await client.query(`
        INSERT INTO resources (
          resource_id, resource_code, description, resource_type_id, plant_id, 
          work_center_id, capacity_quantity, capacity_unit, utilization_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (resource_id) DO NOTHING
      `, [
        res.id, res.code, res.description, res.type_id, res.plant_id,
        res.work_center_id, res.capacity_quantity, res.capacity_unit, res.utilization_rate
      ]);
    }
    
    // 3. Populate Capacity Categories
    console.log('Populating Capacity Categories...');
    const capacityCategories = [
      { id: 'CAP001', description: 'Machine Capacity', type: 'MACHINE', finite: 'Y' },
      { id: 'CAP002', description: 'Labor Capacity', type: 'LABOR', finite: 'N' },
      { id: 'CAP003', description: 'Bottleneck Capacity', type: 'BOTTLENECK', finite: 'Y' }
    ];
    
    for (const cap of capacityCategories) {
      await client.query(`
        INSERT INTO capacity_categories (capacity_category, description, capacity_type, finite_scheduling)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (capacity_category) DO NOTHING
      `, [cap.id, cap.description, cap.type, cap.finite]);
    }
    
    // 4. Populate Activity Types
    console.log('Populating Activity Types...');
    const activityTypes = [
      { id: 'ACT001', code: 'MACHINE-TIME', description: 'Machine Operating Time', area: 'CTRL001', unit: 'HOUR' },
      { id: 'ACT002', code: 'LABOR-TIME', description: 'Direct Labor Time', area: 'CTRL001', unit: 'HOUR' },
      { id: 'ACT003', code: 'SETUP-TIME', description: 'Machine Setup Time', area: 'CTRL001', unit: 'HOUR' },
      { id: 'ACT004', code: 'QUAL-TEST', description: 'Quality Testing', area: 'CTRL001', unit: 'TEST' }
    ];
    
    for (const act of activityTypes) {
      await client.query(`
        INSERT INTO activity_types (activity_type_id, activity_code, description, controlling_area, unit_of_measure)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (activity_type_id) DO NOTHING
      `, [act.id, act.code, act.description, act.area, act.unit]);
    }
    
    // 5. Populate Planning Strategies
    console.log('Populating Planning Strategies...');
    const planningStrategies = [
      { id: 'PS001', description: 'Make-to-Stock', type: 'MTS', consumption: 'FORWARD', mrp_type: 'PD' },
      { id: 'PS002', description: 'Make-to-Order', type: 'MTO', consumption: 'NONE', mrp_type: 'PD' },
      { id: 'PS003', description: 'Assemble-to-Order', type: 'ATO', consumption: 'BACKWARD', mrp_type: 'PD' }
    ];
    
    for (const ps of planningStrategies) {
      await client.query(`
        INSERT INTO planning_strategies (strategy_group, description, strategy_type, consumption_mode, mrp_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (strategy_group) DO NOTHING
      `, [ps.id, ps.description, ps.type, ps.consumption, ps.mrp_type]);
    }
    
    // 6. Populate MRP Controllers
    console.log('Populating MRP Controllers...');
    const mrpControllers = [
      { id: 'MRP001', description: 'Production Planner A', plant_id: 1, person_id: 'PER004', email: 'planner.a@company.com' },
      { id: 'MRP002', description: 'Production Planner B', plant_id: 2, person_id: 'PER001', email: 'planner.b@company.com' },
      { id: 'MRP003', description: 'Materials Planner', plant_id: 1, person_id: 'PER005', email: 'materials@company.com' }
    ];
    
    for (const mrp of mrpControllers) {
      await client.query(`
        INSERT INTO mrp_controllers (mrp_controller, description, plant_id, person_id, email)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (mrp_controller) DO NOTHING
      `, [mrp.id, mrp.description, mrp.plant_id, mrp.person_id, mrp.email]);
    }
    
    // 7. Populate Bills of Material
    console.log('Populating Bills of Material...');
    const materials = await client.query('SELECT id, code, name FROM materials WHERE id <= 5');
    
    if (materials.rows.length >= 3) {
      const finishedMaterial = materials.rows[2]; // MAT003
      const rawMaterial1 = materials.rows[0]; // MAT001
      const component = materials.rows[1]; // MAT002
      
      // Create BOM header
      await client.query(`
        INSERT INTO bills_of_material (
          bom_id, material_id, plant_id, bom_usage, bom_status, valid_from, base_quantity, base_unit
        ) VALUES ('BOM001', $1, 1, 'PRODUCTION', 'ACTIVE', CURRENT_DATE, 1, 'EA')
        ON CONFLICT (bom_id) DO NOTHING
      `, [finishedMaterial.id]);
      
      // Create BOM components
      await client.query(`
        INSERT INTO bom_components (bom_id, component_number, material_id, component_quantity, component_unit, valid_from)
        VALUES 
          ('BOM001', '0010', $1, 2.5, 'KG', CURRENT_DATE),
          ('BOM001', '0020', $2, 1, 'EA', CURRENT_DATE)
        ON CONFLICT (bom_id, component_number) DO NOTHING
      `, [rawMaterial1.id, component.id]);
    }
    
    // 8. Populate Routings and Operations
    console.log('Populating Routings and Operations...');
    const workCenters = await client.query('SELECT id, code FROM work_centers WHERE id <= 3');
    
    if (materials.rows.length >= 1 && workCenters.rows.length >= 2) {
      const finishedMaterial = materials.rows[2];
      const machineWC = workCenters.rows[0];
      const assemblyWC = workCenters.rows[1];
      
      // Create routing
      await client.query(`
        INSERT INTO routings (
          routing_id, routing_code, description, material_id, plant_id, routing_type, 
          routing_usage, base_quantity, base_unit, valid_from
        ) VALUES (
          'RT001', 'ROUTE-MAT003', 'Standard Production Route', $1, 1, 'PRODUCTION', 
          'MANUFACTURING', 1, 'EA', CURRENT_DATE
        )
        ON CONFLICT (routing_id) DO NOTHING
      `, [finishedMaterial.id]);
      
      // Create operations
      await client.query(`
        INSERT INTO operations (
          routing_id, operation_number, operation_id, description, work_center_id,
          setup_time, machine_time, labor_time, base_quantity, valid_from
        ) VALUES 
          ('RT001', '0010', 'OP001', 'Machine Processing', $1, 30, 120, 60, 1, CURRENT_DATE),
          ('RT001', '0020', 'OP002', 'Assembly Operation', $2, 15, 90, 90, 1, CURRENT_DATE)
        ON CONFLICT (routing_id, operation_number) DO NOTHING
      `, [machineWC.id, assemblyWC.id]);
    }
    
    // 9. Update Material Plant Data with MRP settings
    console.log('Updating Material Plant Data with MRP settings...');
    await client.query(`
      UPDATE material_plant_data 
      SET mrp_controller = 'MRP001',
          planning_strategy_group = 'PS001',
          procurement_type = 'F',
          safety_stock = 50,
          reorder_point = 25,
          planned_delivery_time = 5
      WHERE material_id IN (SELECT id FROM materials WHERE id <= 5)
    `);
    
    console.log('Complete Production Planning Data Population finished successfully!');
    
    // Summary report
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM resource_types) as resource_types,
        (SELECT COUNT(*) FROM resources) as resources,
        (SELECT COUNT(*) FROM capacity_categories) as capacity_categories,
        (SELECT COUNT(*) FROM activity_types) as activity_types,
        (SELECT COUNT(*) FROM planning_strategies) as planning_strategies,
        (SELECT COUNT(*) FROM mrp_controllers) as mrp_controllers,
        (SELECT COUNT(*) FROM bills_of_material) as boms,
        (SELECT COUNT(*) FROM bom_components) as bom_components,
        (SELECT COUNT(*) FROM routings) as routings,
        (SELECT COUNT(*) FROM operations) as operations
    `);
    
    console.log('\nData Population Summary:');
    const counts = summary.rows[0];
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`- ${table}: ${count} records`);
    });
    
  } catch (error) {
    console.error('Error populating production data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the population
populateCompleteProductionData()
  .then(() => {
    console.log('Complete Production Planning Data Population completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Data population failed:', error);
    process.exit(1);
  });