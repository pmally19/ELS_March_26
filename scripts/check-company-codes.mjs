// Check what company codes exist
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function checkCompanies() {
    const client = await pool.connect();

    try {
        console.log('📋 Available company codes:\n');

        const result = await client.query(`
      SELECT code, name, active
      FROM company_codes
      ORDER BY code
    `);

        if (result.rows.length === 0) {
            console.log('   ⚠️ No company codes found!\n');
            console.log('   Creating default company code...');

            await client.query(`
        INSERT INTO company_codes (code, name, active)
        VALUES ('1000', 'Main Company', true)
        ON CONFLICT (code) DO NOTHING
      `);

            console.log('   ✅ Created company code: 1000\n');
        } else {
            result.rows.forEach(cc => {
                console.log(`   ${cc.active ? '✅' : '❌'} ${cc.code}: ${cc.name}`);
            });
        }

        console.log(`\nTotal: ${result.rows.length} company codes`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCompanies();
