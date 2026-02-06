import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001/api/purchase';

async function testVendorFiltering() {
    try {
        console.log('🧪 Testing Vendor Filtering API\n');
        console.log('='.repeat(80));

        // Test with materials that have vendor info (from our database check)
        const materialIds = '114,115';  // These have vendor assignments

        console.log(`\n📋 Testing with material IDs: ${materialIds}\n`);

        const response = await fetch(`${BASE_URL}/vendors/by-materials?materialIds=${materialIds}`);

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ API Error:', error);
            return;
        }

        const data = await response.json();

        console.log(`✅ API Response received!\n`);
        console.log('📊 Summary:');
        console.log(`   Total vendors found: ${data.summary.total_vendors}`);
        console.log(`   Vendors with 100% coverage: ${data.summary.vendors_with_100_percent_coverage}`);
        console.log(`   Vendors with preferred materials: ${data.summary.vendors_with_preferred_materials}`);
        console.log(`   Requested material count: ${data.requestedMaterialCount}\n`);

        if (data.vendors.length === 0) {
            console.log('⚠️  No vendors found for these materials\n');
            return;
        }

        console.log('🏢 Vendor Details:\n');
        data.vendors.forEach((vendor, idx) => {
            console.log(`${idx + 1}. ${vendor.name} (${vendor.code})`);
            console.log(`   Coverage: ${vendor.coverage_percentage}% (${vendor.total_materials_matched}/${data.requestedMaterialCount} materials)`);
            console.log(`   Contact: ${vendor.contact_person || 'N/A'}`);
            console.log(`   Email: ${vendor.email || 'N/A'}`);
            console.log(`   Phone: ${vendor.phone || 'N/A'}`);
            console.log(`   Payment Terms: ${vendor.payment_terms || 'N/A'}`);
            console.log(`\n   📦 Materials Supplied:`);

            vendor.materials.forEach(mat => {
                const preferred = mat.is_preferred ? '⭐ PREFERRED' : '';
                console.log(`      - ${mat.material_code} (${mat.material_name})`);
                console.log(`        Price: ${mat.currency} ${mat.unit_price}`);
                console.log(`        Lead Time: ${mat.lead_time_days} days`);
                console.log(`        Min Order Qty: ${mat.minimum_order_quantity} ${preferred}`);
            });
            console.log('');
        });

        console.log('='.repeat(80));
        console.log('\n✅ Test completed successfully!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testVendorFiltering();
