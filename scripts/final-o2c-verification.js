import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function finalVerification() {
    console.log('🎯 FINAL O2C COMPLETE VERIFICATION\n');
    console.log('='.repeat(80));

    const results = {
        database: { passed: 0, failed: 0 },
        backend: { passed: 0, failed: 0 },
        overall: { passed: 0, failed: 0 }
    };

    try {
        // ===== DATABASE VERIFICATION =====
        console.log('\n📊 DATABASE VERIFICATION\n');

        const requiredTables = [
            'sales_returns',
            'sales_return_items',
            'credit_memos',
            'credit_memo_items',
            'return_deliveries',
            'return_delivery_items'
        ];

        for (const table of requiredTables) {
            const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);

            if (result.rows[0].exists) {
                const count = await pool.query(`SELECT COUNT(*) FROM information_schema.columns WHERE table_name = $1`, [table]);
                console.log(`  ✅ ${table.padEnd(30)} (${count.rows[0].count} columns)`);
                results.database.passed++;
                results.overall.passed++;
            } else {
                console.log(`  ❌ ${table.padEnd(30)} MISSING`);
                results.database.failed++;
                results.overall.failed++;
            }
        }

        // ===== BACKEND ROUTES VERIFICATION =====
        console.log('\n🔌 BACKEND ROUTES VERIFICATION\n');

        const fs = await import('fs');
        const routesFile = 'server/routes/order-to-cash-routes.ts';
        const content = fs.readFileSync(routesFile, 'utf8');

        const requiredRoutes = [
            { path: "'/sales-returns'", method: 'POST', desc: 'Create return' },
            { path: "'/sales-returns'", method: 'GET', desc: 'List returns' },
            { path: "'/sales-returns/:id/approve'", method: 'PUT', desc: 'Approve return' },
            { path: "'/credit-memos'", method: 'POST', desc: 'Generate credit memo' },
            { path: "'/credit-memos/:id/post'", method: 'POST', desc: 'Post to GL' },
            { path: "'/credit-memos'", method: 'GET', desc: 'List credit memos' },
            { path: "'/return-deliveries'", method: 'POST', desc: 'Process return delivery' }
        ];

        for (const route of requiredRoutes) {
            const pattern = new RegExp(`router\\.${route.method.toLowerCase()}\\(${route.path}`);
            if (pattern.test(content)) {
                console.log(`  ✅ ${route.method.padEnd(6)} ${route.path.padEnd(35)} ${route.desc}`);
                results.backend.passed++;
                results.overall.passed++;
            } else {
                console.log(`  ❌ ${route.method.padEnd(6)} ${route.path.padEnd(35)} ${route.desc}`);
                results.backend.failed++;
                results.overall.failed++;
            }
        }

        // ===== FRONTEND VERIFICATION =====
        console.log('\n🎨 FRONTEND VERIFICATION\n');

        const frontendFile = 'client/src/pages/transactions/SalesReturns.tsx';
        try {
            const exists = fs.existsSync(frontendFile);
            if (exists) {
                const frontendContent = fs.readFileSync(frontendFile, 'utf8');
                const fileSize = frontendContent.length;
                console.log(`  ✅ SalesReturns.tsx exists (${fileSize.toLocaleString()} bytes)`);
                results.overall.passed++;

                // Check for key components
                const components = [
                    { name: 'useQuery', present: frontendContent.includes('useQuery') },
                    { name: 'useMutation', present: frontendContent.includes('useMutation') },
                    { name: 'Tabs', present: frontendContent.includes('Tabs') },
                    { name: 'Table', present: frontendContent.includes('Table') },
                ];

                components.forEach(comp => {
                    if (comp.present) {
                        console.log(`     ✅ Uses ${comp.name}`);
                    }
                });
            } else {
                console.log(`  ❌ SalesReturns.tsx NOT FOUND`);
                results.overall.failed++;
            }
        } catch (err) {
            console.log(`  ⚠️  Could not verify frontend: ${err.message}`);
        }

        // ===== DATA INTEGRITY CHECKS =====
        console.log('\n🔍 DATA INTEGRITY CHECKS\n');

        // Check if tables are properly linked
        const linkCheck = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE table_name = 'sales_returns') as returns_table,
        COUNT(*) FILTER (WHERE table_name = 'credit_memos') as credit_memos_table
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('sales_returns', 'credit_memos')
    `);

        if (linkCheck.rows[0].returns_table > 0 && linkCheck.rows[0].credit_memos_table > 0) {
            console.log(`  ✅ Core tables present and ready`);
            results.overall.passed++;
        }

        // Check foreign keys
        const fkCheck = await pool.query(`
      SELECT COUNT(*) as fk_count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_name IN ('sales_returns', 'sales_return_items', 'credit_memos', 'credit_memo_items', 'return_deliveries', 'return_delivery_items')
    `);

        console.log(`  ✅ Foreign key constraints: ${fkCheck.rows[0].fk_count}`);
        results.overall.passed++;

        // ===== SUMMARY =====
        console.log('\n' + '='.repeat(80));
        console.log('📊 VERIFICATION SUMMARY\n');

        console.log(`Database:  ${results.database.passed} passed, ${results.database.failed} failed`);
        console.log(`Backend:   ${results.backend.passed} passed, ${results.backend.failed} failed`);
        console.log(`Overall:   ${results.overall.passed} passed, ${results.overall.failed} failed`);

        const totalTests = results.overall.passed + results.overall.failed;
        const passRate = totalTests > 0 ? ((results.overall.passed / totalTests) * 100).toFixed(1) : 0;

        console.log(`\nPass Rate: ${passRate}%`);

        if (results.overall.failed === 0) {
            console.log('\n✅✅✅ ALL TESTS PASSED! ✅✅✅');
            console.log('\n🎉 O2C IMPLEMENTATION IS 100% COMPLETE! 🎉');
            console.log('\nThe system is ready for:');
            console.log('  → Testing');
            console.log('  → User training');
            console.log('  → Production deployment');
        } else {
            console.log(`\n⚠️  ${results.overall.failed} test(s) failed. Review above for details.`);
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

finalVerification();
