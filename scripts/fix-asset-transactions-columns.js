// Quick migration script to add missing vendor_id and invoice_number columns to asset_transactions
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp',
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Adding vendor_id and invoice_number columns to asset_transactions table...\n');

        // Check current columns
        const checkColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'asset_transactions' 
      ORDER BY ordinal_position;
    `);
        console.log('Current columns:', checkColumns.rows.map(r => r.column_name).join(', '));

        // Add vendor_id column if it doesn't exist
        await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'asset_transactions' AND column_name = 'vendor_id'
        ) THEN
          ALTER TABLE asset_transactions ADD COLUMN vendor_id INTEGER REFERENCES vendors(id);
          RAISE NOTICE 'Added vendor_id column';
        ELSE
          RAISE NOTICE 'vendor_id column already exists';
        END IF;
      END $$;
    `);
        console.log('✅ vendor_id column checked/added');

        // Add invoice_number column if it doesn't exist
        await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'asset_transactions' AND column_name = 'invoice_number'
        ) THEN
          ALTER TABLE asset_transactions ADD COLUMN invoice_number VARCHAR(100);
          RAISE NOTICE 'Added invoice_number column';
        ELSE
          RAISE NOTICE 'invoice_number column already exists';
        END IF;
      END $$;
    `);
        console.log('✅ invoice_number column checked/added');

        // Verify columns after migration
        const verifyColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'asset_transactions' 
      ORDER BY ordinal_position;
    `);
        console.log('\nFinal columns:', verifyColumns.rows.map(r => r.column_name).join(', '));

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
