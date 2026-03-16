-- Migration: Add Warehouse Type to Purchase Orders
-- Date: 2025-01-28
-- Description: Adds warehouse_type_id column to purchase_orders table

-- Add warehouse_type_id column to purchase_orders table
DO $$
BEGIN
    -- Add warehouse_type_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders' 
        AND column_name = 'warehouse_type_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN warehouse_type_id INTEGER;
        
        -- Add foreign key constraint if warehouse_types table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'warehouse_types'
        ) THEN
            ALTER TABLE purchase_orders 
            ADD CONSTRAINT purchase_orders_warehouse_type_id_fk 
            FOREIGN KEY (warehouse_type_id) 
            REFERENCES warehouse_types(id) 
            ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Added warehouse_type_id to purchase_orders';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN purchase_orders.warehouse_type_id IS 'Reference to warehouse type for this purchase order';

