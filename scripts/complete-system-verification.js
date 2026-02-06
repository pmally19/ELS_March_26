import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

console.log('\n' + '='.repeat(100));
console.log('🔍 COMPLETE SYSTEM VERIFICATION - CHECKING EVERYTHING');
console.log('='.repeat(100) + '\n');

async function completeVerification() {
    const report = {
        database: {},
        backend: {},
        frontend: {},
        gaps: []
    };

    try {
        // ========================================
        // 1. DATABASE VERIFICATION
        // ========================================
        console.log('📊 DATABASE VERIFICATION\n' + '-'.repeat(100));

        // Check all relevant tables
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        console.log(`\n✅ Total Tables: ${tables.rows.length}\n`);

        const criticalTables = [
            'sales_orders',
            'sales_order_items',
            'quotations',
            'quotation_items',
            'leads',
            'planned_orders',
            'production_orders',
            'delivery_orders',
            'delivery_items',
            'stock_movements',
            'material_reservations',
            'goods_receipts',
            'stock_availability_check'
        ];

        console.log('Critical Tables Check:');
        for (const tableName of criticalTables) {
            const exists = tables.rows.find(t => t.table_name === tableName);
            if (exists) {
                // Get row count
                const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                console.log(`  ✅ ${tableName.padEnd(30)} - ${count.rows[0].count} rows`);
                report.database[tableName] = { exists: true, count: count.rows[0].count };
            } else {
                console.log(`  ❌ ${tableName.padEnd(30)} - MISSING`);
                report.database[tableName] = { exists: false, count: 0 };
                report.gaps.push(`Database: ${tableName} table missing`);
            }
        }

        // Check key columns in sales_orders
        console.log('\n📋 SALES_ORDERS columns:');
        const salesCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_orders'
      ORDER BY ordinal_position
    `);
        salesCols.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Check key columns in production_orders
        console.log('\n🏭 PRODUCTION_ORDERS columns:');
        const prodCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'production_orders'
      ORDER BY ordinal_position
    `);
        prodCols.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // ========================================
        // 2. BACKEND VERIFICATION
        // ========================================
        console.log('\n' + '='.repeat(100));
        console.log('⚙️  BACKEND VERIFICATION\n' + '-'.repeat(100));

        const backendPath = path.join(process.cwd(), 'server');

        // Check services
        const servicesPath = path.join(backendPath, 'services');
        console.log('\n📦 Services:');
        const criticalServices = [
            'productionOrderService.ts',
            'plannedOrderService.ts',
            'demandTraceabilityService.ts',
            'deliveryService.ts',
            'quotationService.ts',
            'leadService.ts',
            'materialMovementService.ts'
        ];

        for (const service of criticalServices) {
            const servicePath = path.join(servicesPath, service);
            if (fs.existsSync(servicePath)) {
                const stats = fs.statSync(servicePath);
                console.log(`  ✅ ${service.padEnd(35)} - ${Math.round(stats.size / 1024)}KB`);
                report.backend[service] = { exists: true };
            } else {
                console.log(`  ❌ ${service.padEnd(35)} - MISSING`);
                report.backend[service] = { exists: false };
                report.gaps.push(`Backend: ${service} missing`);
            }
        }

        // Check routes
        const routesPath = path.join(backendPath, 'routes');
        console.log('\n🛣️  Routes:');
        const criticalRoutes = [
            'production-routes.ts',
            'plannedOrderRoutes.ts',
            'demandTraceabilityRoutes.ts',
            'deliveryRoutes.ts',
            'quotationRoutes.ts',
            'leadRoutes.ts'
        ];

        for (const route of criticalRoutes) {
            const routePath = path.join(routesPath, route);
            if (fs.existsSync(routePath)) {
                const stats = fs.statSync(routePath);
                console.log(`  ✅ ${route.padEnd(35)} - ${Math.round(stats.size / 1024)}KB`);
                report.backend[route] = { exists: true };
            } else {
                console.log(`  ❌ ${route.padEnd(35)} - MISSING`);
                report.backend[route] = { exists: false };
                report.gaps.push(`Backend: ${route} missing`);
            }
        }

        // ========================================
        // 3. FRONTEND VERIFICATION
        // ========================================
        console.log('\n' + '='.repeat(100));
        console.log('🎨 FRONTEND VERIFICATION\n' + '-'.repeat(100));

        const frontendPath = path.join(process.cwd(), 'client', 'src', 'components');

        console.log('\n📄 Components:');
        const criticalComponents = [
            { path: 'production/OrdersContent.tsx', name: 'Production Orders' },
            { path: 'planning/PlannedOrdersList.tsx', name: 'Planned Orders' },
            { path: 'delivery/DeliveryOrdersList.tsx', name: 'Delivery Orders' },
            { path: 'delivery/CreateDeliveryForm.tsx', name: 'Create Delivery' },
            { path: 'sales/QuotationList.tsx', name: 'Quotations List' },
            { path: 'sales/QuotationForm.tsx', name: 'Quotation Form' },
            { path: 'crm/LeadsList.tsx', name: 'Leads List' },
            { path: 'warehouse/MaterialIssueForm.tsx', name: 'Material Issue' }
        ];

        for (const comp of criticalComponents) {
            const compPath = path.join(frontendPath, comp.path);
            if (fs.existsSync(compPath)) {
                const stats = fs.statSync(compPath);
                console.log(`  ✅ ${comp.name.padEnd(30)} - ${Math.round(stats.size / 1024)}KB`);
                report.frontend[comp.name] = { exists: true };
            } else {
                console.log(`  ❌ ${comp.name.padEnd(30)} - MISSING`);
                report.frontend[comp.name] = { exists: false };
                report.gaps.push(`Frontend: ${comp.name} missing`);
            }
        }

        // ========================================
        // 4. SAMPLE DATA CHECK
        // ========================================
        console.log('\n' + '='.repeat(100));
        console.log('📊 SAMPLE DATA CHECK\n' + '-'.repeat(100));

        if (report.database.sales_orders?.exists) {
            const sampleSO = await pool.query('SELECT * FROM sales_orders LIMIT 1');
            if (sampleSO.rows.length > 0) {
                console.log('\n✅ Sample Sales Order:');
                console.log(JSON.stringify(sampleSO.rows[0], null, 2).substring(0, 500) + '...');
            }
        }

        if (report.database.production_orders?.exists) {
            const samplePO = await pool.query('SELECT * FROM production_orders LIMIT 1');
            if (samplePO.rows.length > 0) {
                console.log('\n✅ Sample Production Order:');
                console.log(JSON.stringify(samplePO.rows[0], null, 2).substring(0, 500) + '...');
            }
        }

        // ========================================
        // 5. SUMMARY
        // ========================================
        console.log('\n' + '='.repeat(100));
        console.log('📋 VERIFICATION SUMMARY');
        console.log('='.repeat(100) + '\n');

        console.log('Database Tables:');
        const dbExists = Object.values(report.database).filter(t => t.exists).length;
        const dbTotal = Object.keys(report.database).length;
        console.log(`  ${dbExists}/${dbTotal} critical tables exist`);

        console.log('\nBackend Services & Routes:');
        const beExists = Object.values(report.backend).filter(s => s.exists).length;
        const beTotal = Object.keys(report.backend).length;
        console.log(`  ${beExists}/${beTotal} critical files exist`);

        console.log('\nFrontend Components:');
        const feExists = Object.values(report.frontend).filter(c => c.exists).length;
        const feTotal = Object.keys(report.frontend).length;
        console.log(`  ${feExists}/${feTotal} critical components exist`);

        console.log('\n' + '='.repeat(100));
        console.log('🔴 CRITICAL GAPS FOUND:');
        console.log('='.repeat(100) + '\n');

        if (report.gaps.length === 0) {
            console.log('  ✅ NO CRITICAL GAPS - System is complete!');
        } else {
            report.gaps.forEach((gap, i) => {
                console.log(`  ${i + 1}. ${gap}`);
            });
        }

        console.log('\n' + '='.repeat(100));
        console.log('✅ VERIFICATION COMPLETE');
        console.log('='.repeat(100) + '\n');

        // Save report
        fs.writeFileSync(
            path.join(process.cwd(), 'COMPLETE_VERIFICATION_REPORT.json'),
            JSON.stringify(report, null, 2)
        );
        console.log('📄 Report saved to: COMPLETE_VERIFICATION_REPORT.json\n');

    } catch (error) {
        console.error('❌ Error during verification:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

completeVerification();
