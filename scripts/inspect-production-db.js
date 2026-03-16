import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function inspectProductionTables() {
    const client = await pool.connect();
    try {
        console.log('🔍 INSPECTING PRODUCTION TABLES SCHEMA & DATA');
        console.log('='.repeat(60));

        const tables = [
            'plants',
            'materials',
            'bill_of_materials',
            'work_centers',
            'production_versions',
            'production_orders'
        ];

        for (const table of tables) {
            console.log(`\n📋 TABLE: ${table}`);
            console.log('-'.repeat(30));

            // Get Columns
            const cols = await client.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position`, [table]);

            if (cols.rows.length === 0) {
                console.log('  ❌ Table does not exist!');
                continue;
            }

            console.log('  COLUMNS:', cols.rows.map(c => c.column_name).join(', '));

            // Get Row Count
            const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`  ROW COUNT: ${count.rows[0].count}`);

            // Get Sample Data (if any)
            if (parseInt(count.rows[0].count) > 0) {
                const sample = await client.query(`SELECT * FROM ${table} LIMIT 1`);
                console.log('  SAMPLE ROW:', JSON.stringify(sample.rows[0], null, 2));
            } else {
                console.log('  ⚠️  NO DATA FOUND');
            }
        }

    } catch (err) {
        console.error('❌ Error inspecting DB:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectProductionTables();
