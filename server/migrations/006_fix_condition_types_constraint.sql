-- Migration: Fix condition_types unique constraint to allow same code across different companies
-- Date: 2026-02-10
-- Issue: The current constraint only allows one condition code globally, 
--        but the application logic expects to allow the same code per company

-- Drop the old global unique constraint
ALTER TABLE condition_types 
DROP CONSTRAINT IF EXISTS condition_types_condition_code_key;

-- Add a composite unique constraint that allows the same condition code for different companies
ALTER TABLE condition_types 
ADD CONSTRAINT condition_types_code_company_unique 
UNIQUE (condition_code, company_code_id);

-- Verification query (optional - comment out if not needed)
-- SELECT condition_code, company_code_id, COUNT(*) 
-- FROM condition_types 
-- GROUP BY condition_code, company_code_id 
-- HAVING COUNT(*) > 1;
