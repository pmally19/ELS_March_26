-- Migration: Add document_type to quotations table
-- Purpose: Enable document type classification for quotations

BEGIN;

-- Step 1: Add document_type column with default value
ALTER TABLE quotations 
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(4) DEFAULT 'QT' NOT NULL;

-- Step 2: Update constraint on sd_document_types to allow QUOTATION category
-- First, check if the constraint exists and update it
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'document_types_category_check'
  ) THEN
    ALTER TABLE sd_document_types DROP CONSTRAINT document_types_category_check;
  END IF;

  -- Add new constraint with QUOTATION category
  ALTER TABLE sd_document_types 
    ADD CONSTRAINT document_types_category_check 
    CHECK (category IN ('ORDER', 'DELIVERY', 'BILLING', 'QUOTATION'));
END $$;

-- Step 3: Insert quotation document types
INSERT INTO sd_document_types (code, name, category, is_active)
VALUES 
  ('QT', 'Standard Quotation', 'QUOTATION', true),
  ('QP', 'Project Quotation', 'QUOTATION', true),
  ('QS', 'Service Quotation', 'QUOTATION', true)
ON CONFLICT (code) DO UPDATE 
  SET name = EXCLUDED.name,
      category = EXCLUDED.category,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_quotations_document_type 
  ON quotations(document_type);

-- Step 5: Add foreign key constraint (optional - may not exist in sd_document_types)
-- Adding comment instead of FK to avoid issues if sd_document_types structure differs
COMMENT ON COLUMN quotations.document_type IS 'Document type code - references sd_document_types(code)';

COMMIT;

-- Verification queries
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE 'Quotation document types added:';
  RAISE NOTICE '  - QT: Standard Quotation';
  RAISE NOTICE '  - QP: Project Quotation';
  RAISE NOTICE '  - QS: Service Quotation';
END $$;
