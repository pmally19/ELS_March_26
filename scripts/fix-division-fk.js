import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function fixDivisionFK() {
    const client = await pool.connect();

    try {
        console.log('🔧 Fixing division foreign key constraint...\n');

        // Step 1: Drop the incorrect foreign key constraint
        console.log('Step 1: Dropping incorrect constraint (divisions)...');
        await client.query(`
      ALTER TABLE sales_orders 
      DROP CONSTRAINT IF EXISTS fk_sales_orders_division;
    `);
        console.log('✅ Old constraint dropped\n');

        // Step 2: Add the correct foreign key constraint pointing to sd_divisions
        console.log('Step 2: Adding correct constraint (sd_divisions)...');
        await client.query(`
      ALTER TABLE sales_orders 
      ADD CONSTRAINT fk_sales_orders_division 
      FOREIGN KEY (division_id) 
      REFERENCES sd_divisions(id) 
      ON DELETE SET NULL;
    `);
        console.log('✅ New constraint added\n');

        // Step 3: Verify the constraint
        console.log('Step 3: Verifying constraint...');
        const result = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'sales_orders'
        AND kcu.column_name = 'division_id';
    `);

        if (result.rows.length > 0) {
            console.log('✅ Constraint verification:');
            console.log(result.rows[0]);
            console.log('\n✨ Foreign key constraint successfully updated!');
            console.log(`   sales_orders.division_id now references ${result.rows[0].foreign_table_name}(${result.rows[0].foreign_column_name})`);
        } else {
            console.log('⚠️  Warning: Could not verify constraint');
        }

    } catch (error) {
        console.error('❌ Error fixing constraint:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixDivisionFK()
    .then(() => {
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
