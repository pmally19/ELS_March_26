import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function deepVerification() {
    console.log('🔍 DEEP ORDER-TO-CASH VERIFICATION WITH GL POSTINGS\n');
    console.log('='.repeat(100));

    const report = {
        tables: {},
        glPostings: {},
        gaps: [],
        warnings: []
    };

    try {
        // ===== SECTION 1: ALL O2C TABLES =====
        console.log('\n📊 SECTION 1: DATABASE TABLES VERIFICATION\n');

        const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE ANY(ARRAY['%sales%', '%delivery%', '%billing%', '%payment%', '%invoice%', '%transfer%', '%document_flow%'])
      ORDER BY table_name
    `);

        console.log('O2C Related Tables Found:');
        for (const row of allTables.rows) {
            const colCount = await pool.query(`SELECT COUNT(*) FROM information_schema.columns WHERE table_name = $1`, [row.table_name]);
            const rowCount = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
            console.log(`  ✅ ${row.table_name.padEnd(40)} ${colCount.rows[0].count} cols | ${rowCount.rows[0].count} rows`);
            report.tables[row.table_name] = { columns: colCount.rows[0].count, rows: rowCount.rows[0].count };
        }

        // ===== SECTION 2: SALES ORDER ANALYSIS =====
        console.log('\n📦 SECTION 2: SALES ORDER ANALYSIS\n');

        const orderAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(DISTINCT status) as distinct_statuses,
        SUM(total_amount) as total_order_value,
        AVG(total_amount) as avg_order_value,
        MIN(order_date) as earliest_order,
        MAX(order_date) as latest_order
      FROM sales_orders
    `);

        const orderStats = orderAnalysis.rows[0];
        console.log(`Total Orders: ${orderStats.total_orders}`);
        console.log(`Total Value: $${parseFloat(orderStats.total_order_value || 0).toFixed(2)}`);
        console.log(`Avg Order: $${parseFloat(orderStats.avg_order_value || 0).toFixed(2)}`);
        console.log(`Date Range: ${orderStats.earliest_order} to ${orderStats.latest_order}`);

        // Check order statuses
        const orderStatuses = await pool.query(`
      SELECT status, COUNT(*) as count, SUM(total_amount) as value
      FROM sales_orders
      GROUP BY status
      ORDER BY count DESC
    `);

        console.log('\nOrder Status Breakdown:');
        orderStatuses.rows.forEach(s => {
            console.log(`  ${s.status || 'NULL'}: ${s.count} orders ($${parseFloat(s.value || 0).toFixed(2)})`);
        });

        // ===== SECTION 3: DELIVERY ANALYSIS =====
        console.log('\n🚚 SECTION 3: DELIVERY ANALYSIS\n');

        const deliveryAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(DISTINCT status) as distinct_statuses,
        COUNT(CASE WHEN inventory_posting_status = 'POSTED' THEN 1 END) as goods_issued,
        COUNT(CASE WHEN inventory_posting_status != 'POSTED' OR inventory_posting_status IS NULL THEN 1 END) as not_goods_issued
      FROM delivery_documents
    `);

        const delStats = deliveryAnalysis.rows[0];
        console.log(`Total Deliveries: ${delStats.total_deliveries}`);
        console.log(`Goods Issue Posted: ${delStats.goods_issued}`);
        console.log(`NOT Goods Issued: ${delStats.not_goods_issued}`);

        if (parseInt(delStats.not_goods_issued) > 0) {
            report.warnings.push(`${delStats.not_goods_issued} deliveries without goods issue posting`);
            console.log(`  ⚠️  WARNING: ${delStats.not_goods_issued} deliveries haven't posted goods issue`);
        }

        // Check inventory posting status
        const invPostingCheck = await pool.query(`
      SELECT inventory_posting_status, COUNT(*) as count
      FROM delivery_documents
      GROUP BY inventory_posting_status
    `);

        console.log('\nInventory Posting Status:');
        invPostingCheck.rows.forEach(s => {
            console.log(`  ${s.inventory_posting_status || 'NULL'}: ${s.count} deliveries`);
        });

        // ===== SECTION 4: BILLING/INVOICE ANALYSIS =====
        console.log('\n💰 SECTION 4: BILLING/INVOICE ANALYSIS\n');

        const invoiceAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_invoice_amt,
        SUM(outstanding_amount) as total_outstanding,
        SUM(paid_amount) as total_paid,
        COUNT(CASE WHEN posting_status = 'POSTED' THEN 1 END) as posted_count,
        COUNT(CASE WHEN posting_status != 'POSTED' OR posting_status IS NULL THEN 1 END) as not_posted_count
      FROM billing_documents
    `);

        const invStats = invoiceAnalysis.rows[0];
        console.log(`Total Invoices: ${invStats.total_invoices}`);
        console.log(`Total Invoice Amount: $${parseFloat(invStats.total_invoice_amt || 0).toFixed(2)}`);
        console.log(`Total Paid: $${parseFloat(invStats.total_paid || 0).toFixed(2)}`);
        console.log(`Total Outstanding: $${parseFloat(invStats.total_outstanding || 0).toFixed(2)}`);
        console.log(`Posted Status: ${invStats.posted_count} posted, ${invStats.not_posted_count} not posted`);

        if (parseInt(invStats.not_posted_count) > 0) {
            report.gaps.push(`${invStats.not_posted_count} invoices not posted to accounting`);
            console.log(`  ❌ GAP: ${invStats.not_posted_count} invoices NOT posted to accounting`);
        }

        // Check accounting document numbers
        const accDocCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(accounting_document_number) as with_acc_doc
      FROM billing_documents
      WHERE posting_status = 'POSTED'
    `);

        console.log(`\nAccounting Document Assignment:`);
        console.log(`  Posted Invoices: ${accDocCheck.rows[0].total}`);
        console.log(`  With Accounting Doc #: ${accDocCheck.rows[0].with_acc_doc}`);

        if (accDocCheck.rows[0].total != accDocCheck.rows[0].with_acc_doc) {
            const missing = accDocCheck.rows[0].total - (accDocCheck.rows[0].with_acc_doc || 0);
            report.gaps.push(`${missing} posted invoices missing accounting document number`);
            console.log(`  ❌ GAP: ${missing} posted invoices without accounting document number`);
        }

        // ===== SECTION 5: PAYMENT ANALYSIS =====
        console.log('\n💳 SECTION 5: PAYMENT ANALYSIS\n');

        const paymentAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(payment_amount) as total_paid,
        COUNT(CASE WHEN posting_status = 'POSTED' THEN 1 END) as posted_payments,
        COUNT(CASE WHEN posting_status = 'REVERSED' THEN 1 END) as reversed_payments
      FROM customer_payments
    `);

        const payStats = paymentAnalysis.rows[0];
        console.log(`Total Payments: ${payStats.total_payments}`);
        console.log(`Total Amount Received: $${parseFloat(payStats.total_paid || 0).toFixed(2)}`);
        console.log(`Posted Payments: ${payStats.posted_payments}`);
        console.log(`Reversed Payments: ${payStats.reversed_payments}`);

        // Check payment applications
        const payAppCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_applications,
        SUM(applied_amount) as total_applied
      FROM payment_applications
    `);

        console.log(`\nPayment Applications:`);
        console.log(`  Total Applications: ${payAppCheck.rows[0].total_applications}`);
        console.log(`  Total Applied: $${parseFloat(payAppCheck.rows[0].total_applied || 0).toFixed(2)}`);

        // ===== SECTION 6: GL POSTING VERIFICATION =====
        console.log('\n📒 SECTION 6: GL POSTING VERIFICATION\n');

        // Check journal entries table
        const jeCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'journal_entries'
      )
    `);

        if (jeCheck.rows[0].exists) {
            console.log('✅ journal_entries table exists');

            const jeCount = await pool.query(`SELECT COUNT(*) FROM journal_entries`);
            console.log(`   Total Journal Entries: ${jeCount.rows[0].count}`);

            // Check journal entry types
            const jeTypes = await pool.query(`
        SELECT entry_type, COUNT(*) as count, SUM(debit_amount) as debit, SUM(credit_amount) as credit
        FROM journal_entries
        GROUP BY entry_type
        ORDER BY count DESC
      `);

            console.log('\n   Journal Entry Types:');
            jeTypes.rows.forEach(t => {
                console.log(`     ${t.entry_type}: ${t.count} entries (Debit: $${parseFloat(t.debit || 0).toFixed(2)}, Credit: $${parseFloat(t.credit || 0).toFixed(2)})`);
            });
        } else {
            console.log('❌ journal_entries table NOT found');
            report.gaps.push('journal_entries table does not exist - GL postings may use different structure');
        }

        // Check GL accounts table
        const glAccountCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gl_accounts'
      )
    `);

        if (glAccountCheck.rows[0].exists) {
            console.log('\n✅ gl_accounts table exists');
            const glCount = await pool.query(`SELECT COUNT(*) FROM gl_accounts`);
            console.log(`   Total GL Accounts: ${glCount.rows[0].count}`);
        } else {
            console.log('\n⚠️  gl_accounts table not found - checking alternatives');

            // Check account_id_master
            const aimCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'account_id_master'
        )
      `);

            if (aimCheck.rows[0].exists) {
                console.log('   ✅ account_id_master table exists (using this for GL)');
                const aimCount = await pool.query(`SELECT COUNT(*) FROM account_id_master`);
                console.log(`      Total Accounts: ${aimCount.rows[0].count}`);
            }
        }

        // ===== SECTION 7: AR OPEN ITEMS =====
        console.log('\n📋 SECTION 7: AR OPEN ITEMS VERIFICATION\n');

        const arCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ar_open_items'
      )
    `);

        if (arCheck.rows[0].exists) {
            console.log('✅ ar_open_items table exists');

            const arStats = await pool.query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(outstanding_amount) as total_outstanding,
          COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_count,
          COUNT(CASE WHEN status = 'CLEARED' THEN 1 END) as cleared_count,
          COUNT(CASE WHEN status = 'PARTIAL' THEN 1 END) as partial_count
        FROM ar_open_items
        WHERE active = true
      `);

            const arData = arStats.rows[0];
            console.log(`   Total Open Items: ${arData.total_items}`);
            console.log(`   Total Outstanding: $${parseFloat(arData.total_outstanding || 0).toFixed(2)}`);
            console.log(`   Status Breakdown:`);
            console.log(`     OPEN: ${arData.open_count}`);
            console.log(`     PARTIAL: ${arData.partial_count}`);
            console.log(`     CLEARED: ${arData.cleared_count}`);

            // Compare with billing documents
            if (invStats.total_outstanding) {
                const diff = Math.abs(parseFloat(arData.total_outstanding || 0) - parseFloat(invStats.total_outstanding || 0));
                if (diff > 1) {
                    report.warnings.push(`AR open items ($${parseFloat(arData.total_outstanding).toFixed(2)}) doesn't match billing outstanding ($${parseFloat(invStats.total_outstanding).toFixed(2)})`);
                    console.log(`   ⚠️  WARNING: AR vs Billing mismatch: $${diff.toFixed(2)}`);
                } else {
                    console.log(`   ✅ AR open items match billing documents outstanding`);
                }
            }
        } else {
            console.log('❌ ar_open_items table NOT found');
            report.gaps.push('CRITICAL: ar_open_items table missing - no AR tracking');
        }

        // ===== SECTION 8: DOCUMENT FLOW COMPLETENESS =====
        console.log('\n🔗 SECTION 8: DOCUMENT FLOW COMPLETENESS\n');

        const flowCheck = await pool.query(`
      SELECT 
        source_document_type,
        target_document_type,
        COUNT(*) as flow_count
      FROM document_flow
      GROUP BY source_document_type, target_document_type
      ORDER BY flow_count DESC
    `);

        console.log('Document Flow Patterns:');
        flowCheck.rows.forEach(f => {
            console.log(`  ${f.source_document_type} → ${f.target_document_type}: ${f.flow_count} links`);
        });

        // Check for orphaned documents
        const orphanCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM sales_orders WHERE id NOT IN (SELECT DISTINCT source_document_id FROM document_flow WHERE source_document_type = 'SALES_ORDER')) as orphan_orders,
        (SELECT COUNT(*) FROM delivery_documents WHERE id NOT IN (SELECT DISTINCT source_document_id FROM document_flow WHERE source_document_type = 'DELIVERY')) as orphan_deliveries,
        (SELECT COUNT(*) FROM billing_documents WHERE id NOT IN (SELECT DISTINCT source_document_id FROM document_flow WHERE source_document_type = 'BILLING')) as orphan_invoices
    `);

        const orphans = orphanCheck.rows[0];
        console.log(`\nOrphaned Documents (no flow links):`);
        console.log(`  Orders: ${orphans.orphan_orders}`);
        console.log(`  Deliveries: ${orphans.orphan_deliveries}`);
        console.log(`  Invoices: ${orphans.orphan_invoices}`);

        if (parseInt(orphans.orphan_orders) > 0) report.warnings.push(`${orphans.orphan_orders} orders not linked in document flow`);

        // ===== SECTION 9: CRITICAL GAPS CHECK =====
        console.log('\n🚨 SECTION 9: CRITICAL GAPS DETECTION\n');

        const criticalTables = ['sales_returns', 'credit_memos', 'return_deliveries', 'order_conditions', 'pricing_procedures'];

        for (const table of criticalTables) {
            const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);

            if (exists.rows[0].exists) {
                const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`  ✅ ${table.padEnd(25)} EXISTS (${count.rows[0].count} rows)`);
            } else {
                console.log(`  ❌ ${table.padEnd(25)} MISSING`);
                report.gaps.push(`Table missing: ${table}`);
            }
        }

        // ===== FINAL SUMMARY =====
        console.log('\n' + '='.repeat(100));
        console.log('📊 VERIFICATION SUMMARY\n');

        console.log(`✅ Tables Found: ${Object.keys(report.tables).length}`);
        console.log(`❌ Critical Gaps: ${report.gaps.length}`);
        console.log(`⚠️  Warnings: ${report.warnings.length}`);

        if (report.gaps.length > 0) {
            console.log('\n❌ CRITICAL GAPS IDENTIFIED:');
            report.gaps.forEach((gap, i) => console.log(`   ${i + 1}. ${gap}`));
        }

        if (report.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            report.warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
        }

        console.log('\n' + '='.repeat(100));
        console.log('\n✅ Deep verification complete. Generating detailed report...\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

deepVerification();
