import fetch from 'node-fetch';

async function testPricingPreview() {
    const payload = {
        salesOrgId: 32, // Based on logs from user 1000
        distributionChannelId: 10, // 01
        divisionId: 1, // 01
        customerId: 84, // Maruti
        items: [
            {
                material_id: 164, // rubber
                plant_id: 21, // 1010
                quantity: 10,
                unit_price: 1000
            }
        ],
        manualOverrides: {}
    };

    try {
        console.log('Sending Pricing Preview request for ZMRF 20 (id 50)...');
        const res = await fetch('http://localhost:5001/api/pricing-procedures/50/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log(JSON.stringify(data.conditions, null, 2));
        console.log(`Totals: Subtotal=${data.subtotal}, Tax=${data.taxTotal}, Grand=${data.grandTotal}`);
    } catch (e) {
        console.error(e);
    }
}

testPricingPreview();
