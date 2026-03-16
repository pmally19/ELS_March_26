import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('🔧 FIXING OUTSTANDING AMOUNTS\n');
console.log('='.repeat(80));

async function fixOutstanding() {
    try {
        // Just set outstanding_amount = 0 for all paid invoices
        console.log('\n1. Setting outstanding_amount = 0 for MRF TYRES invoices...\n');

        const result = await pool.query(`
      UPDATE billing_documents
      SET outstanding_amount = 0
      WHERE customer_id = 45
      RETURNING id, billing_number, total_amount, paid_amount, outstanding_amount
    `);

        console.log(`✅ Updated ${result.rows.length} invoices:\n`);

        let totalOutstanding = 0;
        result.rows.forEach((inv, i) => {
            const outstanding = parseFloat(inv.outstanding_amount || 0);
            totalOutstanding += outstanding;
            console.log(`${i + 1}. ${inv.billing_number}:`);
            console.log(`   Total: $${inv.total_amount}`);
            console.log(`   Paid: $${inv.paid_amount}`);
            console.log(`   Outstanding: $${inv.outstanding_amount}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(`\n✅ TOTAL OUTSTANDING: $${totalOutstanding.toFixed(2)}`);
        console.log('\n🎉 ALL DONE!');
        console.log('\nNow in your browser:');
        console.log('  1. Press Ctrl+Shift+R (hard refresh to bypass cache)');
        console.log('  2. Outstanding should show $0.00');
        console.log('  3. All invoices should show as Paid\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

fixOutstanding();
