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

async function diagnoseGLPosting() {
  const client = await pool.connect();
  try {
    console.log("🔍 Diagnosing GL Posting Issues for Depreciation...\n");

    // 1. Check recent depreciation runs
    console.log("1. Recent Depreciation Runs:");
    const runs = await client.query(`
      SELECT 
        id, run_number, fiscal_year, fiscal_period,
        status, posted_to_gl, gl_document_number, error_message,
        total_assets_processed, total_depreciation_amount
      FROM asset_depreciation_runs
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`   Found ${runs.rows.length} recent runs:`);
    runs.rows.forEach((run) => {
      console.log(`   - ${run.run_number}: Status=${run.status}, Posted=${run.posted_to_gl}, GL Doc=${run.gl_document_number || 'NULL'}`);
      if (run.error_message) {
        console.log(`     Error: ${run.error_message.substring(0, 100)}`);
      }
    });

    // 2. Check assets eligible for depreciation
    console.log("\n2. Assets Eligible for Depreciation:");
    const assets = await client.query(`
      SELECT 
        am.id, am.asset_number, am.name, am.company_code_id,
        am.asset_class_id, ac.code as asset_class_code, ac.name as asset_class_name
      FROM asset_master am
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      WHERE (am.is_active = true OR am.active = true)
        AND UPPER(TRIM(COALESCE(am.status, 'Active'))) = 'ACTIVE'
        AND am.acquisition_cost > 0
        AND am.useful_life_years > 0
      LIMIT 10
    `);
    
    console.log(`   Found ${assets.rows.length} eligible assets (showing first 10):`);
    assets.rows.forEach((asset) => {
      console.log(`   - ${asset.asset_number}: ${asset.name} (Class: ${asset.asset_class_code || asset.asset_class_id})`);
    });

    // 3. Check account determination configuration
    console.log("\n3. Account Determination Configuration:");
    const accountDetermination = await client.query(`
      SELECT 
        aad.id, aad.asset_class_id, ac.code as asset_class_code,
        aad.transaction_type, aad.account_category,
        aad.gl_account_id, ga.account_number, ga.account_name,
        aad.company_code_id, cc.code as company_code,
        aad.is_active
      FROM asset_account_determination aad
      LEFT JOIN asset_classes ac ON aad.asset_class_id = ac.id
      LEFT JOIN gl_accounts ga ON aad.gl_account_id = ga.id
      LEFT JOIN company_codes cc ON aad.company_code_id = cc.id
      WHERE aad.transaction_type = 'DEPRECIATION'
        AND aad.is_active = true
      ORDER BY aad.asset_class_id, aad.company_code_id NULLS LAST
    `);
    
    console.log(`   Found ${accountDetermination.rows.length} account determination rules:`);
    if (accountDetermination.rows.length === 0) {
      console.log("   ⚠️  NO ACCOUNT DETERMINATION RULES FOUND!");
      console.log("   This is likely the root cause of GL posting failures.");
    } else {
      accountDetermination.rows.forEach((rule) => {
        console.log(`   - Asset Class: ${rule.asset_class_code || rule.asset_class_id}, ` +
                   `Category: ${rule.account_category}, ` +
                   `Account: ${rule.account_number || 'NULL'} (${rule.account_name || 'N/A'}), ` +
                   `Company: ${rule.company_code || 'ALL'}`);
      });
    }

    // 4. Check which assets have account determination
    console.log("\n4. Assets with Account Determination:");
    const assetsWithAD = await client.query(`
      SELECT 
        am.id, am.asset_number, am.name,
        am.asset_class_id, ac.code as asset_class_code,
        am.company_code_id, cc.code as company_code,
        COALESCE(
          company_expense_ad.gl_account_id,
          general_expense_ad.gl_account_id
        ) as expense_account_id,
        COALESCE(
          company_accum_ad.gl_account_id,
          general_accum_ad.gl_account_id
        ) as accum_account_id,
        CASE 
          WHEN COALESCE(company_expense_ad.gl_account_id, general_expense_ad.gl_account_id) IS NULL 
            THEN 'Missing Expense Account'
          WHEN COALESCE(company_accum_ad.gl_account_id, general_accum_ad.gl_account_id) IS NULL 
            THEN 'Missing Accumulated Account'
          ELSE 'OK'
        END as status
      FROM asset_master am
      LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
      LEFT JOIN company_codes cc ON am.company_code_id = cc.id
      LEFT JOIN asset_account_determination company_expense_ad 
        ON am.asset_class_id = company_expense_ad.asset_class_id 
        AND company_expense_ad.transaction_type = 'DEPRECIATION'
        AND company_expense_ad.account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
        AND company_expense_ad.company_code_id = am.company_code_id
        AND company_expense_ad.is_active = true
      LEFT JOIN asset_account_determination general_expense_ad 
        ON am.asset_class_id = general_expense_ad.asset_class_id 
        AND general_expense_ad.transaction_type = 'DEPRECIATION'
        AND general_expense_ad.account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
        AND general_expense_ad.company_code_id IS NULL
        AND general_expense_ad.is_active = true
        AND company_expense_ad.id IS NULL
      LEFT JOIN asset_account_determination company_accum_ad 
        ON am.asset_class_id = company_accum_ad.asset_class_id 
        AND company_accum_ad.transaction_type = 'DEPRECIATION'
        AND company_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND company_accum_ad.company_code_id = am.company_code_id
        AND company_accum_ad.is_active = true
      LEFT JOIN asset_account_determination general_accum_ad 
        ON am.asset_class_id = general_accum_ad.asset_class_id 
        AND general_accum_ad.transaction_type = 'DEPRECIATION'
        AND general_accum_ad.account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND general_accum_ad.company_code_id IS NULL
        AND general_accum_ad.is_active = true
        AND company_accum_ad.id IS NULL
      WHERE (am.is_active = true OR am.active = true)
        AND UPPER(TRIM(COALESCE(am.status, 'Active'))) = 'ACTIVE'
        AND am.acquisition_cost > 0
        AND am.useful_life_years > 0
      LIMIT 10
    `);
    
    console.log(`   Checking first 10 eligible assets:`);
    assetsWithAD.rows.forEach((asset) => {
      console.log(`   - ${asset.asset_number}: ${asset.status}`);
      if (asset.status !== 'OK') {
        console.log(`     Asset Class: ${asset.asset_class_code || asset.asset_class_id}, Company: ${asset.company_code || 'N/A'}`);
      }
    });

    // 5. Check GL entries for depreciation
    console.log("\n5. GL Entries for Depreciation:");
    const glEntries = await client.query(`
      SELECT 
        document_number, COUNT(*) as entry_count,
        SUM(CASE WHEN debit_credit_indicator = 'D' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN debit_credit_indicator = 'C' THEN amount ELSE 0 END) as total_credits,
        MIN(posting_date) as first_posting_date
      FROM gl_entries
      WHERE source_module = 'ASSET' 
        AND source_document_type = 'DEPRECIATION'
      GROUP BY document_number
      ORDER BY first_posting_date DESC
      LIMIT 5
    `);
    
    console.log(`   Found ${glEntries.rows.length} GL documents for depreciation:`);
    glEntries.rows.forEach((entry) => {
      console.log(`   - ${entry.document_number}: ${entry.entry_count} entries, ` +
                 `Debits: ${parseFloat(entry.total_debits || 0).toFixed(2)}, ` +
                 `Credits: ${parseFloat(entry.total_credits || 0).toFixed(2)}`);
    });

    console.log("\n✅ Diagnosis complete!");
  } catch (error) {
    console.error("❌ Error during diagnosis:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseGLPosting().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

