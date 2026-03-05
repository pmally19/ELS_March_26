/**
 * Seed standard SAP posting keys using REAL account_type codes from account_types table.
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost', port: 5432,
    database: 'mallyerp', user: 'postgres', password: 'Mokshith@21',
});

// Uses the actual codes from your account_types table
const standardPostingKeys = [
    // Customer (Accounts Receivable)
    { posting_key: '01', description: 'Customer Invoice (Debit AR)', debit_credit: 'D', account_type: 'accounts_receivable' },
    { posting_key: '11', description: 'Customer Credit Memo (Credit AR)', debit_credit: 'C', account_type: 'accounts_receivable' },
    { posting_key: '12', description: 'Customer Clearing (Credit AR)', debit_credit: 'C', account_type: 'accounts_receivable' },
    { posting_key: '15', description: 'Incoming Payment AR Clearing', debit_credit: 'C', account_type: 'accounts_receivable' },
    { posting_key: '05', description: 'Customer Debit Memo (Debit AR)', debit_credit: 'D', account_type: 'accounts_receivable' },

    // Vendor (Accounts Payable)
    { posting_key: '31', description: 'Vendor Invoice (Credit AP)', debit_credit: 'C', account_type: 'accounts_payable' },
    { posting_key: '21', description: 'Vendor Credit Memo (Debit AP)', debit_credit: 'D', account_type: 'accounts_payable' },
    { posting_key: '25', description: 'Outgoing Payment AP Clearing', debit_credit: 'D', account_type: 'accounts_payable' },
    { posting_key: '22', description: 'Vendor Clearing (Debit AP)', debit_credit: 'D', account_type: 'accounts_payable' },

    // G/L Account
    { posting_key: '40', description: 'G/L Debit Entry', debit_credit: 'D', account_type: 'gl' },
    { posting_key: '50', description: 'G/L Credit Entry', debit_credit: 'C', account_type: 'gl' },

    // Revenue
    { posting_key: '41', description: 'Revenue Credit Posting', debit_credit: 'C', account_type: 'revenue' },
    { posting_key: '51', description: 'Revenue Clearing Debit', debit_credit: 'D', account_type: 'revenue' },

    // Asset
    { posting_key: '70', description: 'Debit Asset', debit_credit: 'D', account_type: 'asset' },
    { posting_key: '75', description: 'Credit Asset', debit_credit: 'C', account_type: 'asset' },

    // Inventory (Material)
    { posting_key: '91', description: 'Inventory Debit (Material)', debit_credit: 'D', account_type: 'inventory' },
    { posting_key: '96', description: 'Inventory Credit (Material)', debit_credit: 'C', account_type: 'inventory' },

    // Expense
    { posting_key: '60', description: 'Expense Debit Posting', debit_credit: 'D', account_type: 'expense' },

    // Bank / Cash
    { posting_key: '09', description: 'Credit Bank Account', debit_credit: 'C', account_type: 'bank' },
    { posting_key: '10', description: 'Debit Bank Account', debit_credit: 'D', account_type: 'bank' },
];

async function seed() {
    let inserted = 0, skipped = 0;

    for (const key of standardPostingKeys) {
        try {
            const existing = await pool.query(
                'SELECT id FROM posting_keys WHERE posting_key = $1', [key.posting_key]
            );
            if (existing.rows.length > 0) {
                console.log(`⏭  Skip: ${key.posting_key}`);
                skipped++; continue;
            }

            // Verify account_type exists in account_types table
            const atCheck = await pool.query(
                'SELECT id FROM account_types WHERE code = $1', [key.account_type]
            );
            if (atCheck.rows.length === 0) {
                console.warn(`⚠️  account_type '${key.account_type}' not found – skipping key ${key.posting_key}`);
                skipped++; continue;
            }

            await pool.query(
                `INSERT INTO posting_keys (posting_key, description, debit_credit, account_type, active)
         VALUES ($1, $2, $3, $4, true)`,
                [key.posting_key, key.description, key.debit_credit, key.account_type]
            );
            console.log(`✅ Inserted: ${key.posting_key} – ${key.description} [${key.debit_credit}/${key.account_type}]`);
            inserted++;
        } catch (err) {
            console.error(`❌ Error on ${key.posting_key}:`, err.message);
        }
    }

    console.log(`\n📊 Done: ${inserted} inserted, ${skipped} skipped`);
    await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
