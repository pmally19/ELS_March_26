import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

console.log('\n🌱 Seeding Complete Order-to-Cash Workflow\n');
console.log('═'.repeat(60));

async function seedCompleteWorkflow() {
    try {
        // Step 1: Verify existing data
        console.log('\n📊 Step 1: Checking Existing Data');
        console.log('─'.repeat(60));

        const existingOrders = await pool.query('SELECT COUNT(*) FROM sales_orders');
        const existingDeliveries = await pool.query('SELECT COUNT(*) FROM delivery_documents');
        const existingInvoices = await pool.query('SELECT COUNT(*) FROM billing_documents');
        const existingPayments = await pool.query('SELECT COUNT(*) FROM customer_payments');
        const existingApplications = await pool.query('SELECT COUNT(*) FROM payment_applications');

        console.log(`✓ Sales Orders: ${existingOrders.rows[0].count}`);
        console.log(`✓ Deliveries: ${existingDeliveries.rows[0].count}`);
        console.log(`✓ Invoices: ${existingInvoices.rows[0].count}`);
        console.log(`✓ Payments: ${existingPayments.rows[0].count}`);
        console.log(`✓ Payment Applications: ${existingApplications.rows[0].count}`);

        // Step 2: Create sample payment applications
        console.log('\n💰 Step 2: Creating Sample Payment Applications');
        console.log('─'.repeat(60));

        // Get unpaid invoices with matching payments
        const matchData = await pool.query(`
      SELECT 
        bd.id as billing_id,
        bd.billing_number,
        bd.total_amount,
        bd.outstanding_amount,
        cp.id as payment_id,
        cp.payment_number,
        cp.payment_amount,
        bd.customer_id
      FROM billing_documents bd
      JOIN customer_payments cp ON bd.customer_id = cp.customer_id
      WHERE bd.outstanding_amount > 0
        AND cp.posting_status != 'Fully Applied'
        AND NOT EXISTS (
          SELECT 1 FROM payment_applications pa 
          WHERE pa.billing_id = bd.id AND pa.payment_id = cp.id
        )
      LIMIT 3
    `);

        if (matchData.rows.length > 0) {
            for (const match of matchData.rows) {
                const applyAmount = Math.min(
                    parseFloat(match.payment_amount),
                    parseFloat(match.outstanding_amount)
                );

                await pool.query(`
          INSERT INTO payment_applications (
            payment_id,
            billing_id,
            applied_amount,
            application_date,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, CURRENT_DATE, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `, [match.payment_id, match.billing_id, applyAmount]);

                // Update outstanding amount on invoice
                await pool.query(`
          UPDATE billing_documents
          SET outstanding_amount = outstanding_amount - $1,
              payment_status = CASE 
                WHEN (outstanding_amount - $1) <= 0 THEN 'Paid'
                ELSE 'Partially Paid'
              END,
              updated_at = NOW()
          WHERE id = $2
        `, [applyAmount, match.billing_id]);

                console.log(`✓ Applied $${applyAmount.toFixed(2)} from payment ${match.payment_number} to invoice ${match.billing_number}`);
            }
        } else {
            console.log('⚠️  No unpaid invoices with matching payments found');
            console.log('   This is expected if all invoices are already paid');
        }

        // Step 3: Verify results
        console.log('\n✅ Step 3: Verification');
        console.log('─'.repeat(60));

        const finalApplications = await pool.query('SELECT COUNT(*) FROM payment_applications');
        const paidInvoices = await pool.query(`
      SELECT COUNT(*) FROM billing_documents WHERE payment_status = 'Paid'
    `);
        const partiallyPaid = await pool.query(`
      SELECT COUNT(*) FROM billing_documents WHERE payment_status = 'Partially Paid'
    `);

        console.log(`✓ Total Payment Applications: ${finalApplications.rows[0].count}`);
        console.log(`✓ Fully Paid Invoices: ${paidInvoices.rows[0].count}`);
        console.log(`✓ Partially Paid Invoices: ${partiallyPaid.rows[0].count}`);

        // Step 4: Show sample workflow
        console.log('\n📋 Step 4: Sample End-to-End Flow');
        console.log('─'.repeat(60));

        const sampleFlow = await pool.query(`
      SELECT 
        so.order_number,
        so.customer_name,
        so.total_amount as order_amount,
        dd.delivery_number,
        dd.pgi_status,
        bd.billing_number,
        bd.payment_status,
        bd.outstanding_amount,
        COUNT(pa.id) as payment_applications
      FROM sales_orders so
      LEFT JOIN delivery_documents dd ON so.id = dd.sales_order_id
      LEFT JOIN billing_documents bd ON so.id = bd.sales_order_id
      LEFT JOIN payment_applications pa ON bd.id = pa.billing_id
      GROUP BY so.id, dd.id, bd.id
      LIMIT 3
    `);

        sampleFlow.rows.forEach(flow => {
            console.log(`\nOrder: ${flow.order_number} | Customer: ${flow.customer_name}`);
            console.log(`  → Delivery: ${flow.delivery_number || 'None'} (${flow.pgi_status || 'N/A'})`);
            console.log(`  → Invoice: ${flow.billing_number || 'None'} (${flow.payment_status || 'N/A'})`);
            console.log(`  → Payment Applications: ${flow.payment_applications}`);
            console.log(`  → Outstanding: $${parseFloat(flow.outstanding_amount || 0).toFixed(2)}`);
        });

        console.log('\n' + '═'.repeat(60));
        console.log('✅ WORKFLOW SEEDING COMPLETE');
        console.log('═'.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

seedCompleteWorkflow();
