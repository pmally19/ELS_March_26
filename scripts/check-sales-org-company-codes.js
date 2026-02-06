import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function checkSalesOrgCompanyCode() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking sales organization company codes...\n');

        // Check sd_sales_organizations first
        try {
            const result = await client.query(`
        SELECT 
          id,
          code,
          name,
          company_code_id
        FROM sd_sales_organizations
        ORDER BY code;
      `);

            if (result.rows.length > 0) {
                console.log('✅ Found in sd_sales_organizations:');
                console.table(result.rows);

                const withoutCompanyCode = result.rows.filter(row => !row.company_code_id);
                if (withoutCompanyCode.length > 0) {
                    console.log('\n⚠️  Sales organizations WITHOUT company_code_id:');
                    console.table(withoutCompanyCode);
                }
            } else {
                console.log('No records in sd_sales_organizations');
            }
        } catch (error) {
            console.log('sd_sales_organizations table not found, checking sales_organizations...\n');

            // Fallback to check sales_organizations
            const result = await client.query(`
        SELECT 
          id,
          code,
          name,
          company_code_id
        FROM sales_organizations
        ORDER BY code;
      `);

            if (result.rows.length > 0) {
                console.log('✅ Found in sales_organizations:');
                console.table(result.rows);

                const withoutCompanyCode = result.rows.filter(row => !row.company_code_id);
                if (withoutCompanyCode.length > 0) {
                    console.log('\n⚠️  Sales organizations WITHOUT company_code_id:');
                    console.table(withoutCompanyCode);
                }
            } else {
                console.log('No records in sales_organizations');
            }
        }

        // Check available company codes
        console.log('\n📋 Available Company Codes:');
        const ccResult = await client.query(`
      SELECT id, code, name
      FROM company_codes
      ORDER BY code;
    `);
        console.table(ccResult.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSalesOrgCompanyCode()
    .then(() => {
        console.log('\n✅ Check completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Check failed:', error);
        process.exit(1);
    });
