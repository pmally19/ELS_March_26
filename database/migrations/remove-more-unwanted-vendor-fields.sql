-- Migration: Remove additional unwanted fields from vendors table
-- Fields to remove: active (redundant with is_active), vendor_type (redundant with type)
-- These fields are redundant and not in the schema

-- Drop redundant columns if they exist
ALTER TABLE public.vendors 
DROP COLUMN IF EXISTS active,
DROP COLUMN IF EXISTS vendor_type;

-- Add missing columns that are in schema but not in database
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS category_id INTEGER,
ADD COLUMN IF NOT EXISTS incoterms TEXT;

-- Add comments
COMMENT ON COLUMN public.vendors.category_id IS 'Reference to vendor_categories table';
COMMENT ON COLUMN public.vendors.incoterms IS 'International Commercial Terms (e.g., FOB, CIF, EXW)';

-- Update table comment
COMMENT ON TABLE public.vendors IS 'Vendor master table - cleaned up to remove redundant fields (active, vendor_type) and added missing fields (category_id, incoterms)';

