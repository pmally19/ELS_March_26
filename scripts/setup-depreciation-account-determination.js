import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mallyerp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Mokshith@21",
});

async function setupAccountDetermination() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔧 Setting up Account Determination for Depreciation...\n");

    // 1. Check existing GL accounts for depreciation
    console.log("1. Checking available GL accounts for depreciation...");
    const expenseAccounts = await client.query(`
      SELECT id, account_number, account_name, account_type
      FROM gl_accounts
      WHERE (account_name ILIKE '%depreciation%expense%' 
         OR account_name ILIKE '%depreciation%'
         OR account_number ILIKE '%dep%exp%'
         OR account_type = 'EXPENSE')
        AND is_active = true
      ORDER BY account_number
      LIMIT 10
    `);

    const accumAccounts = await client.query(`
      SELECT id, account_number, account_name, account_type
      FROM gl_accounts
      WHERE (account_name ILIKE '%accumulated%depreciation%'
         OR account_name ILIKE '%acc%dep%'
         OR account_number ILIKE '%acc%dep%'
         OR account_type = 'ASSET')
        AND is_active = true
      ORDER BY account_number
      LIMIT 10
    `);

    console.log(`   Found ${expenseAccounts.rows.length} potential depreciation expense accounts:`);
    expenseAccounts.rows.forEach((acc) => {
      console.log(`   - ${acc.account_number}: ${acc.account_name} (Type: ${acc.account_type})`);
    });

    console.log(`\n   Found ${accumAccounts.rows.length} potential accumulated depreciation accounts:`);
    accumAccounts.rows.forEach((acc) => {
      console.log(`   - ${acc.account_number}: ${acc.account_name} (Type: ${acc.account_type})`);
    });

    // 2. Get asset classes
    console.log("\n2. Checking asset classes...");
    const assetClasses = await client.query(`
      SELECT id, code, name
      FROM asset_classes
      WHERE is_active = true
      ORDER BY code
    `);

    console.log(`   Found ${assetClasses.rows.length} asset classes:`);
    assetClasses.rows.forEach((ac) => {
      console.log(`   - ${ac.code}: ${ac.name}`);
    });

    // 3. Get company codes
    console.log("\n3. Checking company codes...");
    const companyCodes = await client.query(`
      SELECT id, code, name
      FROM company_codes
      WHERE active = true
      ORDER BY code
    `);

    console.log(`   Found ${companyCodes.rows.length} company codes:`);
    companyCodes.rows.forEach((cc) => {
      console.log(`   - ${cc.code}: ${cc.name}`);
    });

    // 4. Check existing account determination rules
    console.log("\n4. Checking existing account determination rules...");
    const existingRules = await client.query(`
      SELECT 
        aad.*,
        ac.code as asset_class_code,
        cc.code as company_code,
        ga.account_number, ga.account_name
      FROM asset_account_determination aad
      LEFT JOIN asset_classes ac ON aad.asset_class_id = ac.id
      LEFT JOIN company_codes cc ON aad.company_code_id = cc.id
      LEFT JOIN gl_accounts ga ON aad.gl_account_id = ga.id
      WHERE aad.transaction_type = 'DEPRECIATION'
      ORDER BY aad.asset_class_id, aad.company_code_id NULLS LAST
    `);

    console.log(`   Found ${existingRules.rows.length} existing rules:`);
    if (existingRules.rows.length > 0) {
      existingRules.rows.forEach((rule) => {
        console.log(`   - Asset Class: ${rule.asset_class_code || rule.asset_class_id}, ` +
                   `Company: ${rule.company_code || 'ALL'}, ` +
                   `Category: ${rule.account_category}, ` +
                   `Account: ${rule.account_number || 'NULL'}`);
      });
    } else {
      console.log("   ⚠️  No existing rules found!");
    }

    // 5. Create default rules if accounts are available
    if (expenseAccounts.rows.length > 0 && accumAccounts.rows.length > 0) {
      console.log("\n5. Creating default account determination rules...");
      
      // Use first expense account and first accum account as defaults
      const defaultExpenseAccount = expenseAccounts.rows[0];
      const defaultAccumAccount = accumAccounts.rows[0];

      let rulesCreated = 0;

      // Create rules for each asset class (general rules, no company code)
      for (const assetClass of assetClasses.rows) {
        // Check if expense account rule already exists
        const existingExpense = await client.query(`
          SELECT id FROM asset_account_determination
          WHERE asset_class_id = $1
            AND transaction_type = 'DEPRECIATION'
            AND account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
            AND company_code_id IS NULL
        `, [assetClass.id]);

        if (existingExpense.rows.length === 0) {
          await client.query(`
            INSERT INTO asset_account_determination (
              asset_class_id, transaction_type, account_category,
              gl_account_id, company_code_id, is_active, created_at, updated_at
            )
            VALUES ($1, 'DEPRECIATION', 'DEPRECIATION_EXPENSE_ACCOUNT', $2, NULL, true, NOW(), NOW())
          `, [assetClass.id, defaultExpenseAccount.id]);
          rulesCreated++;
          console.log(`   ✅ Created expense account rule for asset class ${assetClass.code}`);
        }

        // Check if accumulated account rule already exists
        const existingAccum = await client.query(`
          SELECT id FROM asset_account_determination
          WHERE asset_class_id = $1
            AND transaction_type = 'DEPRECIATION'
            AND account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
            AND company_code_id IS NULL
        `, [assetClass.id]);

        if (existingAccum.rows.length === 0) {
          await client.query(`
            INSERT INTO asset_account_determination (
              asset_class_id, transaction_type, account_category,
              gl_account_id, company_code_id, is_active, created_at, updated_at
            )
            VALUES ($1, 'DEPRECIATION', 'ACCUMULATED_DEPRECIATION_ACCOUNT', $2, NULL, true, NOW(), NOW())
          `, [assetClass.id, defaultAccumAccount.id]);
          rulesCreated++;
          console.log(`   ✅ Created accumulated depreciation account rule for asset class ${assetClass.code}`);
        }
      }

      if (rulesCreated > 0) {
        console.log(`\n✅ Created ${rulesCreated} account determination rules!`);
      } else {
        console.log(`\nℹ️  All rules already exist. No new rules created.`);
      }
    } else {
      console.log("\n⚠️  Cannot create default rules: Missing GL accounts.");
      console.log("   Please create GL accounts for:");
      if (expenseAccounts.rows.length === 0) {
        console.log("   - Depreciation Expense Account (account_type: EXPENSE)");
      }
      if (accumAccounts.rows.length === 0) {
        console.log("   - Accumulated Depreciation Account (account_type: ASSET)");
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Account determination setup completed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error setting up account determination:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupAccountDetermination().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

