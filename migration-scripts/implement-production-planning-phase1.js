/**
 * Production Planning Implementation - Phase 1: Foundation Master Data
 * 
 * Implements:
 * 1. Factory Calendars and Working Times
 * 2. Personnel Master Data with Qualifications
 * 3. Work Center Categories
 * 4. Enhanced Material Master fields
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function implementPhase1() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Production Planning Phase 1 Implementation...');
    
    // 1. Factory Calendars
    console.log('📅 Creating Factory Calendars...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS factory_calendars (
        calendar_id VARCHAR(10) PRIMARY KEY,
        calendar_code VARCHAR(20) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        country_code VARCHAR(3),
        holiday_calendar VARCHAR(10),
        working_days VARCHAR(20),
        shifts_per_day INTEGER DEFAULT 1,
        annual_hours INTEGER,
        weekly_hours DECIMAL(5,2),
        daily_hours DECIMAL(5,2),
        saturday_working CHAR(1) DEFAULT 'N',
        sunday_working CHAR(1) DEFAULT 'N',
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(10) DEFAULT 'ACTIVE'
      );
      
      CREATE INDEX IF NOT EXISTS idx_factory_cal_country ON factory_calendars(country_code);
    `);
    
    // 2. Calendar Working Times
    console.log('⏰ Creating Calendar Working Times...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_working_times (
        calendar_id VARCHAR(10) NOT NULL,
        day_of_week INTEGER NOT NULL,
        shift_number INTEGER NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_start_time TIME,
        break_end_time TIME,
        working_hours DECIMAL(5,2) NOT NULL,
        capacity_utilization DECIMAL(5,2) DEFAULT 100.00,
        valid_from DATE NOT NULL,
        valid_to DATE,
        PRIMARY KEY (calendar_id, day_of_week, shift_number, valid_from),
        CONSTRAINT fk_cwt_calendar 
          FOREIGN KEY (calendar_id) REFERENCES factory_calendars(calendar_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_cwt_day_shift ON calendar_working_times(day_of_week, shift_number);
    `);
    
    // 3. Personnel Master Data
    console.log('👥 Creating Personnel Master Data...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS personnel (
        person_id VARCHAR(20) PRIMARY KEY,
        employee_number VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        middle_name VARCHAR(50),
        title VARCHAR(20),
        gender VARCHAR(1),
        date_of_birth DATE,
        nationality VARCHAR(3),
        language_code VARCHAR(2) DEFAULT 'EN',
        email VARCHAR(100),
        telephone VARCHAR(30),
        mobile_phone VARCHAR(30),
        address VARCHAR(200),
        postal_code VARCHAR(20),
        city VARCHAR(50),
        region VARCHAR(50),
        country_code VARCHAR(3),
        department VARCHAR(50),
        position VARCHAR(50),
        organizational_unit VARCHAR(20),
        cost_center_id VARCHAR(20),
        manager_id VARCHAR(20),
        shift_assignment VARCHAR(20),
        certification_level VARCHAR(20),
        skill_level VARCHAR(20),
        wage_type VARCHAR(10),
        wage_group VARCHAR(10),
        hire_date DATE,
        termination_date DATE,
        employment_status VARCHAR(20) DEFAULT 'ACTIVE',
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50),
        changed_date TIMESTAMP,
        changed_by VARCHAR(50),
        status VARCHAR(10) DEFAULT 'ACTIVE',
        CONSTRAINT fk_pers_manager 
          FOREIGN KEY (manager_id) REFERENCES personnel(person_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_personnel_employee_num ON personnel(employee_number);
      CREATE INDEX IF NOT EXISTS idx_personnel_department ON personnel(department);
      CREATE INDEX IF NOT EXISTS idx_personnel_manager ON personnel(manager_id);
    `);
    
    // 4. Personnel Qualifications
    console.log('🎓 Creating Personnel Qualifications...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS personnel_qualifications (
        person_id VARCHAR(20) NOT NULL,
        qualification_id VARCHAR(20) NOT NULL,
        qualification_type VARCHAR(20) NOT NULL,
        description VARCHAR(100) NOT NULL,
        proficiency_level VARCHAR(20),
        certification_date DATE,
        expiry_date DATE,
        certifying_body VARCHAR(100),
        certificate_number VARCHAR(50),
        valid_from DATE NOT NULL,
        valid_to DATE,
        status VARCHAR(10) DEFAULT 'ACTIVE',
        PRIMARY KEY (person_id, qualification_id),
        CONSTRAINT fk_pq_personnel 
          FOREIGN KEY (person_id) REFERENCES personnel(person_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_pq_qualification_type ON personnel_qualifications(qualification_type);
      CREATE INDEX IF NOT EXISTS idx_pq_expiry_date ON personnel_qualifications(expiry_date);
    `);
    
    // 5. Work Center Categories
    console.log('🏭 Creating Work Center Categories...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_center_categories (
        category_code VARCHAR(10) PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        category_type VARCHAR(20) NOT NULL,
        capacity_planning CHAR(1) DEFAULT 'Y',
        scheduling_relevant CHAR(1) DEFAULT 'Y',
        costing_relevant CHAR(1) DEFAULT 'Y',
        activity_allocation CHAR(1) DEFAULT 'Y',
        machine_category CHAR(1) DEFAULT 'N',
        labor_category CHAR(1) DEFAULT 'N',
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(10) DEFAULT 'ACTIVE'
      );
    `);
    
    // 6. Enhance existing work_centers table
    console.log('🔧 Enhancing Work Centers table...');
    const workCenterColumns = [
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS work_center_category VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS person_responsible VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS factory_calendar VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS machine_type VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS equipment_number VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS control_key VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS setup_type_id VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS formula_key VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS power_consumption DECIMAL(10,2)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS power_unit VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS instruction_key VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS wage_group VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS wage_type VARCHAR(10)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS activity_type_1 VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS activity_type_2 VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS activity_type_3 VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS activity_type_4 VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS activity_type_5 VARCHAR(20)',
      'ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS activity_type_6 VARCHAR(20)'
    ];
    
    for (const column of workCenterColumns) {
      try {
        await client.query(column);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error(`Error adding column: ${error.message}`);
        }
      }
    }
    
    // 7. Work Center Text table
    console.log('📝 Creating Work Center Text...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_center_text (
        work_center_id VARCHAR(20) NOT NULL,
        language_code VARCHAR(2) NOT NULL,
        text_id VARCHAR(10) NOT NULL,
        text_line INTEGER NOT NULL,
        text_content VARCHAR(500) NOT NULL,
        PRIMARY KEY (work_center_id, language_code, text_id, text_line)
      );
    `);
    
    // 8. Enhance materials table
    console.log('📦 Enhancing Materials table...');
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
    
    // 9. Material Plant Data
    console.log('🏭📦 Creating Material Plant Data...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS material_plant_data (
        material_id VARCHAR(20) NOT NULL,
        plant_id VARCHAR(10) NOT NULL,
        mrp_type VARCHAR(10),
        mrp_controller VARCHAR(10),
        planning_strategy_group VARCHAR(10),
        consumption_mode VARCHAR(10),
        forward_consumption_periods INTEGER DEFAULT 0,
        backward_consumption_periods INTEGER DEFAULT 0,
        lot_size_procedure VARCHAR(10),
        minimum_lot_size DECIMAL(15,3),
        maximum_lot_size DECIMAL(15,3),
        fixed_lot_size DECIMAL(15,3),
        rounding_value DECIMAL(15,3),
        safety_stock DECIMAL(15,3),
        reorder_point DECIMAL(15,3),
        planned_delivery_time INTEGER,
        gr_processing_time INTEGER,
        procurement_type VARCHAR(10),
        special_procurement VARCHAR(10),
        production_storage_location VARCHAR(10),
        default_storage_location VARCHAR(10),
        abc_indicator VARCHAR(1),
        critical_part CHAR(1) DEFAULT 'N',
        purchasing_group VARCHAR(10),
        plant_status VARCHAR(10) DEFAULT 'ACTIVE',
        valid_from DATE NOT NULL,
        valid_to DATE,
        PRIMARY KEY (material_id, plant_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_mpd_mrp_controller ON material_plant_data(mrp_controller);
      CREATE INDEX IF NOT EXISTS idx_mpd_procurement_type ON material_plant_data(procurement_type);
    `);
    
    console.log('✅ Phase 1 Implementation completed successfully!');
    console.log('\nNext Steps:');
    console.log('1. Run Phase 2 for Bills of Material and Routing');
    console.log('2. Populate seed data for new tables');
    console.log('3. Update API routes to handle new entities');
    
  } catch (error) {
    console.error('❌ Error in Phase 1 implementation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the implementation
implementPhase1()
  .then(() => {
    console.log('🎉 Production Planning Phase 1 completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Phase 1 failed:', error);
    process.exit(1);
  });