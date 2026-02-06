import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function investigateCreditLimit() {
    const client = await pool.connect();

    try {
        console.log('🔍 CREDIT LIMIT INVESTIGATION\n');
        console.log('='.repeat(60));

        // 1. Check customer credit limit data
        console.log('\n📊 1. CUSTOMER CREDIT LIMITS');
        console.log('-'.repeat(60));
        const customerCredit = await client.query(`
      SELECT 
        id,
        customer_number,
        customer_name,
        credit_limit,
        credit_limit_currency,
        used_credit,
        available_credit
      FROM sales_customers
      WHERE credit_limit IS NOT NULL AND credit_limit > 0
      ORDER BY customer_number
      LIMIT 10;
    `);

        if (customerCredit.rows.length > 0) {
            console.table(customerCredit.rows);
        } else {
            console.log('⚠️  No customers with credit limits found');
        }

        // 2. Check sales orders for these customers
        console.log('\n📦 2. RECENT SALES ORDERS');
        console.log('-'.repeat(60));
        const recentOrders = await client.query(`
      SELECT 
        so.id,
        so.order_number,
        so.customer_id,
        sc.customer_name,
        sc.credit_limit,
        so.total_amount,
        so.status,
        so.created_at
      FROM sales_orders so
      LEFT JOIN sales_customers sc ON so.customer_id = sc.id
      WHERE sc.credit_limit IS NOT NULL
      ORDER BY so.created_at DESC
      LIMIT 10;
    `);

        if (recentOrders.rows.length > 0) {
            console.table(recentOrders.rows);
        } else {
            console.log('⚠️  No sales orders found for customers with credit limits');
        }

        // 3. Check if there's a credit tracking table
        console.log('\n💳 3. CREDIT TRACKING TABLES');
        console.log('-'.repeat(60));

        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%credit%'
      ORDER BY table_name;
    `);

        console.log('Tables with "credit" in name:');
        console.table(tables.rows);

        // 4. Check sales_customers table structure for credit fields
        console.log('\n🏗️  4. CREDIT-RELATED COLUMNS IN sales_customers');
        console.log('-'.repeat(60));

        const columns = await client.query(`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sales_customers'
        AND (column_name LIKE '%credit%' OR column_name LIKE '%limit%')
      ORDER BY ordinal_position;
    `);

        console.table(columns.rows);

        // 5. Calculate what SHOULD be the used credit
        console.log('\n🧮 5. CREDIT CALCULATION (Expected vs Actual)');
        console.log('-'.repeat(60));

        const creditCalc = await client.query(`
      SELECT 
        sc.id,
        sc.customer_number,
        sc.customer_name,
        sc.credit_limit,
        sc.used_credit as "current_used_credit",
        COALESCE(SUM(so.total_amount), 0) as "total_order_amount",
        sc.credit_limit - COALESCE(SUM(so.total_amount), 0) as "expected_available_credit",
        sc.available_credit as "current_available_credit",
        CASE 
          WHEN sc.used_credit = COALESCE(SUM(so.total_amount), 0) THEN '✅ CORRECT'
          ELSE '❌ MISMATCH'
        END as "status"
      FROM sales_customers sc
      LEFT JOIN sales_orders so ON sc.id = so.customer_id 
        AND so.status NOT IN ('cancelled', 'closed')
      WHERE sc.credit_limit IS NOT NULL AND sc.credit_limit > 0
      GROUP BY sc.id, sc.customer_number, sc.customer_name, sc.credit_limit, sc.used_credit, sc.available_credit
      ORDER BY sc.customer_number
      LIMIT 10;
    `);

        console.table(creditCalc.rows);

        // 6. Summary
        console.log('\n📝 INVESTIGATION SUMMARY');
        console.log('='.repeat(60));

        const mismatch = creditCalc.rows.filter(row => row.status === '❌ MISMATCH');
        if (mismatch.length > 0) {
            console.log(`\n❌ FOUND ${mismatch.length} CUSTOMERS WITH CREDIT MISMATCH:`);
            mismatch.forEach(row => {
                console.log(`\n  Customer: ${row.customer_name} (${row.customer_number})`);
                console.log(`    Credit Limit: ${row.credit_limit}`);
                console.log(`    Current Used Credit: ${row.current_used_credit}`);
                console.log(`    Actual Order Total: ${row.total_order_amount}`);
                console.log(`    Difference: ${parseFloat(row.current_used_credit) - parseFloat(row.total_order_amount)}`);
            });

            console.log(`\n⚠️  ISSUE: used_credit field is NOT being updated when orders are created!`);
        } else {
            console.log('\n✅ All customer credit amounts match their order totals');
        }

    } catch (error) {
        console.error('❌ Error during investigation:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

investigateCreditLimit()
    .then(() => {
        console.log('\n✅ Investigation completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Investigation failed:', error);
        process.exit(1);
    });
