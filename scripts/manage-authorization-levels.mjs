import pg from 'pg';
import readline from 'readline';

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function showMenu() {
    console.log('\n===========================================');
    console.log('  PAYMENT AUTHORIZATION MANAGEMENT');
    console.log('===========================================');
    console.log('1. View all authorization levels');
    console.log('2. Add new authorization level');
    console.log('3. Update authorization level');
    console.log('4. Delete authorization level');
    console.log('5. View user limits');
    console.log('6. Add/Update user limit');
    console.log('7. View authorization history');
    console.log('8. Exit');
    console.log('===========================================');
}

async function viewLevels(client) {
    const result = await client.query(`
    SELECT id, level_name, level_order, min_amount, max_amount, 
           requires_dual_approval, is_active
    FROM payment_authorization_levels
    ORDER BY level_order
  `);

    console.log('\n📊 AUTHORIZATION LEVELS');
    console.log('─'.repeat(80));
    console.log('ID | Level Name       | Order | Min Amount   | Max Amount   | Dual | Active');
    console.log('─'.repeat(80));

    for (const row of result.rows) {
        const maxAmt = row.max_amount ? `$${parseFloat(row.max_amount).toLocaleString()}` : 'Unlimited';
        console.log(
            `${String(row.id).padEnd(2)} | ${row.level_name.padEnd(16)} | ${String(row.level_order).padEnd(5)} | ` +
            `$${parseFloat(row.min_amount).toLocaleString().padEnd(11)} | ${maxAmt.padEnd(12)} | ` +
            `${row.requires_dual_approval ? 'YES' : 'NO '.padEnd(4)} | ${row.is_active ? 'YES' : 'NO'}`
        );
    }
}

async function addLevel(client) {
    console.log('\n➕ ADD NEW AUTHORIZATION LEVEL\n');

    const levelName = await question('Level Name (e.g., "Senior Manager"): ');
    const levelOrder = await question('Level Order (1-10): ');
    const minAmount = await question('Minimum Amount ($): ');
    const maxAmount = await question('Maximum Amount ($ or "unlimited"): ');
    const dualApproval = await question('Requires Dual Approval? (yes/no): ');

    const maxValue = maxAmount.toLowerCase() === 'unlimited' ? null : parseFloat(maxAmount);
    const requiresDual = dualApproval.toLowerCase() === 'yes';

    await client.query(`
    INSERT INTO payment_authorization_levels 
    (level_name, level_order, min_amount, max_amount, requires_dual_approval)
    VALUES ($1, $2, $3, $4, $5)
  `, [levelName, parseInt(levelOrder), parseFloat(minAmount), maxValue, requiresDual]);

    console.log('\n✅ Authorization level added successfully!');
}

