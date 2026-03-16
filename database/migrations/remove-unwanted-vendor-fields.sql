-- Migration: Remove unwanted fields from vendors table
-- Fields to remove: description, supplier_type, order_frequency, category
-- These fields are not in the schema and are causing errors

-- Drop columns if they exist (using IF EXISTS to avoid errors if columns don't exist)
ALTER TABLE public.vendors 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS supplier_type,
DROP COLUMN IF EXISTS order_frequency,
DROP COLUMN IF EXISTS category;

-- Add comment to document the migration
COMMENT ON TABLE public.vendors IS 'Vendor master table - cleaned up to remove unwanted fields (description, supplier_type, order_frequency, category)';

