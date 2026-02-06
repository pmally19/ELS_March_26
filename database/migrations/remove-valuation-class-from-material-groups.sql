-- Migration to remove valuation_class column from material_groups table
-- This migration drops the valuation_class column and its associated index

-- Drop the index first (if it exists)
DROP INDEX IF EXISTS idx_material_groups_valuation_class;

-- Drop the column (if it exists)
ALTER TABLE material_groups 
DROP COLUMN IF EXISTS valuation_class;

-- Add comment
COMMENT ON TABLE material_groups IS 'Master data table for material groups - used to categorize materials (valuation_class removed)';

