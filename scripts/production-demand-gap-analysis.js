import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runGapAnalysis() {
    const client = await pool.connect();

    try {
        console.log('═'.repeat(80));
        console.log('🔍 PRODUCTION ORDER DEMAND-DRIVEN FLOW - COMPLETE GAP ANALYSIS');
        console.log('═'.repeat(80));
        console.log('\n');

        // ========================================
        // 1. DATABASE SCHEMA ANALYSIS
        // ========================================
        console.log('📊 PART 1: DATABASE SCHEMA ANALYSIS');
        console.log('─'.repeat(80));

        // Check production_orders columns
        console.log('\n1.1 PRODUCTION_ORDERS Table Structure:');
        const prodOrdersCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'production_orders' 
      ORDER BY ordinal_position
    `);
        console.table(prodOrdersCols.rows);

        // Check sales_orders columns
        console.log('\n1.2 SALES_ORDERS Table Structure:');
        const salesOrdersCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sales_orders' 
      ORDER BY ordinal_position
    `);
        console.table(salesOrdersCols.rows);

        // Check planned_orders columns
        console.log('\n1.3 PLANNED_ORDERS Table Structure:');
        const plannedOrdersCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'planned_orders' 
      ORDER BY ordinal_position
    `);
        console.table(plannedOrdersCols.rows);

        // ========================================
        // 2. RELATIONSHIP ANALYSIS
        // ========================================
        console.log('\n\n📊 PART 2: RELATIONSHIP & LINKAGE ANALYSIS');
        console.log('─'.repeat(80));

        // Check for sales_order_id in production_orders
        const hasSalesOrderLink = prodOrdersCols.rows.find(col =>
            col.column_name.toLowerCase().includes('sales') ||
            col.column_name.toLowerCase().includes('demand')
        );
        console.log('\n2.1 Production Orders → Sales Orders Link:');
        console.log(`   ❌ sales_order_id field: ${hasSalesOrderLink ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`   ❌ demand_source field: ${prodOrdersCols.rows.find(c => c.column_name === 'demand_source') ? '✅ EXISTS' : '❌ MISSING'}`);

        // Check for planned_order_id in production_orders  
        const hasPlannedOrderLink = prodOrdersCols.rows.find(col =>
            col.column_name.toLowerCase().includes('planned')
        );
        console.log('\n2.2 Production Orders → Planned Orders Link:');
        console.log(`   planned_order_id field: ${hasPlannedOrderLink ? '✅ EXISTS' : '❌ MISSING'}`);

        // Check for sales_order_id in planned_orders
        const plannedHasSalesLink = plannedOrdersCols.rows.find(col =>
            col.column_name.toLowerCase().includes('sales') ||
            col.column_name.toLowerCase().includes('source')
        );
        console.log('\n2.3 Planned Orders → Sales Orders Link:');
        console.log(`   sales_order_id field: ${plannedHasSalesLink ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`   demand_source field: ${plannedOrdersCols.rows.find(c => c.column_name === 'demand_source') ? '✅ EXISTS' : '❌ MISSING'}`);

        // ========================================
        // 3. DATA ANALYSIS
        // ========================================
        console.log('\n\n📊 PART 3: CURRENT DATA ANALYSIS');
        console.log('─'.repeat(80));

        // Count records
        const salesCount = await client.query('SELECT COUNT(*) as count FROM sales_orders');
        const plannedCount = await client.query('SELECT COUNT(*) as count FROM planned_orders');
        const prodCount = await client.query('SELECT COUNT(*) as count FROM production_orders');

        console.log('\n3.1 Record Counts:');
        console.log(`   Sales Orders: ${salesCount.rows[0].count}`);
        console.log(`   Planned Orders: ${plannedCount.rows[0].count}`);
        console.log(`   Production Orders: ${prodCount.rows[0].count}`);

        // Check if any production orders have source references
        if (hasPlannedOrderLink) {
            const linkedProdOrders = await client.query(`
        SELECT COUNT(*) as count 
        FROM production_orders 
        WHERE ${hasPlannedOrderLink.column_name} IS NOT NULL
      `);
            console.log(`   Production Orders linked to Planned Orders: ${linkedProdOrders.rows[0].count}`);
        }

        // Sample production orders
        console.log('\n3.2 Sample Production Orders (First 5):');
        const sampleProd = await client.query('SELECT * FROM production_orders LIMIT 5');
        console.table(sampleProd.rows);

        // Sample sales orders
        if (parseInt(salesCount.rows[0].count) > 0) {
            console.log('\n3.3 Sample Sales Orders (First 5):');
            const sampleSales = await client.query('SELECT id, order_number, customer_name, order_date, status FROM sales_orders LIMIT 5');
            console.table(sampleSales.rows);
        }

        // Sample planned orders
        if (parseInt(plannedCount.rows[0].count) > 0) {
            console.log('\n3.4 Sample Planned Orders (First 5):');
            const samplePlanned = await client.query('SELECT * FROM planned_orders LIMIT 5');
            console.table(samplePlanned.rows);
        }

        // ========================================
        // 4. FOREIGN KEY CONSTRAINTS
        // ========================================
        console.log('\n\n📊 PART 4: FOREIGN KEY CONSTRAINTS');
        console.log('─'.repeat(80));

        const fkConstraints = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('production_orders', 'planned_orders', 'sales_orders')
      ORDER BY tc.table_name
    `);

        console.log('\n4.1 Foreign Key Relationships:');
        if (fkConstraints.rows.length > 0) {
            console.table(fkConstraints.rows);
        } else {
            console.log('   ⚠️  NO FOREIGN KEY CONSTRAINTS FOUND between production_orders, planned_orders, and sales_orders');
        }

        // ========================================
        // 5. GAP SUMMARY
        // ========================================
        console.log('\n\n📊 PART 5: GAP ANALYSIS SUMMARY');
        console.log('═'.repeat(80));

        const gaps = [];

        // Check for missing fields
        if (!hasSalesOrderLink) {
            gaps.push({
                category: 'DATABASE',
                severity: 'CRITICAL',
                gap: 'production_orders missing sales_order_id',
                impact: 'Cannot trace production back to customer demand',
                recommendation: 'Add sales_order_id INTEGER column with FK to sales_orders(id)'
            });
        }

        if (!hasPlannedOrderLink) {
            gaps.push({
                category: 'DATABASE',
                severity: 'CRITICAL',
                gap: 'production_orders missing planned_order_id',
                impact: 'Cannot link MRP planned orders to production orders',
                recommendation: 'Add planned_order_id INTEGER column with FK to planned_orders(id)'
            });
        }

        if (!plannedHasSalesLink) {
            gaps.push({
                category: 'DATABASE',
                severity: 'HIGH',
                gap: 'planned_orders missing sales_order_id/demand_source',
                impact: 'Planned orders not linked to sales demand',
                recommendation: 'Add sales_order_id and demand_source columns'
            });
        }

        if (fkConstraints.rows.length === 0) {
            gaps.push({
                category: 'DATABASE',
                severity: 'HIGH',
                gap: 'No foreign key constraints between tables',
                impact: 'Data integrity not enforced at DB level',
                recommendation: 'Add FK constraints for referential integrity'
            });
        }

        console.log('\n5.1 IDENTIFIED GAPS:');
        console.table(gaps);

        console.log('\n\n═'.repeat(80));
        console.log('✅ GAP ANALYSIS COMPLETE');
        console.log('═'.repeat(80));

        // Write detailed report to file
        const report = `
PRODUCTION ORDER DEMAND-DRIVEN FLOW - COMPLETE GAP ANALYSIS REPORT
Generated: ${new Date().toISOString()}
================================================================

EXECUTIVE SUMMARY
-----------------
Total Sales Orders: ${salesCount.rows[0].count}
Total Planned Orders: ${plannedCount.rows[0].count}
Total Production Orders: ${prodCount.rows[0].count}
Critical Gaps Found: ${gaps.filter(g => g.severity === 'CRITICAL').length}
High Priority Gaps: ${gaps.filter(g => g.severity === 'HIGH').length}


DETAILED FINDINGS
-----------------

${gaps.map((g, i) => `
${i + 1}. ${g.gap}
   Category: ${g.category}
   Severity: ${g.severity}
   Impact: ${g.impact}
   Recommendation: ${g.recommendation}
`).join('\n')}


REQUIRED DATABASE CHANGES
--------------------------

1. ALTER TABLE production_orders 
   - ADD COLUMN sales_order_id INTEGER REFERENCES sales_orders(id)
   - ADD COLUMN planned_order_id INTEGER REFERENCES planned_orders(id)
   - ADD COLUMN demand_source VARCHAR(20) DEFAULT 'MANUAL' 
     -- Values: 'SALES_ORDER', 'FORECAST', 'STOCK_REPLENISHMENT', 'MANUAL'
   - ADD COLUMN source_document_number VARCHAR(50)

2. ALTER TABLE planned_orders
   - ADD COLUMN sales_order_id INTEGER REFERENCES sales_orders(id)
   - ADD COLUMN demand_source VARCHAR(20) DEFAULT 'MRP'
   - ADD COLUMN source_document_type VARCHAR(20)
   - ADD COLUMN source_document_id INTEGER

3. ALTER TABLE sales_orders
   - ADD COLUMN production_status VARCHAR(20) DEFAULT 'NOT_STARTED'
     -- Values: 'NOT_STARTED', 'PLANNED', 'IN_PRODUCTION', 'COMPLETED'
   - ADD COLUMN planned_order_created BOOLEAN DEFAULT FALSE
   - ADD COLUMN production_order_created BOOLEAN DEFAULT FALSE


BACKEND API GAPS
----------------

Missing Endpoints:
1. POST /api/sales/orders/:id/create-demand
   - Create planned order from sales order
   
2. POST /api/production-planning/convert-to-production/:plannedOrderId
   - Convert planned order to production order
   
3. GET /api/production/orders/:id/demand-trace
   - Trace production order back to original demand
   
4. GET /api/sales/orders/:id/production-status
   - Check production status of sales order


FRONTEND INTEGRATION GAPS
--------------------------

Missing Features:
1. Sales Order screen doesn't show production status
2. No button to trigger MRP from sales order
3. Production Order creation doesn't link to sales orders
4. No traceability view showing: Sales Order → Planned Order → Production Order
5. Missing demand source indicator on production orders


SAP STANDARD FLOW vs CURRENT IMPLEMENTATION
--------------------------------------------

SAP Standard Flow:
Customer Demand → Sales Order (VA01) → MRP Run (MD01/MD02) → 
Planned Order (MD04) → Convert (CO40) → Production Order (CO01) → 
Release (CO02) → Confirm (CO11N) → Goods Receipt (MIGO) → 
Delivery (VL01N)

Current Implementation:
✅ Can create Sales Orders
✅ Can create Production Orders  
✅ Has Planned Orders table
❌ No linkage between Sales → Planned → Production
❌ No MRP integration to create planned orders from sales
❌ No conversion process from planned to production
❌ No demand traceability


PRIORITY RECOMMENDATIONS
-------------------------

PHASE 1 (CRITICAL - Implement First):
1. Add relationship columns to database
2. Modify production order creation to accept source references
3. Add demand_source tracking

PHASE 2 (HIGH - Implement Second):
4. Create API to generate planned orders from sales orders
5. Create API to convert planned orders to production orders
6. Add foreign key constraints

PHASE 3 (MEDIUM - Implement Third):
7. Build frontend UI for demand traceability
8. Add production status to sales orders screen
9. Implement full MRP integration


CONCLUSION
----------
The current system has the basic tables (sales_orders, planned_orders, production_orders)
but lacks the critical linkages needed for a true demand-driven production flow.
The main gap is the absence of relationship fields and the process to link them together.

Without these linkages, production orders are created in isolation and cannot be traced
back to customer demand, which is a fundamental requirement in SAP's make-to-order and
make-to-stock processes.
`;

        fs.writeFileSync(
            'c:\\Users\\moksh\\Desktop\\28-10-2025\\docs\\PRODUCTION_DEMAND_GAP_ANALYSIS.txt',
            report
        );

        console.log('\n📄 Detailed report written to: docs/PRODUCTION_DEMAND_GAP_ANALYSIS.txt');

    } catch (error) {
        console.error('❌ Error during gap analysis:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runGapAnalysis()
    .then(() => {
        console.log('\n✅ Analysis completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Analysis failed:', error);
        process.exit(1);
    });
