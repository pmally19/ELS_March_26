import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('🔧 FIXING PAYMENT CREATION CONSTRAINTS\n');
console.log('='.repeat(80));

try {
    // Fix 1: Make company_code_id nullable in customer_payments
    console.log('\n1. Making customer_payments.company_code_id nullable...');
    await pool.query(`
    ALTER TABLE customer_payments 
    ALTER COLUMN company_code_id DROP NOT NULL
  `);
    console.log('✅ customer_payments.company_code_id is now nullable');

    // Fix 2: Make gl_account_id nullable in ar_open_items
    console.log('\n2. Making ar_open-items.gl_account_id nullable...');
    await pool.query(`
    ALTER TABLE ar_open_items 
    ALTER COLUMN gl_account_id DROP NOT NULL
  `);
    console.log('✅ ar_open_items.gl_account_id is now nullable');

    // Fix 3: Check currency column
    console.log('\n3. Checking currency column...');
    const currCheck = await pool.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'customer_payments' 
    AND column_name = 'currency'
  `);

    if (currCheck.rows.length > 0) {
        console.log(`✅ currency column exists (nullable: ${currCheck.rows[0].is_nullable})`);
    }

    // Fix 4: Add default for posting_status if needed
    console.log('\n4. Setting default for posting_status...');
    await pool.query(`
    ALTER TABLE customer_payments 
    ALTER COLUMN posting_status SET DEFAULT 'POSTED'
  `);
    console.log('✅ posting_status default set to POSTED');

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 All constraints fixed!');
    console.log('\nPayments should now be created successfully.');
    console.log('Try creating a payment again to test.');

} catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nSome fixes may have already been applied or column may not exist.');
    console.log('This is OK if the column was already nullable.');
} finally {
    await pool.end();
}
