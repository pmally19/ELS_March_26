-- Migration: Fix billing_items unit column length
-- Date: 2025-10-28
-- Description: Increase unit column from VARCHAR(2) to VARCHAR(10) to allow proper unit names

-- Alter the unit column to allow longer unit names
ALTER TABLE billing_items 
ALTER COLUMN unit TYPE VARCHAR(10);

-- Add comment
COMMENT ON COLUMN billing_items.unit IS 'Unit of measure (e.g., EA, PC, KG, LB, PIECE, EACH)';

