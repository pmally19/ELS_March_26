import pg from 'pg';
const { Pool } = pg;

// Database credentials
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkPRSchema() {
    try {
        console.log('🔍 Connecting to database: mallyerp...\n');

        // Check purchase_requisitions table schema
        console.log('📋 PURCHASE_REQUISITIONS Table Schema:');
        console.log('='.repeat(80));

        const prSchema = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'purchase_requisitions'
      ORDER BY ordinal_position
    `);

        if (prSchema.rows.length === 0) {
            console.log('⚠️  Table "purchase_requisitions" does NOT exist!\n');
        } else {
            prSchema.rows.forEach((col, idx) => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`${(idx + 1).toString().padStart(2)}. ${col.column_name.padEnd(30)} ${col.data_type}${maxLen.padEnd(10)} ${nullable}${defaultVal}`);
            });
            console.log(`\n✅ Total columns: ${prSchema.rows.length}\n`);
        }

        // Check purchase_requisition_items table schema
        console.log('📦 PURCHASE_REQUISITION_ITEMS Table Schema:');
        console.log('='.repeat(80));

        const prItemsSchema = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'purchase_requisition_items'
      ORDER BY ordinal_position
    `);

        if (prItemsSchema.rows.length === 0) {
            console.log('⚠️  Table "purchase_requisition_items" does NOT exist!\n');
        } else {
            prItemsSchema.rows.forEach((col, idx) => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`${(idx + 1).toString().padStart(2)}. ${col.column_name.padEnd(30)} ${col.data_type}${maxLen.padEnd(10)} ${nullable}${defaultVal}`);
            });
            console.log(`\n✅ Total columns: ${prItemsSchema.rows.length}\n`);
        }

        // Check for missing fields that are in the UI
        console.log('🔎 MISSING FIELDS ANALYSIS:');
        console.log('='.repeat(80));

        const expectedItemFields = [
            'material_group',
            'storage_location',
            'storage_location_id',
            'purchasing_group',
            'purchasing_group_id',
            'purchasing_org',
            'purchasing_organization_id',
            'cost_center',
            'cost_center_id',
            'plant_id',
            'material_number'
        ];

        const existingColumns = prItemsSchema.rows.map(r => r.column_name);
        const missingFields = expectedItemFields.filter(field => !existingColumns.includes(field));

        if (missingFields.length > 0) {
            console.log('❌ Missing fields in purchase_requisition_items:');
            missingFields.forEach(field => console.log(`   - ${field}`));
        } else {
            console.log('✅ All expected fields are present!');
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ Schema check completed successfully!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

checkPRSchema();
