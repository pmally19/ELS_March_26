import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function addColumnsToPOItems() {
    try {
        console.log('Adding material_code and unit_of_measure columns to purchase_order_items...');

        await pool.query(`
      ALTER TABLE purchase_order_items 
        ADD COLUMN IF NOT EXISTS material_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10);
    `);

        console.log('✅ Columns added successfully!');

        // Verify columns
        const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_order_items' 
        AND column_name IN ('material_code', 'unit_of_measure')
    `);

        console.log('\nVerified columns:');
        result.rows.forEach(row => console.log(`  - ${row.column_name}`));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

addColumnsToPOItems();
