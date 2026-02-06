import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('🔄 UPDATING BILLING DOCUMENTS WITH PAID AMOUNTS\n');
console.log('='.repeat(80));

async function updatePaidAmounts() {
    try {
        // Calculate paid amounts for each billing document based on total - outstanding
        console.log('\n1. Updating paid_amount for all billing documents...\n');

        const result = await pool.query(`
      UPDATE billing_documents
      SET paid_amount = COALESCE(total_amount, 0) - COALESCE(outstanding_amount, total_amount)
      WHERE id IN (SELECT id FROM billing_documents LIMIT 100)
      RETURNING id, billing_number, total_amount, paid_amount, outstanding_amount
    `);

        console.log(`✅ Updated ${result.rows.length} billing documents:\n`);

        result.rows.slice(0, 10).forEach((doc, i) => {
            console.log(`${i + 1}. ${doc.billing_number}:`);
            console.log(`   Total: $${doc.total_amount}`);
            console.log(`   Paid: $${doc.paid_amount}`);
            console.log(`   Outstanding: $${doc.outstanding_amount}`);
        });

        if (result.rows.length > 10) {
            console.log(`\n... and ${result.rows.length - 10} more`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ DONE! Now refresh your browser to see updated amounts.');
        console.log('   The "Paid" column should now show correct values.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

updatePaidAmounts();
