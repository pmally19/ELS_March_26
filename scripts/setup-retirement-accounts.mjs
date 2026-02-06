import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function setupRetirementAccounts() {
    const client = await pool.connect();

    try {
        console.log('=== SETTING UP RETIREMENT GL ACCOUNT DETERMINATION ===\n');

        await client.query('BEGIN');

        // 1. Find GL accounts for retirement (those named appropriately)
        console.log('1. Finding appropriate GL accounts...\n');

        // Find Asset Account (for fixed assets)
        const assetAccountResult = await client.query(`
            SELECT id, account_number, account_name FROM gl_accounts 
            WHERE is_active = true 
            AND (LOWER(account_name) LIKE '%fixed asset%' 
                OR LOWER(account_name) LIKE '%property%plant%'
                OR LOWER(account_name) LIKE '%equipment%'
                OR account_number LIKE '12%' OR account_number LIKE '14%')
            ORDER BY account_number
            LIMIT 1
        `);

        // Find Accumulated Depreciation Account
        const accumDepResult = await client.query(`
            SELECT id, account_number, account_name FROM gl_accounts 
            WHERE is_active = true 
            AND (LOWER(account_name) LIKE '%accumulated%' OR LOWER(account_name) LIKE '%accum%deprec%')
            ORDER BY account_number
            LIMIT 1
        `);

        // Find Gain/Loss on Disposal Account
        const gainLossResult = await client.query(`
            SELECT id, account_number, account_name FROM gl_accounts 
            WHERE is_active = true 
            AND (LOWER(account_name) LIKE '%gain%' OR LOWER(account_name) LIKE '%loss%' 
                OR LOWER(account_name) LIKE '%disposal%')
            ORDER BY account_number
            LIMIT 1
        `);

        // Find Cash/Bank Account
        const cashResult = await client.query(`
            SELECT id, account_number, account_name FROM gl_accounts 
            WHERE is_active = true 
            AND (LOWER(account_name) LIKE '%cash%' OR LOWER(account_name) LIKE '%bank%'
                OR account_number LIKE '10%' OR account_number LIKE '11%')
            ORDER BY account_number
            LIMIT 1
        `);

        const assetAccount = assetAccountResult.rows[0];
        const accumDepAccount = accumDepResult.rows[0];
        const gainLossAccount = gainLossResult.rows[0];
        const cashAccount = cashResult.rows[0];

        console.log('Found accounts:');
        console.log(`   Asset Account: ${assetAccount ? `${assetAccount.account_number} - ${assetAccount.account_name}` : '⚠️  NOT FOUND'}`);
        console.log(`   Accum Depreciation: ${accumDepAccount ? `${accumDepAccount.account_number} - ${accumDepAccount.account_name}` : '⚠️  NOT FOUND'}`);
        console.log(`   Gain/Loss Account: ${gainLossAccount ? `${gainLossAccount.account_number} - ${gainLossAccount.account_name}` : '⚠️  NOT FOUND'}`);
        console.log(`   Cash Account: ${cashAccount ? `${cashAccount.account_number} - ${cashAccount.account_name}` : '⚠️  NOT FOUND'}`);

        if (!assetAccount || !accumDepAccount) {
            console.log('\n❌ Cannot proceed - minimum required accounts (Asset, Accumulated Depreciation) not found.');
            console.log('Please create appropriate GL accounts first.');
            await client.query('ROLLBACK');
            return;
        }

        // 2. Get all asset classes and company codes
        const assetClasses = await client.query(`SELECT id, code, name FROM asset_classes WHERE is_active = true`);
        const companyCodes = await client.query(`SELECT id, code, name FROM company_codes WHERE active = true`);

        console.log(`\n2. Found ${assetClasses.rows.length} asset classes, ${companyCodes.rows.length} company codes`);

        // 3. Create RETIREMENT account determination rules
        console.log('\n3. Creating RETIREMENT account determination rules...\n');

        let rulesAdded = 0;

        for (const ac of assetClasses.rows) {
            for (const cc of companyCodes.rows) {
                // Asset Account
                if (assetAccount) {
                    await client.query(`
                        INSERT INTO asset_account_determination 
                        (asset_class_id, company_code_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at)
                        VALUES ($1, $2, 'RETIREMENT', 'ASSET_ACCOUNT', $3, true, NOW(), NOW())
                        ON CONFLICT DO NOTHING
                    `, [ac.id, cc.id, assetAccount.id]);
                    rulesAdded++;
                }

                // Accumulated Depreciation Account
                if (accumDepAccount) {
                    await client.query(`
                        INSERT INTO asset_account_determination 
                        (asset_class_id, company_code_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at)
                        VALUES ($1, $2, 'RETIREMENT', 'ACCUMULATED_DEPRECIATION_ACCOUNT', $3, true, NOW(), NOW())
                        ON CONFLICT DO NOTHING
                    `, [ac.id, cc.id, accumDepAccount.id]);
                    rulesAdded++;
                }

                // Gain/Loss Account (if available)
                if (gainLossAccount) {
                    await client.query(`
                        INSERT INTO asset_account_determination 
                        (asset_class_id, company_code_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at)
                        VALUES ($1, $2, 'RETIREMENT', 'GAIN_LOSS_ACCOUNT', $3, true, NOW(), NOW())
                        ON CONFLICT DO NOTHING
                    `, [ac.id, cc.id, gainLossAccount.id]);
                    rulesAdded++;
                }

                // Cash Account (if available)
                if (cashAccount) {
                    await client.query(`
                        INSERT INTO asset_account_determination 
                        (asset_class_id, company_code_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at)
                        VALUES ($1, $2, 'RETIREMENT', 'CASH_ACCOUNT', $3, true, NOW(), NOW())
                        ON CONFLICT DO NOTHING
                    `, [ac.id, cc.id, cashAccount.id]);
                    rulesAdded++;
                }
            }
        }

        console.log(`   ✅ Added ${rulesAdded} RETIREMENT account determination rules`);

        // 4. Verify final state
        console.log('\n4. Final verification of RETIREMENT rules...\n');
        const finalRules = await client.query(`
            SELECT 
                ac.code as asset_class,
                cc.code as company_code,
                aad.account_category,
                ga.account_number,
                ga.account_name
            FROM asset_account_determination aad
            LEFT JOIN asset_classes ac ON aad.asset_class_id = ac.id
            LEFT JOIN company_codes cc ON aad.company_code_id = cc.id
            LEFT JOIN gl_accounts ga ON aad.gl_account_id = ga.id
            WHERE aad.transaction_type = 'RETIREMENT'
            ORDER BY ac.code, cc.code, aad.account_category
        `);

        console.log(`   Total RETIREMENT rules: ${finalRules.rows.length}`);

        // Group by account category
        const byCategory = {};
        finalRules.rows.forEach(r => {
            byCategory[r.account_category] = (byCategory[r.account_category] || 0) + 1;
        });
        Object.entries(byCategory).forEach(([cat, count]) => {
            console.log(`   - ${cat}: ${count} rules`);
        });

        await client.query('COMMIT');
        console.log('\n=== SETUP COMPLETED ===');
        console.log('\nRetirement GL posting is now configured. When you retire an asset:');
        console.log('1. Accumulated Depreciation will be debited (cleared)');
        console.log('2. Cash will be debited (if sold for proceeds)');
        console.log('3. Gain/Loss will be recorded (if any)');
        console.log('4. Asset Account will be credited (removed)');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

setupRetirementAccounts();
