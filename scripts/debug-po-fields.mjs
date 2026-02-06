import fetch from 'node-fetch';

async function fetchPO() {
    try {
        const response = await fetch('http://localhost:5001/api/purchase/orders/189');

        if (!response.ok) {
            console.error('Failed to fetch:', response.status);
            return;
        }

        const data = await response.json();
        console.log('Relevant PO Data Fields:');
        console.log({
            id: data.id,
            vendor_id: data.vendor_id,
            warehouse_type_id: data.warehouse_type_id,
            order_date: data.order_date,
            delivery_date: data.delivery_date,
            status: data.status,
            currency: data.currency,
            notes: data.notes,
            ship_to_address_id: data.ship_to_address_id,
            purchase_organization_id: data.purchase_organization_id,
            plant_id: data.plant_id,
            company_code_id: data.company_code_id
        });
        console.log('\nKeys in top-level object:', Object.keys(data));
    } catch (error) {
        console.error('Error:', error);
    }
}

fetchPO();
