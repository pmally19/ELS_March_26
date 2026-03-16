// Insert sample overdue invoices for dunning testing - CORRECTED VERSION
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function insertTestData() {
    console.log('📊 Inserting sample overdue invoice data for dunning testing...\n');

    try {
        // Get first company code ID
        const companyCode = await pool.query('SELECT id FROM company_codes LIMIT 1');
        const companyCodeId = companyCode.rows[0].id;
        console.log(`Using company code ID: ${companyCodeId}\n`);

        // Check customers
        const customerCheck = await pool.query('SELECT COUNT(*) FROM erp_customers');
        console.log(`Found ${customerCheck.rows[0].count} customers`);

        // Insert customers if < 5
        if (parseInt(customerCheck.rows[0].count) < 5) {
            await pool.query(`
        INSERT INTO erp_customers (customer_code, name, email, phone, company_code_id, version, is_active, created_at)
        VALUES 
          ('CUST001', 'ABC Corporation', 'billing@abccorp.com', '+1-555-0101', $1, 1, true, NOW()),
          ('CUST002', 'XYZ Industries', 'finance@xyzind.com', '+1-555-0102', $1, 1, true, NOW()),
          ('CUST003', 'Alpha Solutions', 'accounts@alphasol.com', '+1-555-0103', $1, 1, true, NOW()),
          ('CUST004', 'Beta Enterprises', 'payments@betaent.com', '+1-555-0104', $1, 1, true, NOW()),
          ('CUST005', 'Gamma Trading', 'billing@gamma.com', '+1-555-0105', $1, 1, true, NOW())
        ON CONFLICT (customer_code) DO NOTHING
      `, [companyCodeId]);
            console.log('✅ Created test customers');
        }

        // Get customers  
        const customers = await pool.query(`
      SELECT id, customer_code, name 
      FROM erp_customers 
      LIMIT 5
    `);

        console.log(`Using ${customers.rows.length} customers\n`);

        // Delete old test data
        await pool.query(`DELETE FROM billing_documents WHERE billing_number LIKE 'INV-TEST-%'`);

        // Insert  overdue invoices
        const invoices = [
            [customers.rows[0].id, 'INV-TEST-001', 2450.00, 17], // 17 days overdue
            [customers.rows[1].id, 'INV-TEST-002', 5800.00, 25], // 25 days overdue
            [customers.rows[2].id, 'INV-TEST-003', 1200.00, 8],  // 8 days overdue
            [customers.rows[3].id, 'INV-TEST-004', 3500.00, 35], // 35 days overdue
            [customers.rows[4].id, 'INV-TEST-005', 7200.00, 52], // 52 days overdue
            [customers.rows[0].id, 'INV-TEST-006', 850.00, 12],  // 12 days overdue
        ];

        for (const [custId, invNum, amount, daysAgo] of invoices) {
            const dueDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            await pool.query(`
        INSERT INTO billing_documents (
          customer_id, billing_number, billing_type, billing_date, 
          due_date, total_amount, outstanding_amount, paid_amount, 
          posting_status, created_at
        ) VALUES ($1, $2, 'INVOICE', CURRENT_DATE, $3, $4, $5, 0, 'POSTED', NOW())
      `, [custId, invNum, dueDate, amount, amount]);

            console.log(`✅ ${invNum} - $${amount} (${daysAgo} days overdue)`);
        }

        // Verify
        const check = await pool.query(`
      SELECT 
        c.name,
        bd.billing_number,
        bd.outstanding_amount,
        CURRENT_DATE - bd.due_date as days_overdue
      FROM billing_documents bd
      JOIN erp_customers c ON bd.customer_id = c.id
      WHERE bd.due_date < CURRENT_DATE
        AND bd.outstanding_amount > 0
      ORDER BY bd.due_date ASC
    `);

        console.log('\n📊 OVERDUE INVOICES:');
        console.log('─'.repeat(80));
        check.rows.forEach(r => {
            console.log(`${r.name.padEnd(20)} ${r.billing_number.padEnd(15)} $${parseFloat(r.outstanding_amount).toFixed(2).padEnd(10)} ${r.days_overdue} days`);
        });
        console.log('─'.repeat(80));
        console.log(`Total: ${check.rows.length} invoices - $${check.rows.reduce((sum, r) => sum + parseFloat(r.outstanding_amount), 0).toFixed(2)}`);

        console.log('\n🎉 SUCCESS! Now go to:');
        console.log('http://localhost:5001/transactions/dunning-management');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

insertTestData();
