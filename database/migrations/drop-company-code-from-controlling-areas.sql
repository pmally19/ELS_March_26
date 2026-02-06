-- Migration to remove company_code_id from management_control_areas table
-- Author: System Cleanup
-- Date: 2026-01-02
-- Purpose: Remove company code relationship from controlling areas

-- Drop the index first
DROP INDEX IF EXISTS idx_management_control_areas_company_code;

-- Drop the foreign key constraint if it exists
ALTER TABLE management_control_areas 
DROP CONSTRAINT IF EXISTS management_control_areas_company_code_id_fkey;

-- Drop the column
ALTER TABLE management_control_areas 
DROP COLUMN IF EXISTS company_code_id;

-- Confirmation
SELECT 'Company code field removed from management_control_areas table' as status;
