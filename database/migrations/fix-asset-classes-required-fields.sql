-- Migration: Fix Asset Classes - Add Required Fields
-- Purpose: Add required fields for account determination and depreciation method
-- Remove defaults, hardcoded values, and SAP terminology

-- Step 1: Add new required columns
ALTER TABLE asset_classes
  ADD COLUMN IF NOT EXISTS depreciation_method_id INTEGER REFERENCES depreciation_methods(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS account_determination_key VARCHAR(50),
  ADD COLUMN IF NOT EXISTS number_range_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS screen_layout_code VARCHAR(50);

-- Step 2: Remove default values
ALTER TABLE asset_classes
  ALTER COLUMN is_active DROP DEFAULT;

-- Step 3: Create junction table for asset class and company code assignment
CREATE TABLE IF NOT EXISTS asset_class_company_codes (
  id SERIAL PRIMARY KEY,
  asset_class_id INTEGER NOT NULL REFERENCES asset_classes(id) ON DELETE CASCADE,
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(asset_class_id, company_code_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_class_company_codes_asset_class ON asset_class_company_codes(asset_class_id);
CREATE INDEX IF NOT EXISTS idx_asset_class_company_codes_company_code ON asset_class_company_codes(company_code_id);

-- Step 4: Migrate existing data if any
-- If default_depreciation_method exists, try to find matching depreciation_method_id
DO $$
DECLARE
  ac_record RECORD;
  dm_id INTEGER;
BEGIN
  FOR ac_record IN SELECT id, default_depreciation_method FROM asset_classes WHERE default_depreciation_method IS NOT NULL LOOP
    SELECT id INTO dm_id FROM depreciation_methods WHERE code = ac_record.default_depreciation_method LIMIT 1;
    IF dm_id IS NOT NULL THEN
      UPDATE asset_classes SET depreciation_method_id = dm_id WHERE id = ac_record.id;
    END IF;
  END LOOP;
END $$;

-- Step 5: Make depreciation_method_id and account_determination_key required for new records
-- Note: We'll handle this in application logic, not as NOT NULL constraint
-- to allow migration of existing data

-- Step 6: Update table comments (remove SAP terminology)
COMMENT ON TABLE asset_classes IS 'Master data table for asset classification';
COMMENT ON COLUMN asset_classes.code IS 'Unique code identifier for the asset class';
COMMENT ON COLUMN asset_classes.name IS 'Display name of the asset class';
COMMENT ON COLUMN asset_classes.depreciation_method_id IS 'Required reference to depreciation method';
COMMENT ON COLUMN asset_classes.account_determination_key IS 'Required key for account determination configuration';
COMMENT ON COLUMN asset_classes.number_range_code IS 'Code for number range assignment';
COMMENT ON COLUMN asset_classes.screen_layout_code IS 'Code for screen layout configuration';
COMMENT ON TABLE asset_class_company_codes IS 'Junction table for asset class and company code assignment';

