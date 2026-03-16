import express from 'express';
import { ensureActivePool } from '../database';

const router = express.Router();

// Add purchase_order column to vendor_invoices table
router.post('/add-purchase-order-column', async (req, res) => {
    try {
        const pool = ensureActivePool();

        console.log('🔧 Starting migration: Adding purchase_order column to vendor_invoices...');

        // Check if column already exists
        const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vendor_invoices'
      AND column_name = 'purchase_order'
    `);

        if (columnCheck.rows.length > 0) {
            console.log('✅ Column purchase_order already exists');
            return res.json({
                success: true,
                message: 'Column purchase_order already exists',
                alreadyExists: true
            });
        }

        // Add the column
        await pool.query(`
      ALTER TABLE vendor_invoices 
      ADD COLUMN purchase_order VARCHAR(20)
    `);
        console.log('✅ Added column: purchase_order VARCHAR(20)');

        // Create index
        await pool.query(`
      CREATE INDEX idx_vendor_invoices_purchase_order 
      ON vendor_invoices(purchase_order)
    `);
        console.log('✅ Created index: idx_vendor_invoices_purchase_order');

        // Get current structure
        const structure = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vendor_invoices'
      ORDER BY ordinal_position
    `);

        console.log('✅ Migration completed successfully!');
        console.log('📋 Current vendor_invoices structure:', structure.rows);

        res.json({
            success: true,
            message: 'Successfully added purchase_order column to vendor_invoices',
            structure: structure.rows
        });

    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            detail: error.detail
        });
    }
});

export default router;
