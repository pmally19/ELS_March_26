import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('🔍 DIAGNOSING WHY PAYMENTS DON\'T SAVE\n');
console.log('='.repeat(80));

async function diagnose() {
    try {
        // Check 1: Verify all our fixes were applied
        console.log('\n1. Checking if constraints were relaxed...\n');

        const checks = [
            { table: 'customer_payments', column: 'company_code_id' },
            { table: 'billing_documents', column: 'company_code_id' },
            { table: 'ar_open_items', column: 'gl_account_id' }
        ];

        for (const check of checks) {
            const result = await pool.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [check.table, check.column]);

            if (result.rows.length > 0) {
                const nullable = result.rows[0].is_nullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL';
                console.log(`  ${check.table}.${check.column}: ${nullable}`);
            } else {
                console.log(`  ${check.table}.${check.column}: ⚠️  Column not found`);
            }
        }

        // Check 2: Verify company code 1 exists
        console.log('\n2. Checking company code ID 1...\n');
        const cc = await pool.query('SELECT id, code, name FROM company_codes WHERE id = 1');
        if (cc.rows.length > 0) {
            console.log(`  ✅ Company code 1 exists: ${cc.rows[0].code} - ${cc.rows[0].name}`);
        } else {
            console.log('  ❌ Company code 1 NOT FOUND!');
        }

        // Check 3: Check customer 66
        console.log('\n3. Checking customer 66...\n');
        const cust = await pool.query(`
      SELECT id, name, company_code_id, currency 
      FROM erp_customers 
      WHERE id = 66
    `);

        if (cust.rows.length > 0) {
            const c = cust.rows[0];
            console.log(`  Customer: ${c.name}`);
            console.log(`  Company Code ID: ${c.company_code_id || 'NULL'}`);
            console.log(`  Currency: ${c.currency || 'NULL'}`);

            // Check if customer's company code exists
            if (c.company_code_id) {
                const ccCheck = await pool.query(
                    'SELECT id FROM company_codes WHERE id = $1',
                    [c.company_code_id]
                );
                if (ccCheck.rows.length > 0) {
                    console.log(`  ✅ Customer's company code (${c.company_code_id}) exists`);
                } else {
                    console.log(`  ❌ Customer's company code (${c.company_code_id}) does NOT exist!`);
                    console.log('     THIS WILL CAUSE FK CONSTRAINT ERROR!');
                }
            }
        }

        // Check 4: Try manual insert with minimal data
        console.log('\n4. Testing manual payment insert...\n');

        try {
            const testInsert = await pool.query(`
        INSERT INTO customer_payments (
          payment_number, customer_id, payment_date, payment_amount, 
          payment_method, posting_status, currency
        ) VALUES (
          'TEST-MANUAL-001', 66, CURRENT_DATE, 100.00,
          'CASH', 'POSTED', 'USD'
        ) RETURNING id, payment_number
      `);

            console.log('  ✅ Manual insert SUCCEEDED!');
            console.log(`     ID: ${testInsert.rows[0].id}, Number: ${testInsert.rows[0].payment_number}`);

            // Clean up test payment
            await pool.query('DELETE FROM customer_payments WHERE payment_number = \'TEST-MANUAL-001\'');
            console.log('     (Test payment cleaned up)');

        } catch (insertError) {
            console.log('  ❌ Manual insert FAILED!');
            console.log(`     Error: ${insertError.message}`);
            console.log(`     Detail: ${insertError.detail || 'N/A'}`);

            if (insertError.code === '23503') {
                console.log('\n     🔍 FK CONSTRAINT VIOLATION DETECTED!');
                console.log(`        Constraint: ${insertError.constraint}`);
                console.log(`        This is why payments don\'t save!`);
            }
        }

        // Check 5: Check for any required NOT NULL columns
        console.log('\n5. Checking required columns in customer_payments...\n');

        const requiredCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customer_payments' 
      AND is_nullable = 'NO'
      AND column_default IS NULL
      ORDER BY ordinal_position
    `);

        if (requiredCols.rows.length > 0) {
            console.log('  Required columns (NOT NULL with no default):');
            requiredCols.rows.forEach(col => {
                console.log(`    - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('  ✅ All NOT NULL columns have defaults');
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n📋 DIAGNOSIS COMPLETE\n');

    } catch (error) {
        console.error('❌ Diagnosis error:', error.message);
    } finally {
        await pool.end();
    }
}

diagnose();
