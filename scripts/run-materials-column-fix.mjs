import pg from 'pg';
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
        console.log('🔄 Fixing materials table column sizes...\n');

        // Read migration file
        const fs = await import('fs/promises');
        const migration = await fs.readFile(
            'C:\\Users\\moksh\\Desktop\\28-10-2025\\database\\migrations\\1023-fix-materials-column-sizes.sql',
            'utf-8'
        );

        // Run migration
        await client.query(migration);

        console.log('✅ Migration completed successfully!\n');

        // Verify changes
        const result = await client.query(`
            SELECT column_name, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'materials' 
            AND column_name IN (
                'industry_sector', 'mrp_controller', 'purchasing_group',
                'distribution_channel', 'sales_organization', 'production_storage_location'
            )
            ORDER BY column_name
        `);

        console.log('📊 Updated column sizes:');
        result.rows.forEach(row => {
            console.log(`   ${row.column_name.padEnd(35)} VARCHAR(${row.character_maximum_length})`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
