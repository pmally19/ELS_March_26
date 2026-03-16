-- Asset Management Database Cleanup and Optimization
-- Date: 2025-12-31
-- Purpose: Remove redundant fields, add indexes, optimize schema
-- Database: mallyerp
-- Password: Mokshith@21

-- ============================================
-- STEP 1: Remove Redundant Fields
-- ============================================

-- Remove duplicate 'active' column (keep 'is_active')
-- First, ensure data is synced
UPDATE asset_master 
SET is_active = COALESCE(is_active, active, true)
WHERE is_active IS NULL OR active IS NOT NULL;

-- Now drop the redundant column
ALTER TABLE asset_master DROP COLUMN IF EXISTS active;

-- Remove redundant 'asset_class' text field (we have asset_class_id FK)
-- This prevents data inconsistency
ALTER TABLE asset_master DROP COLUMN IF EXISTS asset_class;

-- ============================================
-- STEP 2: Add Performance Indexes
-- ============================================

-- Index on company_code_id for filtering by company
CREATE INDEX IF NOT EXISTS idx_asset_master_company_code 
  ON asset_master(company_code_id) 
  WHERE company_code_id IS NOT NULL;

-- Index on cost_center_id for cost center reports
CREATE INDEX IF NOT EXISTS idx_asset_master_cost_center 
  ON asset_master(cost_center_id) 
  WHERE cost_center_id IS NOT NULL;

-- Index on asset_class_id for class-based filtering
CREATE INDEX IF NOT EXISTS idx_asset_master_asset_class 
  ON asset_master(asset_class_id) 
  WHERE asset_class_id IS NOT NULL;

-- Index on status for filtering by asset status
CREATE INDEX IF NOT EXISTS idx_asset_master_status 
  ON asset_master(status) 
  WHERE status IS NOT NULL;

-- Index on is_active for active/inactive filtering
CREATE INDEX IF NOT EXISTS idx_asset_master_is_active 
  ON asset_master(is_active);

-- Composite index for common query pattern (company + active)
CREATE INDEX IF NOT EXISTS idx_asset_master_company_active 
  ON asset_master(company_code_id, is_active) 
  WHERE company_code_id IS NOT NULL;

-- Index on capitalization_date for period filtering
CREATE INDEX IF NOT EXISTS idx_asset_master_capitalization_date 
  ON asset_master(capitalization_date) 
  WHERE capitalization_date IS NOT NULL;

-- Index on retirement_date for retired asset queries
CREATE INDEX IF NOT EXISTS idx_asset_master_retirement_date 
  ON asset_master(retirement_date) 
  WHERE retirement_date IS NOT NULL;

-- ============================================
-- STEP 3: Add/Update Constraints
-- ============================================

-- Ensure name is NOT NULL (critical field)
ALTER TABLE asset_master 
  ALTER COLUMN name SET NOT NULL;

-- Ensure is_active is NOT NULL with default
ALTER TABLE asset_master 
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true;

-- Add CHECK constraint for useful_life_years (must be positive if set)
ALTER TABLE asset_master 
  DROP CONSTRAINT IF EXISTS chk_useful_life_positive;

ALTER TABLE asset_master 
  ADD CONSTRAINT chk_useful_life_positive 
  CHECK (useful_life_years IS NULL OR useful_life_years > 0);

-- Add CHECK constraint for acquisition_cost (must be non-negative)
ALTER TABLE asset_master 
  DROP CONSTRAINT IF EXISTS chk_acquisition_cost_nonnegative;

ALTER TABLE asset_master 
  ADD CONSTRAINT chk_acquisition_cost_nonnegative 
  CHECK (acquisition_cost IS NULL OR acquisition_cost >= 0);

-- Add CHECK constraint for accumulated_depreciation (must be non-negative)
ALTER TABLE asset_master 
  DROP CONSTRAINT IF EXISTS chk_accumulated_depreciation_nonnegative;

ALTER TABLE asset_master 
  ADD CONSTRAINT chk_accumulated_depreciation_nonnegative 
  CHECK (accumulated_depreciation IS NULL OR accumulated_depreciation >= 0);

-- ============================================
-- STEP 4: Create/Update Triggers
-- ============================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_update_net_book_value ON asset_master;
DROP FUNCTION IF EXISTS update_net_book_value();

-- Create function to automatically calculate net_book_value
CREATE OR REPLACE FUNCTION update_net_book_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate net book value: acquisition cost - accumulated depreciation
  NEW.net_book_value = COALESCE(NEW.acquisition_cost, 0) 
                     - COALESCE(NEW.accumulated_depreciation, 0);
  
  -- Ensure it doesn't go negative
  IF NEW.net_book_value < 0 THEN
    NEW.net_book_value = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before INSERT or UPDATE
CREATE TRIGGER trigger_update_net_book_value
  BEFORE INSERT OR UPDATE OF acquisition_cost, accumulated_depreciation
  ON asset_master
  FOR EACH ROW
  EXECUTE FUNCTION update_net_book_value();

-- ============================================
-- STEP 5: Update Existing Records
-- ============================================

-- Calculate net_book_value for all existing assets
UPDATE asset_master
SET net_book_value = GREATEST(
  COALESCE(acquisition_cost, 0) - COALESCE(accumulated_depreciation, 0),
  0
);

-- Set default values for critical fields if NULL
UPDATE asset_master
SET is_active = true
WHERE is_active IS NULL;

-- ============================================
-- STEP 6: Add Helpful Comments
-- ============================================

COMMENT ON COLUMN asset_master.net_book_value IS 'Automatically calculated: acquisition_cost - accumulated_depreciation';
COMMENT ON COLUMN asset_master.is_active IS 'Asset active status - true for active, false for deactivated';
COMMENT ON COLUMN asset_master.asset_class_id IS 'Foreign key to asset_classes table - use this instead of text field';
COMMENT ON COLUMN asset_master.accumulated_depreciation IS 'Total depreciation posted to date';
COMMENT ON COLUMN asset_master.last_depreciation_date IS 'Date of last depreciation posting';
COMMENT ON COLUMN asset_master.capitalization_date IS 'Date when asset was capitalized and depreciation started';
COMMENT ON COLUMN asset_master.retirement_date IS 'Date when asset was retired/disposed';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that all active assets have required fields
SELECT 
  COUNT(*) as total_assets,
  COUNT(CASE WHEN asset_number IS NOT NULL THEN 1 END) as with_number,
  COUNT(CASE WHEN asset_class_id IS NOT NULL THEN 1 END) as with_class,
  COUNT(CASE WHEN company_code_id IS NOT NULL THEN 1 END) as with_company,
  COUNT(CASE WHEN acquisition_cost IS NOT NULL THEN 1 END) as with_cost
FROM asset_master
WHERE is_active = true;

-- Verify net_book_value calculation
SELECT 
  id,
  asset_number,
  acquisition_cost,
  accumulated_depreciation,
  net_book_value,
  CASE 
    WHEN net_book_value != COALESCE(acquisition_cost, 0) - COALESCE(accumulated_depreciation, 0)
    THEN 'MISMATCH'
    ELSE 'OK'
  END as calculation_check
FROM asset_master
WHERE is_active = true
LIMIT 10;

-- Check index creation
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'asset_master'
ORDER BY indexname;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Asset Management Database Cleanup Complete!';
  RAISE NOTICE 'Redundant fields removed: active, asset_class';
  RAISE NOTICE 'Performance indexes added: 8 indexes';
  RAISE NOTICE 'Constraints enforced: 3 CHECK constraints';
  RAISE NOTICE 'Trigger created: net_book_value auto-calculation';
END $$;
