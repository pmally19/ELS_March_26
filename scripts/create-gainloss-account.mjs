import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function createGainLossAccount() {
    const client = await pool.connect();

    try {
        console.log('=== CREATING GAIN/LOSS ON DISPOSAL ACCOUNT ===\n');

        await client.query('BEGIN');

        // Check if a gain/loss account already exists
        const existing = await client.query(`
            SELECT id, account_number, account_name FROM gl_accounts 
            WHERE LOWER(account_name) LIKE '%gain%loss%' 
               OR LOWER(account_name) LIKE '%loss%disposal%'
               OR LOWER(account_name) LIKE '%gain%disposal%'
               OR account_number = '8100'
            LIMIT 1
        `);

        if (existing.rows.length > 0) {
            console.log('✅ Gain/Loss account already exists:', existing.rows[0].account_number, existing.rows[0].account_name);
            await client.query('ROLLBACK');
            return;
        }

        // Get chart of accounts ID
        const coaResult = await client.query(`SELECT id FROM chart_of_accounts LIMIT 1`);
        const chartId = coaResult.rows[0]?.id;

        if (!chartId) {
            console.log('⚠️  No chart of accounts found. Cannot create account.');
            await client.query('ROLLBACK');
            return;
        }

        // Create a Gain/Loss on Disposal account
        const insertResult = await client.query(`
            INSERT INTO gl_accounts (
                account_number, account_name, account_type, 
                chart_of_accounts_id, is_active, created_at, updated_at
            ) VALUES (
                '8100', 'Gain/Loss on Asset Disposal', 'OTHER_INCOME', 
                $1, true, NOW(), NOW()
            )
            RETURNING id, account_number, account_name
        `, [chartId]);

        const newAccount = insertResult.rows[0];
        console.log('✅ Created Gain/Loss account:', newAccount.account_number, '-', newAccount.account_name);

        // Now create RETIREMENT account determination rules for GAIN_LOSS_ACCOUNT
        const assetClasses = await client.query(`SELECT id FROM asset_classes WHERE is_active = true`);
        const companyCodes = await client.query(`SELECT id FROM company_codes WHERE active = true`);

        let rulesAdded = 0;
        for (const ac of assetClasses.rows) {
            for (const cc of companyCodes.rows) {
                await client.query(`
                    INSERT INTO asset_account_determination 
                    (asset_class_id, company_code_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at)
                    VALUES ($1, $2, 'RETIREMENT', 'GAIN_LOSS_ACCOUNT', $3, true, NOW(), NOW())
                    ON CONFLICT DO NOTHING
                `, [ac.id, cc.id, newAccount.id]);
                rulesAdded++;
            }
        }

        console.log(`✅ Added ${rulesAdded} GAIN_LOSS_ACCOUNT determination rules`);

        await client.query('COMMIT');
        console.log('\n=== COMPLETED ===');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createGainLossAccount();
