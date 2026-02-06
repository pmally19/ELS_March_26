import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function completeRemainingMigrations() {
    const client = await pool.connect();

    try {
        console.log('='.repeat(80));
        console.log('COMPLETING REMAINING MIGRATIONS');
        console.log('='.repeat(80));

        // Payment allocations foreign keys (skip if exist)
        console.log('\n1. Adding vendor_payment_allocations foreign keys...');
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
                console.error('   ❌ Error:', e.message);
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
                console.error('   ❌ Error:', e.message);
            }
        }

        // Payment proposals foreign keys
        console.log('\n2. Adding payment_proposals foreign keys...');
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
                console.error('   ❌ Error:', e.message);
            }
        }

        // Payment proposal items foreign keys
        console.log('\n3. Adding payment_proposal_items foreign keys...');
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
                console.error('   ❌ Error:', e.message);
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
                console.error('   ❌ Error:', e.message);
            }
        }

        // Add indexes
        console.log('\n4. Adding performance indexes...');
        const indexes = [
            { table: 'vendor_payment_allocations', name: 'idx_payment_allocations_payment', column: 'payment_id' },
            { table: 'vendor_payment_allocations', name: 'idx_payment_allocations_open_item', column: 'open_item_id' },
            { table: 'payment_proposals', name: 'idx_payment_proposals_company_code', column: 'company_code_id' },
            { table: 'payment_proposals', name: 'idx_payment_proposals_status', column: 'status' },
            { table: 'payment_proposal_items', name: 'idx_proposal_items_invoice', column: 'invoice_id' },
            { table: 'payment_proposal_items', name: 'idx_proposal_items_vendor', column: 'vendor_id' }
        ];

        for (const idx of indexes) {
            try {
                await client.query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column});`);
                console.log(`   ✅ Created index: ${idx.name}`);
            } catch (e) {
                console.error(`   ❌ Error creating ${idx.name}:`, e.message);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ ALL REMAINING MIGRATIONS COMPLETED');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

completeRemainingMigrations();
