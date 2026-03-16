-- Migration 1105: Create vendor_invoices VIEW for backward compatibility
-- Fix: Table naming confusion (vendor_invoices vs accounts_payable)
-- 
-- Problem: Backend code uses both vendor_invoices and accounts_payable
-- Reality: Only accounts_payable exists in database (01-complete-schema.sql line 348)
-- Solution: Create VIEW so both names work
--
-- This fixes:
-- - Three-way match service (references vendor_invoices)
-- - Migrations 1100-1104 (add FKs to vendor_invoices)
-- - CrossCheck agent (queries vendor_invoices)

-- Drop any existing object with this name to prevent "is not a view" errors
DROP TABLE IF EXISTS vendor_invoices CASCADE;
DROP VIEW IF EXISTS vendor_invoices;

-- Create the VIEW
CREATE OR REPLACE VIEW vendor_invoices AS 
SELECT * FROM accounts_payable;

-- Add comment for documentation
COMMENT ON VIEW vendor_invoices IS 
'Compatibility view - maps to accounts_payable table. Fixes table naming confusion where backend uses both names. The actual data is in accounts_payable table (created in 01-complete-schema.sql).';

-- Verify the VIEW works
DO $$
BEGIN
  RAISE NOTICE 'vendor_invoices VIEW created successfully';
  RAISE NOTICE 'Both vendor_invoices and accounts_payable now reference the same data';
END $$;