async function updateLevel(client) {
    await viewLevels(client);

    console.log('\n✏️ UPDATE AUTHORIZATION LEVEL\n');

    const id = await question('Enter Level ID to update: ');

    const current = await client.query('SELECT * FROM payment_authorization_levels WHERE id = $1', [id]);
    if (current.rows.length === 0) {
        console.log('❌ Level not found');
        return;
    }

    const level = current.rows[0];
    console.log(`\nCurrent values for "${level.level_name}":`);
    console.log(`  Min Amount: $${level.min_amount}`);
    console.log(`  Max Amount: ${level.max_amount || 'Unlimited'}`);
    console.log(`  Dual Approval: ${level.requires_dual_approval ? 'Yes' : 'No'}`);

    const minAmount = await question(`New Min Amount (press Enter to keep $${level.min_amount}): `);
    const maxAmount = await question(`New Max Amount (press Enter to keep ${level.max_amount || 'Unlimited'}): `);
    const dualApproval = await question(`Requires Dual Approval? (yes/no, Enter to keep): `);

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (minAmount.trim()) {
        updates.push(`min_amount = $${paramIndex}`);
        values.push(parseFloat(minAmount));
        paramIndex++;
    }

    if (maxAmount.trim()) {
        const maxVal = maxAmount.toLowerCase() === 'unlimited' ? null : parseFloat(maxAmount);
        updates.push(`max_amount = $${paramIndex}`);
        values.push(maxVal);
        paramIndex++;
    }

    if (dualApproval.trim()) {
        updates.push(`requires_dual_approval = $${paramIndex}`);
        values.push(dualApproval.toLowerCase() === 'yes');
        paramIndex++;
    }

    if (updates.length > 0) {
        values.push(id);
        await client.query(
            `UPDATE payment_authorization_levels SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
            values
        );
        console.log('\n✅ Authorization level updated!');
    } else {
        console.log('\nNo changes made.');
    }
}

async function deleteLevel(client) {
    await viewLevels(client);

    console.log('\n🗑️ DELETE AUTHORIZATION LEVEL\n');

    const id = await question('Enter Level ID to delete: ');
    const confirm = await question('Are you sure? This will affect user limits. (yes/no): ');

    if (confirm.toLowerCase() === 'yes') {
        await client.query('DELETE FROM payment_authorization_levels WHERE id = $1', [id]);
        console.log('\n✅ Level deleted.');
    } else {
        console.log('\nDeletion cancelled.');
    }
}

async function viewUserLimits(client) {
    const result = await client.query(`
    SELECT ul.id, ul.user_id, ul.role, ul.daily_limit, ul.single_payment_limit,
           ul.dual_approval_threshold, ul.can_authorize, pal.level_name
    FROM user_authorization_limits ul
    LEFT JOIN payment_authorization_levels pal ON ul.authorization_level_id = pal.id
    ORDER BY ul.role
  `);

    console.log('\n👤 USER AUTHORIZATION LIMITS');
    console.log('─'.repeat(90));
    console.log('ID | User | Role             | Daily Limit  | Single Limit | Dual Threshold | Level');
    console.log('─'.repeat(90));

    for (const row of result.rows) {
        console.log(
            `${String(row.id).padEnd(2)} | ${String(row.user_id).padEnd(4)} | ${row.role.padEnd(16)} | ` +
            `$${parseFloat(row.daily_limit).toLocaleString().padEnd(11)} | $${parseFloat(row.single_payment_limit).toLocaleString().padEnd(11)} | ` +
            `$${parseFloat(row.dual_approval_threshold).toLocaleString().padEnd(13)} | ${row.level_name || 'N/A'}`
        );
    }
}

async function addUserLimit(client) {
    await viewLevels(client);

    console.log('\n➕ ADD/UPDATE USER LIMIT\n');

    const userId = await question('User ID: ');
    const role = await question('Role (e.g., "AP Clerk", "Manager", "CFO"): ');
    const dailyLimit = await question('Daily Limit ($): ');
    const singleLimit = await question('Single Payment Limit ($): ');
    const dualThreshold = await question('Dual Approval Threshold ($): ');
    const levelId = await question('Authorization Level ID (from list above): ');

    await client.query(`
    INSERT INTO user_authorization_limits 
    (user_id, role, daily_limit, single_payment_limit, dual_approval_threshold, authorization_level_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, company_code_id) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      daily_limit = EXCLUDED.daily_limit,
      single_payment_limit = EXCLUDED.single_payment_limit,
      dual_approval_threshold = EXCLUDED.dual_approval_threshold,
      authorization_level_id = EXCLUDED.authorization_level_id,
      updated_at = NOW()
  `, [parseInt(userId), role, parseFloat(dailyLimit), parseFloat(singleLimit), parseFloat(dualThreshold), parseInt(levelId)]);

    console.log('\n✅ User authorization limit saved!');
}

async function viewHistory(client) {
    const result = await client.query(`
    SELECT pa.id, pa.payment_id, pa.authorized_by, pa.authorization_level,
           pa.authorization_status, pa.authorization_notes, pa.authorization_date
    FROM payment_authorizations pa
    ORDER BY pa.authorization_date DESC
    LIMIT 20
  `);

    console.log('\n📜 RECENT AUTHORIZATION HISTORY (Last 20)');
    console.log('─'.repeat(80));

    if (result.rows.length === 0) {
        console.log('No authorization history found.');
        return;
    }

    for (const row of result.rows) {
        console.log(
            `Payment #${row.payment_id} | User: ${row.authorized_by} | Level: ${row.authorization_level || 'N/A'} | ` +
            `Status: ${row.authorization_status} | Date: ${new Date(row.authorization_date).toLocaleString()}`
        );
        if (row.authorization_notes) {
            console.log(`  Notes: ${row.authorization_notes}`);
        }
    }
}

async function main() {
    const client = await pool.connect();

    try {
        let running = true;

        while (running) {
            await showMenu();
            const choice = await question('\nSelect option (1-8): ');

            switch (choice) {
                case '1':
                    await viewLevels(client);
                    break;
                case '2':
                    await addLevel(client);
                    break;
                case '3':
                    await updateLevel(client);
                    break;
                case '4':
                    await deleteLevel(client);
                    break;
                case '5':
                    await viewUserLimits(client);
                    break;
                case '6':
                    await addUserLimit(client);
                    break;
                case '7':
                    await viewHistory(client);
                    break;
                case '8':
                    running = false;
                    console.log('\nGoodbye! 👋');
                    break;
                default:
                    console.log('\n❌ Invalid option. Please select 1-8.');
            }
        }
    } finally {
        rl.close();
        client.release();
        await pool.end();
    }
}

main();
