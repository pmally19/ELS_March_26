-- Migration: Fix goods_receipts table schema to match code expectations
-- This migration adds missing columns needed for purchase order flow
-- All changes are idempotent and safe to run multiple times

-- Add missing columns to goods_receipts table
DO $$
BEGIN
    -- Add grn_number column (Goods Receipt Note number)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'grn_number'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN grn_number VARCHAR(50);
        -- Populate from receipt_number if it exists
        UPDATE goods_receipts SET grn_number = receipt_number WHERE grn_number IS NULL AND receipt_number IS NOT NULL;
        RAISE NOTICE 'Added grn_number column to goods_receipts';
    END IF;

    -- Add material_code column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'material_code'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN material_code VARCHAR(50);
        RAISE NOTICE 'Added material_code column to goods_receipts';
    END IF;

    -- Add plant_id column (integer reference to plants table)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'plant_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN plant_id INTEGER;
        -- Try to populate from plant_code if plants table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plants') THEN
            UPDATE goods_receipts gr
            SET plant_id = p.id
            FROM plants p
            WHERE gr.plant_code = p.code 
            AND gr.plant_id IS NULL;
        END IF;
        RAISE NOTICE 'Added plant_id column to goods_receipts';
    END IF;

    -- Add storage_location_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'storage_location_id'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN storage_location_id INTEGER;
        RAISE NOTICE 'Added storage_location_id column to goods_receipts';
    END IF;

    -- Add quantity column (per line item, not total)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN quantity NUMERIC(15,3);
        -- Populate from total_quantity if it exists
        UPDATE goods_receipts SET quantity = total_quantity WHERE quantity IS NULL AND total_quantity IS NOT NULL;
        RAISE NOTICE 'Added quantity column to goods_receipts';
    END IF;

    -- Add unit_price column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN unit_price NUMERIC(15,2);
        RAISE NOTICE 'Added unit_price column to goods_receipts';
    END IF;

    -- Add total_value column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'total_value'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN total_value NUMERIC(15,2);
        -- Populate from total_amount if it exists
        UPDATE goods_receipts SET total_value = total_amount WHERE total_value IS NULL AND total_amount IS NOT NULL;
        RAISE NOTICE 'Added total_value column to goods_receipts';
    END IF;

    -- Add receipt_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'receipt_type'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN receipt_type VARCHAR(50);
        -- Set default based on purchase_order_id
        UPDATE goods_receipts SET receipt_type = 'PURCHASE_ORDER' 
        WHERE receipt_type IS NULL AND purchase_order_id IS NOT NULL;
        RAISE NOTICE 'Added receipt_type column to goods_receipts';
    END IF;

    -- Add reference_document column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'reference_document'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN reference_document VARCHAR(100);
        -- Populate from purchase_order if it exists
        UPDATE goods_receipts SET reference_document = purchase_order 
        WHERE reference_document IS NULL AND purchase_order IS NOT NULL;
        RAISE NOTICE 'Added reference_document column to goods_receipts';
    END IF;

    -- Add batch_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'batch_number'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN batch_number VARCHAR(50);
        RAISE NOTICE 'Added batch_number column to goods_receipts';
    END IF;

    -- Add received_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goods_receipts' 
        AND column_name = 'received_by'
    ) THEN
        ALTER TABLE goods_receipts ADD COLUMN received_by VARCHAR(100);
        -- Populate from created_by if it exists
        UPDATE goods_receipts SET received_by = created_by 
        WHERE received_by IS NULL AND created_by IS NOT NULL;
        RAISE NOTICE 'Added received_by column to goods_receipts';
    END IF;
END $$;

-- Add foreign key constraint for plant_id if plants table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plants') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'goods_receipts_fk_plant'
        ) THEN
            BEGIN
                ALTER TABLE goods_receipts 
                ADD CONSTRAINT goods_receipts_fk_plant 
                FOREIGN KEY (plant_id) REFERENCES plants(id);
                RAISE NOTICE 'Added foreign key constraint goods_receipts_fk_plant';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint goods_receipts_fk_plant: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- Add foreign key constraint for storage_location_id if storage_locations table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'goods_receipts_fk_storage_location'
        ) THEN
            BEGIN
                ALTER TABLE goods_receipts 
                ADD CONSTRAINT goods_receipts_fk_storage_location 
                FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id);
                RAISE NOTICE 'Added foreign key constraint goods_receipts_fk_storage_location';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint goods_receipts_fk_storage_location: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_goods_receipts_grn_number ON goods_receipts(grn_number);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_material_code ON goods_receipts(material_code);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_plant_id ON goods_receipts(plant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_purchase_order_id ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_posted ON goods_receipts(posted);

-- Add comments for documentation
COMMENT ON COLUMN goods_receipts.grn_number IS 'Goods Receipt Note number - unique identifier for the receipt';
COMMENT ON COLUMN goods_receipts.material_code IS 'Material code for the received item';
COMMENT ON COLUMN goods_receipts.plant_id IS 'Reference to plant where goods are received';
COMMENT ON COLUMN goods_receipts.storage_location_id IS 'Reference to storage location where goods are stored';
COMMENT ON COLUMN goods_receipts.quantity IS 'Quantity received for this line item';
COMMENT ON COLUMN goods_receipts.unit_price IS 'Unit price of the received material';
COMMENT ON COLUMN goods_receipts.total_value IS 'Total value of the received quantity';
COMMENT ON COLUMN goods_receipts.receipt_type IS 'Type of receipt: PURCHASE_ORDER, PRODUCTION, etc.';
COMMENT ON COLUMN goods_receipts.reference_document IS 'Reference to source document (e.g., purchase order number)';
COMMENT ON COLUMN goods_receipts.batch_number IS 'Batch or lot number for the received material';
COMMENT ON COLUMN goods_receipts.received_by IS 'Person who received the goods';

