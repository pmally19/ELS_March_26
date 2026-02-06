import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function dropMaterialPlantsTable() {
    const client = await pool.connect();

    try {
        console.log('\n=== DROPPING MATERIAL_PLANTS TABLE ===\n');

        // Step 1: Check if table exists and has data
        console.log('Step 1: Checking if material_plants table exists...');
        const checkTable = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'material_plants'
            );
        `);

        if (!checkTable.rows[0].exists) {
            console.log('✓ Table material_plants does not exist. Nothing to drop.');
            return;
        }

        console.log('✓ Table material_plants exists.');

        // Step 2: Check row count
        console.log('\nStep 2: Checking data in material_plants...');
        const countResult = await client.query('SELECT COUNT(*) FROM material_plants');
        const rowCount = parseInt(countResult.rows[0].count);
        console.log(`✓ Found ${rowCount} rows in material_plants table.`);

        if (rowCount > 0) {
            console.log('\n⚠️  WARNING: Table contains data that will be lost!');
        }

        // Step 3: Drop the table
        console.log('\nStep 3: Dropping material_plants table...');
        await client.query('DROP TABLE IF EXISTS material_plants CASCADE');
        console.log('✓ Successfully dropped material_plants table.');

        // Step 4: Verify deletion
        console.log('\nStep 4: Verifying table was dropped...');
        const verifyDrop = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'material_plants'
            );
        `);

        if (!verifyDrop.rows[0].exists) {
            console.log('✓ VERIFIED: material_plants table has been successfully removed from database.');
        } else {
            console.log('✗ ERROR: Table still exists after drop command.');
        }

        console.log('\n=== MIGRATION COMPLETE ===\n');

    } catch (error) {
        console.error('\n✗ ERROR during migration:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
dropMaterialPlantsTable()
    .then(() => {
        console.log('Migration script finished successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
