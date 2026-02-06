import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function checkMaterialsSchema() {
    try {
        console.log('🔍 Checking materials table schema...\n');

        // Get column details
        const result = await pool.query(`
      SELECT 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'materials'
      ORDER BY ordinal_position
    `);

        console.log('📋 Materials Table Columns:');
        console.log('='.repeat(60));
        result.rows.forEach(col => {
            console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        console.log('='.repeat(60));
        console.log(`Total columns: ${result.rows.length}\n`);

        // Get a sample row
        const sampleResult = await pool.query(`
      SELECT * FROM materials LIMIT 1
    `);

        if (sampleResult.rows.length > 0) {
            console.log('📊 Sample Material Record:');
            console.log('='.repeat(60));
            console.log(JSON.stringify(sampleResult.rows[0], null, 2));
            console.log('='.repeat(60));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkMaterialsSchema();
