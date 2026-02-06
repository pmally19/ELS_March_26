import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function checkTables() {
    try {
        console.log('🔍 Checking table schemas...\n');

        const tables = ['purchasing_groups', 'purchasing_organizations', 'storage_locations', 'plants'];

        for (const table of tables) {
            console.log(`\n📋 ${table.toUpperCase()} Table:`);
            console.log('='.repeat(60));

            const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

            result.rows.forEach(col => {
                console.log(`  ${col.column_name.padEnd(30)} ${col.data_type}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();
