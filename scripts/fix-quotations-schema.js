import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function fixQuotationsSchema() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'mallyerp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

    const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

    const pool = new Pool({ connectionString });

    let client;
    try {
        console.log('🔄 Starting quotations table schema fix...');
        client = await pool.connect();

        // 1. Rename columns if they exist with old names
        console.log('📝 Renaming columns...');
        await client.query(`
      DO $$
      BEGIN
        IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='quotations' AND column_name='valid_until') THEN
          ALTER TABLE quotations RENAME COLUMN valid_until TO valid_until_date;
        END IF;
        IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='quotations' AND column_name='currency_code') THEN
          ALTER TABLE quotations RENAME COLUMN currency_code TO currency;
        END IF;
      END $$;
    `);

        // 2. Add missing columns
        console.log('📝 Adding missing columns...');

        // Notes
        await client.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;`);

        // Sales Person ID
        await client.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sales_person_id INTEGER;`);

        // Converted To Order ID
        await client.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS converted_to_order_id INTEGER;`);

        // Updated At
        await client.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;`);

        // Created By (with default for existing rows)
        await client.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by INTEGER DEFAULT 1 NOT NULL;`);

        // 3. Update data types to TIMESTAMP if they are DATE
        console.log('📝 Updating column types...');
        await client.query(`ALTER TABLE quotations ALTER COLUMN quotation_date TYPE TIMESTAMP USING quotation_date::TIMESTAMP;`);
        await client.query(`ALTER TABLE quotations ALTER COLUMN valid_until_date TYPE TIMESTAMP USING valid_until_date::TIMESTAMP;`);

        console.log('✅ Quotations table schema updated successfully!');

    } catch (error) {
        console.error('❌ Error updating schema:', error);
        throw error;
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

fixQuotationsSchema().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
