-- Migration: Setup number ranges for quotation document types
-- Purpose: Create separate number ranges for each quotation type

BEGIN;

-- Step 1: Insert number ranges for quotation document types
INSERT INTO sd_number_ranges (object_code, range_number, from_number, to_number, current_number, external)
VALUES 
  ('QUOTATION', 'QT', '0100000000', '0199999999', '0100000000', false),  -- Standard Quotation
  ('QUOTATION', 'QP', '0200000000', '0299999999', '0200000000', false),  -- Project Quotation  
  ('QUOTATION', 'QS', '0300000000', '0399999999', '0300000000', false)   -- Service Quotation
ON CONFLICT (object_code, range_number) DO UPDATE
  SET from_number = EXCLUDED.from_number,
      to_number = EXCLUDED.to_number,
      updated_at = NOW();

-- Step 2: Update document types to reference their number ranges
UPDATE sd_document_types SET number_range = 'QT' WHERE code = 'QT';
UPDATE sd_document_types SET number_range = 'QP' WHERE code = 'QP';
UPDATE sd_document_types SET number_range = 'QS' WHERE code = 'QS';

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Number ranges created for quotation types:';
  RAISE NOTICE '  - QT (Standard): Range 0100000000-0199999999';
  RAISE NOTICE '  - QP (Project): Range 0200000000-0299999999';
  RAISE NOTICE '  - QS (Service): Range 0300000000-0399999999';
END $$;
