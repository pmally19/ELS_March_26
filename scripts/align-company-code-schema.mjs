import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function alignCompanyCodeSchema() {
    const client = await pool.connect();

    try {
        console.log('🔧 Aligning company_codes table schema...\n');

        await client.query('BEGIN');

        // Add description column
        console.log('Adding description column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS description TEXT
        `);

        // Add tax_id column
        console.log('Adding tax_id column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50)
        `);

        // Add address column
        console.log('Adding address column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS address TEXT
        `);

        // Add state column
        console.log('Adding state column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS state VARCHAR(100)
        `);

        // Add postal_code column
        console.log('Adding postal_code column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)
        `);

        // Add phone column
        console.log('Adding phone column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS phone VARCHAR(50)
        `);

        // Add email column
        console.log('Adding email column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS email VARCHAR(255)
        `);

        // Add website column
        console.log('Adding website column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS website VARCHAR(255)
        `);

        // Add logo_url column
        console.log('Adding logo_url column...');
        await client.query(`
            ALTER TABLE company_codes 
            ADD COLUMN IF NOT EXISTS logo_url TEXT
        `);

        await client.query('COMMIT');

        console.log('\n✅ Schema migration completed successfully!\n');

        // Verify the new schema
        const schemaQuery = `
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'company_codes'
            ORDER BY ordinal_position
        `;

        const result = await client.query(schemaQuery);

        console.log('📋 Updated Schema (Total columns:', result.rows.length, '):\n');
        result.rows.forEach((row, idx) => {
            const maxLength = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
            console.log(`${idx + 1}. ${row.column_name} - ${row.data_type}${maxLength}`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

alignCompanyCodeSchema();
