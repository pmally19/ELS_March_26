import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function addPlantCodeColumn() {
    const client = await pool.connect();

    try {
        console.log('\n=== ADDING PLANT_CODE COLUMN TO MATERIALS TABLE ===\n');

        // Step 1: Check if column already exists
        console.log('Step 1: Checking if plant_code column exists...');
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'materials' AND column_name = 'plant_code'
        `);

        if (checkColumn.rows.length > 0) {
            console.log('✓ Column plant_code already exists. Skipping creation.');
            return;
        }

        console.log('✓ Column does not exist. Proceeding with creation.');

        // Step 2: Add plant_code column
        console.log('\nStep 2: Adding plant_code column...');
        await client.query(`
            ALTER TABLE materials 
            ADD COLUMN plant_code VARCHAR(4) DEFAULT NULL
        `);
        console.log('✓ Successfully added plant_code column.');

        // Step 3: Add foreign key constraint
        console.log('\nStep 3: Adding foreign key constraint...');
        await client.query(`
            ALTER TABLE materials
            ADD CONSTRAINT fk_materials_plant_code 
            FOREIGN KEY (plant_code) REFERENCES plants(code)
            ON DELETE SET NULL
            ON UPDATE CASCADE
        `);
        console.log('✓ Successfully added foreign key constraint.');

        // Step 4: Create index for performance
        console.log('\nStep 4: Creating index on plant_code...');
        await client.query(`
            CREATE INDEX idx_materials_plant_code 
            ON materials(plant_code)
        `);
        console.log('✓ Successfully created index.');

        // Step 5: Verify changes
        console.log('\nStep 5: Verifying changes...');
        const verifyColumn = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'materials' AND column_name = 'plant_code'
        `);

        if (verifyColumn.rows.length > 0) {
            console.log('✓ VERIFIED: plant_code column details:');
            console.log(`  Type: ${verifyColumn.rows[0].data_type}`);
            console.log(`  Nullable: ${verifyColumn.rows[0].is_nullable}`);
            console.log(`  Default: ${verifyColumn.rows[0].column_default || 'NULL'}`);
        }

        const verifyConstraint = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'materials' 
            AND constraint_name = 'fk_materials_plant_code'
        `);

        console.log(`✓ Foreign key constraint: ${verifyConstraint.rows.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);

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
addPlantCodeColumn()
    .then(() => {
        console.log('Migration script finished successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
