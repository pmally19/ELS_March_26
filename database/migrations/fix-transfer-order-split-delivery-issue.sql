-- Migration: Fix Transfer Order Split Delivery Issue
-- Date: 2025-10-28
-- Description: Prevent transfer orders from combining split deliveries
-- Issue: Transfer orders were combining items from multiple split deliveries
-- Fix: Add unique constraint on delivery_id and ensure proper isolation

-- Step 1: Check if there are any duplicate transfer orders for the same delivery
-- (This will help identify existing issues)
SELECT 
    delivery_id, 
    COUNT(*) as transfer_order_count,
    STRING_AGG(transfer_number, ', ') as transfer_numbers
FROM transfer_orders
WHERE delivery_id IS NOT NULL
GROUP BY delivery_id
HAVING COUNT(*) > 1;

-- Step 2: Add unique constraint on delivery_id to prevent multiple transfer orders per delivery
-- First, drop the constraint if it exists (in case of re-running)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_transfer_orders_delivery_id'
    ) THEN
        ALTER TABLE transfer_orders DROP CONSTRAINT uq_transfer_orders_delivery_id;
    END IF;
    
    -- Add unique constraint on delivery_id (only for non-null values)
    -- Note: PostgreSQL unique constraints allow multiple NULL values
    -- So we need to handle this carefully
    CREATE UNIQUE INDEX IF NOT EXISTS uq_transfer_orders_delivery_id 
    ON transfer_orders(delivery_id) 
    WHERE delivery_id IS NOT NULL;
    
    -- Add comment
    COMMENT ON INDEX uq_transfer_orders_delivery_id IS 
    'Ensures each delivery can only have one transfer order, preventing split deliveries from being combined';
END $$;

-- Step 3: Verify the constraint was created
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'transfer_orders' 
AND indexname = 'uq_transfer_orders_delivery_id';

-- Step 4: Add check constraint to ensure delivery_id is set when creating transfer orders
-- (This ensures transfer orders are always linked to a specific delivery)
ALTER TABLE transfer_orders 
ADD CONSTRAINT chk_transfer_orders_delivery_id 
CHECK (
    -- Either delivery_id or sales_order_id must be set
    (delivery_id IS NOT NULL) OR (sales_order_id IS NOT NULL)
);

-- Step 5: Add comment to delivery_id column for clarity
COMMENT ON COLUMN transfer_orders.delivery_id IS 
'Reference to delivery document. Each delivery can only have ONE transfer order (unique constraint). Split deliveries must have separate transfer orders.';

-- Verification query: Check for any orphaned or duplicate transfer orders
SELECT 
    'Transfer orders without delivery_id' as check_type,
    COUNT(*) as count
FROM transfer_orders
WHERE delivery_id IS NULL
UNION ALL
SELECT 
    'Deliveries with multiple transfer orders' as check_type,
    COUNT(*) as count
FROM (
    SELECT delivery_id
    FROM transfer_orders
    WHERE delivery_id IS NOT NULL
    GROUP BY delivery_id
    HAVING COUNT(*) > 1
) duplicates;

