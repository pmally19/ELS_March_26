// Migration script to add purchase_order column to vendor_invoices table
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting migration: Add purchase_order column to vendor_invoices...\n');

        // Check if column already exists
        console.log('1️⃣ Checking if purchase_order column exists...');
        const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vendor_invoices'
      AND column_name = 'purchase_order'
    `);

        if (columnCheck.rows.length > 0) {
            console.log('   ✅ Column purchase_order already exists - skipping\n');
            return;
        }

        console.log('   ℹ️  Column does not exist - proceeding with migration\n');

        // Add the column
        console.log('2️⃣ Adding purchase_order column...');
        await client.query(`
      ALTER TABLE vendor_invoices 
      ADD COLUMN purchase_order VARCHAR(20)
    `);
        console.log('   ✅ Added column: purchase_order VARCHAR(20)\n');

        // Create index
        console.log('3️⃣ Creating index...');
        await client.query(`
      CREATE INDEX idx_vendor_invoices_purchase_order 
      ON vendor_invoices(purchase_order)
    `);
        console.log('   ✅ Created index: idx_vendor_invoices_purchase_order\n');

        // Get current structure
        console.log('4️⃣ Verifying table structure...');
        const structure = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vendor_invoices'
      ORDER BY ordinal_position
    `);

        console.log('   📋 vendor_invoices columns:');
        structure.rows.forEach(col => {
            const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`      - ${col.column_name}: ${col.data_type}${maxLen} ${nullable}`);
        });

        console.log('\n✅ Migration completed successfully!');
        console.log('🎉 You can now filter vendor invoices by purchase order number!\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.detail) console.error('   Detail:', error.detail);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
