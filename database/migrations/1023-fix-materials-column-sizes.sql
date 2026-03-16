-- Fix materials table column sizes for better usability
-- Migration: 1023-fix-materials-column-sizes.sql

BEGIN;

-- Increase industry_sector from VARCHAR(10) to VARCHAR(50)
ALTER TABLE materials 
  ALTER COLUMN industry_sector TYPE VARCHAR(50);

-- While we're at it, let's increase other commonly long fields
ALTER TABLE materials 
  ALTER COLUMN mrp_controller TYPE VARCHAR(20);

ALTER TABLE materials 
  ALTER COLUMN purchasing_group TYPE VARCHAR(20);

ALTER TABLE materials 
  ALTER COLUMN distribution_channel TYPE VARCHAR(20);

ALTER TABLE materials 
  ALTER COLUMN sales_organization TYPE VARCHAR(20);

ALTER TABLE materials 
  ALTER COLUMN production_storage_location TYPE VARCHAR(20);

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Materials table column sizes increased successfully';
  RAISE NOTICE '   - industry_sector: VARCHAR(10) → VARCHAR(50)';
  RAISE NOTICE '   - Various other fields increased to VARCHAR(20)';
END $$;
