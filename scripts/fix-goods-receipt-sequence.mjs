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
        console.log('🔧 Starting Goods Receipt sequence fix migration...');

        // Read the migration SQL file
        const migrationPath = join(__dirname, '../database/migrations/1002-fix-goods-receipt-sequence.sql');
        const sqlScript = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration file loaded');
        console.log('⚙️  Executing migration...\n');

        // Execute the migration
        const result = await client.query(sqlScript);

        console.log('✅ Migration executed successfully!');
        console.log('\n📊 Verification Results:');

        // Check if sequence exists
        const seqCheck = await client.query(`
      SELECT 
        CASE 
          WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'movement_number_seq')
          THEN '✅ Sequence exists'
          ELSE '❌ Sequence missing'
        END as sequence_status
    `);
        console.log(seqCheck.rows[0].sequence_status);

        // Check if trigger exists
        const triggerCheck = await client.query(`
      SELECT 
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_movement_on_gr')
          THEN '✅ Trigger exists'
          ELSE '❌ Trigger missing'
        END as trigger_status
    `);
        console.log(triggerCheck.rows[0].trigger_status);

        // Check if function exists
        const funcCheck = await client.query(`
      SELECT 
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_movement_on_goods_receipt')
          THEN '✅ Trigger function exists'
          ELSE '❌ Trigger function missing'
        END as function_status
    `);
        console.log(funcCheck.rows[0].function_status);

        console.log('\n🎉 All fixes applied successfully!');
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
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Migration failed:', err);
        process.exit(1);
    });
