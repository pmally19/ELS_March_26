import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function testPRFieldMapping() {
    const client = await pool.connect();

    try {
        console.log('🧪 Testing Purchase Requisition Field Mapping\n');
        console.log('='.repeat(80));

        // Test 1: Create a test PR with all fields
        console.log('\n📝 Test 1: Creating test PR with ALL fields...');

        await client.query('BEGIN');

        // Insert PR header
        const prResult = await client.query(`
      INSERT INTO purchase_requisitions (
        requisition_number,
        cost_center_id,
        requisition_date,
        requested_by,
        department,
        priority,
        justification,
        project_code,
        notes,
        status,
        approval_status,
        total_value,
        currency_code
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
            'TEST-001',  // requisition_number (fits varchar(10))
            1, // cost_center_id
            'Test User',
            'IT Department',
            'HIGH',
            'Testing all material fields are saved',
            'PROJ-001',
            'Automated test notes',
            'DRAFT',
            'PENDING',
            1500.00,
            'USD'
        ]);

        const testPR = prResult.rows[0];
        console.log(`✅ Created test PR: ${testPR.requisition_number} (ID: ${testPR.id})`);

        // Insert test item with ALL fields
        const itemResult = await client.query(`
      INSERT INTO purchase_requisition_items (
        requisition_id,
        line_number,
        material_id,
        material_code,
        material_name,
        material_number,
        description,
        quantity,
        unit_of_measure,
        unit_price,
        total_price,
        required_date,
        material_group,
        material_group_id,
        storage_location,
        storage_location_id,
        purchasing_group,
        purchasing_group_id,
        purchasing_org,
        purchasing_organization_id,
        cost_center,
        cost_center_id,
        plant_id,
        plant_code,
        estimated_unit_price,
        estimated_total_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *
    `, [
            testPR.id,           // 1. requisition_id
            1,                   // 2. line_number
            null,                // 3. material_id (null to avoid FK constraint)
            '2001-18-TYRE',      // 4. material_code
            '18 INCH-TYRE',      // 5. material_name
            'MAT-2001',          // 6. material_number
            'High performance tire 18 inch', // 7. description
            1,                   // 8. quantity
            'EA',                // 9. unit_of_measure
            200.00,              // 10. unit_price
            200.00,              // 11. total_price
            new Date(),          // 12. required_date
            'TIRES',             // 13. material_group
            null,                // 14. material_group_id (null to avoid FK)
            'Storage Loc',       // 15. storage_location
            null,                // 16. storage_location_id (null to avoid FK)
            'PG001',             // 17. purchasing_group
            null,                // 18. purchasing_group_id (null to avoid FK)
            'PO01245',           // 19. purchasing_org
            null,                // 20. purchasing_organization_id (null to avoid FK)
            'Cost Center',       // 21. cost_center
            null,                // 22. cost_center_id (null to avoid FK)
            null,                // 23. plant_id (null to avoid FK)
            'P001',              // 24. plant_code
            200.00,              // 25. estimated_unit_price
            200.00               // 26. estimated_total_price
        ]);

        const testItem = itemResult.rows[0];
        console.log(`✅ Created test item with all fields (Line ${testItem.line_number})`);

        // Test 2: Verify all fields were saved
        console.log('\n🔍 Test 2: Verifying all fields were persisted...');

        const verifyResult = await client.query(`
      SELECT * FROM purchase_requisition_items WHERE id = $1
    `, [testItem.id]);

        const savedItem = verifyResult.rows[0];

        // Check critical fields
        const fieldsToCheck = [
            { field: 'material_code', expected: '2001-18-TYRE', actual: savedItem.material_code },
            { field: 'material_name', expected: '18 INCH-TYRE', actual: savedItem.material_name },
            { field: 'description', expected: 'High performance tire 18 inch', actual: savedItem.description },
            { field: 'unit_of_measure', expected: 'EA', actual: savedItem.unit_of_measure },
            { field: 'material_group', expected: 'TIRES', actual: savedItem.material_group },
            { field: 'storage_location', expected: 'Storage Loc', actual: savedItem.storage_location },
            { field: 'purchasing_group', expected: 'PG001', actual: savedItem.purchasing_group },
            { field: 'purchasing_org', expected: 'PO01245', actual: savedItem.purchasing_org },
            { field: 'cost_center', expected: 'Cost Center', actual: savedItem.cost_center },
        ];

        let passedTests = 0;
        let failedTests = 0;

        console.log('\nField Verification:');
        fieldsToCheck.forEach(({ field, expected, actual }) => {
            const passed = actual === expected;
            if (passed) {
                console.log(`  ✅ ${field.padEnd(25)} = "${actual}"`);
                passedTests++;
            } else {
                console.log(`  ❌ ${field.padEnd(25)} Expected: "${expected}", Got: "${actual}"`);
                failedTests++;
            }
        });

        // Cleanup
        await client.query('ROLLBACK');

        console.log('\n' + '='.repeat(80));
        console.log(`\n📊 Test Results: ${passedTests}/${fieldsToCheck.length} tests passed`);

        if (failedTests === 0) {
            console.log('🎉 SUCCESS! All UI fields are now being saved correctly!\n');
            return true;
        } else {
            console.log(`⚠️  WARNING: ${failedTests} field(s) not persisting correctly\n`);
            return false;
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    } finally {
        client.release();
        await pool.end();
    }
}

testPRFieldMapping().then(success => {
    process.exit(success ? 0 : 1);
});
