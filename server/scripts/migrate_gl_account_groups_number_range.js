import pkg from 'pg';
const { Pool } = pkg;

// Database configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mallyerp',
    password: 'Mokshith@21',
    port: 5432,
});

async function migrateGLAccountGroups() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting GL Account Groups migration...\n');

        await client.query('BEGIN');

        // Step 1: Add number_range_id column
        console.log('📝 Step 1: Adding number_range_id column...');
        await client.query(`
      ALTER TABLE gl_account_groups 
      ADD COLUMN IF NOT EXISTS number_range_id INTEGER REFERENCES number_ranges(id)
    `);
        console.log('✅ number_range_id column added successfully\n');

        // Step 2: Check existing data
        console.log('📊 Step 2: Checking existing GL account groups...');
        const existingGroups = await client.query(`
      SELECT id, code, name, number_range_start, number_range_end 
      FROM gl_account_groups 
      LIMIT 5
    `);
        console.log(`Found ${existingGroups.rowCount} existing groups (showing first 5):`);
        existingGroups.rows.forEach(row => {
            console.log(`  - ${row.code}: ${row.name} (Range: ${row.number_range_start || 'N/A'} - ${row.number_range_end || 'N/A'})`);
        });
        console.log('');

        // Step 3: Drop old columns
        console.log('🗑️  Step 3: Removing old number range columns...');
        await client.query(`
      ALTER TABLE gl_account_groups
      DROP COLUMN IF EXISTS number_range_start,
      DROP COLUMN IF EXISTS number_range_end,
      DROP COLUMN IF EXISTS account_number_pattern,
      DROP COLUMN IF EXISTS account_number_min_length,
      DROP COLUMN IF EXISTS account_number_max_length,
      DROP COLUMN IF EXISTS field_control_group
    `);
        console.log('✅ Old columns removed successfully\n');

        // Step 4: Verify schema changes
        console.log('🔍 Step 4: Verifying schema changes...');
        const schemaCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'gl_account_groups'
      AND column_name IN ('number_range_id', 'number_range_start', 'number_range_end')
      ORDER BY column_name
    `);
        console.log('Current schema for number range columns:');
        schemaCheck.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        console.log('');

        await client.query('COMMIT');

        console.log('✨ Migration completed successfully!\n');
        console.log('📋 Summary:');
        console.log('  ✅ Added: number_range_id (INTEGER, references number_ranges)');
        console.log('  ❌ Removed: number_range_start, number_range_end, account_number_pattern');
        console.log('  ❌ Removed: account_number_min_length, account_number_max_length, field_control_group');
        console.log('\n🎯 Next Steps:');
        console.log('  1. Update backend API endpoints');
        console.log('  2. Update frontend GL Account Groups form');
        console.log('  3. Test creating new GL Account Groups with number ranges');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
console.log('═══════════════════════════════════════════════════════════');
console.log('  GL Account Groups - Number Range Migration');
console.log('═══════════════════════════════════════════════════════════\n');

migrateGLAccountGroups()
    .then(() => {
        console.log('\n═══════════════════════════════════════════════════════════');
        process.exit(0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
