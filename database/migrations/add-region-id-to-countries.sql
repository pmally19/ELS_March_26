-- Migration: Add region_id column to countries table
-- Date: 2025-11-30
-- Description: Add region_id foreign key to countries table for proper region relationship

-- Add region_id column if it doesn't exist
ALTER TABLE countries ADD COLUMN IF NOT EXISTS region_id INTEGER;

-- Add foreign key constraint if regions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regions') THEN
    -- Add foreign key constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'countries_region_id_fkey' 
      AND table_name = 'countries'
    ) THEN
      ALTER TABLE countries 
      ADD CONSTRAINT countries_region_id_fkey 
      FOREIGN KEY (region_id) REFERENCES regions(id);
    END IF;
  END IF;
END $$;

-- Create index on region_id for better query performance
CREATE INDEX IF NOT EXISTS idx_countries_region_id ON countries(region_id);

-- Note: The old 'region' varchar column is kept for backward compatibility
-- You can migrate existing data from 'region' text to 'region_id' if needed

