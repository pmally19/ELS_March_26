-- Migration: Add warehouse_type_id to goods_receipts table
-- Date: 2025-11-11
-- Description: Adds warehouse_type_id column to goods_receipts table to replace storage_location_id usage
--              and populates it from purchase_orders table for existing records

-- Add warehouse_type_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'warehouse_type_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN warehouse_type_id INTEGER;
        RAISE NOTICE 'Added warehouse_type_id column to goods_receipts';
    ELSE
        RAISE NOTICE 'Column warehouse_type_id already exists in goods_receipts';
    END IF;
END $$;

-- Add foreign key constraint for warehouse_type_id if warehouse_types table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types'
    ) THEN
        -- Check if constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'goods_receipts' 
            AND constraint_name = 'fk_goods_receipts_warehouse_type'
        ) THEN
            ALTER TABLE goods_receipts 
            ADD CONSTRAINT fk_goods_receipts_warehouse_type 
                FOREIGN KEY (warehouse_type_id) 
                REFERENCES warehouse_types(id) 
                ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for warehouse_type_id';
        END IF;
    END IF;
END $$;

-- Populate warehouse_type_id from purchase_orders for existing goods_receipts
-- Match by purchase_order number (receipt_number or purchase_order column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders' 
        AND column_name = 'warehouse_type_id'
    ) THEN
        -- Update goods_receipts with warehouse_type_id from purchase_orders
        UPDATE goods_receipts gr
        SET warehouse_type_id = po.warehouse_type_id
        FROM purchase_orders po
        WHERE gr.purchase_order = po.order_number
          AND gr.warehouse_type_id IS NULL
          AND po.warehouse_type_id IS NOT NULL;
        
        RAISE NOTICE 'Populated warehouse_type_id for existing goods_receipts from purchase_orders';
    END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_goods_receipts_warehouse_type_id 
ON goods_receipts(warehouse_type_id);

-- Add comment
COMMENT ON COLUMN goods_receipts.warehouse_type_id IS 'Warehouse type from purchase order (replaces storage_location_id usage)';

