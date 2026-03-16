import fetch from 'node-fetch';

async function testPaymentTermsAPI() {
    try {
        console.log('Testing Payment Terms API...\n');

        const response = await fetch('http://localhost:5001/api/master-data/payment-terms');

        if (!response.ok) {
            console.log('❌ API returned error:', response.status, response.statusText);
            const text = await response.text();
            console.log('Response:', text);
            return;
        }

        const data = await response.json();

        console.log('✅ Payment Terms API Response:');
        console.log(`Total payment terms: ${data.length}\n`);

        data.forEach(term => {
            console.log(`  ${term.paymentTermKey}: ${term.description}`);
            console.log(`    Cash Discount Days: ${term.cashDiscountDays || 'N/A'}`);
            console.log(`    Payment Due Days: ${term.paymentDueDays || 'N/A'}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error testing API:', error.message);
    }
}

testPaymentTermsAPI();
