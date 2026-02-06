-- Add inventory and credit check status columns to sales_orders table
-- This migration adds automatic check result tracking to sales orders

-- Add inventory status column
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS inventory_status VARCHAR(20) DEFAULT 'UNCHECKED';

-- Add credit check status column  
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS credit_check_status VARCHAR(20) DEFAULT 'PENDING';

-- Add comments for documentation
COMMENT ON COLUMN sales_orders.inventory_status IS 'Inventory availability status: UNCHECKED, AVAILABLE, PARTIAL, UNAVAILABLE';
COMMENT ON COLUMN sales_orders.credit_check_status IS 'Credit check result: PENDING, APPROVED, BLOCKED, EXCEEDED, NO_LIMIT_SET, ERROR';

-- Update existing orders to have default status
UPDATE sales_orders 
SET 
  inventory_status = 'UNCHECKED',
  credit_check_status = 'PENDING'
WHERE inventory_status IS NULL OR credit_check_status IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_inventory_status ON sales_orders(inventory_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_credit_check_status ON sales_orders(credit_check_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_combo ON sales_orders(status, inventory_status, credit_check_status);
