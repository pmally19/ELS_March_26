import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        const migrationPath = join(__dirname, '..', 'database', 'migrations', '1001-consolidate-to-stock-movements.sql');
        console.log('📄 Reading:', migrationPath, '\n');

        const sql = readFileSync(migrationPath, 'utf8');

        console.log('⏳ Executing migration...\n');
        await pool.query(sql);

        console.log('✅ Migration executed successfully!\n');
        console.log('='.repeat(70));

        console.log('\n🔍 VERIFICATION:\n');

        const tableCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'material_movements'
    `);

        if (parseInt(tableCheck.rows[0].count) === 0) {
            console.log('✅ material_movements table DROPPED');
        } else {
            console.log('⚠️  material_movements still exists!');
        }

        const stockCount = await pool.query(`SELECT COUNT(*) FROM stock_movements`);
        console.log(`✅ stock_movements has ${stockCount.rows[0].count} records`);

        const indexes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'stock_movements' 
      ORDER BY indexname
    `);
        console.log(`✅ stock_movements has ${indexes.rows.length} indexes\n`);

        console.log('='.repeat(70));
        console.log('✨ MIGRATION COMPLETE! ✨');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED!');
        console.error('Error:', error.message);
        console.error('\nStack:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runConsolidation();
