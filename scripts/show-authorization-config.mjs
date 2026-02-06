import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function showAuthorizationSetup() {
    const client = await pool.connect();

    console.log('═'.repeat(70));
    console.log('  PAYMENT AUTHORIZATION LEVELS - CURRENT CONFIGURATION');
    console.log('═'.repeat(70));

    try {
        // 1. Authorization Levels
        console.log('\n📊 AUTHORIZATION LEVELS (payment_authorization_levels)');
        console.log('─'.repeat(70));

        const levels = await client.query(`
      SELECT id, level_name, level_order, min_amount, max_amount, 
             requires_dual_approval, is_active
      FROM payment_authorization_levels
      ORDER BY level_order
    `);

        console.log('');
        console.log('  How it works:');
        console.log('  - Payments are automatically assigned to a level based on amount');
        console.log('  - Higher amount = higher authorization level required');
        console.log('  - Dual approval means TWO different users must approve');
        console.log('');

        for (const level of levels.rows) {
            const maxAmt = level.max_amount ? `$${parseFloat(level.max_amount).toLocaleString()}` : 'Unlimited';
            const dual = level.requires_dual_approval ? '⚠️ DUAL APPROVAL REQUIRED' : '✓ Single approval';
            console.log(`  Level ${level.level_order}: ${level.level_name}`);
            console.log(`     Amount Range: $${parseFloat(level.min_amount).toLocaleString()} - ${maxAmt}`);
            console.log(`     ${dual}`);
            console.log('');
        }

        // 2. User Limits
        console.log('\n👤 USER AUTHORIZATION LIMITS (user_authorization_limits)');
        console.log('─'.repeat(70));

        const users = await client.query(`
      SELECT ul.*, pal.level_name
      FROM user_authorization_limits ul
      LEFT JOIN payment_authorization_levels pal ON ul.authorization_level_id = pal.id
      ORDER BY ul.role
    `);

        if (users.rows.length === 0) {
            console.log('  No user limits configured yet.');
            console.log('  Run: node scripts/manage-authorization-levels.mjs');
        } else {
            for (const user of users.rows) {
                console.log(`  User ID: ${user.user_id} (${user.role})`);
                console.log(`     Daily Limit: $${parseFloat(user.daily_limit).toLocaleString()}`);
                console.log(`     Single Payment Max: $${parseFloat(user.single_payment_limit).toLocaleString()}`);
                console.log(`     Dual Approval Above: $${parseFloat(user.dual_approval_threshold).toLocaleString()}`);
                console.log(`     Authorization Level: ${user.level_name || 'Not assigned'}`);
                console.log('');
            }
        }

        // 3. Example scenarios
        console.log('\n📋 EXAMPLE AUTHORIZATION SCENARIOS');
        console.log('─'.repeat(70));
        console.log('');
        console.log('  Scenario 1: Payment of $3,000');
        console.log('    → Level: AP Clerk');
        console.log('    → Single approval sufficient');
        console.log('    → Anyone with AP Clerk level or higher can approve');
        console.log('');
        console.log('  Scenario 2: Payment of $15,000');
        console.log('    → Level: Manager');
        console.log('    → Single approval sufficient');
        console.log('    → Requires Manager level or higher');
        console.log('');
        console.log('  Scenario 3: Payment of $50,000');
        console.log('    → Level: Finance Manager');
        console.log('    → ⚠️ DUAL APPROVAL REQUIRED');
        console.log('    → Two different Finance Managers (or higher) must approve');
        console.log('');
        console.log('  Scenario 4: Payment of $250,000');
        console.log('    → Level: CFO');
        console.log('    → ⚠️ DUAL APPROVAL REQUIRED');
        console.log('    → Two different CFOs (or equivalent) must approve');

        // 4. How to customize
        console.log('\n');
        console.log('═'.repeat(70));
        console.log('  HOW TO CUSTOMIZE');
        console.log('═'.repeat(70));
        console.log('');
        console.log('  Option 1: Interactive CLI Tool');
        console.log('    node scripts/manage-authorization-levels.mjs');
        console.log('');
        console.log('  Option 2: Direct SQL (for bulk updates)');
        console.log('    -- Add a new level');
        console.log('    INSERT INTO payment_authorization_levels');
        console.log('    (level_name, level_order, min_amount, max_amount, requires_dual_approval)');
        console.log('    VALUES (\'Director\', 5, 500001, 1000000, TRUE);');
        console.log('');
        console.log('    -- Update existing level');
        console.log('    UPDATE payment_authorization_levels');
        console.log('    SET max_amount = 10000, requires_dual_approval = TRUE');
        console.log('    WHERE level_name = \'AP Clerk\';');
        console.log('');
        console.log('    -- Add user limits');
        console.log('    INSERT INTO user_authorization_limits');
        console.log('    (user_id, role, daily_limit, single_payment_limit,');
        console.log('     dual_approval_threshold, authorization_level_id)');
        console.log('    VALUES (2, \'Manager\', 100000, 25000, 10000, 2);');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

showAuthorizationSetup();
