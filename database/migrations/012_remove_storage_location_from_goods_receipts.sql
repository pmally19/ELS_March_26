-- Migration: Remove storage_location_id from goods_receipts table
-- Date: 2025-11-11
-- Description: Removes storage_location_id column from goods_receipts table as it's replaced by warehouse_type_id

-- Drop the column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'storage_location_id'
    ) THEN
        -- Drop foreign key constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'goods_receipts' 
            AND constraint_name = 'goods_receipts_storage_location_id_fkey'
        ) THEN
            ALTER TABLE goods_receipts 
            DROP CONSTRAINT goods_receipts_storage_location_id_fkey;
            RAISE NOTICE 'Dropped foreign key constraint for storage_location_id';
        END IF;
        
        -- Drop the column
        ALTER TABLE goods_receipts 
        DROP COLUMN storage_location_id;
        RAISE NOTICE 'Dropped storage_location_id column from goods_receipts';
    ELSE
        RAISE NOTICE 'Column storage_location_id does not exist in goods_receipts';
    END IF;
END $$;

-- Drop index if it exists
DROP INDEX IF EXISTS idx_goods_receipts_storage_location_id;

-- Add comment
COMMENT ON TABLE goods_receipts IS 'Goods receipts table - uses warehouse_type_id instead of storage_location_id';

