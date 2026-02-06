-- Fix stock_balances constraint to allow ATP calculations with ordered quantities
-- The constraint should allow available_quantity to exceed quantity when there are ordered quantities
-- Formula: Available = In Stock - Committed - Reserved + Ordered
-- So: Available can be > In Stock when Ordered > Committed + Reserved

-- Drop the incorrect constraint if it exists
ALTER TABLE stock_balances DROP CONSTRAINT IF EXISTS check_available_le_quantity;

-- Add correct constraint that allows ATP calculations
-- Available quantity should be <= quantity + ordered_quantity (allows ATP to work correctly)
ALTER TABLE stock_balances ADD CONSTRAINT check_available_le_quantity_with_ordered 
  CHECK (available_quantity <= (COALESCE(quantity, 0) + COALESCE(ordered_quantity, 0)));

-- Also ensure available_quantity is not negative
ALTER TABLE stock_balances DROP CONSTRAINT IF EXISTS check_available_non_negative;
ALTER TABLE stock_balances ADD CONSTRAINT check_available_non_negative 
  CHECK (available_quantity >= 0);

