import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

console.log('\\n╔════════════════════════════════════════════════════════════╗');
console.log('║   COMPLETE ORDER-TO-CASH WORKFLOW VERIFICATION            ║');
console.log('╚════════════════════════════════════════════════════════════╝\\n');

async function completeVerification() {
    try {
        // 1. Table structures
        console.log('📊 STEP 1: TABLE STRUCTURES & COLUMNS');
        console.log('━'.repeat(60));

        const tables = {
            sales_orders: await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'sales_orders' 
        ORDER BY ordinal_position LIMIT 10
      `),
            delivery_documents: await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'delivery_documents' 
        ORDER BY ordinal_position LIMIT 10
      `),
            billing_documents: await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'billing_documents' 
        ORDER BY ordinal_position LIMIT 10
      `),
        };

        for (const [table, result] of Object.entries(tables)) {
            console.log(`\\n${table}:`);
            result.rows.forEach(col => {
                console.log(`  • ${col.column_name.padEnd(30)} ${col.data_type}`);
            });
        }

        // 2. Data flow analysis
        console.log('\\n\\n🔄 STEP 2: DATA FLOW ANALYSIS');
        console.log('━'.repeat(60));

        const dataFlow = await pool.query(`
      SELECT 
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT dd.id) as total_deliveries,
        COUNT(DISTINCT bd.id) as total_invoices,
        COUNT(DISTINCT cp.id) as total_payments,
        COUNT(DISTINCT pa.id) as total_applications,
        COUNT(DISTINCT CASE WHEN dd.order_id IS NOT NULL THEN so.id END) as orders_with_delivery,
        COUNT(DISTINCT CASE WHEN bd.order_id IS NOT NULL THEN so.id END) as orders_with_invoice,
        COUNT(DISTINCT CASE WHEN bd.delivery_id IS NOT NULL THEN bd.id END) as invoices_from_delivery
      FROM sales_orders so
      LEFT JOIN delivery_documents dd ON so.id = dd.order_id
      LEFT JOIN billing_documents bd ON so.id = bd.order_id
      LEFT JOIN customer_payments cp ON bd.customer_id = cp.customer_id
      LEFT JOIN payment_applications pa ON bd.id = pa.billing_id
    `);

        const flow = dataFlow.rows[0];
        console.log(`\\nOrder → Delivery → Invoice → Payment Flow:`);
        console.log(`  Orders Created:          ${flow.total_orders}`);
        console.log(`  └─ With Deliveries:      ${flow.orders_with_delivery} (${Math.round(flow.orders_with_delivery / flow.total_orders * 100)}%)`);
        console.log(`  └─ With Invoices:        ${flow.orders_with_invoice} (${Math.round(flow.orders_with_invoice / flow.total_orders * 100)}%)`);
        console.log(`\\n  Total Deliveries:        ${flow.total_deliveries}`);
        console.log(`  Total Invoices:          ${flow.total_invoices}`);
        console.log(`  └─ From Deliveries:      ${flow.invoices_from_delivery}`);
        console.log(`\\n  Total Payments:          ${flow.total_payments}`);
        console.log(`  Total Applications:      ${flow.total_applications}`);

        // 3. Sample data check
        console.log('\\n\\n📝 STEP 3: SAMPLE DATA VERIFICATION');
        console.log('━'.repeat(60));

        const sampleOrder = await pool.query(`
      SELECT 
        so.id, so.order_number, so.customer_name, so.total_amount, so.status,
        dd.delivery_number, dd.posting_status as delivery_status,
        bd.billing_number, bd.payment_status as invoice_status
      FROM sales_orders so
      LEFT JOIN delivery_documents dd ON so.id = dd.order_id
      LEFT JOIN billing_documents bd ON so.id = bd.order_id
      LIMIT 1
    `);

        if (sampleOrder.rows.length > 0) {
            const order = sampleOrder.rows[0];
            console.log(`\\nSample Order: ${order.order_number}`);
            console.log(`  Customer:    ${order.customer_name}`);
            console.log(`  Amount:      $${order.total_amount}`);
            console.log(`  Status:      ${order.status}`);
            console.log(`  Delivery:    ${order.delivery_number || 'None'} (${order.delivery_status || 'N/A'})`);
            console.log(`  Invoice:     ${order.billing_number || 'None'} (${order.invoice_status || 'N/A'})`);
        }

        // 4. Payment application deep dive
        console.log('\\n\\n💰 STEP 4: PAYMENT APPLICATION ANALYSIS');
        console.log('━'.repeat(60));

        const paymentStatus = await pool.query(`
      SELECT 
        bd.billing_number,
        bd.total_amount as invoice_amount,
        bd.outstanding_amount,
        bd.payment_status,
        COUNT(pa.id) as applications_count,
        COALESCE(SUM(pa.applied_amount), 0) as total_applied
      FROM billing_documents bd
      LEFT JOIN payment_applications pa ON bd.id = pa.billing_id
      GROUP BY bd.id, bd.billing_number, bd.total_amount, bd.outstanding_amount, bd.payment_status
    `);

        console.log(`\\nInvoice Payment Status:`);
        paymentStatus.rows.forEach(inv => {
            console.log(`\\n  Invoice: ${inv.billing_number}`);
            console.log(`    Total:        $${parseFloat(inv.invoice_amount || 0).toFixed(2)}`);
            console.log(`    Outstanding:  $${parseFloat(inv.outstanding_amount || 0).toFixed(2)}`);
            console.log(`    Status:       ${inv.payment_status}`);
            console.log(`    Applications: ${inv.applications_count}`);
            console.log(`    Applied:      $${parseFloat(inv.total_applied).toFixed(2)}`);
        });

        // 5. Document flow tracking
        console.log('\\n\\n🔗 STEP 5: DOCUMENT FLOW TRACKING');
        console.log('━'.repeat(60));

        const hasDocFlow = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'document_flow'
    `);

        if (parseInt(hasDocFlow.rows[0].count) > 0) {
            const docFlow = await pool.query(`
        SELECT 
          source_document_type,
          source_document_number,
          target_document_type,
          target_document_number,
          COUNT(*) as flow_count
        FROM document_flow
        GROUP BY source_document_type, source_document_number, target_document_type, target_document_number
        LIMIT 5
      `);

            console.log(`\\nDocument Flow Records: ${docFlow.rows.length}`);
            docFlow.rows.forEach(flow => {
                console.log(`  ${flow.source_document_type} ${flow.source_document_number} → ${flow.target_document_type} ${flow.target_document_number}`);
            });
        } else {
            console.log('\\n⚠️  document_flow table does not exist');
        }

        // 6. Foreign key relationships
        console.log('\\n\\n🔑 STEP 6: FOREIGN KEY RELATIONSHIPS');
        console.log('━'.repeat(60));

        const fks = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS references_table,
        ccu.column_name AS references_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('delivery_documents', 'billing_documents', 'payment_applications')
      ORDER BY tc.table_name, kcu.column_name
    `);

        console.log(`\\nForeign Keys Found: ${fks.rows.length}`);
        fks.rows.forEach(fk => {
            console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.references_table}.${fk.references_column}`);
        });

        // 7. Gaps summary
        console.log('\\n\\n🎯 STEP 7: IDENTIFIED GAPS');
        console.log('━'.repeat(60));

        const gaps = [];

        // Check for broken links
        const brokenDeliveries = await pool.query(`
      SELECT COUNT(*) as count 
      FROM delivery_documents dd
      LEFT JOIN sales_orders so ON dd.order_id = so.id
      WHERE so.id IS NULL
    `);
        if (parseInt(brokenDeliveries.rows[0].count) > 0) {
            gaps.push(`${brokenDeliveries.rows[0].count} deliveries with missing sales orders`);
        }

        const brokenInvoices = await pool.query(`
      SELECT COUNT(*) as count 
      FROM billing_documents bd
      LEFT JOIN sales_orders so ON bd.order_id = so.id
      WHERE bd.order_id IS NOT NULL AND so.id IS NULL
    `);
        if (parseInt(brokenInvoices.rows[0].count) > 0) {
            gaps.push(`${brokenInvoices.rows[0].count} invoices with missing sales orders`);
        }

        if (parseInt(flow.total_applications) === 0 && parseInt(flow.total_payments) > 0) {
            gaps.push(`${flow.total_payments} payments exist but 0 payment applications (CRITICAL)`);
        }

        if (gaps.length > 0) {
            console.log('\\n❌ Critical Issues:');
            gaps.forEach((gap, i) => {
                console.log(`  ${i + 1}. ${gap}`);
            });
        } else {
            console.log('\\n✅ No critical data integrity issues found!');
        }

        console.log('\\n\\n' + '═'.repeat(60));
        console.log('VERIFICATION COMPLETE');
        console.log('═'.repeat(60) + '\\n');

    } catch (error) {
        console.error('\\n❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

completeVerification();
