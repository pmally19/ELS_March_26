// Test creating procedure via API with correct company code
import dotenv from 'dotenv';
dotenv.config();

async function testAPI() {
    try {
        console.log('🧪 Testing Pricing Procedures API...\n');

        const baseURL = 'http://localhost:5001';

        // 1. Test GET all procedures
        console.log('1. GET /api/pricing-procedures');
        const getResponse = await fetch(`${baseURL}/api/pricing-procedures?company_code=1000`);
        const procedures = await getResponse.json();

        if (getResponse.ok) {
            console.log(`   ✅ Success! Found ${procedures.length} procedures\n`);
        } else {
            console.log(`   ❌ Failed:`, procedures);
            return;
        }

        // 2. Test CREATE procedure
        console.log('2. POST /api/pricing-procedures');
        const createData = {
            procedure_code: 'TEST002',
            procedure_name: 'API Test Procedure',
            description: 'Created via API test',
            is_active: true,
            company_code: '1000'
        };

        const createResponse = await fetch(`${baseURL}/api/pricing-procedures`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createData)
        });

        const created = await createResponse.json();

        if (createResponse.ok) {
            console.log(`   ✅ Created procedure ID: ${created.id}`);
            console.log(`   Code: ${created.procedure_code}`);
            console.log(`   Name: ${created.procedure_name}\n`);

            // 3. Test GET again to verify
            console.log('3. GET /api/pricing-procedures (verify)');
            const verifyResponse = await fetch(`${baseURL}/api/pricing-procedures?company_code=1000`);
            const updatedList = await verifyResponse.json();
            console.log(`   ✅ Now found ${updatedList.length} procedures\n`);

            console.log('✅ All API tests passed!');
        } else {
            console.log(`   ❌ Failed:`, created);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAPI();
