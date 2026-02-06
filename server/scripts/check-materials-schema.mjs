import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function checkSchema() {
    try {
       const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'materials' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n=== MATERIALS TABLE SCHEMA ===\n');
        console.log('Columns found:', result.rows.length);
        console.log('');
        
        result.rows.forEach(row => {
            console.log(`${row.column_name}:`);
            console.log(`  Type: ${row.data_type}`);
            console.log(`  Nullable: ${row.is_nullable}`);
            console.log(`  Default: ${row.column_default || 'none'}`);
            console.log('');
        });
        
        // Check specifically for inventory columns
        const inventoryColumns = ['min_stock', 'max_stock', 'reorder_point', 'safety_stock', 'lead_time', 'planned_delivery_time'];
        console.log('\n=== INVENTORY FIELDS CHECK ===\n');
        inventoryColumns.forEach(col => {
            const exists = result.rows.find(r => r.column_name === col);
            console.log(`${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
