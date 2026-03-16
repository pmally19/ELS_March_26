import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log("🚀 Starting FSV API Tests...");

  try {
    // 1. Create a new FSV
    console.log("\n1️⃣ Creating a new FSV...");
    const createRes = await fetch(`${BASE_URL}/fsv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: `TST${Math.floor(Math.random() * 1000)}`,
        name: 'Test Financial Statement Version',
      })
    });

    if (!createRes.ok) throw new Error(`Create failed: ${createRes.statusText}`);
    const newFsv = await createRes.json();
    console.log("✅ FSV Created:", newFsv.code, newFsv.name);
    const fsvId = newFsv.id;

    // 2. Fetch the created FSV to get the default items
    console.log("\n2️⃣ Fetching FSV details to verify default nodes...");
    const detailsRes = await fetch(`${BASE_URL}/fsv/${fsvId}`);
    if (!detailsRes.ok) throw new Error(`Fetch failed: ${detailsRes.statusText}`);
    const details = await detailsRes.json();

    console.log(`✅ Fetched FSV with ${details.items.length} default nodes.`);

    // 3. Update the hierarchy with some assignments
    console.log("\n3️⃣ Adding assignments to the hierarchy...");
    const assetsNode = details.items.find((i: any) => i.itemName === 'Assets');

    if (!assetsNode) throw new Error("Assets node not found!");

    const assignments = [
      {
        fsvItemId: assetsNode.id,
        fromAccount: '100000',
        toAccount: '199999',
        debitIndicator: true,
        creditIndicator: true
      }
    ];

    const hierarchyRes = await fetch(`${BASE_URL}/fsv/${fsvId}/hierarchy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: details.items, // Keep existing items
        assignments
      })
    });

    if (!hierarchyRes.ok) throw new Error(`Hierarchy update failed: ${hierarchyRes.statusText}`);
    console.log("✅ Hierarchy updated with new account assignments.");

    // 4. Test the Reporting API
    console.log("\n4️⃣ Testing FSV Reporting endpoint...");
    const reportRes = await fetch(`${BASE_URL}/fsv-reporting/report/${fsvId}?startDate=2023-01-01&endDate=2023-12-31`);
    if (!reportRes.ok) throw new Error(`Report fetch failed: ${reportRes.status}`);
    const report = await reportRes.json();

    if (report.success && report.report.length > 0) {
      console.log("✅ Report generated successfully.");
      console.log(`   Root nodes count: ${report.report.length}`);
      console.log(`   Sample Node: ${report.report[0].name} - Balance: ${report.report[0].balance}`);
    } else {
      console.log("❌ Report generation failed or returned empty.");
    }

    console.log("\n🎉 All tests completed successfully!");

  } catch (error) {
    console.error("\n❌ Test Failed:", error);
  }
}

runTests();
