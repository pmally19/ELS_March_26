const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runConsolidation() {
    console.log('🚀 CONSOLIDATING TO STOCK_MOVEMENTS\n');
    console.log('='.repeat(70));

    try {
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '1001-consolidate-to-stock-movements.sql');
        console.log('📄 Reading:', migrationPath, '\n');

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('⏳ Executing...\n');
        await pool.query(sql);

        console.log('✅ Migration executed!\n');
        console.log('='.repeat(70));

        console.log('\n🔍 VERIFICATION:\n');

        const tableCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'material_movements'
    `);

        if (parseInt(tableCheck.rows[0].count) === 0) {
            console.log('✅ material_movements DROPPED');
        } else {
            console.log('⚠️  material_movements still exists');
        }

        const stockCount = await pool.query(`SELECT COUNT(*) FROM stock_movements`);
        console.log(`✅ stock_movements: ${stockCount.rows[0].count} records`);

        const indexes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'stock_movements' ORDER BY indexname
    `);
        console.log(`✅ Indexes: ${indexes.rows.length} total\n`);

        console.log('='.repeat(70));
        console.log('✨ COMPLETE! ✨');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runConsolidation();
