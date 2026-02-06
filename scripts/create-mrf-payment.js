import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('💰 CREATING PAYMENT FOR MRF TYRES (Customer 45)\n');
console.log('='.repeat(80));

async function createMRFPayment() {
    try {
        // Get MRF TYRES invoices
        console.log('\n1. Checking invoices for MRF TYRES (ID: 45)...\n');

        const invoices = await pool.query(`
      SELECT id, billing_number, total_amount, outstanding_amount
      FROM billing_documents
      WHERE customer_id = 45
      ORDER BY billing_date DESC
      LIMIT 5
    `);

        if (invoices.rows.length > 0) {
            console.log('Found invoices:');
            let totalOutstanding = 0;
            invoices.rows.forEach((inv, i) => {
                const outstanding = parseFloat(inv.outstanding_amount || inv.total_amount);
                totalOutstanding += outstanding;
                console.log(`  ${i + 1}. ${inv.billing_number}: $${inv.total_amount} (Outstanding: $${outstanding})`);
            });
            console.log(`\nTotal Outstanding: $${totalOutstanding.toFixed(2)}`);
        } else {
            console.log('⚠️  No invoices found for MRF TYRES');
            await pool.end();
            return;
        }

        // Create payment for $1000
        console.log('\n2. Creating payment of $1000 for MRF TYRES...\n');

        const paymentData = {
            customerId: 45,
            amount: 1000.00,
            paymentDate: '2025-12-28',
            paymentMethod: 'BANK_TRANSFER',
            reference: 'UI-TEST-PAYMENT',
            description: 'Test payment to update invoice UI'
        };

        const response = await fetch('http://localhost:5001/api/order-to-cash/customer-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();

        console.log('API Response:');
        console.log(JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('\n✅ Payment created successfully!');

            // Wait for processing
            await new Promise(r => setTimeout(r, 2000));

            // Check updated invoices
            console.log('\n3. Checking updated invoice amounts...\n');

            const updatedInvoices = await pool.query(`
        SELECT billing_number, total_amount, outstanding_amount
        FROM billing_documents
        WHERE customer_id = 45
        ORDER BY billing_date DESC
        LIMIT 5
      `);

            console.log('Updated invoices:');
            updatedInvoices.rows.forEach((inv, i) => {
                const outstanding = parseFloat(inv.outstanding_amount || inv.total_amount);
                const paid = parseFloat(inv.total_amount) - outstanding;
                console.log(`  ${i + 1}. ${inv.billing_number}:`);
                console.log(`     Total: $${inv.total_amount}`);
                console.log(`     Paid: $${paid.toFixed(2)}`);
                console.log(`     Outstanding: $${outstanding.toFixed(2)}`);
            });

            console.log('\n✅ Now refresh the UI page to see updated amounts!');
            console.log('   The "Paid" and "Outstanding" columns should update.');

        } else {
            console.log('\n❌ Payment failed:', result.error);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

createMRFPayment();
