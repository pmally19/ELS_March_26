-- Migration: Rename Account Determination Keys to Asset Account Profile
-- Date: 2026-01-28
-- Purpose: Rename table and related objects to use "Asset Account Profile" terminology

-- Rename the main table
ALTER TABLE IF EXISTS account_determination_keys RENAME TO asset_account_profiles;

-- Rename indexes
ALTER INDEX IF EXISTS idx_account_determination_keys_code RENAME TO idx_asset_account_profiles_code;
ALTER INDEX IF EXISTS idx_account_determination_keys_active RENAME TO idx_asset_account_profiles_active;

-- Update table and column comments
COMMENT ON TABLE asset_account_profiles IS 'Master data table for asset account profile configurations';
COMMENT ON COLUMN asset_account_profiles.code IS 'Unique code identifier for the asset account profile';
COMMENT ON COLUMN asset_account_profiles.name IS 'Display name of the asset account profile';
COMMENT ON COLUMN asset_account_profiles.description IS 'Description of the asset account profile configuration';
COMMENT ON COLUMN asset_account_profiles.is_active IS 'Whether this asset account profile is active and available for use';

-- Note: The asset_classes table references this by code (not FK), so no FK constraint to update
