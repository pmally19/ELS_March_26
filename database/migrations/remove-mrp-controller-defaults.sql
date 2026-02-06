-- Migration: Remove defaults from mrp_controllers table
-- Date: 2025-11-26
-- Description: Removes default values from mrp_controllers table to enforce explicit value provision

BEGIN;

-- Remove default from is_active column
ALTER TABLE mrp_controllers 
ALTER COLUMN is_active DROP DEFAULT;

-- Remove default from created_at column (if exists)
ALTER TABLE mrp_controllers 
ALTER COLUMN created_at DROP DEFAULT;

-- Remove default from updated_at column (if exists)
ALTER TABLE mrp_controllers 
ALTER COLUMN updated_at DROP DEFAULT;

COMMIT;

-- Verification query (run separately to verify)
-- SELECT column_name, column_default, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'mrp_controllers' 
--   AND column_name IN ('is_active', 'created_at', 'updated_at');

