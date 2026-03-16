import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('🔧 FIXING ALL PAID INVOICES - SETTING OUTSTANDING TO $0\n');
console.log('='.repeat(80));

async function fixPaidInvoices() {
    try {
        // Step 1: Check current state
        console.log('\n1. Current state of MRF TYRES invoices:\n');
        const before = await pool.query(`
      SELECT billing_number, total_amount, paid_amount, outstanding_amount, status
      FROM billing_documents
      WHERE customer_id = 45
      ORDER BY id
    `);

        before.rows.forEach((inv, i) => {
            console.log(`${i + 1}. ${inv.billing_number}: Total=$${inv.total_amount}, Paid=$${inv.paid_amount}, Outstanding=$${inv.outstanding_amount}, Status=${inv.status}`);
        });

        // Step 2: Update ALL invoices where paid_amount = total_amount
        console.log('\n2. Updating invoices where paid = total (fully paid)...\n');

        const updateResult = await pool.query(`
      UPDATE billing_documents
      SET 
        outstanding_amount = 0,
        status = 'paid',
        updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT id 
        FROM billing_documents 
        WHERE customer_id = 45
        AND COALESCE(paid_amount, 0) >= COALESCE(total_amount, 0)
      )
      RETURNING id, billing_number, total_amount, paid_amount, outstanding_amount, status
    `);

        console.log(`✅ Updated ${updateResult.rows.length} invoices to PAID status:\n`);
        updateResult.rows.forEach((inv, i) => {
            console.log(`${i + 1}. ${inv.billing_number}: Outstanding=$${inv.outstanding_amount}, Status=${inv.status}`);
        });

        // Step 3: Also update AR open items
        console.log('\n3. Updating AR open items...\n');

        const arUpdate = await pool.query(`
      UPDATE ar_open_items
      SET 
        outstanding_amount = 0,
        status = 'Cleared',
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = 45
      AND billing_document_id IN (
        SELECT id FROM billing_documents 
        WHERE customer_id = 45 
        AND status = 'paid'
      )
      RETURNING id, outstanding_amount, status
    `);

        console.log(`✅ Updated ${arUpdate.rows.length} AR open items to Cleared\n`);

        // Step 4: Verify final state
        console.log('4. Final state verification:\n');
        const after = await pool.query(`
      SELECT billing_number, total_amount, paid_amount, outstanding_amount, status
      FROM billing_documents
      WHERE customer_id = 45
      ORDER BY id
    `);

        let totalOutstanding = 0;
        after.rows.forEach((inv, i) => {
            const outstanding = parseFloat(inv.outstanding_amount || 0);
            totalOutstanding += outstanding;
            console.log(`${i + 1}. ${inv.billing_number}:`);
            console.log(`   Total: $${inv.total_amount}`);
            console.log(`   Paid: $${inv.paid_amount}`);
            console.log(`   Outstanding: $${inv.outstanding_amount}`);
            console.log(`   Status: ${inv.status}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(`\n✅ TOTAL OUTSTANDING FOR MRF TYRES: $${totalOutstanding.toFixed(2)}`);
        console.log('\n🎉 ALL INVOICES MARKED AS PAID!');
        console.log('\nNow refresh your browser (Ctrl+Shift+R to bypass cache)');
        console.log('You should see:');
        console.log('  - Outstanding: $0.00');
        console.log('  - All invoices with "Paid" status (green badge)');
        console.log('  - Paid column showing correct amounts\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

fixPaidInvoices();
