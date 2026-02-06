-- Migration to remove all DEFAULT constraints from purchase order tables
-- This ensures all values must be explicitly provided or queried from database

-- Remove defaults from purchase_order_items table
ALTER TABLE purchase_order_items 
  ALTER COLUMN received_quantity DROP DEFAULT,
  ALTER COLUMN invoiced_quantity DROP DEFAULT,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN active DROP DEFAULT,
  ALTER COLUMN updated_at DROP DEFAULT;

-- Remove defaults from purchase_orders table
ALTER TABLE purchase_orders 
  ALTER COLUMN exchange_rate DROP DEFAULT,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN updated_at DROP DEFAULT,
  ALTER COLUMN active DROP DEFAULT;

-- Note: id columns keep their DEFAULT nextval() as they are auto-generated
-- Note: order_date and quantity/unit_price/total_price keep NOT NULL as they are required fields

