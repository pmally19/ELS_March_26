import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp',
    port: 5432
});

async function checkAndFixProductionTables() {
    console.log('🔍 Checking Production Module Database Tables...\n');

    try {
        // Check production_orders table
        console.log('📋 Checking production_orders table...');
        const ordersCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'production_orders'
      ORDER BY ordinal_position
    `);

        if (ordersCheck.rows.length === 0) {
            console.log('❌ production_orders table does NOT exist!');
            console.log('Creating production_orders table...');

            await pool.query(`
        CREATE TABLE production_orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          material_id INTEGER REFERENCES materials(id),
          plant_id INTEGER,
          bom_id INTEGER,
          work_center_id INTEGER,
          production_version_id INTEGER,
          order_type VARCHAR(20),
          planned_quantity NUMERIC(15,3),
          actual_quantity NUMERIC(15,3) DEFAULT 0,
          scrap_quantity NUMERIC(15,3) DEFAULT 0,
          unit_of_measure VARCHAR(10),
          planned_start_date DATE,
          planned_end_date DATE,
          actual_start_date DATE,
          actual_end_date DATE,
          release_date DATE,
          status VARCHAR(20) DEFAULT 'Planned',
          priority VARCHAR(10),
          notes TEXT,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ production_orders table created!');
        } else {
            console.log(`✅ production_orders has ${ordersCheck.rows.length} columns`);
            ordersCheck.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type}`);
            });
        }

        // Check work_centers table
        console.log('\n📋 Checking work_centers table...');
        const wcCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'work_centers'
      ORDER BY ordinal_position
    `);

        if (wcCheck.rows.length === 0) {
            console.log('❌ work_centers table does NOT exist!');
            console.log('Creating work_centers table...');

            await pool.query(`
        CREATE TABLE work_centers (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          plant_id INTEGER,
          capacity NUMERIC(15,3),
          capacity_unit VARCHAR(10),
          cost_center_id INTEGER,
          responsible_person_id INTEGER,
          status VARCHAR(20) DEFAULT 'active',
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ work_centers table created!');
        } else {
            console.log(`✅ work_centers has ${wcCheck.rows.length} columns`);
        }

        // Check bill_of_materials table
        console.log('\n📋 Checking bill_of_materials table...');
        const bomCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bill_of_materials'
      ORDER BY ordinal_position
    `);

        if (bomCheck.rows.length === 0) {
            console.log('❌ bill_of_materials table does NOT exist!');
            console.log('Creating bill_of_materials table...');

            await pool.query(`
        CREATE TABLE bill_of_materials (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          material_id INTEGER REFERENCES materials(id),
          plant_id INTEGER,
          base_quantity NUMERIC(15,3) DEFAULT 1,
          base_unit VARCHAR(10),
          is_active BOOLEAN DEFAULT TRUE,
          valid_from DATE,
          valid_to DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ bill_of_materials table created!');

            // Create bom_items table
            await pool.query(`
        CREATE TABLE IF NOT EXISTS bom_items (
          id SERIAL PRIMARY KEY,
          bom_id INTEGER REFERENCES bill_of_materials(id) ON DELETE CASCADE,
          material_id INTEGER REFERENCES materials(id),
          quantity NUMERIC(15,3) NOT NULL,
          unit_of_measure VARCHAR(10),
          item_category VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ bom_items table created!');
        } else {
            console.log(`✅ bill_of_materials has ${bomCheck.rows.length} columns`);
        }

        // Check production_versions table
        console.log('\n📋 Checking production_versions table...');
        const pvCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'production_versions'
    `);

        if (pvCheck.rows.length === 0) {
            console.log('❌ production_versions table does NOT exist!');
            console.log('Creating production_versions table...');

            await pool.query(`
        CREATE TABLE production_versions (
          id SERIAL PRIMARY KEY,
          material_id INTEGER REFERENCES materials(id),
          plant_id INTEGER,
          version_number VARCHAR(10) NOT NULL,
          bom_id INTEGER REFERENCES bill_of_materials(id),
          routing_id INTEGER,
          routing_model_type VARCHAR(20) DEFAULT 'legacy',
          is_active BOOLEAN DEFAULT TRUE,
          valid_from DATE,
          valid_to DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(material_id, plant_id, version_number)
        )
      `);
            console.log('✅ production_versions table created!');
        } else {
            console.log(`✅ production_versions has ${pvCheck.rows.length} columns`);
        }

        // Check production_work_orders table
        console.log('\n📋 Checking production_work_orders table...');
        const pwoCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'production_work_orders'
    `);

        if (pwoCheck.rows.length === 0) {
            console.log('❌ production_work_orders table does NOT exist!');
            console.log('Creating production_work_orders table...');

            await pool.query(`
        CREATE TABLE production_work_orders (
          id SERIAL PRIMARY KEY,
          production_order_id INTEGER REFERENCES production_orders(id),
          material_id INTEGER REFERENCES materials(id),
          work_center_id INTEGER,
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          status VARCHAR(20) DEFAULT 'planned',
          quantity NUMERIC(15,3),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ production_work_orders table created!');
        } else {
            console.log(`✅ production_work_orders has ${pwoCheck.rows.length} columns`);
        }

        // Get row counts
        console.log('\n📊 Row Counts:');
        const tables = ['production_orders', 'work_centers', 'bill_of_materials', 'production_versions', 'production_work_orders'];
        for (const table of tables) {
            const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   ${table}: ${countResult.rows[0].count} rows`);
        }

        console.log('\n✅ Production Module Database Check Complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkAndFixProductionTables();
