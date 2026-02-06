// Simple test to check invoice tables via HTTP API (using running server)
async function checkTables() {
    try {
        console.log('Checking invoice tables via running server API...\n');

        // The server is running on localhost:5001
        const response = await fetch('http://localhost:5001/api/database/check-tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tables: ['vendor_invoices', 'accounts_payable']
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Response:', JSON.stringify(data, null, 2));
        } else {
            console.log('⚠️  API endpoint not found, trying direct query...');

            // Try querying invoices endpoint to check which table backend uses
            const invoiceResponse = await fetch('http://localhost:5001/api/ap/invoices?limit=1');
            if (invoiceResponse.ok) {
                const invoices = await invoiceResponse.json();
                console.log('\n✅ Invoice API works');
                console.log('Sample invoice:', invoices[0]?.invoice_number);
                console.log('\nThis means the backend CAN query invoice data.');
                console.log('Check server logs to see which table it queries.');
            } else {
                console.log('❌ Invoice API also failed');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkTables();
