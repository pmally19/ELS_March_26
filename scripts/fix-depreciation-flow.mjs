import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function fixDepreciationFlow() {
    const client = await pool.connect();

    try {
        console.log('=== FIXING DEPRECIATION FLOW ===\n');

        await client.query('BEGIN');

        // 1. Create depreciation_runs table if not exists
        console.log('1. Creating depreciation_runs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS depreciation_runs (
                id SERIAL PRIMARY KEY,
                run_number VARCHAR(50),
                fiscal_year INTEGER NOT NULL,
                fiscal_period INTEGER NOT NULL,
                depreciation_area_id INTEGER,
                company_code_id INTEGER REFERENCES company_codes(id),
                run_date TIMESTAMP DEFAULT NOW(),
                run_by VARCHAR(100),
                status VARCHAR(20) DEFAULT 'COMPLETED',
                assets_processed INTEGER DEFAULT 0,
                total_depreciation NUMERIC(18,2) DEFAULT 0,
                gl_document_number VARCHAR(50),
                post_to_gl BOOLEAN DEFAULT true,
                test_run BOOLEAN DEFAULT false,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ depreciation_runs table ready');

        // 2. Create depreciation_run_details table if not exists
        console.log('2. Creating depreciation_run_details table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS depreciation_run_details (
                id SERIAL PRIMARY KEY,
                run_id INTEGER REFERENCES depreciation_runs(id),
                asset_id INTEGER REFERENCES asset_master(id),
                depreciation_amount NUMERIC(18,2),
                prior_accumulated_depreciation NUMERIC(18,2),
                new_accumulated_depreciation NUMERIC(18,2),
                prior_net_book_value NUMERIC(18,2),
                new_net_book_value NUMERIC(18,2),
                depreciation_method VARCHAR(50),
                useful_life_years INTEGER,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ depreciation_run_details table ready');

        // 3. Check what GL accounts exist for depreciation
        console.log('\n3. Checking GL accounts...');
        const glResult = await client.query(`
            SELECT id, account_number, account_name, account_type
            FROM gl_accounts 
            WHERE is_active = true
            ORDER BY account_number
        `);

        // Find or create depreciation-related accounts
        let depExpenseAccount = glResult.rows.find(r =>
            r.account_name?.toLowerCase().includes('depreciation') &&
            r.account_name?.toLowerCase().includes('expense')
        );
        let accumDepAccount = glResult.rows.find(r =>
            r.account_name?.toLowerCase().includes('accumulated') ||
            r.account_name?.toLowerCase().includes('accum')
        );

        // Also check by account number pattern
        if (!depExpenseAccount) {
            depExpenseAccount = glResult.rows.find(r => r.account_number?.startsWith('6'));
        }
        if (!accumDepAccount) {
            accumDepAccount = glResult.rows.find(r => r.account_number === '1501' || r.account_number?.startsWith('15'));
        }

        console.log('   Depreciation Expense Account:', depExpenseAccount ? `${depExpenseAccount.account_number} - ${depExpenseAccount.account_name}` : 'NOT FOUND');
        console.log('   Accumulated Depreciation Account:', accumDepAccount ? `${accumDepAccount.account_number} - ${accumDepAccount.account_name}` : 'NOT FOUND');

        // 4. Get all asset classes and company codes
        console.log('\n4. Getting asset classes and company codes...');
        const assetClasses = await client.query(`SELECT id, code, name FROM asset_classes WHERE is_active = true`);
        const companyCodes = await client.query(`SELECT id, code, name FROM company_codes WHERE active = true`);

        console.log(`   Found ${assetClasses.rows.length} asset classes, ${companyCodes.rows.length} company codes`);

        // 5. Check existing account determination rules
        console.log('\n5. Checking existing account determination rules...');
        const existingRules = await client.query(`
            SELECT asset_class_id, company_code_id, transaction_type, account_category
            FROM asset_account_determination
        `);
        console.log(`   Found ${existingRules.rows.length} existing rules`);

        // 6. Create missing account determination rules for depreciation
        console.log('\n6. Creating missing depreciation account determination rules...');

        let rulesAdded = 0;

        if (depExpenseAccount && accumDepAccount) {
            for (const ac of assetClasses.rows) {
                for (const cc of companyCodes.rows) {
                    // Check if DEPRECIATION_EXPENSE_ACCOUNT rule exists
                    const expenseExists = existingRules.rows.find(r =>
                        r.asset_class_id === ac.id &&
                        r.company_code_id === cc.id &&
                        r.transaction_type === 'DEPRECIATION' &&
                        r.account_category === 'DEPRECIATION_EXPENSE_ACCOUNT'
                    );

                    if (!expenseExists) {
                        await client.query(`
                            INSERT INTO asset_account_determination 
                            (asset_class_id, company_code_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at)
                            VALUES ($1, $2, 'DEPRECIATION', 'DEPRECIATION_EXPENSE_ACCOUNT', $3, true, NOW(), NOW())
                            ON CONFLICT DO NOTHING
                        `, [ac.id, cc.id, depExpenseAccount.id]);
                        rulesAdded++;
                    }

                    // Check if ACCUMULATED_DEPRECIATION_ACCOUNT rule exists
                    const accumExists = existingRules.rows.find(r =>
                        r.asset_class_id === ac.id &&
                        r.company_code_id === cc.id &&
                        r.transaction_type === 'DEPRECIATION' &&
                        r.account_category === 'ACCUMULATED_DEPRECIATION_ACCOUNT'
                    );

                    if (!accumExists) {
                        await client.query(`
                            INSERT INTO asset_account_determination 
                            (asset_class_id, company_code_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at)
                            VALUES ($1, $2, 'DEPRECIATION', 'ACCUMULATED_DEPRECIATION_ACCOUNT', $3, true, NOW(), NOW())
                            ON CONFLICT DO NOTHING
                        `, [ac.id, cc.id, accumDepAccount.id]);
                        rulesAdded++;
                    }
                }
            }
            console.log(`   ✅ Added ${rulesAdded} new account determination rules`);
        } else {
            console.log('   ⚠️  Cannot add rules - missing GL accounts. Please create:');
            if (!depExpenseAccount) console.log('      - A Depreciation Expense account (e.g., 6100)');
            if (!accumDepAccount) console.log('      - An Accumulated Depreciation account (e.g., 1501)');
        }

        // 7. Verify final state
        console.log('\n7. Final verification...');
        const finalRules = await client.query(`
            SELECT 
                ac.code as asset_class,
                cc.code as company_code,
                aad.transaction_type,
                aad.account_category,
                ga.account_number,
                ga.account_name
            FROM asset_account_determination aad
            LEFT JOIN asset_classes ac ON aad.asset_class_id = ac.id
            LEFT JOIN company_codes cc ON aad.company_code_id = cc.id
            LEFT JOIN gl_accounts ga ON aad.gl_account_id = ga.id
            WHERE aad.transaction_type = 'DEPRECIATION'
            ORDER BY ac.code, cc.code, aad.account_category
        `);

        console.log(`   Total DEPRECIATION rules: ${finalRules.rows.length}`);
        finalRules.rows.forEach(r => {
            console.log(`   - ${r.asset_class} | ${r.company_code} | ${r.account_category} → ${r.account_number} (${r.account_name})`);
        });

        await client.query('COMMIT');
        console.log('\n=== FIX COMPLETED ===');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixDepreciationFlow();
