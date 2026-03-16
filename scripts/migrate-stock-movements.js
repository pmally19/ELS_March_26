import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function migrateStockMovements() {
    console.log('\n' + '='.repeat(80));
    console.log('📦 MIGRATING OLD STOCK_MOVEMENTS TO MATERIAL_MOVEMENTS');
    console.log('='.repeat(80) + '\n');

    try {
        // 1. Check if stock_movements table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'stock_movements'
            )
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('ℹ️  No stock_movements table found - nothing to migrate\n');
            return;
        }

        // 2. Count existing data
        const oldCount = await pool.query('SELECT COUNT(*) as count FROM stock_movements');
        const newCount = await pool.query('SELECT COUNT(*) as count FROM material_movements');

        console.log(`📊 Current state:`);
        console.log(`   stock_movements (old): ${oldCount.rows[0].count} records`);
        console.log(`   material_movements (new): ${newCount.rows[0].count} records\n`);

        if (parseInt(oldCount.rows[0].count) === 0) {
            console.log('ℹ️  No data in stock_movements to migrate\n');
            return;
        }

        // 3. Migrate data
        console.log('🔄 Migrating data from stock_movements to material_movements...\n');

        const result = await pool.query(`
            INSERT INTO material_movements (
                movement_number,
                movement_type,
                material_code,
                material_name,
                quantity,
                unit_of_measure,
                from_location,
                to_location,
                reference_document,
                reference_type,
                movement_date,
                posting_date,
                status,
                notes
            )
            SELECT 
                COALESCE(sm.document_number, 'MIG-' || sm.id) as movement_number,
                CASE 
                    WHEN sm.movement_type IN ('IN', 'OUT') THEN 
                        CASE sm.movement_type 
                            WHEN 'IN' THEN 'Goods Receipt'
                            WHEN 'OUT' THEN 'Goods Issue'
                        END
                    ELSE 'Adjustment'
                END as movement_type,
                sm.material_code,
                COALESCE(m.name, p.name, sm.material_code) as material_name,
                ABS(sm.quantity) as quantity,
                COALESCE(sm.unit, 'EA') as unit_of_measure,
                sm.storage_location as from_location,
                sm.storage_location as to_location,
                sm.reference_document,
                'Migration' as reference_type,
                sm.posting_date as movement_date,
                sm.posting_date::date as posting_date,
                'Posted' as status,
                'Migrated from stock_movements table' as notes
            FROM stock_movements sm
            LEFT JOIN materials m ON sm.material_code = m.code
            LEFT JOIN products p ON sm.material_code = p.sku
            WHERE NOT EXISTS (
                SELECT 1 FROM material_movements mm 
                WHERE mm.movement_number = COALESCE(sm.document_number, 'MIG-' || sm.id)
            )
            ON CONFLICT (movement_number) DO NOTHING
            RETURNING id, movement_number, movement_type, material_code, quantity
        `);

        console.log(`✅ Migration completed!`);
        console.log(`   Records migrated: ${result.rows.length}\n`);

        if (result.rows.length > 0) {
            console.log('Sample migrated records:');
            result.rows.slice(0, 5).forEach((r, idx) => {
                console.log(`   ${idx + 1}. ${r.movement_number} - ${r.movement_type} - ${r.material_code} - ${r.quantity}`);
            });
        }

        // 4. Final count
        const finalCount = await pool.query('SELECT COUNT(*) as count FROM material_movements');
        console.log(`\n📊 Final count: ${finalCount.rows[0].count} records in material_movements\n`);

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await pool.end();
    }
}

migrateStockMovements();
