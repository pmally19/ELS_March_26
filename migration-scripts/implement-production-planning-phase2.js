/**
 * Production Planning Implementation - Phase 2: Process Master Data
 * 
 * Implements:
 * 1. Bills of Material with Components
 * 2. Routing and Operations
 * 3. Resource Types and Resources
 * 4. Planning Strategies and MRP Controllers
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function implementPhase2() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Production Planning Phase 2 Implementation...');
    
    // 1. Bills of Material
    console.log('Creating Bills of Material structure...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills_of_material (
        bom_id VARCHAR(20) PRIMARY KEY,
        material_id VARCHAR(20) NOT NULL,
        plant_id VARCHAR(10) NOT NULL,
        bom_usage VARCHAR(10) NOT NULL,
        alternative_bom VARCHAR(2) DEFAULT '01',
        bom_status VARCHAR(10) DEFAULT 'ACTIVE',
        valid_from DATE NOT NULL,
        valid_to DATE,
        base_quantity DECIMAL(15,3) NOT NULL,
        base_unit VARCHAR(10) NOT NULL,
        bom_text VARCHAR(200),
        laboratory_office VARCHAR(10),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50),
        changed_date TIMESTAMP,
        changed_by VARCHAR(50),
        authorization_group VARCHAR(10)
      );
      
      CREATE INDEX IF NOT EXISTS idx_bom_material_plant ON bills_of_material(material_id, plant_id);
      CREATE INDEX IF NOT EXISTS idx_bom_usage ON bills_of_material(bom_usage);
      CREATE INDEX IF NOT EXISTS idx_bom_status ON bills_of_material(bom_status);
    `);
    
    // 2. BOM Components
    console.log('Creating BOM Components...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bom_components (
        bom_id VARCHAR(20) NOT NULL,
        component_number VARCHAR(4) NOT NULL,
        material_id VARCHAR(20) NOT NULL,
        component_quantity DECIMAL(15,3) NOT NULL,
        component_unit VARCHAR(10) NOT NULL,
        component_scrap DECIMAL(5,2) DEFAULT 0,
        operation_number VARCHAR(10),
        installation_point VARCHAR(10),
        valid_from DATE NOT NULL,
        valid_to DATE,
        PRIMARY KEY (bom_id, component_number),
        CONSTRAINT fk_bomc_bom 
          FOREIGN KEY (bom_id) REFERENCES bills_of_material(bom_id),
        CONSTRAINT fk_bomc_material 
          FOREIGN KEY (material_id) REFERENCES materials(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_bomc_material ON bom_components(material_id);
    `);
    
    // 3. Routings
    console.log('Creating Routings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS routings (
        routing_id VARCHAR(20) PRIMARY KEY,
        routing_code VARCHAR(40) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        material_id VARCHAR(20) NOT NULL,
        plant_id VARCHAR(10) NOT NULL,
        routing_type VARCHAR(10) NOT NULL,
        routing_usage VARCHAR(10) NOT NULL,
        routing_status VARCHAR(20) DEFAULT 'ACTIVE',
        version_number VARCHAR(10) DEFAULT '001',
        alternative_routing VARCHAR(2) DEFAULT '01',
        lot_size_from DECIMAL(15,3) DEFAULT 1,
        lot_size_to DECIMAL(15,3) DEFAULT 99999999,
        base_quantity DECIMAL(15,3) NOT NULL,
        base_unit VARCHAR(10) NOT NULL,
        valid_from DATE NOT NULL,
        valid_to DATE,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50),
        changed_date TIMESTAMP,
        changed_by VARCHAR(50),
        authorization_group VARCHAR(10)
      );
      
      CREATE INDEX IF NOT EXISTS idx_routings_material ON routings(material_id);
      CREATE INDEX IF NOT EXISTS idx_routings_plant ON routings(plant_id);
      CREATE INDEX IF NOT EXISTS idx_routings_status ON routings(routing_status);
    `);
    
    // 4. Operations
    console.log('Creating Operations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS operations (
        routing_id VARCHAR(20) NOT NULL,
        operation_number VARCHAR(10) NOT NULL,
        operation_id VARCHAR(20) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        work_center_id VARCHAR(20) NOT NULL,
        control_key VARCHAR(10),
        operation_type VARCHAR(10),
        standard_text_key VARCHAR(10),
        setup_time DECIMAL(10,2),
        machine_time DECIMAL(10,2),
        labor_time DECIMAL(10,2),
        base_quantity DECIMAL(15,3) NOT NULL,
        time_unit VARCHAR(10) DEFAULT 'MIN',
        setup_type VARCHAR(10),
        teardown_time DECIMAL(10,2),
        queue_time DECIMAL(10,2),
        move_time DECIMAL(10,2),
        wait_time DECIMAL(10,2),
        minimum_send_ahead_quantity DECIMAL(15,3),
        operation_status VARCHAR(20) DEFAULT 'ACTIVE',
        valid_from DATE NOT NULL,
        valid_to DATE,
        PRIMARY KEY (routing_id, operation_number),
        CONSTRAINT fk_op_routing 
          FOREIGN KEY (routing_id) REFERENCES routings(routing_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_operations_wc ON operations(work_center_id);
      CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(operation_status);
    `);
    
    // 5. Operation Text
    console.log('Creating Operation Text...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS operation_text (
        operation_id VARCHAR(20) NOT NULL,
        language_code VARCHAR(2) NOT NULL,
        text_id VARCHAR(10) NOT NULL,
        text_line INTEGER NOT NULL,
        text_content VARCHAR(500) NOT NULL,
        PRIMARY KEY (operation_id, language_code, text_id, text_line),
        CONSTRAINT fk_ot_operation 
          FOREIGN KEY (operation_id) REFERENCES operations(operation_id)
      );
    `);
    
    // 6. Resource Types
    console.log('Creating Resource Types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_types (
        resource_type_id VARCHAR(20) PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        resource_category VARCHAR(20) NOT NULL,
        capacity_relevant CHAR(1) DEFAULT 'Y',
        scheduling_relevant CHAR(1) DEFAULT 'Y',
        costing_relevant CHAR(1) DEFAULT 'Y',
        maintenance_relevant CHAR(1) DEFAULT 'N',
        unit_of_measure VARCHAR(10),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(10) DEFAULT 'ACTIVE'
      );
    `);
    
    // 7. Resources
    console.log('Creating Resources...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS resources (
        resource_id VARCHAR(20) PRIMARY KEY,
        resource_code VARCHAR(40) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        resource_type_id VARCHAR(20) NOT NULL,
        plant_id VARCHAR(10) NOT NULL,
        work_center_id VARCHAR(20),
        cost_center_id VARCHAR(20),
        supplier_id VARCHAR(20),
        manufacturer VARCHAR(50),
        model_number VARCHAR(50),
        serial_number VARCHAR(50),
        acquisition_date DATE,
        acquisition_value DECIMAL(15,2),
        currency_code VARCHAR(3),
        depreciation_key VARCHAR(10),
        useful_life_years INTEGER,
        location VARCHAR(50),
        room_number VARCHAR(20),
        capacity_quantity DECIMAL(15,3),
        capacity_unit VARCHAR(10),
        utilization_rate DECIMAL(5,2) DEFAULT 100.00,
        availability_rate DECIMAL(5,2) DEFAULT 100.00,
        efficiency_rate DECIMAL(5,2) DEFAULT 100.00,
        setup_time_minutes INTEGER DEFAULT 0,
        teardown_time_minutes INTEGER DEFAULT 0,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50),
        status VARCHAR(10) DEFAULT 'ACTIVE',
        CONSTRAINT fk_res_type 
          FOREIGN KEY (resource_type_id) REFERENCES resource_types(resource_type_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type_id);
      CREATE INDEX IF NOT EXISTS idx_resources_plant ON resources(plant_id);
      CREATE INDEX IF NOT EXISTS idx_resources_wc ON resources(work_center_id);
    `);
    
    // 8. Resource Text
    console.log('Creating Resource Text...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_text (
        resource_id VARCHAR(20) NOT NULL,
        language_code VARCHAR(2) NOT NULL,
        text_id VARCHAR(10) NOT NULL,
        text_line INTEGER NOT NULL,
        text_content VARCHAR(500) NOT NULL,
        PRIMARY KEY (resource_id, language_code, text_id, text_line),
        CONSTRAINT fk_rt_resource 
          FOREIGN KEY (resource_id) REFERENCES resources(resource_id)
      );
    `);
    
    // 9. Activity Types
    console.log('Creating Activity Types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_types (
        activity_type_id VARCHAR(20) PRIMARY KEY,
        activity_code VARCHAR(40) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        controlling_area VARCHAR(10) NOT NULL,
        activity_category VARCHAR(20),
        unit_of_measure VARCHAR(10) NOT NULL,
        price_indicator VARCHAR(10),
        allocation_method VARCHAR(10),
        capacity_category VARCHAR(10),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(10) DEFAULT 'ACTIVE'
      );
    `);
    
    // 10. Capacity Categories
    console.log('Creating Capacity Categories...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS capacity_categories (
        capacity_category VARCHAR(10) PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        capacity_type VARCHAR(20) NOT NULL,
        finite_scheduling CHAR(1) DEFAULT 'Y',
        capacity_leveling CHAR(1) DEFAULT 'Y',
        bottleneck_category CHAR(1) DEFAULT 'N',
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(10) DEFAULT 'ACTIVE'
      );
    `);
    
    // 11. Planning Strategies
    console.log('Creating Planning Strategies...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS planning_strategies (
        strategy_group VARCHAR(10) PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        strategy_type VARCHAR(20) NOT NULL,
        consumption_mode VARCHAR(10),
        planning_procedure VARCHAR(10),
        mrp_type VARCHAR(10),
        procurement_type VARCHAR(10),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(10) DEFAULT 'ACTIVE'
      );
    `);
    
    // 12. MRP Controllers
    console.log('Creating MRP Controllers...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mrp_controllers (
        mrp_controller VARCHAR(10) PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        plant_id VARCHAR(10) NOT NULL,
        person_id VARCHAR(20),
        purchasing_group VARCHAR(10),
        buyer_code VARCHAR(10),
        telephone VARCHAR(30),
        email VARCHAR(100),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(10) DEFAULT 'ACTIVE',
        CONSTRAINT fk_mrpc_plant 
          FOREIGN KEY (plant_id) REFERENCES plants(id),
        CONSTRAINT fk_mrpc_person 
          FOREIGN KEY (person_id) REFERENCES personnel(person_id)
      );
    `);
    
    console.log('Phase 2 Implementation completed successfully!');
    
  } catch (error) {
    console.error('Error in Phase 2 implementation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the implementation
implementPhase2()
  .then(() => {
    console.log('Production Planning Phase 2 completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Phase 2 failed:', error);
    process.exit(1);
  });