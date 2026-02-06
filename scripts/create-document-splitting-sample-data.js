import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mallyerp',
  password: 'Mokshith@21',
  port: 5432,
});

async function checkAndCreateSampleData() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking existing data...\n');

    // 1. Check Ledgers
    console.log('1. Checking Ledgers...');
    let ledgerResult = await client.query('SELECT id, code, name, document_splitting_active FROM ledgers LIMIT 5');
    console.log(`   Found ${ledgerResult.rows.length} ledgers`);
    if (ledgerResult.rows.length === 0) {
      console.log('   ⚠️  No ledgers found. Creating sample ledger...');
      const ledgerInsert = await client.query(`
        INSERT INTO ledgers (code, name, description, document_splitting_active, is_active, created_at, updated_at)
        VALUES ('L01', 'Main Ledger', 'Primary accounting ledger', true, true, NOW(), NOW())
        RETURNING id, code, name
      `);
      console.log(`   ✅ Created ledger: ${ledgerInsert.rows[0].code} - ${ledgerInsert.rows[0].name} (ID: ${ledgerInsert.rows[0].id})`);
      ledgerResult = ledgerInsert;
    } else {
      ledgerResult.rows.forEach(l => {
        console.log(`   - ${l.code}: ${l.name} (DS: ${l.document_splitting_active || false})`);
      });
    }
    const ledgerId = ledgerResult.rows[0].id;
    const ledgerCode = ledgerResult.rows[0].code;

    // Enable document splitting on ledger
    await client.query(`
      UPDATE ledgers SET document_splitting_active = true WHERE id = $1
    `, [ledgerId]);
    console.log(`   ✅ Enabled document splitting on ledger ${ledgerCode}\n`);

    // 2. Check Company Codes
    console.log('2. Checking Company Codes...');
    let companyCodeResult = await client.query('SELECT id, code, name FROM company_codes LIMIT 5');
    console.log(`   Found ${companyCodeResult.rows.length} company codes`);
    if (companyCodeResult.rows.length === 0) {
      console.log('   ⚠️  No company codes found. Creating sample company code...');
      const ccInsert = await client.query(`
        INSERT INTO company_codes (code, name, description, currency, is_active, created_at, updated_at)
        VALUES ('1000', 'Test Company', 'Test Company for Document Splitting', 'USD', true, NOW(), NOW())
        RETURNING id, code, name
      `);
      console.log(`   ✅ Created company code: ${ccInsert.rows[0].code} - ${ccInsert.rows[0].name} (ID: ${ccInsert.rows[0].id})`);
      companyCodeResult = ccInsert;
    } else {
      companyCodeResult.rows.forEach(cc => {
        console.log(`   - ${cc.code}: ${cc.name}`);
      });
    }
    const companyCodeId = companyCodeResult.rows[0].id;
    const companyCode = companyCodeResult.rows[0].code;

    // 3. Check Vendors
    console.log('\n3. Checking Vendors...');
    let vendorResult = await client.query('SELECT id, code, name FROM vendors LIMIT 5');
    console.log(`   Found ${vendorResult.rows.length} vendors`);
    if (vendorResult.rows.length === 0) {
      console.log('   ⚠️  No vendors found. Creating sample vendor...');
      const vendorInsert = await client.query(`
        INSERT INTO vendors (code, name, company_code_id, currency, is_active, created_at, updated_at)
        VALUES ('V001', 'Test Vendor', $1, 'USD', true, NOW(), NOW())
        RETURNING id, code, name
      `, [companyCodeId]);
      console.log(`   ✅ Created vendor: ${vendorInsert.rows[0].code} - ${vendorInsert.rows[0].name} (ID: ${vendorInsert.rows[0].id})`);
      vendorResult = vendorInsert;
    } else {
      vendorResult.rows.forEach(v => {
        console.log(`   - ${v.code}: ${v.name}`);
      });
    }
    const vendorId = vendorResult.rows[0].id;

    // 4. Check GL Accounts
    console.log('\n4. Checking GL Accounts...');
    // Try to find proper AP and Expense accounts
    let apAccount = await client.query(`
      SELECT id, account_number, account_name FROM gl_accounts 
      WHERE (account_number = '200000' OR account_number LIKE '2%') 
      AND (account_type = 'LIABILITY' OR account_name ILIKE '%payable%' OR account_name ILIKE '%ap%')
      ORDER BY account_number LIMIT 1
    `);
    if (apAccount.rows.length === 0) {
      // Try without type filter
      apAccount = await client.query(`
        SELECT id, account_number, account_name FROM gl_accounts 
        WHERE account_number = '200000' OR account_number LIKE '200%'
        ORDER BY account_number LIMIT 1
      `);
    }
    if (apAccount.rows.length === 0) {
      console.log('   ⚠️  No AP account found. Creating 200000 - Accounts Payable...');
      const apInsert = await client.query(`
        INSERT INTO gl_accounts (account_number, account_name, account_type, is_active, created_at, updated_at)
        VALUES ('200000', 'Accounts Payable', 'LIABILITY', true, NOW(), NOW())
        RETURNING id, account_number, account_name
      `);
      apAccount = apInsert;
      console.log(`   ✅ Created AP account: ${apInsert.rows[0].account_number} - ${apInsert.rows[0].account_name}`);
    } else {
      console.log(`   ✅ Found AP account: ${apAccount.rows[0].account_number} - ${apAccount.rows[0].account_name}`);
    }
    const apAccountId = apAccount.rows[0].id;
    const apAccountNumber = apAccount.rows[0].account_number;

    let expenseAccount = await client.query(`
      SELECT id, account_number, account_name FROM gl_accounts 
      WHERE (account_number = '400000' OR account_number LIKE '4%')
      AND (account_type = 'EXPENSE' OR account_name ILIKE '%expense%' OR account_name ILIKE '%cost%')
      ORDER BY account_number LIMIT 1
    `);
    if (expenseAccount.rows.length === 0) {
      // Try without type filter
      expenseAccount = await client.query(`
        SELECT id, account_number, account_name FROM gl_accounts 
        WHERE account_number = '400000' OR account_number LIKE '400%'
        ORDER BY account_number LIMIT 1
      `);
    }
    if (expenseAccount.rows.length === 0) {
      console.log('   ⚠️  No expense account found. Creating 400000 - Office Supplies Expense...');
      const expInsert = await client.query(`
        INSERT INTO gl_accounts (account_number, account_name, account_type, is_active, created_at, updated_at)
        VALUES ('400000', 'Office Supplies Expense', 'EXPENSE', true, NOW(), NOW())
        RETURNING id, account_number, account_name
      `);
      expenseAccount = expInsert;
      console.log(`   ✅ Created expense account: ${expInsert.rows[0].account_number} - ${expInsert.rows[0].account_name}`);
    } else {
      console.log(`   ✅ Found expense account: ${expenseAccount.rows[0].account_number} - ${expenseAccount.rows[0].account_name}`);
    }
    const expenseAccountId = expenseAccount.rows[0].id;
    const expenseAccountNumber = expenseAccount.rows[0].account_number;

    // 5. Check Profit Centers
    console.log('\n5. Checking Profit Centers...');
    // Use profit_center and description columns (actual table structure)
    let pc1 = await client.query(`SELECT id, profit_center, description FROM profit_centers WHERE profit_center = 'PC001'`);
    if (pc1.rows.length === 0) {
      console.log('   ⚠️  PC001 not found. Creating...');
      try {
        // Reset sequence if needed
        await client.query(`SELECT setval('profit_centers_id_seq', (SELECT MAX(id) FROM profit_centers))`);
        const pc1Insert = await client.query(`
          INSERT INTO profit_centers (profit_center, description, company_code, company_code_id, controlling_area, valid_from, active, created_at, updated_at)
          VALUES ('PC001', 'Profit Center 001', $1, $2, 'A000', CURRENT_DATE, true, NOW(), NOW())
          RETURNING id, profit_center, description
        `, [companyCode, companyCodeId]);
        pc1 = pc1Insert;
        console.log(`   ✅ Created: ${pc1Insert.rows[0].profit_center} - ${pc1Insert.rows[0].description}`);
      } catch (e) {
        if (e.code === '23505') {
          // Already exists, fetch it
          pc1 = await client.query(`SELECT id, profit_center, description FROM profit_centers WHERE profit_center = 'PC001'`);
          console.log(`   ✅ Found existing: ${pc1.rows[0].profit_center} - ${pc1.rows[0].description}`);
        } else {
          throw e;
        }
      }
    } else {
      console.log(`   ✅ Found: ${pc1.rows[0].profit_center} - ${pc1.rows[0].description}`);
    }

    let pc2 = await client.query(`SELECT id, profit_center, description FROM profit_centers WHERE profit_center = 'PC002'`);
    if (pc2.rows.length === 0) {
      console.log('   ⚠️  PC002 not found. Creating...');
      try {
        await client.query(`SELECT setval('profit_centers_id_seq', (SELECT MAX(id) FROM profit_centers))`);
        const pc2Insert = await client.query(`
          INSERT INTO profit_centers (profit_center, description, company_code, company_code_id, controlling_area, valid_from, active, created_at, updated_at)
          VALUES ('PC002', 'Profit Center 002', $1, $2, 'A000', CURRENT_DATE, true, NOW(), NOW())
          RETURNING id, profit_center, description
        `, [companyCode, companyCodeId]);
        pc2 = pc2Insert;
        console.log(`   ✅ Created: ${pc2Insert.rows[0].profit_center} - ${pc2Insert.rows[0].description}`);
      } catch (e) {
        if (e.code === '23505') {
          pc2 = await client.query(`SELECT id, profit_center, description FROM profit_centers WHERE profit_center = 'PC002'`);
          console.log(`   ✅ Found existing: ${pc2.rows[0].profit_center} - ${pc2.rows[0].description}`);
        } else {
          throw e;
        }
      }
    } else {
      console.log(`   ✅ Found: ${pc2.rows[0].profit_center} - ${pc2.rows[0].description}`);
    }

    // 6. Check Document Splitting Characteristic
    console.log('\n6. Checking Document Splitting Characteristics...');
    let characteristic = await client.query(`
      SELECT id, code, name FROM document_splitting_characteristics WHERE code = 'PROFIT_CENTER'
    `);
    if (characteristic.rows.length === 0) {
      console.log('   ⚠️  PROFIT_CENTER characteristic not found. Creating...');
      const charInsert = await client.query(`
        INSERT INTO document_splitting_characteristics 
        (code, name, description, characteristic_type, field_name, requires_zero_balance, is_mandatory, is_active, created_at, updated_at)
        VALUES ('PROFIT_CENTER', 'Profit Center', 'Profit center for segment reporting', 'PROFIT_CENTER', 'profit_center', false, false, true, NOW(), NOW())
        RETURNING id, code, name
      `);
      characteristic = charInsert;
      console.log(`   ✅ Created: ${charInsert.rows[0].code} - ${charInsert.rows[0].name}`);
    } else {
      console.log(`   ✅ Found: ${characteristic.rows[0].code} - ${characteristic.rows[0].name}`);
    }
    const characteristicId = characteristic.rows[0].id;

    // 7. Check Item Categories
    console.log('\n7. Checking Item Categories...');
    let vendorCategory = await client.query(`
      SELECT id, code, name FROM document_splitting_item_categories WHERE code = 'VENDOR'
    `);
    if (vendorCategory.rows.length === 0) {
      console.log('   ⚠️  VENDOR category not found. Creating...');
      const vCatInsert = await client.query(`
        INSERT INTO document_splitting_item_categories 
        (code, name, description, category_type, is_active, created_at, updated_at)
        VALUES ('VENDOR', 'Vendor Account', 'Accounts payable and vendor-related accounts', 'VENDOR', true, NOW(), NOW())
        RETURNING id, code, name
      `);
      vendorCategory = vCatInsert;
      console.log(`   ✅ Created: ${vCatInsert.rows[0].code} - ${vCatInsert.rows[0].name} (ID: ${vCatInsert.rows[0].id})`);
    } else {
      console.log(`   ✅ Found: ${vendorCategory.rows[0].code} - ${vendorCategory.rows[0].name} (ID: ${vendorCategory.rows[0].id})`);
    }
    const vendorCategoryId = vendorCategory.rows[0].id;

    let expenseCategory = await client.query(`
      SELECT id, code, name FROM document_splitting_item_categories WHERE code = 'EXPENSE'
    `);
    if (expenseCategory.rows.length === 0) {
      console.log('   ⚠️  EXPENSE category not found. Creating...');
      const eCatInsert = await client.query(`
        INSERT INTO document_splitting_item_categories 
        (code, name, description, category_type, is_active, created_at, updated_at)
        VALUES ('EXPENSE', 'Expense Account', 'Expense and cost accounts', 'EXPENSE', true, NOW(), NOW())
        RETURNING id, code, name
      `);
      expenseCategory = eCatInsert;
      console.log(`   ✅ Created: ${eCatInsert.rows[0].code} - ${eCatInsert.rows[0].name} (ID: ${eCatInsert.rows[0].id})`);
    } else {
      console.log(`   ✅ Found: ${expenseCategory.rows[0].code} - ${expenseCategory.rows[0].name} (ID: ${expenseCategory.rows[0].id})`);
    }
    const expenseCategoryId = expenseCategory.rows[0].id;

    // 8. Assign Item Categories to GL Accounts
    console.log('\n8. Assigning Item Categories to GL Accounts...');
    let apCategoryAssign = await client.query(`
      SELECT id FROM document_splitting_gl_account_categories 
      WHERE gl_account_id = $1 AND item_category_id = $2
    `, [apAccountId, vendorCategoryId]);
    if (apCategoryAssign.rows.length === 0) {
      await client.query(`
        INSERT INTO document_splitting_gl_account_categories 
        (gl_account_id, gl_account_number, item_category_id, valid_from, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_DATE, true, NOW(), NOW())
      `, [apAccountId, apAccountNumber, vendorCategoryId]);
      console.log(`   ✅ Assigned VENDOR category to AP account ${apAccountNumber}`);
    } else {
      console.log(`   ✅ AP account ${apAccountNumber} already has VENDOR category`);
    }

    let expenseCategoryAssign = await client.query(`
      SELECT id FROM document_splitting_gl_account_categories 
      WHERE gl_account_id = $1 AND item_category_id = $2
    `, [expenseAccountId, expenseCategoryId]);
    if (expenseCategoryAssign.rows.length === 0) {
      await client.query(`
        INSERT INTO document_splitting_gl_account_categories 
        (gl_account_id, gl_account_number, item_category_id, valid_from, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_DATE, true, NOW(), NOW())
      `, [expenseAccountId, expenseAccountNumber, expenseCategoryId]);
      console.log(`   ✅ Assigned EXPENSE category to expense account ${expenseAccountNumber}`);
    } else {
      console.log(`   ✅ Expense account ${expenseAccountNumber} already has EXPENSE category`);
    }

    // 9. Check Business Transaction
    console.log('\n9. Checking Business Transactions...');
    let businessTransaction = await client.query(`
      SELECT id, code, name FROM document_splitting_business_transactions WHERE code = 'VENDOR_INV'
    `);
    if (businessTransaction.rows.length === 0) {
      console.log('   ⚠️  VENDOR_INV transaction not found. Creating...');
      const btInsert = await client.query(`
        INSERT INTO document_splitting_business_transactions 
        (code, name, description, transaction_type, is_active, created_at, updated_at)
        VALUES ('VENDOR_INV', 'Vendor Invoice', 'Vendor invoice posting', 'VENDOR_INVOICE', true, NOW(), NOW())
        RETURNING id, code, name
      `);
      businessTransaction = btInsert;
      console.log(`   ✅ Created: ${btInsert.rows[0].code} - ${btInsert.rows[0].name} (ID: ${btInsert.rows[0].id})`);
    } else {
      console.log(`   ✅ Found: ${businessTransaction.rows[0].code} - ${businessTransaction.rows[0].name} (ID: ${businessTransaction.rows[0].id})`);
    }
    const businessTransactionId = businessTransaction.rows[0].id;

    // 10. Check Splitting Method
    console.log('\n10. Checking Splitting Methods...');
    let splittingMethod = await client.query(`
      SELECT id, code, name FROM document_splitting_methods WHERE code = 'ACTIVE'
    `);
    if (splittingMethod.rows.length === 0) {
      console.log('   ⚠️  ACTIVE method not found. Creating...');
      const smInsert = await client.query(`
        INSERT INTO document_splitting_methods 
        (code, name, method_type, description, is_active, created_at, updated_at)
        VALUES ('ACTIVE', 'Active Splitting', 'ACTIVE', 'Split documents based on characteristics', true, NOW(), NOW())
        RETURNING id, code, name
      `);
      splittingMethod = smInsert;
      console.log(`   ✅ Created: ${smInsert.rows[0].code} - ${smInsert.rows[0].name} (ID: ${smInsert.rows[0].id})`);
    } else {
      console.log(`   ✅ Found: ${splittingMethod.rows[0].code} - ${splittingMethod.rows[0].name} (ID: ${splittingMethod.rows[0].id})`);
    }
    const splittingMethodId = splittingMethod.rows[0].id;

    // 11. Check Document Type Mapping
    console.log('\n11. Checking Document Type Mappings...');
    let docTypeMapping = await client.query(`
      SELECT id, document_type, business_transaction_id FROM document_splitting_document_type_mapping 
      WHERE document_type = 'KR'
    `);
    if (docTypeMapping.rows.length === 0) {
      console.log('   ⚠️  KR mapping not found. Creating...');
      const dtmInsert = await client.query(`
        INSERT INTO document_splitting_document_type_mapping 
        (document_type, business_transaction_id, company_code_id, is_active, created_at, updated_at)
        VALUES ('KR', $1, $2, true, NOW(), NOW())
        RETURNING id, document_type
      `, [businessTransactionId, companyCodeId]);
      docTypeMapping = dtmInsert;
      console.log(`   ✅ Created mapping: ${dtmInsert.rows[0].document_type} → VENDOR_INV`);
    } else {
      console.log(`   ✅ Found mapping: ${docTypeMapping.rows[0].document_type} → VENDOR_INV`);
    }

    // 12. Check Splitting Rule
    console.log('\n12. Checking Splitting Rules...');
    let splittingRule = await client.query(`
      SELECT id, rule_name FROM document_splitting_rules 
      WHERE business_transaction_id = $1 AND source_item_category_id = $2
    `, [businessTransactionId, vendorCategoryId]);
    if (splittingRule.rows.length === 0) {
      console.log('   ⚠️  Splitting rule not found. Creating...');
      const srInsert = await client.query(`
        INSERT INTO document_splitting_rules 
        (business_transaction_id, business_transaction_variant_id, splitting_method_id, rule_name, description, 
         source_item_category_id, target_item_category_id, priority, is_active, created_at, updated_at)
        VALUES ($1, NULL, $2, 'Split Vendor Balance by Profit Center', 
                'Split vendor account balance based on profit center assignment', 
                $3, NULL, 10, true, NOW(), NOW())
        RETURNING id, rule_name
      `, [businessTransactionId, splittingMethodId, vendorCategoryId]);
      splittingRule = srInsert;
      console.log(`   ✅ Created rule: ${srInsert.rows[0].rule_name} (ID: ${srInsert.rows[0].id})`);
    } else {
      console.log(`   ✅ Found rule: ${splittingRule.rows[0].rule_name} (ID: ${splittingRule.rows[0].id})`);
    }

    // 13. Check Zero Balance Account
    console.log('\n13. Checking Zero Balance Accounts...');
    let zeroBalance = await client.query(`
      SELECT id FROM document_splitting_zero_balance_accounts 
      WHERE ledger_id = $1
    `, [ledgerId]);
    if (zeroBalance.rows.length === 0) {
      // Check if clearing account exists
      let clearingAccount = await client.query(`
        SELECT id, account_number FROM gl_accounts WHERE account_number = '999999'
      `);
      if (clearingAccount.rows.length === 0) {
        const clearingInsert = await client.query(`
          INSERT INTO gl_accounts (account_number, account_name, account_type, is_active, created_at, updated_at)
          VALUES ('999999', 'Zero Balance Clearing Account', 'ASSET', true, NOW(), NOW())
          RETURNING id, account_number
        `);
        clearingAccount = clearingInsert;
      }
      const clearingAccountId = clearingAccount.rows[0].id;
      
      await client.query(`
        INSERT INTO document_splitting_zero_balance_accounts 
        (ledger_id, company_code_id, gl_account_id, gl_account_number, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, '999999', 'Zero balance clearing account', true, NOW(), NOW())
      `, [ledgerId, companyCodeId, clearingAccountId]);
      console.log(`   ✅ Created zero balance account: 999999 (GL Account ID: ${clearingAccountId})`);
    } else {
      console.log(`   ✅ Zero balance account already configured`);
    }

    // 14. Check Activation
    console.log('\n14. Checking Activation Settings...');
    let activation = await client.query(`
      SELECT id FROM document_splitting_activation 
      WHERE ledger_id = $1 AND company_code_id = $2
    `, [ledgerId, companyCodeId]);
    if (activation.rows.length === 0) {
      await client.query(`
        INSERT INTO document_splitting_activation 
        (ledger_id, company_code_id, splitting_method_id, is_active, enable_inheritance, enable_standard_assignment, created_at, updated_at)
        VALUES ($1, $2, $3, true, true, true, NOW(), NOW())
      `, [ledgerId, companyCodeId, splittingMethodId]);
      console.log(`   ✅ Created activation settings`);
    } else {
      // Update to ensure it's active
      await client.query(`
        UPDATE document_splitting_activation 
        SET is_active = true, enable_inheritance = true, enable_standard_assignment = true
        WHERE ledger_id = $1 AND company_code_id = $2
      `, [ledgerId, companyCodeId]);
      console.log(`   ✅ Activation settings already exist and are active`);
    }

    console.log('\n✅ Sample data creation complete!');
    console.log('\n📋 Summary:');
    console.log(`   Ledger: ${ledgerCode} (ID: ${ledgerId}) - Document Splitting: ✅`);
    console.log(`   Company Code: ${companyCode} (ID: ${companyCodeId})`);
    console.log(`   Vendor: V001 (ID: ${vendorId})`);
    console.log(`   AP Account: ${apAccountNumber} (ID: ${apAccountId}) - Category: VENDOR`);
    console.log(`   Expense Account: ${expenseAccountNumber} (ID: ${expenseAccountId}) - Category: EXPENSE`);
    console.log(`   Profit Centers: PC001, PC002`);
    console.log(`   Characteristic: PROFIT_CENTER`);
    console.log(`   Item Categories: VENDOR, EXPENSE`);
    console.log(`   Business Transaction: VENDOR_INV`);
    console.log(`   Splitting Method: ACTIVE`);
    console.log(`   Document Type Mapping: KR → VENDOR_INV`);
    console.log(`   Splitting Rule: Split Vendor Balance by Profit Center`);
    console.log(`   Zero Balance Account: 999999`);
    console.log(`   Activation: ✅ Active`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndCreateSampleData()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

