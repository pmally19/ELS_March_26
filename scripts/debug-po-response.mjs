import fetch from 'node-fetch';

async function fetchPO() {
    try {
        // Assuming the server is running on localhost:5001 or similar during dev, 
        // but the script runs in node so I need the port. 
        // The previous logs showed port 5001.
        const response = await fetch('http://localhost:5001/api/purchase/orders/189');

        if (!response.ok) {
            console.error('Failed to fetch:', response.status, response.statusText);
            // Try fetching list to find a valid ID if 189 fails
            const listResponse = await fetch('http://localhost:5001/api/purchase/orders');
            const list = await listResponse.json();
            console.log('Available POs:', list.map(po => po.id).slice(0, 5));
            if (list.length > 0) {
                const detailResponse = await fetch(`http://localhost:5001/api/purchase/orders/${list[0].id}`);
                const detail = await detailResponse.json();
                console.log('Detail for PO', list[0].id, JSON.stringify(detail, null, 2));
            }
            return;
        }

        const data = await response.json();
        console.log('PO Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

fetchPO();
