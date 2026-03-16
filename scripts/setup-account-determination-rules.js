import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

try {
  console.log('Setting up account determination rules...\n');

  // Get default GL accounts
  const expenseAccountResult = await pool.query(`
    SELECT id, account_number, account_name 
    FROM gl_accounts 
    WHERE account_type = 'EXPENSES'
      AND (account_name ILIKE '%depreciation%' OR account_name ILIKE '%amortization%')
      AND is_active = true 
    ORDER BY account_number
    LIMIT 1
  `);

  const accumulatedAccountResult = await pool.query(`
    SELECT id, account_number, account_name 
    FROM gl_accounts 
    WHERE account_type = 'ASSETS'
      AND (account_name ILIKE '%accumulated%depreciation%' OR account_name ILIKE '%depreciation%accumulated%')
      AND is_active = true 
    ORDER BY account_number
    LIMIT 1
  `);

  const assetAccountResult = await pool.query(`
    SELECT id, account_number, account_name 
    FROM gl_accounts 
    WHERE account_type = 'ASSETS'
      AND (account_name ILIKE '%fixed%asset%' OR account_name ILIKE '%property%plant%equipment%' OR account_name ILIKE '%ppe%')
      AND is_active = true 
    ORDER BY account_number
    LIMIT 1
  `);

  if (expenseAccountResult.rows.length === 0) {
    console.log('❌ No depreciation expense account found. Please create one in GL accounts.');
    process.exit(1);
  }

  if (accumulatedAccountResult.rows.length === 0) {
    console.log('❌ No accumulated depreciation account found. Please create one in GL accounts.');
    process.exit(1);
  }

  const expenseAccountId = expenseAccountResult.rows[0].id;
  const accumulatedAccountId = accumulatedAccountResult.rows[0].id;
  const assetAccountId = assetAccountResult.rows[0]?.id || null;

  console.log(`Using Depreciation Expense Account: ${expenseAccountResult.rows[0].account_number} - ${expenseAccountResult.rows[0].account_name} (ID: ${expenseAccountId})`);
  console.log(`Using Accumulated Depreciation Account: ${accumulatedAccountResult.rows[0].account_number} - ${accumulatedAccountResult.rows[0].account_name} (ID: ${accumulatedAccountId})`);
  if (assetAccountId) {
    console.log(`Using Fixed Asset Account: ${assetAccountResult.rows[0].account_number} - ${assetAccountResult.rows[0].account_name} (ID: ${assetAccountId})`);
  }
  console.log('');

  // Get all active asset classes
  const assetClassesResult = await pool.query(`
    SELECT id, code, name 
    FROM asset_classes 
    WHERE is_active = true 
    ORDER BY code
  `);

  if (assetClassesResult.rows.length === 0) {
    console.log('❌ No active asset classes found. Please create asset classes first.');
    process.exit(1);
  }

  console.log(`Found ${assetClassesResult.rows.length} active asset classes\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Create/update rules for each asset class
  for (const assetClass of assetClassesResult.rows) {
    // Check if rule already exists
    const existingRule = await pool.query(`
      SELECT id 
      FROM asset_account_determination 
      WHERE asset_class_id = $1 
        AND transaction_type = 'DEPRECIATION'
        AND company_code_id IS NULL
    `, [assetClass.id]);

    if (existingRule.rows.length > 0) {
      // Update existing rule
      await pool.query(`
        UPDATE asset_account_determination 
        SET 
          gl_depreciation_expense_account_id = $1,
          gl_accumulated_depreciation_account_id = $2,
          gl_asset_account_id = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [expenseAccountId, accumulatedAccountId, assetAccountId, existingRule.rows[0].id]);
      
      updated++;
      console.log(`  ✓ Updated rule for ${assetClass.code} - ${assetClass.name}`);
    } else {
      // Create new rule
      await pool.query(`
        INSERT INTO asset_account_determination (
          asset_class_id,
          transaction_type,
          gl_depreciation_expense_account_id,
          gl_accumulated_depreciation_account_id,
          gl_asset_account_id,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, 'DEPRECIATION', $2, $3, $4, true, NOW(), NOW())
      `, [assetClass.id, expenseAccountId, accumulatedAccountId, assetAccountId]);
      
      created++;
      console.log(`  ✓ Created rule for ${assetClass.code} - ${assetClass.name}`);
    }

    // Also create/update CAPITALIZATION rule
    const existingCapRule = await pool.query(`
      SELECT id 
      FROM asset_account_determination 
      WHERE asset_class_id = $1 
        AND transaction_type = 'CAPITALIZATION'
        AND company_code_id IS NULL
    `, [assetClass.id]);

    if (existingCapRule.rows.length > 0) {
      await pool.query(`
        UPDATE asset_account_determination 
        SET 
          gl_asset_account_id = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [assetAccountId, existingCapRule.rows[0].id]);
    } else {
      await pool.query(`
        INSERT INTO asset_account_determination (
          asset_class_id,
          transaction_type,
          gl_asset_account_id,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, 'CAPITALIZATION', $2, true, NOW(), NOW())
      `, [assetClass.id, assetAccountId]);
    }
  }

  console.log(`\n✅ Setup complete:`);
  console.log(`   Created: ${created} rules`);
  console.log(`   Updated: ${updated} rules`);
  console.log(`   Total asset classes processed: ${assetClassesResult.rows.length}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}

