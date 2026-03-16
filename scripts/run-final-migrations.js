import pkg from 'pg';
import fs from 'fs';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runFinalMigrations() {
    const client = await pool.connect();

    try {
        console.log('='.repeat(80));
        console.log('RUNNING FINAL MIGRATIONS FOR PHASE 4-8');
        console.log('='.repeat(80));

        const migrationFile = 'database/migrations/1104-complete-ap-foreign-keys.sql';
        console.log(`\n📄 Running: ${migrationFile}`);

        const sql = fs.readFileSync(migrationFile, 'utf8');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');

        // Verify results
        console.log('\n' + '='.repeat(80));
        console.log('VERIFICATION: Foreign Keys Added');
        console.log('='.repeat(80));

        const fkCheck = await client.query(`
      SELECT 
        tc.table_name,
        COUNT(*) as fk_count
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN (
          'vendor_invoices',
          'three_way_matches',
          'vendor_payment_allocations',
          'payment_proposals',
          'payment_proposal_items'
        )
      GROUP BY tc.table_name
      ORDER BY tc.table_name;
    `);

        console.log('\nForeign Keys by Table:');
        console.table(fkCheck.rows);

        console.log('\n✅ All migrations completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Migration error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runFinalMigrations();
