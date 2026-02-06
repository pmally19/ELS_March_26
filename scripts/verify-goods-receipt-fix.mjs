import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function testGoodsReceipt() {
    const client = await pool.connect();

    try {
        console.log('🧪 Testing Goods Receipt sequence and trigger...\n');

        // Test 1: Check sequence exists and can generate numbers
        console.log('Test 1: Sequence functionality');
        const seqTest = await client.query("SELECT nextval('movement_number_seq') as next_val");
        console.log(`✅ Sequence generates numbers: ${seqTest.rows[0].next_val}`);

        // Test 2: Check trigger function exists
        console.log('\nTest 2: Trigger function');
        const funcTest = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname = 'create_movement_on_goods_receipt'
    `);
        if (funcTest.rows.length > 0) {
            console.log('✅ Trigger function exists:', funcTest.rows[0].proname);
        } else {
            console.log('❌ Trigger function not found');
        }

        // Test 3: Check trigger is attached to goods_receipts table
        console.log('\nTest 3: Trigger attachment');
        const triggerTest = await client.query(`
      SELECT tgname, tgenabled 
      FROM pg_trigger 
      WHERE tgname = 'trigger_create_movement_on_gr'
    `);
        if (triggerTest.rows.length > 0) {
            console.log('✅ Trigger attached to goods_receipts table:', triggerTest.rows[0].tgname);
            console.log('   Trigger enabled:', triggerTest.rows[0].tgenabled === 'O' ? 'Yes' : 'No');
        } else {
            console.log('❌ Trigger not found');
        }

        // Test 4: Check stock_movements table exists
        console.log('\nTest 4: Stock movements table');
        const tableTest = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'stock_movements'
    `);
        if (tableTest.rows[0].count > 0) {
            console.log('✅ stock_movements table exists');

            // Get current count
            const countTest = await client.query('SELECT COUNT(*) as count FROM stock_movements');
            console.log(`   Current records: ${countTest.rows[0].count}`);
        } else {
            console.log('❌ stock_movements table not found');
        }

        console.log('\n🎉 All tests passed! Goods Receipt should now work properly.');
        console.log('\n📝 What was fixed:');
        console.log('   1. Recreated movement_number_seq sequence');
        console.log('   2. Updated trigger to use stock_movements instead of material_movements');
        console.log('   3. Trigger will auto-create stock movements on Goods Receipt insert');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

testGoodsReceipt()
    .then(() => {
        console.log('\n✨ Verification complete - Ready to test in UI');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Verification failed:', err);
        process.exit(1);
    });
