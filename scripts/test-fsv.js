async function testFSV() {
    const API_URL = 'http://localhost:5000/api/fsv';

    console.log("1. Creating a new FSV...");
    const createRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: 'TEST',
            name: 'Test Chart of Accounts FSV',
            chartOfAccountsId: null // test creation
        })
    });

    if (!createRes.ok) {
        throw new Error(`Failed to create FSV: ${await createRes.text()}`);
    }
    const newFsv = await createRes.json();
    console.log(`Created FSV successfully: ${newFsv.id}`);

    console.log("2. Fetching its default hierarchy...");
    const getRes = await fetch(`${API_URL}/${newFsv.id}`);
    const fsvData = await getRes.json();
    
    // items should contain the 7 SAP defaults. Add one child node.
    let items = fsvData.items || [];
    console.log(`Initial items count: ${items.length}`);

    // Create a new child for the "Assets" node (usually sortOrder 1)
    const assetsNode = items.find(i => i.itemName === 'Assets');
    if (assetsNode) {
        items.push({
            id: '123e4567-e89b-12d3-a456-426614174000', // random uuid
            parentItemId: assetsNode.id,
            itemName: 'Current Assets',
            itemType: 'node',
            sortOrder: 1,
            displayTotalFlag: true,
            displayBalance: true
        });
        console.log("Added 'Current Assets' child node.");
    }

    console.log("3. Saving updated hierarchy...");
    
    // This is the buggy part before - if we send child first, it would crash if bulk insert wasn't topologically sorted.
    // Let's deliberately scramble the order to test our topological sort fix!
    const scrambledItems = [...items].reverse();

    const saveRes = await fetch(`${API_URL}/${newFsv.id}/hierarchy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: scrambledItems,
            assignments: []
        })
    });

    if (!saveRes.ok) {
        throw new Error(`Failed to save hierarchy: ${await saveRes.text()}`);
    }
    console.log("Hierarchy saved successfully! Fix is working.");

    console.log("4. Fetching back to verify...");
    const verifyRes = await fetch(`${API_URL}/${newFsv.id}`);
    const verifyData = await verifyRes.json();
    console.log(`Verified items count: ${verifyData.items.length} (Expected ${items.length})`);
    
    const savedChild = verifyData.items.find(i => i.itemName === 'Current Assets');
    if (savedChild && savedChild.parentItemId === assetsNode.id) {
        console.log("SUCCESS! Tree structure was preserved correctly across save and load.");
    } else {
        console.error("FAILED. Child node not found or parent incorrect.");
    }
}

testFSV().catch(console.error);
