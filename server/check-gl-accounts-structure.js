import { pool } from './db.js';

async function checkGLAccountsTable() {
    try {
        console.log('🔍 Checking GL Accounts table structure...\n');

        const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'gl_accounts'
      ORDER BY ordinal_position
    `);

        console.log('Columns in gl_accounts table:\n');
        result.rows.forEach(row => {
            const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`  ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${nullable}`);
        });

        const hasCoA = result.rows.some(row => row.column_name === 'chart_of_accounts');

        console.log('\n' + '='.repeat(80));
        if (hasCoA) {
            console.log('✅ chart_of_accounts column EXISTS in gl_accounts table');

            // Check sample data
            const sample = await pool.query('SELECT account_number, account_name, chart_of_accounts FROM gl_accounts LIMIT 5');
            console.log('\nSample GL Accounts with CoA:');
            sample.rows.forEach(row => {
                console.log(`  ${row.account_number} - ${row.account_name} (CoA: ${row.chart_of_accounts || 'NULL'})`);
            });
        } else {
            console.log('❌ chart_of_accounts column DOES NOT EXIST in gl_accounts table');
            console.log('   Need to add this column before implementing Material Account Determination');
        }
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkGLAccountsTable();
