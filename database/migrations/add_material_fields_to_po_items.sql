-- Migration: Add material_code and unit_of_measure to purchase_order_items
-- Date: 2026-01-04

-- Add columns if they don't exist
ALTER TABLE purchase_order_items 
  ADD COLUMN IF NOT EXISTS material_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10);

-- Add comment
COMMENT ON COLUMN purchase_order_items.material_code IS 'Material code from materials table';
COMMENT ON COLUMN purchase_order_items.unit_of_measure IS 'Unit of measure for the material';
