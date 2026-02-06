import fetch from 'node-fetch';

async function fetchPO() {
    try {
        const response = await fetch('http://localhost:5001/api/purchase/orders/189');

        if (!response.ok) {
            console.error('Failed to fetch:', response.status);
            return;
        }

        const data = await response.json();
        console.log('FULL PO DATA:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

fetchPO();
