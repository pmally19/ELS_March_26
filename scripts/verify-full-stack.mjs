import pg from 'pg';
import fetch from 'node-fetch';

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

const API_BASE = 'http://localhost:5001/api';

console.log('🔍 FULL STACK VERIFICATION - Frontend → Backend → Database\n');
console.log('='.repeat(80));

// ============================================================================
// PHASE 1: DATABASE SCHEMA VERIFICATION
// ============================================================================
async function verifyDatabase() {
    console.log('\n📊 PHASE 1: DATABASE SCHEMA VERIFICATION');
    console.log('-'.repeat(80));

    const checks = [];

    // Check 1: vendor_invoices VIEW exists
    try {
        const viewCheck = await pool.query(`
      SELECT table_type FROM information_schema.tables 
      WHERE table_name = 'vendor_invoices'
    `);
        if (viewCheck.rows.length > 0 && viewCheck.rows[0].table_type === 'VIEW') {
            console.log('✅ vendor_invoices VIEW exists');
            const count = await pool.query('SELECT COUNT(*) FROM vendor_invoices');
            console.log(`   → Contains ${count.rows[0].count} invoice records`);
            checks.push({ name: 'vendor_invoices VIEW', status: 'PASS' });
        } else {
            console.log('❌ vendor_invoices is not a VIEW');
            checks.push({ name: 'vendor_invoices VIEW', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ vendor_invoices VIEW check failed:', e.message);
        checks.push({ name: 'vendor_invoices VIEW', status: 'FAIL' });
    }

    // Check 2: accounting_documents.status column exists
    try {
        const statusCol = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'accounting_documents' AND column_name = 'status'
    `);
        if (statusCol.rows.length > 0) {
            console.log('✅ accounting_documents.status column exists');
            console.log(`   → Type: ${statusCol.rows[0].data_type}`);
            checks.push({ name: 'accounting_documents.status', status: 'PASS' });
        } else {
            console.log('❌ accounting_documents.status column missing');
            checks.push({ name: 'accounting_documents.status', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ status column check failed:', e.message);
        checks.push({ name: 'accounting_documents.status', status: 'FAIL' });
    }

    // Check 3: company_codes has chart_of_accounts_id
    try {
        const coaCol = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'company_codes' AND column_name = 'chart_of_accounts_id'
    `);
        if (coaCol.rows.length > 0) {
            console.log('✅ company_codes.chart_of_accounts_id column exists');
            const assigned = await pool.query(`
        SELECT COUNT(*) FROM company_codes WHERE chart_of_accounts_id IS NOT NULL
      `);
            console.log(`   → ${assigned.rows[0].count} company codes have assigned CoA`);
            checks.push({ name: 'company_codes.chart_of_accounts_id', status: 'PASS' });
        } else {
            console.log('❌ company_codes.chart_of_accounts_id missing');
            checks.push({ name: 'company_codes.chart_of_accounts_id', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ chart_of_accounts_id check failed:', e.message);
        checks.push({ name: 'company_codes.chart_of_accounts_id', status: 'FAIL' });
    }

    // Check 4: Verify vendor_payments table and payment_number uniqueness
    try {
        const paymentsCheck = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT payment_number) as unique_numbers
      FROM vendor_payments
    `);
        const total = parseInt(paymentsCheck.rows[0].total);
        const unique = parseInt(paymentsCheck.rows[0].unique_numbers);

        if (total === unique) {
            console.log('✅ vendor_payments: All payment numbers are unique');
            console.log(`   → ${total} payments with unique payment numbers`);
            checks.push({ name: 'Payment Number Uniqueness', status: 'PASS' });
        } else {
            console.log(`❌ vendor_payments: Duplicate payment numbers detected (${total} total, ${unique} unique)`);
            checks.push({ name: 'Payment Number Uniqueness', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ Payment number check failed:', e.message);
        checks.push({ name: 'Payment Number Uniqueness', status: 'FAIL' });
    }

    return checks;
}

// ============================================================================
// PHASE 2: BACKEND API VERIFICATION
// ============================================================================
async function verifyBackend() {
    console.log('\n🔌 PHASE 2: BACKEND API VERIFICATION');
    console.log('-'.repeat(80));

    const checks = [];

    // Check 1: AP workflow statistics (alternative to tiles-data)
    try {
        const res = await fetch(`${API_BASE}/ap/workflow-statistics`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ GET /api/ap/workflow-statistics - 200 OK');
            console.log(`   → Active POs: ${data.data?.active_pos || 0}`);
            console.log(`   → Pending Invoices: ${data.data?.pending_invoices || 0}`);
            checks.push({ name: 'AP Workflow API', status: 'PASS' });
        } else {
            console.log(`❌ GET /api/ap/workflow-statistics - ${res.status} ${res.statusText}`);
            checks.push({ name: 'AP Workflow API', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ AP Workflow API failed:', e.message);
        checks.push({ name: 'AP Workflow API', status: 'FAIL' });
    }

    // Check 2: AP Pending Payments (alternative to payment-proposals)
    try {
        const res = await fetch(`${API_BASE}/ap/pending-payments`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ GET /api/ap/pending-payments - 200 OK');
            console.log(`   → Pending payments count: ${data.data?.length || 0}`);
            checks.push({ name: 'Pending Payments API', status: 'PASS' });
        } else {
            console.log(`❌ GET /api/ap/pending-payments - ${res.status}`);
            checks.push({ name: 'Pending Payments API', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ Pending Payments API failed:', e.message);
        checks.push({ name: 'Pending Payments API', status: 'FAIL' });
    }

    // Check 3: GL Accounts endpoint (uses company_codes.chart_of_accounts_id)
    try {
        const res = await fetch(`${API_BASE}/master-data/gl-accounts`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ GET /api/master-data/gl-accounts - 200 OK');
            console.log(`   → GL Accounts: ${data.length || 0}`);
            checks.push({ name: 'GL Accounts API', status: 'PASS' });
        } else {
            console.log(`❌ GET /api/master-data/gl-accounts - ${res.status}`);
            checks.push({ name: 'GL Accounts API', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ GL Accounts API failed:', e.message);
        checks.push({ name: 'GL Accounts API', status: 'FAIL' });
    }

    // Check 4: Period End Closing endpoints
    try {
        const res = await fetch(`${API_BASE}/period-end-closing`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ GET /api/period-end-closing - 200 OK');
            console.log(`   → Period closings: ${data.records?.length || 0}`);
            checks.push({ name: 'Period End Closing API', status: 'PASS' });
        } else {
            console.log(`❌ GET /api/period-end-closing - ${res.status}`);
            checks.push({ name: 'Period End Closing API', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ Period End Closing API failed:', e.message);
        checks.push({ name: 'Period End Closing API', status: 'FAIL' });
    }

    return checks;
}

// ============================================================================
// PHASE 3: DATA INTEGRITY VERIFICATION
// ============================================================================
async function verifyDataIntegrity() {
    console.log('\n🔐 PHASE 3: DATA INTEGRITY VERIFICATION');
    console.log('-'.repeat(80));

    const checks = [];

    // Check 1: All invoices have valid vendor references
    try {
        const invalidInvoices = await pool.query(`
      SELECT COUNT(*) FROM accounts_payable ap
      WHERE NOT EXISTS (SELECT 1 FROM vendors v WHERE v.id = ap.vendor_id)
    `);
        const count = parseInt(invalidInvoices.rows[0].count);
        if (count === 0) {
            console.log('✅ All invoices have valid vendor references');
            checks.push({ name: 'Invoice→Vendor Integrity', status: 'PASS' });
        } else {
            console.log(`❌ ${count} invoices have invalid vendor references`);
            checks.push({ name: 'Invoice→Vendor Integrity', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ Vendor reference check failed:', e.message);
        checks.push({ name: 'Invoice→Vendor Integrity', status: 'FAIL' });
    }

    // Check 2: Payment proposals link to valid invoices
    try {
        const invalidProposals = await pool.query(`
      SELECT COUNT(*) FROM payment_proposal_items ppi
      WHERE NOT EXISTS (
        SELECT 1 FROM accounts_payable ap WHERE ap.id = ppi.invoice_id
      )
    `);
        const count = parseInt(invalidProposals.rows[0].count);
        if (count === 0) {
            console.log('✅ All payment proposals link to valid invoices');
            checks.push({ name: 'Proposal→Invoice Integrity', status: 'PASS' });
        } else {
            console.log(`❌ ${count} proposal items have invalid invoice references`);
            checks.push({ name: 'Proposal→Invoice Integrity', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ Proposal integrity check failed:', e.message);
        checks.push({ name: 'Proposal→Invoice Integrity', status: 'FAIL' });
    }

    // Check 3: GL Accounts belong to assigned Chart of Accounts
    try {
        const invalidGL = await pool.query(`
      SELECT COUNT(*) FROM gl_accounts ga
      INNER JOIN company_codes cc ON ga.company_code_id = cc.id
      WHERE ga.chart_of_accounts_id != cc.chart_of_accounts_id
        AND cc.chart_of_accounts_id IS NOT NULL
    `);
        const count = parseInt(invalidGL.rows[0].count);
        if (count === 0) {
            console.log('✅ All GL accounts match company code CoA assignment');
            checks.push({ name: 'GL→CoA Integrity', status: 'PASS' });
        } else {
            console.log(`❌ ${count} GL accounts have mismatched CoA`);
            checks.push({ name: 'GL→CoA Integrity', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ GL CoA check failed:', e.message);
        checks.push({ name: 'GL→CoA Integrity', status: 'FAIL' });
    }

    return checks;
}

// ============================================================================
// PHASE 4: CRITICAL FIXES VERIFICATION
// ============================================================================
async function verifyCriticalFixes() {
    console.log('\n🛠️  PHASE 4: CRITICAL FIXES VERIFICATION');
    console.log('-'.repeat(80));

    const checks = [];

    // Check 1: Payment number format (PAY-YYYY-NNNNNN)
    try {
        const formatCheck = await pool.query(`
      SELECT payment_number FROM vendor_payments
      WHERE payment_number NOT LIKE 'PAY-____-______'
      LIMIT 5
    `);
        if (formatCheck.rows.length === 0) {
            console.log('✅ All payment numbers follow PAY-YYYY-NNNNNN format');
            checks.push({ name: 'Payment Number Format', status: 'PASS' });
        } else {
            console.log('❌ Invalid payment number formats found:');
            formatCheck.rows.forEach(row => console.log(`   → ${row.payment_number}`));
            checks.push({ name: 'Payment Number Format', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ Payment format check failed:', e.message);
        checks.push({ name: 'Payment Number Format', status: 'FAIL' });
    }

    // Check 2: Verify vendor_invoices VIEW syncs with accounts_payable
    try {
        const syncCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM vendor_invoices) as view_count,
        (SELECT COUNT(*) FROM accounts_payable) as table_count
    `);
        const viewCount = parseInt(syncCheck.rows[0].view_count);
        const tableCount = parseInt(syncCheck.rows[0].table_count);

        if (viewCount === tableCount) {
            console.log(`✅ vendor_invoices VIEW synced with accounts_payable (${viewCount} records)`);
            checks.push({ name: 'vendor_invoices Sync', status: 'PASS' });
        } else {
            console.log(`❌ Sync mismatch: VIEW=${viewCount}, TABLE=${tableCount}`);
            checks.push({ name: 'vendor_invoices Sync', status: 'FAIL' });
        }
    } catch (e) {
        console.log('❌ Sync check failed:', e.message);
        checks.push({ name: 'vendor_invoices Sync', status: 'FAIL' });
    }

    // Check 3: Branding update (ELS+ERP)
    console.log('⚠️  Branding (ELS+ERP) - Frontend check (manual verification required)');
    checks.push({ name: 'Branding Update', status: 'MANUAL' });

    return checks;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
    try {
        const allChecks = [];

        // Run all verification phases
        const dbChecks = await verifyDatabase();
        allChecks.push(...dbChecks);

        const backendChecks = await verifyBackend();
        allChecks.push(...backendChecks);

        const integrityChecks = await verifyDataIntegrity();
        allChecks.push(...integrityChecks);

        const fixChecks = await verifyCriticalFixes();
        allChecks.push(...fixChecks);

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('📋 VERIFICATION SUMMARY');
        console.log('='.repeat(80));

        const passed = allChecks.filter(c => c.status === 'PASS').length;
        const failed = allChecks.filter(c => c.status === 'FAIL').length;
        const manual = allChecks.filter(c => c.status === 'MANUAL').length;
        const total = allChecks.length;

        console.log(`\n✅ PASSED: ${passed}/${total}`);
        console.log(`❌ FAILED: ${failed}/${total}`);
        console.log(`⚠️  MANUAL: ${manual}/${total}`);

        if (failed > 0) {
            console.log('\n❌ FAILED CHECKS:');
            allChecks.filter(c => c.status === 'FAIL').forEach(c => {
                console.log(`   → ${c.name}`);
            });
        }

        const successRate = ((passed / (total - manual)) * 100).toFixed(1);
        console.log(`\n📊 Success Rate: ${successRate}%`);

        if (failed === 0 && passed > 0) {
            console.log('\n🎉 ALL AUTOMATED CHECKS PASSED! System is verified and working correctly.');
        } else if (failed > 0) {
            console.log('\n⚠️  Some checks failed. Please review the issues above.');
        }

    } catch (error) {
        console.error('\n💥 Verification script error:', error);
    } finally {
        await pool.end();
    }
}

main();
