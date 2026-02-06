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

async function fixAccountRules() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔧 Fixing Account Determination Rules for Depreciation...\n");

    // Get the correct accounts
    const expenseAccount = await client.query(`
      SELECT id, account_number, account_name, account_type
      FROM gl_accounts
      WHERE account_number = '6300'
        AND account_type = 'EXPENSES'
        AND is_active = true
      LIMIT 1
    `);

    const accumAccount = await client.query(`
      SELECT id, account_number, account_name, account_type
      FROM gl_accounts
      WHERE (account_number = '1501' OR account_number = '1510')
        AND account_type = 'ASSETS'
        AND (account_name ILIKE '%accumulated%depreciation%' OR account_name ILIKE '%acc%dep%')
        AND is_active = true
      ORDER BY account_number
      LIMIT 1
    `);

    if (expenseAccount.rows.length === 0) {
      console.log("❌ Depreciation Expense Account (6300) not found!");
      throw new Error("Depreciation Expense Account not found");
    }

    if (accumAccount.rows.length === 0) {
      console.log("❌ Accumulated Depreciation Account not found!");
      throw new Error("Accumulated Depreciation Account not found");
    }

    const expenseAccountId = expenseAccount.rows[0].id;
    const accumAccountId = accumAccount.rows[0].id;

    console.log(`Using Expense Account: ${expenseAccount.rows[0].account_number} - ${expenseAccount.rows[0].account_name}`);
    console.log(`Using Accumulated Account: ${accumAccount.rows[0].account_number} - ${accumAccount.rows[0].account_name}\n`);

    // Update expense account rules
    const updateExpense = await client.query(`
      UPDATE asset_account_determination
      SET gl_account_id = $1, updated_at = NOW()
      WHERE transaction_type = 'DEPRECIATION'
        AND account_category = 'DEPRECIATION_EXPENSE_ACCOUNT'
        AND gl_account_id != $1
    `, [expenseAccountId]);

    console.log(`✅ Updated ${updateExpense.rowCount} expense account rules`);

    // Update accumulated account rules
    const updateAccum = await client.query(`
      UPDATE asset_account_determination
      SET gl_account_id = $1, updated_at = NOW()
      WHERE transaction_type = 'DEPRECIATION'
        AND account_category = 'ACCUMULATED_DEPRECIATION_ACCOUNT'
        AND gl_account_id != $1
    `, [accumAccountId]);

    console.log(`✅ Updated ${updateAccum.rowCount} accumulated depreciation account rules`);

    await client.query("COMMIT");
    console.log("\n✅ Account determination rules fixed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error fixing account rules:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAccountRules().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

