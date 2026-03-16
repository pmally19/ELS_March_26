import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function cleanOrphanedDataAndMigrate() {
    const client = await pool.connect();

    try {
        console.log('='.repeat(80));
        console.log('CLEANING ORPHANED DATA AND RUNNING MIGRATIONS');
        console.log('='.repeat(80));

        // Check for orphaned records
        console.log('\n1. Checking for orphaned vendor_payment_allocations...');
        const orphaned = await client.query(`
      SELECT vpa.id, vpa.payment_id
      FROM vendor_payment_allocations vpa
      LEFT JOIN vendor_payments vp ON vpa.payment_id = vp.id
      WHERE vp.id IS NULL;
    `);

        console.log(`   Found ${orphaned.rows.length} orphaned records`);

        if (orphaned.rows.length > 0) {
            console.log('   Deleting orphaned records...');
            await client.query(`
        DELETE FROM vendor_payment_allocations
        WHERE payment_id NOT IN (SELECT id FROM vendor_payments);
      `);
            console.log('   ✅ Orphaned records cleaned');
        }

        // Now add foreign keys
        console.log('\n2. Adding foreign keys...');

        try {
            await client.query(`
        ALTER TABLE vendor_payment_allocations
        ADD CONSTRAINT fk_payment_allocations_payment
        FOREIGN KEY (payment_id) REFERENCES vendor_payments(id)
        ON DELETE CASCADE;
      `);
            console.log('   ✅ Added fk_payment_allocations_payment');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('   ℹ️  fk_payment_allocations_payment already exists');
            } else {
                throw e;
            }
        }

        try {
            await client.query(`
        ALTER TABLE vendor_payment_allocations  
        ADD CONSTRAINT fk_payment_allocations_open_item
        FOREIGN KEY (open_item_id) REFERENCES vendor_invoices(id)
        ON DELETE NO ACTION;
      `);
            console.log('   ✅ Added fk_payment_allocations_open_item');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('   ℹ️  fk_payment_allocations_open_item already exists');
            } else {
                throw e;
            }
        }

        try {
            await client.query(`
        ALTER TABLE payment_proposals
        ADD CONSTRAINT fk_payment_proposals_company_code
        FOREIGN KEY (company_code_id) REFERENCES company_codes(id)
        ON DELETE NO ACTION;
      `);
            console.log('   ✅ Added fk_payment_proposals_company_code');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('   ℹ️  fk_payment_proposals_company_code already exists');
            } else {
                throw e;
            }
        }

        try {
            await client.query(`
        ALTER TABLE payment_proposal_items
        ADD CONSTRAINT fk_proposal_items_invoice
        FOREIGN KEY (invoice_id) REFERENCES vendor_invoices(id)
        ON DELETE NO ACTION;
      `);
            console.log('   ✅ Added fk_proposal_items_invoice');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('   ℹ️  fk_proposal_items_invoice already exists');
            } else {
                throw e;
            }
        }

        try {
            await client.query(`
        ALTER TABLE payment_proposal_items
        ADD CONSTRAINT fk_proposal_items_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        ON DELETE NO ACTION;
      `);
            console.log('   ✅ Added fk_proposal_items_vendor');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('   ℹ️  fk_proposal_items_vendor already exists');
            } else {
                throw e;
            }
        }

        // Final verification
        console.log('\n3. Final Verification:');
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

        console.log('\n   Foreign Keys by Table:');
        console.table(fkCheck.rows);

        console.log('\n' + '='.repeat(80));
        console.log('✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanOrphanedDataAndMigrate();
