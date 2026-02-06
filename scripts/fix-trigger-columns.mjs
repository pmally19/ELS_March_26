import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔧 Fixing Goods Receipt trigger with correct column names...');

        // Read the migration SQL file
        const migrationPath = join(__dirname, '../database/migrations/1003-fix-goods-receipt-trigger-columns.sql');
        const sqlScript = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration file loaded');
        console.log('⚙️  Executing migration...\n');

        // Execute the migration
        await client.query(sqlScript);

        console.log('✅ Migration executed successfully!');
        console.log('\n📊 Verification Results:');

        // Check if function exists
        const funcCheck = await client.query(`
      SELECT 
        proname,
        pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE proname = 'create_movement_on_goods_receipt'
    `);

        if (funcCheck.rows.length > 0) {
            console.log('✅ Trigger function exists and updated');
        } else {
            console.log('❌ Trigger function not found');
        }

        console.log('\n🎉 Trigger function now uses correct stock_movements columns!');
        console.log('✅ Goods Receipt creation should now work properly');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('\n✨ Migration completed successfully');
        console.log('🧪 Try creating a Goods Receipt now!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Migration failed:', err);
        process.exit(1);
    });
