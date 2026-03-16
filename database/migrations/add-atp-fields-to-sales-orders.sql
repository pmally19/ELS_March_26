-- ================================================================
-- MIGRATION: Add ATP (Available-to-Promise) Fields to Sales Orders
-- Purpose: Enable stock availability checking and production requirement flagging
-- ================================================================

-- Add ATP-related fields to sales_orders table
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS stock_check_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS production_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS atp_quantity DECIMAL(15, 3);

-- Add check constraint for availability_status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_sales_orders_availability_status'
  ) THEN
    ALTER TABLE sales_orders
      ADD CONSTRAINT chk_sales_orders_availability_status
      CHECK (availability_status IN ('PENDING', 'AVAILABLE', 'PARTIAL', 'NOT_AVAILABLE'));
  END IF;
END $$;

-- Add index for performance on production_required queries
CREATE INDEX IF NOT EXISTS idx_sales_orders_production_required 
  ON sales_orders(production_required) 
  WHERE production_required = TRUE;

-- Add index for ATP status
CREATE INDEX IF NOT EXISTS idx_sales_orders_availability_status 
  ON sales_orders(availability_status);

-- Add comments for documentation
COMMENT ON COLUMN sales_orders.availability_status IS 'ATP check result: PENDING, AVAILABLE, PARTIAL, NOT_AVAILABLE';
COMMENT ON COLUMN sales_orders.stock_check_date IS 'Date and time when last ATP check was performed';
COMMENT ON COLUMN sales_orders.production_required IS 'Flag indicating if production is required to fulfill order';
COMMENT ON COLUMN sales_orders.atp_quantity IS 'Available-to-promise quantity from ATP check';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'ATP fields added to sales_orders table successfully';
END $$;
