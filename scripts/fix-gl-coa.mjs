import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function fixGLCoA() {
    try {
        console.log('🔧 Fixing GL accounts with mismatched Chart of Accounts...\n');

        // Update GL accounts to match company code's CoA
        const result = await pool.query(`
      UPDATE gl_accounts ga
      SET chart_of_accounts_id = cc.chart_of_accounts_id
      FROM company_codes cc
      WHERE ga.company_code_id = cc.id
        AND ga.chart_of_accounts_id != cc.chart_of_accounts_id
        AND cc.chart_of_accounts_id IS NOT NULL
    `);

        console.log(`✅ Updated ${result.rowCount} GL accounts to match company code CoA assignment`);

        // Verify the fix
        const verifyResult = await pool.query(`
      SELECT COUNT(*) as total_mismatches
      FROM gl_accounts ga
      INNER JOIN company_codes cc ON ga.company_code_id = cc.id
      WHERE ga.chart_of_accounts_id != cc.chart_of_accounts_id
        AND cc.chart_of_accounts_id IS NOT NULL
    `);

        const remaining = parseInt(verifyResult.rows[0].total_mismatches);
        if (remaining === 0) {
            console.log('✅ Verification: All GL accounts now match their company code CoA');
        } else {
            console.log(`⚠️  Warning: ${remaining} mismatches still remain`);
        }

    } catch (error) {
        console.error('❌ Error fixing GL CoA mismatches:', error);
    } finally {
        await pool.end();
    }
}

fixGLCoA();
