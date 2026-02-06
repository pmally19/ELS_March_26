/**
 * Factory Calendar Schema Migration - Complete Fix
 * 
 * This script will:
 * 1. Add factory_calendar columns if they don't exist
 * 2. Fix existing column lengths if needed
 * 3. Add foreign key constraints
 * 4. Clean up invalid references
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('='.repeat(80));
    console.log('FACTORY CALENDAR SCHEMA MIGRATION');
    console.log('='.repeat(80));
    console.log();

    // 1. Check if factory_calendars exists
    const fcExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'factory_calendars'
      );
    `);

    if (!fcExists.rows[0].exists) {
      console.log('❌ factory_calendars table does not exist! Cannot proceed.');
      return false;
    }

    console.log('✅ factory_calendars table exists');
    console.log();

    // 2. Handle plants table
    console.log('STEP 1: Fixing plants table...');
    console.log('-'.repeat(80));

    const plantsColExists = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'plants' AND column_name = 'factory_calendar'
    `);

    if (plantsColExists.rows.length === 0) {
      console.log('Adding factory_calendar column to plants...');
      await client.query(`
        ALTER TABLE plants 
        ADD COLUMN factory_calendar VARCHAR(10);
      `);
      console.log('✅ Added factory_calendar column to plants');
    } else {
      const col = plantsColExists.rows[0];
      if (col.character_maximum_length < 10) {
        console.log(`Fixing plants.factory_calendar length (${col.character_maximum_length} -> 10)...`);
        await client.query(`
          ALTER TABLE plants 
          ALTER COLUMN factory_calendar TYPE VARCHAR(10);
        `);
        console.log('✅ Fixed plants.factory_calendar data type');
      } else {
        console.log('✅ plants.factory_calendar already correct');
      }
    }

    // 3. Handle work_centers table
    console.log();
    console.log('STEP 2: Fixing work_centers table...');
    console.log('-'.repeat(80));

    const wcColExists = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'work_centers' AND column_name = 'factory_calendar'
    `);

    if (wcColExists.rows.length === 0) {
      console.log('Adding factory_calendar column to work_centers...');
      await client.query(`
        ALTER TABLE work_centers 
        ADD COLUMN factory_calendar VARCHAR(10);
      `);
      console.log('✅ Added factory_calendar column to work_centers');
    } else {
      const col = wcColExists.rows[0];
      if (col.character_maximum_length < 10) {
        console.log(`Fixing work_centers.factory_calendar length (${col.character_maximum_length} -> 10)...`);
        await client.query(`
          ALTER TABLE work_centers 
          ALTER COLUMN factory_calendar TYPE VARCHAR(10);
        `);
        console.log('✅ Fixed work_centers.factory_calendar data type');
      } else {
        console.log('✅ work_centers.factory_calendar already correct');
      }
    }

    // 4. Handle sd_shipping_points table
    console.log();
    console.log('STEP 3: Fixing sd_shipping_points table...');
    console.log('-'.repeat(80));

    const spColExists = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'sd_shipping_points' AND column_name = 'factory_calendar'
    `);

    if (spColExists.rows.length === 0) {
      console.log('Adding factory_calendar column to sd_shipping_points...');
      await client.query(`
        ALTER TABLE sd_shipping_points 
        ADD COLUMN factory_calendar VARCHAR(10);
      `);
      console.log('✅ Added factory_calendar column to sd_shipping_points');
    } else {
      const col = spColExists.rows[0];
      if (col.character_maximum_length < 10) {
        console.log(`Fixing sd_shipping_points.factory_calendar length (${col.character_maximum_length} -> 10)...`);
        await client.query(`
          ALTER TABLE sd_shipping_points 
          ALTER COLUMN factory_calendar TYPE VARCHAR(10);
        `);
        console.log('✅ Fixed sd_shipping_points.factory_calendar data type');
      } else {
        console.log('✅ sd_shipping_points.factory_calendar already correct');
      }
    }

    // 5. Clean up invalid references
    console.log();
    console.log('STEP 4: Cleaning up invalid references...');
    console.log('-'.repeat(80));

    const invalidPlants = await client.query(`
      UPDATE plants 
      SET factory_calendar = NULL 
      WHERE factory_calendar IS NOT NULL 
      AND factory_calendar NOT IN (SELECT calendar_id FROM factory_calendars);
    `);
    console.log(`✅ Cleaned ${invalidPlants.rowCount} invalid plant references`);

    const invalidWCs = await client.query(`
      UPDATE work_centers 
      SET factory_calendar = NULL 
      WHERE factory_calendar IS NOT NULL 
      AND factory_calendar NOT IN (SELECT calendar_id FROM factory_calendars);
    `);
    console.log(`✅ Cleaned ${invalidWCs.rowCount} invalid work center references`);

    const invalidSPs = await client.query(`
      UPDATE sd_shipping_points 
      SET factory_calendar = NULL 
      WHERE factory_calendar IS NOT NULL 
      AND factory_calendar NOT IN (SELECT calendar_id FROM factory_calendars);
    `);
    console.log(`✅ Cleaned ${invalidSPs.rowCount} invalid shipping point references`);

    // 6. Add foreign key constraints
    console.log();
    console.log('STEP 5: Adding foreign key constraints...');
    console.log('-'.repeat(80));

    // Drop existing constraints if they exist
    await client.query(`
      ALTER TABLE plants DROP CONSTRAINT IF EXISTS fk_plant_factory_calendar;
      ALTER TABLE work_centers DROP CONSTRAINT IF EXISTS fk_wc_factory_calendar;
      ALTER TABLE sd_shipping_points DROP CONSTRAINT IF EXISTS fk_sp_factory_calendar;
    `);

    // Add new constraints
    await client.query(`
      ALTER TABLE plants 
      ADD CONSTRAINT fk_plant_factory_calendar 
      FOREIGN KEY (factory_calendar) 
      REFERENCES factory_calendars(calendar_id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);
    console.log('✅ Added foreign key constraint to plants');

    await client.query(`
      ALTER TABLE work_centers 
      ADD CONSTRAINT fk_wc_factory_calendar 
      FOREIGN KEY (factory_calendar) 
      REFERENCES factory_calendars(calendar_id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);
    console.log('✅ Added foreign key constraint to work_centers');

    await client.query(`
      ALTER TABLE sd_shipping_points 
      ADD CONSTRAINT fk_sp_factory_calendar 
      FOREIGN KEY (factory_calendar) 
      REFERENCES factory_calendars(calendar_id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);
    console.log('✅ Added foreign key constraint to sd_shipping_points');

    // 7. Summary
    console.log();
    console.log('='.repeat(80));
    console.log('MIGRATION COMPLETE!');
    console.log('='.repeat(80));
    console.log();
    console.log('Summary of changes:');
    console.log('✅ All factory_calendar columns are now VARCHAR(10)');
    console.log('✅ Foreign key constraints added to all tables');
    console.log('✅ Invalid references cleaned up');
    console.log('✅ Database integrity enforced');
    console.log();

    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then((success) => {
    if (success) {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('💥 Migration failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
