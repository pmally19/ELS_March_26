/**
 * Foundation Tables Creation for Production Planning
 * 
 * Creates the essential base tables that other production planning tables depend on.
 * This script checks what exists and creates only what's missing.
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createFoundationTables() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Foundation Tables Creation...');
    
    // Check existing tables
    const existingTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    const tableNames = existingTables.rows.map(row => row.table_name);
    console.log('Existing tables:', tableNames.join(', '));
    
    // 1. Create materials table if it doesn't exist
    if (!tableNames.includes('materials')) {
      console.log('Creating materials table...');
      await client.query(`
        CREATE TABLE materials (
          id SERIAL PRIMARY KEY,
          code VARCHAR(40) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          material_type VARCHAR(20) DEFAULT 'FINISHED',
          unit_of_measure VARCHAR(10) DEFAULT 'EA',
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Enhanced fields for production planning
          alternative_unit VARCHAR(10),
          conversion_factor DECIMAL(15,6) DEFAULT 1,
          gross_weight DECIMAL(15,3),
          net_weight DECIMAL(15,3),
          weight_unit VARCHAR(10),
          volume DECIMAL(15,3),
          volume_unit VARCHAR(10),
          size_dimensions VARCHAR(50),
          ean_upc_code VARCHAR(20),
          manufacturer_code VARCHAR(20),
          manufacturer_part_number VARCHAR(40),
          old_material_number VARCHAR(40),
          laboratory_office VARCHAR(10),
          product_hierarchy VARCHAR(20),
          division VARCHAR(10)
        );
        
        CREATE INDEX idx_materials_code ON materials(code);
        CREATE INDEX idx_materials_type ON materials(material_type);
      `);
    } else {
      console.log('Materials table exists, enhancing with production planning fields...');
      const materialColumns = [
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS alternative_unit VARCHAR(10)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(15,6) DEFAULT 1',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS gross_weight DECIMAL(15,3)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS net_weight DECIMAL(15,3)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS volume DECIMAL(15,3)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS volume_unit VARCHAR(10)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS size_dimensions VARCHAR(50)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS ean_upc_code VARCHAR(20)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS manufacturer_code VARCHAR(20)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS manufacturer_part_number VARCHAR(40)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS old_material_number VARCHAR(40)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS laboratory_office VARCHAR(10)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS product_hierarchy VARCHAR(20)',
        'ALTER TABLE materials ADD COLUMN IF NOT EXISTS division VARCHAR(10)'
      ];
      
      for (const column of materialColumns) {
        try {
          await client.query(column);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error(`Error adding material column: ${error.message}`);
          }
        }
      }
    }
    
    // 2. Create plants table if it doesn't exist
    if (!tableNames.includes('plants')) {
      console.log('Creating plants table...');
      await client.query(`
        CREATE TABLE plants (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          country VARCHAR(50) DEFAULT 'USA',
          address TEXT,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Enhanced fields for production planning
          company_code VARCHAR(10),
          country_code VARCHAR(3),
          region VARCHAR(50),
          currency_code VARCHAR(3) DEFAULT 'USD',
          language_code VARCHAR(2) DEFAULT 'EN',
          time_zone VARCHAR(10),
          planning_plant CHAR(1) DEFAULT 'Y',
          factory_calendar VARCHAR(10),
          purchasing_org VARCHAR(10),
          sales_org VARCHAR(10),
          distribution_channel VARCHAR(10),
          plant_address VARCHAR(200),
          postal_code VARCHAR(20),
          city VARCHAR(50),
          telephone VARCHAR(30),
          fax VARCHAR(30),
          email VARCHAR(100)
        );
        
        CREATE INDEX idx_plants_code ON plants(code);
        CREATE INDEX idx_plants_country ON plants(country_code);
      `);
    }
    
    // 3. Create work_centers table if it doesn't exist
    if (!tableNames.includes('work_centers')) {
      console.log('Creating work_centers table...');
      await client.query(`
        CREATE TABLE work_centers (
          id SERIAL PRIMARY KEY,
          code VARCHAR(40) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          plant_id INTEGER REFERENCES plants(id),
          capacity INTEGER DEFAULT 8,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Enhanced fields for production planning
          work_center_category VARCHAR(10),
          cost_center_id VARCHAR(20),
          person_responsible VARCHAR(20),
          location VARCHAR(50),
          usage_code VARCHAR(10),
          standard_value_key VARCHAR(10),
          factory_calendar VARCHAR(10),
          machine_type VARCHAR(20),
          supplier_id VARCHAR(20),
          equipment_number VARCHAR(20),
          control_key VARCHAR(10),
          setup_type_id VARCHAR(10),
          formula_key VARCHAR(10),
          power_consumption DECIMAL(10,2),
          power_unit VARCHAR(10),
          instruction_key VARCHAR(10),
          wage_group VARCHAR(10),
          wage_type VARCHAR(10),
          activity_type_1 VARCHAR(20),
          activity_type_2 VARCHAR(20),
          activity_type_3 VARCHAR(20),
          activity_type_4 VARCHAR(20),
          activity_type_5 VARCHAR(20),
          activity_type_6 VARCHAR(20)
        );
        
        CREATE INDEX idx_work_centers_plant ON work_centers(plant_id);
        CREATE INDEX idx_work_centers_category ON work_centers(work_center_category);
      `);
    } else {
      console.log('Work centers table exists, enhancing with production planning fields...');
      const wcColumns = [
        'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS work_center_category VARCHAR(10)',
        'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS cost_center_id VARCHAR(20)',
        'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS person_responsible VARCHAR(20)',
        'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS factory_calendar VARCHAR(10)',
        'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS machine_type VARCHAR(20)',
        'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS power_consumption DECIMAL(10,2)',
        'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS setup_type_id VARCHAR(10)'
      ];
      
      for (const column of wcColumns) {
        try {
          await client.query(column);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error(`Error adding work center column: ${error.message}`);
          }
        }
      }
    }
    
    // 4. Create cost_centers table if it doesn't exist
    if (!tableNames.includes('cost_centers')) {
      console.log('Creating cost_centers table...');
      await client.query(`
        CREATE TABLE cost_centers (
          id SERIAL PRIMARY KEY,
          code VARCHAR(40) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Enhanced fields for production planning
          controlling_area VARCHAR(10),
          company_code VARCHAR(10),
          cost_center_category VARCHAR(10),
          hierarchy_area VARCHAR(20),
          manager_id VARCHAR(20),
          department VARCHAR(50),
          profit_center VARCHAR(20),
          business_area VARCHAR(10),
          functional_area VARCHAR(20),
          location VARCHAR(50),
          room_number VARCHAR(20),
          telephone VARCHAR(30),
          fax VARCHAR(30),
          email VARCHAR(100),
          budget_amount DECIMAL(15,2),
          currency_code VARCHAR(3),
          lock_indicator CHAR(1) DEFAULT 'N',
          valid_from DATE DEFAULT CURRENT_DATE,
          valid_to DATE
        );
        
        CREATE INDEX idx_cost_centers_code ON cost_centers(code);
        CREATE INDEX idx_cost_centers_manager ON cost_centers(manager_id);
      `);
    }
    
    // 5. Populate sample data for foundation tables
    console.log('Populating sample foundation data...');
    
    // Sample materials
    await client.query(`
      INSERT INTO materials (code, name, description, material_type, unit_of_measure)
      VALUES 
        ('MAT001', 'Raw Material A', 'Basic raw material for production', 'RAW', 'KG'),
        ('MAT002', 'Component B', 'Electronic component', 'COMPONENTS', 'EA'),
        ('MAT003', 'Finished Product C', 'Final assembled product', 'FINISHED', 'EA'),
        ('MAT004', 'Packaging Material', 'Cardboard packaging', 'PACKAGING', 'EA'),
        ('MAT005', 'Semi-Finished D', 'Intermediate product', 'SEMI_FINISHED', 'EA')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Sample plants
    await client.query(`
      INSERT INTO plants (code, name, country, city, factory_calendar)
      VALUES 
        ('PLT001', 'Main Manufacturing Plant', 'USA', 'Detroit', 'CAL001'),
        ('PLT002', 'Assembly Plant', 'USA', 'Chicago', 'CAL002'),
        ('PLT003', 'Distribution Center', 'USA', 'Atlanta', 'CAL001')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Sample work centers
    await client.query(`
      INSERT INTO work_centers (code, name, description, plant_id, capacity, work_center_category, machine_type)
      VALUES 
        ('WC001', 'CNC Machining Center', 'Computer controlled machining', 1, 24, 'MACHINE', 'CNC_MACHINE'),
        ('WC002', 'Assembly Line A', 'Main assembly line', 1, 16, 'ASSEMBLY', 'ASSEMBLY_LINE'),
        ('WC003', 'Quality Control', 'Inspection and testing', 1, 8, 'QUALITY', 'INSPECTION'),
        ('WC004', 'Packaging Station', 'Final packaging', 2, 12, 'PACKAGING', 'PACKAGING_LINE'),
        ('WC005', 'Material Prep', 'Material preparation area', 1, 8, 'LABOR', 'MANUAL')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Sample cost centers
    await client.query(`
      INSERT INTO cost_centers (code, name, description, department, location)
      VALUES 
        ('CC001', 'Production Operations', 'Main production cost center', 'Manufacturing', 'Plant Floor'),
        ('CC002', 'Quality Assurance', 'Quality control operations', 'Quality', 'QC Lab'),
        ('CC003', 'Maintenance', 'Equipment maintenance', 'Maintenance', 'Workshop'),
        ('CC004', 'Packaging Operations', 'Packaging and shipping', 'Logistics', 'Warehouse'),
        ('CC005', 'Production Planning', 'Planning and scheduling', 'Planning', 'Office')
      ON CONFLICT (code) DO NOTHING
    `);
    
    console.log('Foundation Tables Creation completed successfully!');
    console.log('Created/Enhanced: materials, plants, work_centers, cost_centers');
    console.log('Ready for production planning phase 2 implementation');
    
  } catch (error) {
    console.error('Error creating foundation tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the creation
createFoundationTables()
  .then(() => {
    console.log('Foundation Tables Creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Foundation creation failed:', error);
    process.exit(1);
  });