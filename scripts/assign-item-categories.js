import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mallyerp',
  password: 'Mokshith@21',
  port: 5432,
});

async function assignItemCategories() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Assigning Item Categories to GL Accounts\n');
    console.log('='.repeat(60));

    // 1. Get or create EXPENSE item category
    console.log('\n1. Checking EXPENSE Item Category...');
    let expenseCategoryId = null;
    const expenseCatResult = await client.query(`
      SELECT id FROM document_splitting_item_categories 
      WHERE code = 'EXPENSE' AND is_active = true
      LIMIT 1
    `);
    
    if (expenseCatResult.rows.length > 0) {
      expenseCategoryId = expenseCatResult.rows[0].id;
      console.log(`   ✅ Found EXPENSE category (ID: ${expenseCategoryId})`);
    } else {
      console.log('   ❌ EXPENSE category not found');
      await client.query('ROLLBACK');
      return;
    }

    // 2. Get or create VENDOR item category
    console.log('\n2. Checking VENDOR Item Category...');
    let vendorCategoryId = null;
    const vendorCatResult = await client.query(`
      SELECT id FROM document_splitting_item_categories 
      WHERE (code = 'VENDOR' OR code = 'vendor') AND is_active = true
      ORDER BY code
      LIMIT 1
    `);
    
    if (vendorCatResult.rows.length > 0) {
      vendorCategoryId = vendorCatResult.rows[0].id;
      console.log(`   ✅ Found VENDOR category (ID: ${vendorCategoryId})`);
    } else {
      console.log('   ❌ VENDOR category not found');
      await client.query('ROLLBACK');
      return;
    }

    // 3. Assign EXPENSE category to expense accounts
    console.log('\n3. Assigning EXPENSE category to expense accounts...');
    const expenseAccounts = await client.query(`
      SELECT id, account_number, account_name 
      FROM gl_accounts 
      WHERE account_number = '6000' 
        OR (account_type IN ('EXPENSE', 'EXPENSES') AND account_number LIKE '6%')
      LIMIT 10
    `);
    
    for (const account of expenseAccounts.rows) {
      // Check if already assigned
      const existing = await client.query(`
        SELECT id FROM document_splitting_gl_account_categories
        WHERE gl_account_id = $1 AND item_category_id = $2 AND is_active = true
      `, [account.id, expenseCategoryId]);
      
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO document_splitting_gl_account_categories (
            gl_account_id, gl_account_number, item_category_id, valid_from, is_active
          ) VALUES ($1, $2, $3, CURRENT_DATE, true)
        `, [account.id, account.account_number, expenseCategoryId]);
        console.log(`   ✅ Assigned EXPENSE to ${account.account_number} - ${account.account_name}`);
      } else {
        console.log(`   ⏭️  ${account.account_number} already has EXPENSE category`);
      }
    }

    // 4. Assign VENDOR category to AP accounts
    console.log('\n4. Assigning VENDOR category to AP accounts...');
    const apAccounts = await client.query(`
      SELECT id, account_number, account_name 
      FROM gl_accounts 
      WHERE account_number = '2100' 
        OR (account_type = 'LIABILITIES' AND (
          account_number LIKE '21%' 
          OR account_group ILIKE '%PAYABLE%'
          OR account_group ILIKE '%VENDOR%'
        ))
      LIMIT 10
    `);
    
    for (const account of apAccounts.rows) {
      // Check if already assigned
      const existing = await client.query(`
        SELECT id FROM document_splitting_gl_account_categories
        WHERE gl_account_id = $1 AND item_category_id = $2 AND is_active = true
      `, [account.id, vendorCategoryId]);
      
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO document_splitting_gl_account_categories (
            gl_account_id, gl_account_number, item_category_id, valid_from, is_active
          ) VALUES ($1, $2, $3, CURRENT_DATE, true)
        `, [account.id, account.account_number, vendorCategoryId]);
        console.log(`   ✅ Assigned VENDOR to ${account.account_number} - ${account.account_name}`);
      } else {
        console.log(`   ⏭️  ${account.account_number} already has VENDOR category`);
      }
    }

    await client.query('COMMIT');
    console.log('\n' + '='.repeat(60));
    console.log('✅ Item Categories Assigned Successfully!');
    console.log('\n💡 Next step: Test document splitting again');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

assignItemCategories()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Assignment failed:', error);
    process.exit(1);
  });

