import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkVendorMaterialTables() {
    try {
        console.log('🔍 Checking for Vendor-Material Assignment Tables\n');
        console.log('='.repeat(80));

        // Check for tables with 'vendor' and 'material' in the name
        const tableQuery = await pool.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (
          table_name LIKE '%vendor%material%' 
          OR table_name LIKE '%material%vendor%'
          OR table_name = 'vendor_materials'
          OR table_name = 'material_vendors'
          OR table_name = 'vendor_material_info'
          OR table_name = 'material_vendor_info'
          OR table_name = 'purchasing_info'
          OR table_name = 'info_records'
        )
      ORDER BY table_name
    `);

        if (tableQuery.rows.length > 0) {
            console.log('\n✅ Found related tables:\n');
            for (const table of tableQuery.rows) {
                console.log(`📋 Table: ${table.table_name} (${table.table_type})`);

                // Get columns for this table
                const colQuery = await pool.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);

                console.log('   Columns:');
                colQuery.rows.forEach(col => {
                    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                    const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                    console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${def}`);
                });

                // Get row count
                const countQuery = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
                console.log(`   📊 Row count: ${countQuery.rows[0].count}`);

                // Get sample data if exists
                if (parseInt(countQuery.rows[0].count) > 0) {
                    const sampleQuery = await pool.query(`SELECT * FROM ${table.table_name} LIMIT 3`);
                    console.log('   📄 Sample data:');
                    sampleQuery.rows.forEach((row, idx) => {
                        console.log(`   Row ${idx + 1}:`, JSON.stringify(row, null, 2));
                    });
                }
                console.log('');
            }
        } else {
            console.log('\n❌ No vendor-material assignment tables found');
            console.log('\n💡 Need to create new table for material-vendor relationships\n');
        }

        // Also check vendor and material tables
        console.log('='.repeat(80));
        console.log('\n📊 Checking core tables:\n');

        // Check vendors table
        const vendorCheck = await pool.query(`
      SELECT COUNT(*) as count FROM vendors
    `);
        console.log(`✅ vendors table: ${vendorCheck.rows[0].count} vendors`);

        // Check materials table
        const materialCheck = await pool.query(`
      SELECT COUNT(*) as count FROM materials
    `);
        console.log(`✅ materials table: ${materialCheck.rows[0].count} materials`);

        // Check for any foreign key relationships
        console.log('\n🔗 Checking foreign key relationships:');
        const fkQuery = await pool.query(`
      SELECT
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND (
          tc.table_name LIKE '%vendor%' 
          OR ccu.table_name LIKE '%vendor%'
          OR tc.table_name LIKE '%material%'
          OR ccu.table_name LIKE '%material%'
        )
      ORDER BY tc.table_name, kcu.column_name
    `);

        if (fkQuery.rows.length > 0) {
            fkQuery.rows.slice(0, 10).forEach(fk => {
                console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
            if (fkQuery.rows.length > 10) {
                console.log(`   ... and ${fkQuery.rows.length - 10} more relationships`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ Database schema check complete!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkVendorMaterialTables();
