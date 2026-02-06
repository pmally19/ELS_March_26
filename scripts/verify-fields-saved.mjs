import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifyFieldsSaved() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking if test company with all fields exists...\n');

        // Look for a recently created test company
        const result = await client.query(`
            SELECT * FROM company_codes 
            WHERE code LIKE 'TEST%' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            console.log('❌ No test company found in database');
            console.log('Please run the test script first: node scripts/test-company-code-api.mjs');
        } else {
            const company = result.rows[0];
            console.log('✅ Found test company:\n');
            console.log(`Code: ${company.code}`);
            console.log(`Name: ${company.name}`);
            console.log(`\n📋 New Fields Status:`);
            console.log(`  description: ${company.description || '❌ NULL'}`);
            console.log(`  tax_id: ${company.tax_id || '❌ NULL'}`);
            console.log(`  address: ${company.address || '❌ NULL'}`);
            console.log(`  state: ${company.state || '❌ NULL'}`);
            console.log(`  postal_code: ${company.postal_code || '❌ NULL'}`);
            console.log(`  phone: ${company.phone || '❌ NULL'}`);
            console.log(`  email: ${company.email || '❌ NULL'}`);
            console.log(`  website: ${company.website || '❌ NULL'}`);
            console.log(`  logo_url: ${company.logo_url || '❌ NULL'}`);

            // Count how many new fields are NOT null
            const newFields = [company.description, company.tax_id, company.address, company.state,
            company.postal_code, company.phone, company.email, company.website, company.logo_url];
            const nonNullCount = newFields.filter(f => f !== null).length;

            console.log(`\n${nonNullCount > 0 ? '✅' : '❌'} Result: ${nonNullCount}/9 new fields have data`);

            if (nonNullCount === 9) {
                console.log('\n🎉 SUCCESS! All fields are being saved correctly!');
            } else if (nonNullCount === 0) {
                console.log('\n❌ FAILED: No fields are being saved (all NULL)');
            } else {
                console.log('\n⚠️  PARTIAL: Some fields saved, others are NULL');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyFieldsSaved();
