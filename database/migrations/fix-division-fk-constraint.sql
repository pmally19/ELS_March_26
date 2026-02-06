-- Fix division foreign key to reference sd_divisions instead of divisions
-- This migration corrects the foreign key constraint for sales_orders.division_id

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE sales_orders 
DROP CONSTRAINT IF EXISTS fk_sales_orders_division;

-- Step 2: Add the correct foreign key constraint pointing to sd_divisions
ALTER TABLE sales_orders 
ADD CONSTRAINT fk_sales_orders_division 
FOREIGN KEY (division_id) 
REFERENCES sd_divisions(id) 
ON DELETE SET NULL;

-- Verify the constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'sales_orders'
    AND kcu.column_name = 'division_id';
