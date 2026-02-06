-- Migration: Remove Tax Jurisdiction from Customers Table
-- Date: 2025-10-28
-- Description: Remove tax_jurisdiction column from erp_customers table as it's no longer used

-- Remove tax_jurisdiction column from erp_customers table
ALTER TABLE public.erp_customers 
DROP COLUMN IF EXISTS tax_jurisdiction;

-- Add comment
COMMENT ON TABLE public.erp_customers IS 'Customer master data - tax_jurisdiction column removed on 2025-10-28';

