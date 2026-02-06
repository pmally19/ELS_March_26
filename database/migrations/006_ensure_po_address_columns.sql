-- Migration: Ensure Purchase Order Address Columns Exist
-- Date: 2025-11-09
-- Description: Ensures pay_to_address_id and ship_to_address_id columns exist in purchase_orders table
--              and adds foreign key constraints if they don't exist

-- Add pay_to_address_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders' 
        AND column_name = 'pay_to_address_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN pay_to_address_id INTEGER;
        RAISE NOTICE 'Added pay_to_address_id to purchase_orders';
    ELSE
        RAISE NOTICE 'Column pay_to_address_id already exists in purchase_orders';
    END IF;
END $$;

-- Add ship_to_address_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders' 
        AND column_name = 'ship_to_address_id'
    ) THEN
        ALTER TABLE purchase_orders ADD COLUMN ship_to_address_id INTEGER;
        RAISE NOTICE 'Added ship_to_address_id to purchase_orders';
    ELSE
        RAISE NOTICE 'Column ship_to_address_id already exists in purchase_orders';
    END IF;
END $$;

-- Add foreign key constraint for pay_to_address_id if addresses table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'addresses'
    ) THEN
        -- Check if constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'purchase_orders' 
            AND constraint_name = 'fk_purchase_orders_pay_to_address'
        ) THEN
            ALTER TABLE purchase_orders 
            ADD CONSTRAINT fk_purchase_orders_pay_to_address 
                FOREIGN KEY (pay_to_address_id) 
                REFERENCES addresses(id) 
                ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for pay_to_address_id';
        END IF;
    END IF;
END $$;

-- Add foreign key constraint for ship_to_address_id if addresses table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'addresses'
    ) THEN
        -- Check if constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'purchase_orders' 
            AND constraint_name = 'fk_purchase_orders_ship_to_address'
        ) THEN
            ALTER TABLE purchase_orders 
            ADD CONSTRAINT fk_purchase_orders_ship_to_address 
                FOREIGN KEY (ship_to_address_id) 
                REFERENCES addresses(id) 
                ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for ship_to_address_id';
        END IF;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN purchase_orders.pay_to_address_id IS 'Address for payment (from vendor master data)';
COMMENT ON COLUMN purchase_orders.ship_to_address_id IS 'Address where goods should be shipped (from warehouse/plant)';

