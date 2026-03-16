import pkg from 'pg';
import fs from 'fs';
import path from 'path';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('='.repeat(80));
        console.log('RUNNING DATABASE MIGRATIONS FOR PHASES 4-8');
        console.log('='.repeat(80));

        const migrations = [
            '1100-add-invoice-foreign-keys.sql',
            '1101-add-three-way-match-foreign-keys.sql',
            '1102-add-payment-foreign-keys.sql',
            '1103-add-payment-proposal-foreign-keys.sql'
        ];

        for (const migrationFile of migrations) {
            const migrationPath = path.join(process.cwd(), 'database', 'migrations', migrationFile);

            console.log(`\n${'─'.repeat(80)}`);
            console.log(`📄 Running migration: ${migrationFile}`);
            console.log(`${'─'.repeat(80)}`);

            if (!fs.existsSync(migrationPath)) {
                console.log(`⚠️  Migration file not found: ${migrationPath}`);
                continue;
            }

            const sql = fs.readFileSync(migrationPath, 'utf8');

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('COMMIT');

                console.log(`✅ Migration ${migrationFile} completed successfully`);
            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`❌ Migration ${migrationFile} failed:`);
                console.error(error.message);
                throw error;
            }
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log('✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
        console.log('='.repeat(80));

        // Verify foreign keys were added
        console.log('\n📊 Verifying Foreign Keys...\n');

        const fkQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN (
          'vendor_invoices', 
          'three_way_matches', 
          'vendor_payment_allocations',
          'payment_proposals',
          'payment_proposal_items'
        )
      ORDER BY tc.table_name, tc.constraint_name;
    `;

        const fkResult = await client.query(fkQuery);

        console.log('Foreign Keys Added:');
        console.table(fkResult.rows);

        console.log(`\n✅ Total Foreign Keys: ${fkResult.rows.length}`);

    } catch (error) {
        console.error('\n❌ MIGRATION ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
