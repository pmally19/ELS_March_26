import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function cleanAllOrphanedData() {
    const client = await pool.connect();

    try {
        console.log('Cleaning all orphaned data before adding foreign keys...\n');

        // Clean vendor_payment_allocations
        console.log('1. Cleaning vendor_payment_allocations...');
        await client.query(`
      DELETE FROM vendor_payment_allocations
      WHERE payment_id NOT IN (SELECT id FROM vendor_payments);
    `);
        await client.query(`
      DELETE FROM vendor_payment_allocations
      WHERE open_item_id NOT IN (SELECT id FROM vendor_invoices);
    `);
        console.log('   ✅ Cleaned\n');

        // Clean payment_proposal_items
        console.log('2. Cleaning payment_proposal_items...');
        await client.query(`
      DELETE FROM payment_proposal_items
      WHERE invoice_id IS NOT NULL 
        AND invoice_id NOT IN (SELECT id FROM vendor_invoices);
    `);
        await client.query(`
      DELETE FROM payment_proposal_items
      WHERE vendor_id IS NOT NULL 
        AND vendor_id NOT IN (SELECT id FROM vendors);
    `);
        console.log('   ✅ Cleaned\n');

        // Now add all foreign keys
        console.log('3. Adding foreign keys...\n');

        const fkCommands = [
            {
                name: 'fk_payment_allocations_payment',
                sql: `ALTER TABLE vendor_payment_allocations
              ADD CONSTRAINT fk_payment_allocations_payment
              FOREIGN KEY (payment_id) REFERENCES vendor_payments(id)
              ON DELETE CASCADE;`
            },
            {
                name: 'fk_payment_allocations_open_item',
                sql: `ALTER TABLE vendor_payment_allocations  
              ADD CONSTRAINT fk_payment_allocations_open_item
              FOREIGN KEY (open_item_id) REFERENCES vendor_invoices(id)
              ON DELETE NO ACTION;`
            },
            {
                name: 'fk_payment_proposals_company_code',
                sql: `ALTER TABLE payment_proposals
              ADD CONSTRAINT fk_payment_proposals_company_code
              FOREIGN KEY (company_code_id) REFERENCES company_codes(id)
              ON DELETE NO ACTION;`
            },
            {
                name: 'fk_proposal_items_invoice',
                sql: `ALTER TABLE payment_proposal_items
              ADD CONSTRAINT fk_proposal_items_invoice
              FOREIGN KEY (invoice_id) REFERENCES vendor_invoices(id)
              ON DELETE NO ACTION;`
            },
            {
                name: 'fk_proposal_items_vendor',
                sql: `ALTER TABLE payment_proposal_items
              ADD CONSTRAINT fk_proposal_items_vendor
              FOREIGN KEY (vendor_id) REFERENCES vendors(id)
              ON DELETE NO ACTION;`
            }
        ];

        for (const fk of fkCommands) {
            try {
                await client.query(fk.sql);
                console.log(`   ✅ Added: ${fk.name}`);
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log(`   ℹ️  Already exists: ${fk.name}`);
                } else {
                    console.error(`   ❌ Failed: ${fk.name} - ${e.message}`);
                }
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(80));
        console.log('FINAL VERIFICATION');
        console.log('='.repeat(80));

        const result = await client.query(`
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

        console.log('\nForeign Keys Summary:');
        console.table(result.rows);

        console.log('\n✅ ALL MIGRATIONS COMPLETED!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanAllOrphanedData();
