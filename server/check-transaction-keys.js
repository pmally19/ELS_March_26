import { pool } from './db.js';

console.log('\n📋 Checking Transaction Keys and Account Keys...\n');

async function checkKeys() {
    try {
        // Check transaction_keys
        console.log('=== TRANSACTION KEYS ===');
        const txKeysResult = await pool.query(`
      SELECT code, description, business_context 
      FROM transaction_keys 
      ORDER BY code 
      LIMIT 20
    `);

        if (txKeysResult.rows.length > 0) {
            console.log(`✅ Found ${txKeysResult.rows.length} transaction keys:\n`);
            txKeysResult.rows.forEach(row => {
                console.log(`  ${row.code.padEnd(10)} - ${row.description} (${row.business_context})`);
            });
        } else {
            console.log('⚠️  No transaction keys found\n');
        }

        // Check account_keys
        console.log('\n=== ACCOUNT KEYS ===');
        const accKeysResult = await pool.query(`
      SELECT code, description, account_type 
      FROM account_keys 
      ORDER BY code 
      LIMIT 20
    `);

        if (accKeysResult.rows.length > 0) {
            console.log(`✅ Found ${accKeysResult.rows.length} account keys:\n`);
            accKeysResult.rows.forEach(row => {
                console.log(`  ${row.code.padEnd(10)} - ${row.description} (${row.account_type || 'N/A'})`);
            });
        } else {
            console.log('⚠️  No account keys found\n');
        }

        // Check for MM-specific keys
        console.log('\n=== MM-SPECIFIC KEYS (for OBYC) ===');
        const mmKeys = ['BSX', 'BSA', 'GBB', 'PRD', 'AUM', 'WRX'];

        for (const key of mmKeys) {
            const result = await pool.query(`
        SELECT code, description FROM account_keys WHERE code = $1
        UNION ALL
        SELECT code, description FROM transaction_keys WHERE code = $1
      `, [key]);

            if (result.rows.length > 0) {
                console.log(`  ✅ ${key} - ${result.rows[0].description}`);
            } else {
                console.log(`  ❌ ${key} - NOT FOUND (needed for Material valuation)`);
            }
        }

        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkKeys();
