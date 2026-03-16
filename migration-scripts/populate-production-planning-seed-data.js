/**
 * Production Planning Seed Data Population
 * 
 * Populates essential seed data for production planning master data:
 * 1. Factory calendars with working times
 * 2. Work center categories 
 * 3. Sample personnel data
 * 4. Material plant data for existing materials
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function populateSeedData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting Production Planning Seed Data Population...');
    
    // 1. Factory Calendars
    console.log('📅 Populating Factory Calendars...');
    const calendars = [
      {
        calendar_id: 'CAL001',
        calendar_code: 'STANDARD_8H',
        description: 'Standard 8-hour Working Day',
        country_code: 'USA',
        working_days: 'MON-FRI',
        shifts_per_day: 1,
        daily_hours: 8.00,
        weekly_hours: 40.00,
        saturday_working: 'N',
        sunday_working: 'N'
      },
      {
        calendar_id: 'CAL002',
        calendar_code: 'MANUFACTURING_24H',
        description: '24-hour Manufacturing Schedule',
        country_code: 'USA',
        working_days: 'MON-SUN',
        shifts_per_day: 3,
        daily_hours: 24.00,
        weekly_hours: 168.00,
        saturday_working: 'Y',
        sunday_working: 'Y'
      },
      {
        calendar_id: 'CAL003',
        calendar_code: 'FLEX_SCHEDULE',
        description: 'Flexible Working Schedule',
        country_code: 'USA',
        working_days: 'MON-SAT',
        shifts_per_day: 2,
        daily_hours: 16.00,
        weekly_hours: 96.00,
        saturday_working: 'Y',
        sunday_working: 'N'
      }
    ];
    
    for (const cal of calendars) {
      await client.query(`
        INSERT INTO factory_calendars (
          calendar_id, calendar_code, description, country_code, working_days,
          shifts_per_day, daily_hours, weekly_hours, saturday_working, sunday_working
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (calendar_id) DO NOTHING
      `, [
        cal.calendar_id, cal.calendar_code, cal.description, cal.country_code,
        cal.working_days, cal.shifts_per_day, cal.daily_hours, cal.weekly_hours,
        cal.saturday_working, cal.sunday_working
      ]);
    }
    
    // 2. Calendar Working Times
    console.log('⏰ Populating Calendar Working Times...');
    const workingTimes = [
      // Standard 8-hour day (CAL001)
      { calendar_id: 'CAL001', day_of_week: 1, shift_number: 1, start_time: '08:00', end_time: '17:00', working_hours: 8.00 },
      { calendar_id: 'CAL001', day_of_week: 2, shift_number: 1, start_time: '08:00', end_time: '17:00', working_hours: 8.00 },
      { calendar_id: 'CAL001', day_of_week: 3, shift_number: 1, start_time: '08:00', end_time: '17:00', working_hours: 8.00 },
      { calendar_id: 'CAL001', day_of_week: 4, shift_number: 1, start_time: '08:00', end_time: '17:00', working_hours: 8.00 },
      { calendar_id: 'CAL001', day_of_week: 5, shift_number: 1, start_time: '08:00', end_time: '17:00', working_hours: 8.00 },
      
      // 24-hour manufacturing (CAL002) - 3 shifts
      { calendar_id: 'CAL002', day_of_week: 1, shift_number: 1, start_time: '06:00', end_time: '14:00', working_hours: 8.00 },
      { calendar_id: 'CAL002', day_of_week: 1, shift_number: 2, start_time: '14:00', end_time: '22:00', working_hours: 8.00 },
      { calendar_id: 'CAL002', day_of_week: 1, shift_number: 3, start_time: '22:00', end_time: '06:00', working_hours: 8.00 },
      
      // Flexible schedule (CAL003) - 2 shifts
      { calendar_id: 'CAL003', day_of_week: 1, shift_number: 1, start_time: '07:00', end_time: '15:00', working_hours: 8.00 },
      { calendar_id: 'CAL003', day_of_week: 1, shift_number: 2, start_time: '15:00', end_time: '23:00', working_hours: 8.00 }
    ];
    
    for (const wt of workingTimes) {
      await client.query(`
        INSERT INTO calendar_working_times (
          calendar_id, day_of_week, shift_number, start_time, end_time, working_hours, valid_from
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
        ON CONFLICT (calendar_id, day_of_week, shift_number, valid_from) DO NOTHING
      `, [wt.calendar_id, wt.day_of_week, wt.shift_number, wt.start_time, wt.end_time, wt.working_hours]);
    }
    
    // 3. Work Center Categories
    console.log('🏭 Populating Work Center Categories...');
    const wcCategories = [
      {
        category_code: 'MACHINE',
        description: 'Machine Work Centers',
        category_type: 'PRODUCTION',
        machine_category: 'Y',
        labor_category: 'N'
      },
      {
        category_code: 'LABOR',
        description: 'Labor-Intensive Work Centers',
        category_type: 'PRODUCTION',
        machine_category: 'N',
        labor_category: 'Y'
      },
      {
        category_code: 'ASSEMBLY',
        description: 'Assembly Work Centers',
        category_type: 'ASSEMBLY',
        machine_category: 'Y',
        labor_category: 'Y'
      },
      {
        category_code: 'QUALITY',
        description: 'Quality Control Centers',
        category_type: 'INSPECTION',
        machine_category: 'N',
        labor_category: 'Y'
      },
      {
        category_code: 'PACKAGING',
        description: 'Packaging Work Centers',
        category_type: 'PACKAGING',
        machine_category: 'Y',
        labor_category: 'Y'
      }
    ];
    
    for (const wc of wcCategories) {
      await client.query(`
        INSERT INTO work_center_categories (
          category_code, description, category_type, machine_category, labor_category
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (category_code) DO NOTHING
      `, [wc.category_code, wc.description, wc.category_type, wc.machine_category, wc.labor_category]);
    }
    
    // 4. Sample Personnel Data
    console.log('👥 Populating Personnel Data...');
    const personnel = [
      {
        person_id: 'PER001',
        employee_number: 'EMP001',
        first_name: 'John',
        last_name: 'Smith',
        department: 'Production',
        position: 'Production Manager',
        skill_level: 'EXPERT',
        certification_level: 'LEVEL_3',
        email: 'john.smith@company.com'
      },
      {
        person_id: 'PER002',
        employee_number: 'EMP002',
        first_name: 'Maria',
        last_name: 'Garcia',
        department: 'Quality',
        position: 'Quality Inspector',
        skill_level: 'ADVANCED',
        certification_level: 'LEVEL_2',
        email: 'maria.garcia@company.com'
      },
      {
        person_id: 'PER003',
        employee_number: 'EMP003',
        first_name: 'David',
        last_name: 'Johnson',
        department: 'Production',
        position: 'Machine Operator',
        skill_level: 'INTERMEDIATE',
        certification_level: 'LEVEL_1',
        email: 'david.johnson@company.com'
      },
      {
        person_id: 'PER004',
        employee_number: 'EMP004',
        first_name: 'Sarah',
        last_name: 'Williams',
        department: 'Planning',
        position: 'Production Planner',
        skill_level: 'ADVANCED',
        certification_level: 'LEVEL_2',
        email: 'sarah.williams@company.com'
      },
      {
        person_id: 'PER005',
        employee_number: 'EMP005',
        first_name: 'Michael',
        last_name: 'Brown',
        department: 'Maintenance',
        position: 'Maintenance Technician',
        skill_level: 'EXPERT',
        certification_level: 'LEVEL_3',
        email: 'michael.brown@company.com'
      }
    ];
    
    for (const person of personnel) {
      await client.query(`
        INSERT INTO personnel (
          person_id, employee_number, first_name, last_name, department, position,
          skill_level, certification_level, email, hire_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE - INTERVAL '1 year')
        ON CONFLICT (person_id) DO NOTHING
      `, [
        person.person_id, person.employee_number, person.first_name, person.last_name,
        person.department, person.position, person.skill_level, person.certification_level, person.email
      ]);
    }
    
    // 5. Personnel Qualifications
    console.log('🎓 Populating Personnel Qualifications...');
    const qualifications = [
      {
        person_id: 'PER001',
        qualification_id: 'QUAL001',
        qualification_type: 'PRODUCTION_MANAGEMENT',
        description: 'Production Management Certification',
        proficiency_level: 'EXPERT',
        certification_date: '2023-01-15'
      },
      {
        person_id: 'PER002',
        qualification_id: 'QUAL002',
        qualification_type: 'QUALITY_CONTROL',
        description: 'ISO 9001 Quality Control',
        proficiency_level: 'ADVANCED',
        certification_date: '2023-03-20'
      },
      {
        person_id: 'PER003',
        qualification_id: 'QUAL003',
        qualification_type: 'MACHINE_OPERATION',
        description: 'CNC Machine Operation',
        proficiency_level: 'INTERMEDIATE',
        certification_date: '2023-05-10'
      },
      {
        person_id: 'PER004',
        qualification_id: 'QUAL004',
        qualification_type: 'PRODUCTION_PLANNING',
        description: 'SAP PP Planning Certification',
        proficiency_level: 'ADVANCED',
        certification_date: '2023-02-28'
      },
      {
        person_id: 'PER005',
        qualification_id: 'QUAL005',
        qualification_type: 'MAINTENANCE',
        description: 'Preventive Maintenance Specialist',
        proficiency_level: 'EXPERT',
        certification_date: '2023-04-15'
      }
    ];
    
    for (const qual of qualifications) {
      await client.query(`
        INSERT INTO personnel_qualifications (
          person_id, qualification_id, qualification_type, description,
          proficiency_level, certification_date, valid_from
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
        ON CONFLICT (person_id, qualification_id) DO NOTHING
      `, [
        qual.person_id, qual.qualification_id, qual.qualification_type,
        qual.description, qual.proficiency_level, qual.certification_date
      ]);
    }
    
    // 6. Update existing work centers with new fields
    console.log('🔧 Updating existing Work Centers...');
    const updateWorkCenters = [
      {
        code: 'WC001',
        work_center_category: 'MACHINE',
        person_responsible: 'PER001',
        factory_calendar: 'CAL002',
        machine_type: 'CNC_MACHINE'
      },
      {
        code: 'WC002',
        work_center_category: 'ASSEMBLY',
        person_responsible: 'PER002',
        factory_calendar: 'CAL001',
        machine_type: 'ASSEMBLY_LINE'
      }
    ];
    
    for (const wc of updateWorkCenters) {
      await client.query(`
        UPDATE work_centers 
        SET work_center_category = $1, person_responsible = $2, factory_calendar = $3, machine_type = $4
        WHERE code = $5
      `, [wc.work_center_category, wc.person_responsible, wc.factory_calendar, wc.machine_type, wc.code]);
    }
    
    // 7. Create Material Plant Data for existing materials
    console.log('📦🏭 Creating Material Plant Data...');
    const materialsResult = await client.query('SELECT id, code FROM materials LIMIT 10');
    const plantsResult = await client.query('SELECT id, code FROM plants LIMIT 5');
    
    if (materialsResult.rows.length > 0 && plantsResult.rows.length > 0) {
      for (let i = 0; i < Math.min(materialsResult.rows.length, 10); i++) {
        const material = materialsResult.rows[i];
        const plant = plantsResult.rows[i % plantsResult.rows.length];
        
        await client.query(`
          INSERT INTO material_plant_data (
            material_id, plant_id, mrp_type, mrp_controller, procurement_type,
            safety_stock, reorder_point, planned_delivery_time, abc_indicator, valid_from
          ) VALUES ($1, $2, 'PD', 'PLAN001', 'F', 100, 50, 7, 'A', CURRENT_DATE)
          ON CONFLICT (material_id, plant_id) DO NOTHING
        `, [material.id, plant.id]);
      }
    }
    
    console.log('✅ Seed Data Population completed successfully!');
    
    // Summary
    console.log('\n📊 Summary of populated data:');
    console.log(`- Factory Calendars: ${calendars.length}`);
    console.log(`- Work Center Categories: ${wcCategories.length}`);
    console.log(`- Personnel Records: ${personnel.length}`);
    console.log(`- Personnel Qualifications: ${qualifications.length}`);
    console.log(`- Material Plant Data: ${Math.min(materialsResult.rows.length, 10)}`);
    
  } catch (error) {
    console.error('❌ Error populating seed data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the population
populateSeedData()
  .then(() => {
    console.log('🎉 Production Planning Seed Data Population completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed data population failed:', error);
    process.exit(1);
  });